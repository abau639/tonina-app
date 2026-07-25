#!/usr/bin/env python3
"""Ping every configured VC/PE board URL and report which are reachable.

The board URLs in config/boards.json are best-effort — firms rename or move their
job boards. Run this once on a network with open egress to find the dead ones,
then fix them in config/boards.json (open the firm's jobs/talent/careers page in a
browser, copy the real URL).

    python scripts/check_boards.py
    python scripts/check_boards.py --timeout 15

Uses only the standard library, so it runs before `pip install -r requirements.txt`.
This does NOT scrape — it just does a lightweight request to see if the URL resolves.
"""

from __future__ import annotations

import argparse
import sys
import urllib.request
import urllib.error
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

# Importing scrape merges config/boards.json into consider_board.BOARDS.
from scripts import scrape  # noqa: F401  (triggers board registration)
from scripts.sources import consider_board

UA = "Mozilla/5.0 (compatible; job-scraper board-check/1.0)"


def check(url: str, timeout: float) -> tuple[str, str]:
    """Return (status_label, detail). Never raises."""
    req = urllib.request.Request(url, headers={"User-Agent": UA}, method="GET")
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            code = resp.getcode()
            final = resp.geturl()
            if final.rstrip("/") != url.rstrip("/"):
                return "OK→redirect", f"{code} → {final}"
            return "OK", str(code)
    except urllib.error.HTTPError as e:
        # 404/410 = likely wrong URL; 403/429 = reachable but blocking bots (still "exists")
        label = "DEAD" if e.code in (404, 410) else "BLOCKED/other"
        return label, f"HTTP {e.code}"
    except urllib.error.URLError as e:
        return "UNREACHABLE", str(getattr(e, "reason", e))
    except Exception as e:  # timeouts, TLS, etc.
        return "UNREACHABLE", f"{type(e).__name__}: {e}"


def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--timeout", type=float, default=12.0)
    args = ap.parse_args(argv)

    boards = sorted(consider_board.BOARDS.items())
    print(f"Checking {len(boards)} board URLs (timeout {args.timeout:g}s)...\n")
    dead = []
    for slug, (company, url) in boards:
        label, detail = check(url, args.timeout)
        mark = {"OK": "✓", "OK→redirect": "↪", "DEAD": "✗", "BLOCKED/other": "•", "UNREACHABLE": "?"}.get(label, "?")
        print(f"  {mark} {label:14s} {slug:18s} {url}")
        if detail:
            print(f"      {detail}")
        if label in ("DEAD", "UNREACHABLE"):
            dead.append((slug, url, detail))

    print()
    if dead:
        print(f"{len(dead)} board(s) need attention — fix the url in config/boards.json:")
        for slug, url, detail in dead:
            print(f"  - {slug}: {url}  ({detail})")
        print("\n(‘BLOCKED/other’ and ‘redirect’ usually still work for scraping — only DEAD/UNREACHABLE need a new URL.)")
    else:
        print("All board URLs resolved. ✓")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
