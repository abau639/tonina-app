#!/usr/bin/env python3
"""Mark jobs not re-confirmed in >N business days as 'stale' (default N=3).

A live job gets its last_seen_at bumped on every scrape. A job that fell off the
board stops being re-confirmed, so once it hasn't been seen in more than 3 business
days (weekends excluded) we flag it 'stale' — likely filled/closed. Re-appearing
flips it back to 'active'.

The reference point is the latest scrape run, not the wall clock, so leaving the
tool idle for a week doesn't falsely age everything.

Usage:
    python scripts/mark_stale.py                 # threshold = 3 business days
    python scripts/mark_stale.py --days 5        # custom threshold
    python scripts/mark_stale.py --list          # print the stale ones after marking
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from scripts import db


def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--days", type=int, default=3, help="Business-day staleness threshold (default 3)")
    ap.add_argument("--list", action="store_true", help="List stale jobs after marking")
    args = ap.parse_args(argv)

    n_active, n_stale = db.mark_stale(threshold_business_days=args.days)
    print(f"Marked {n_stale} stale (>{args.days} business days unseen) · {n_active} active.")

    if args.list and n_stale:
        with db.connect() as conn:
            rows = conn.execute(
                "SELECT title, company, last_seen_at FROM jobs WHERE status='stale' ORDER BY last_seen_at"
            ).fetchall()
        print("\nStale (likely filled):")
        for r in rows:
            print(f"  - {r['title']} — {r['company']}  (last seen {str(r['last_seen_at']).split(' ')[0]})")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
