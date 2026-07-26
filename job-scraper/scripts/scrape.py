#!/usr/bin/env python3
"""Main scrape orchestrator.

Usage:
    python scripts/scrape.py --sources a16z,sequoia,vmg,kleiner_perkins,firstround_public,firstround,linkedin,indeed,glassdoor \\
        --keywords "product manager,ML engineer" \\
        --locations "Miami FL,Fort Lauderdale FL,Sunrise FL,Remote"

    python scripts/scrape.py --sources a16z                              # one source
    python scripts/scrape.py --sources all                               # everything (default)
    python scripts/scrape.py --dry-run                                   # don't write to DB

Per-source errors don't abort the whole run — one bad scraper doesn't tank the
others. The exit code is 0 if at least one source succeeded, 1 if all failed.
"""

from __future__ import annotations

import argparse
import os
import sys
import traceback
from pathlib import Path
from typing import Callable

# Allow `python scripts/scrape.py` to import sibling modules.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

try:
    from dotenv import load_dotenv

    load_dotenv()
except Exception:
    pass

from scripts import db
from scripts.sources import consider_board, firstround_talent, linkedin, indeed, glassdoor, jobspy_source


import json


def _make_board_source(slug: str) -> Callable:
    return lambda k, l: consider_board.fetch_jobs(slug, k, l)


def _make_jobspy_source(site: str) -> Callable:
    return lambda k, l: jobspy_source.fetch_jobs(site, k, l)


# Built-in Consider-powered VC boards (tested baseline). slug == source column.
_BUILTIN_BOARDS = {
    "a16z": "vc", "sequoia": "vc", "vmg": "vc",
    "kleiner_perkins": "vc", "firstround_public": "vc",
}

# Aggregator sites, scraped via the maintained JobSpy library (pip: python-jobspy).
_JOBSPY_SITES = ["linkedin", "indeed", "glassdoor", "google", "zip_recruiter"]

# Each registered source is a callable: (keywords, locations) -> list[dict].
SOURCES: dict[str, Callable] = {
    slug: _make_board_source(slug) for slug in _BUILTIN_BOARDS
}
SOURCES.update({site: _make_jobspy_source(site) for site in _JOBSPY_SITES})
SOURCES.update({
    # Logged-in First Round talent network.
    "firstround": lambda k, l: firstround_talent.fetch_jobs(k, l),
    # Legacy hand-rolled scrapers, kept as a fallback if JobSpy ever regresses.
    "linkedin_legacy": lambda k, l: linkedin.fetch_jobs(k, l),
    "indeed_legacy": lambda k, l: indeed.fetch_jobs(k, l),
    "glassdoor_legacy": lambda k, l: glassdoor.fetch_jobs(k, l),
})

# Board -> type map for group aliases (vc / pe / boards).
_BOARD_TYPES: dict[str, str] = dict(_BUILTIN_BOARDS)


def _load_config_boards() -> None:
    """Register extra VC/growth/PE boards from config/boards.json, if present."""
    cfg = Path(__file__).resolve().parent.parent / "config" / "boards.json"
    if not cfg.exists():
        return
    try:
        data = json.loads(cfg.read_text())
    except Exception as e:
        print(f"  (could not read config/boards.json: {e})")
        return
    for b in data.get("boards", []):
        slug, company, url = b.get("slug"), b.get("company"), b.get("url")
        if not (slug and company and url):
            continue
        consider_board.register_board(slug, company, url)
        SOURCES[slug] = _make_board_source(slug)
        _BOARD_TYPES[slug] = b.get("type", "vc")


_load_config_boards()

# Group aliases the user can pass to --sources.
GROUPS: dict[str, list[str]] = {
    "vc": [s for s, t in _BOARD_TYPES.items() if t in ("vc", "growth")],
    "pe": [s for s, t in _BOARD_TYPES.items() if t in ("pe", "growth")],
    "boards": list(_BOARD_TYPES.keys()),
    "aggregators": list(_JOBSPY_SITES),
}

# `--sources all` runs the recommended set: JobSpy aggregators + every configured
# board. It excludes the *_legacy duplicates and firstround (needs a login).
_EXCLUDE_FROM_ALL = set(["firstround", "linkedin_legacy", "indeed_legacy", "glassdoor_legacy"])
DEFAULT_SOURCES = [s for s in SOURCES.keys() if s not in _EXCLUDE_FROM_ALL]


def _parse_csv(arg: str | None) -> list[str]:
    if not arg:
        return []
    return [s.strip() for s in arg.split(",") if s.strip()]


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--sources",
        default="all",
        help="Comma-separated list of source slugs, or 'all'. "
        f"Known: {', '.join(SOURCES.keys())}",
    )
    parser.add_argument("--keywords", default="", help="Comma-separated keywords to filter by")
    parser.add_argument(
        "--locations", default="", help="Comma-separated locations to filter by (fuzzy match)"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Run scrapers but don't write to the database; print what would be inserted.",
    )
    parser.add_argument(
        "--results-wanted",
        type=int,
        default=None,
        help="JobSpy: max postings per aggregator site per keyword (overrides config/search.json).",
    )
    parser.add_argument(
        "--hours-old",
        type=int,
        default=None,
        help="JobSpy: only postings newer than this many hours (overrides config/search.json).",
    )
    parser.add_argument(
        "--full-rescrape",
        action="store_true",
        help="Treat every result as new. (Default: upsert dedupes on company+title+source_url.)",
    )
    args = parser.parse_args(argv)

    if args.sources.strip().lower() == "all":
        source_names = DEFAULT_SOURCES
    else:
        requested = _parse_csv(args.sources)
        # Expand group aliases (vc / pe / boards) into their member slugs.
        source_names = []
        for s in requested:
            if s in GROUPS:
                source_names.extend(GROUPS[s])
            else:
                source_names.append(s)
        # De-dupe, preserve order.
        seen = set()
        source_names = [s for s in source_names if not (s in seen or seen.add(s))]
        unknown = [s for s in source_names if s not in SOURCES]
        if unknown:
            print(f"Unknown source(s): {', '.join(unknown)}")
            print(f"Known sources: {', '.join(SOURCES.keys())}")
            print(f"Group aliases: {', '.join(GROUPS.keys())}")
            return 2

    keywords = _parse_csv(args.keywords)
    locations = _parse_csv(args.locations)

    # CLI overrides for the JobSpy aggregator sources (else config/search.json wins).
    if args.results_wanted is not None:
        jobspy_source.OVERRIDES["results_wanted"] = args.results_wanted
    if args.hours_old is not None:
        jobspy_source.OVERRIDES["hours_old"] = args.hours_old

    print(f"Sources: {', '.join(source_names)}")
    if keywords:
        print(f"Keywords: {keywords}")
    if locations:
        print(f"Locations: {locations}")
    if args.dry_run:
        print("DRY RUN — nothing will be written to the database.")
    print()

    any_success = False
    summary: list[tuple[str, int, int, str]] = []

    for name in source_names:
        print(f"--- {name} ---")
        run_id = None
        if not args.dry_run:
            run_id = db.start_run(name, ",".join(keywords) or None, ",".join(locations) or None)
        try:
            jobs = SOURCES[name](keywords or None, locations or None)
            print(f"  fetched {len(jobs)} jobs")

            if args.dry_run:
                for j in jobs[:5]:
                    print(
                        f"  - {j.get('company', '?')} | {j.get('title', '?')} | "
                        f"{j.get('location', '?')} | stage={j.get('company_stage')} | "
                        f"size={j.get('company_size_employees')}"
                    )
                if len(jobs) > 5:
                    print(f"  ... and {len(jobs) - 5} more")
                summary.append((name, len(jobs), 0, "dry-run"))
                any_success = True
                continue

            total, new = db.upsert_jobs(jobs)
            print(f"  upserted: {total} total, {new} new")
            db.finish_run(run_id, status="success", jobs_found=total, jobs_new=new)
            summary.append((name, total, new, "success"))
            any_success = True

        except Exception as e:
            tb = traceback.format_exc()
            err_one_line = f"{type(e).__name__}: {e}"
            print(f"  FAILED: {err_one_line}")
            # Print the traceback so the user can see where it broke.
            print(tb.splitlines()[-3] if tb.splitlines() else "")
            if run_id is not None:
                db.finish_run(
                    run_id,
                    status="failed",
                    error=err_one_line + "\n" + tb[-1500:],
                )
            summary.append((name, 0, 0, f"failed: {err_one_line}"))

    print()
    print("Summary")
    print("-------")
    for name, total, new, status in summary:
        print(f"  {name:20s}  total={total:4d}  new={new:4d}  {status}")

    return 0 if any_success else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
