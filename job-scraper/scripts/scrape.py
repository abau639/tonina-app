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
from scripts.sources import consider_board, firstround_talent, linkedin, indeed, glassdoor


# Each registered source is a callable: (keywords, locations) -> list[dict].
SOURCES: dict[str, Callable] = {
    # Consider-powered VC boards. board_slug doubles as the source-column value.
    "a16z": lambda k, l: consider_board.fetch_jobs("a16z", k, l),
    "sequoia": lambda k, l: consider_board.fetch_jobs("sequoia", k, l),
    "vmg": lambda k, l: consider_board.fetch_jobs("vmg", k, l),
    "kleiner_perkins": lambda k, l: consider_board.fetch_jobs("kleiner_perkins", k, l),
    "firstround_public": lambda k, l: consider_board.fetch_jobs("firstround_public", k, l),
    # Logged-in First Round talent network.
    "firstround": lambda k, l: firstround_talent.fetch_jobs(k, l),
    # Public job aggregators (ToS-violating direct scraping; user accepted risk).
    "linkedin": lambda k, l: linkedin.fetch_jobs(k, l),
    "indeed": lambda k, l: indeed.fetch_jobs(k, l),
    "glassdoor": lambda k, l: glassdoor.fetch_jobs(k, l),
}

DEFAULT_SOURCES = list(SOURCES.keys())


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
        "--full-rescrape",
        action="store_true",
        help="Treat every result as new. (Default: upsert dedupes on company+title+source_url.)",
    )
    args = parser.parse_args(argv)

    if args.sources.strip().lower() == "all":
        source_names = DEFAULT_SOURCES
    else:
        source_names = _parse_csv(args.sources)
        unknown = [s for s in source_names if s not in SOURCES]
        if unknown:
            print(f"Unknown source(s): {', '.join(unknown)}")
            print(f"Known sources: {', '.join(SOURCES.keys())}")
            return 2

    keywords = _parse_csv(args.keywords)
    locations = _parse_csv(args.locations)

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
