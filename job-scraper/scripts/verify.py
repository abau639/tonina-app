#!/usr/bin/env python3
"""Manual Tuck-verification loop — no scraping, no LinkedIn, no account access.

Chosen workflow: the pipeline ranks opportunities and proposes a shortlist of
companies; you look those up in your (sanctioned) Tuck/Dartmouth alumni directory;
you record what you confirm here; you re-run the report so verified warm-intros
rise to the top. Everything stays on your machine.

Commands
--------
  # 1. Export the shortlist to check in the alumni directory (CSV + console)
  python scripts/verify.py worklist --top 20

  # 2. Record a confirmed alum (name optional — omit to just flag the company)
  python scripts/verify.py add-alum --company "Palmetto Pay" \
      --name "Marisol Reyes" --title CEO --detail "Tuck MBA 2013"
  python scripts/verify.py add-alum --company "Coral Health" --dartmouth \
      --name "Priya Nair" --title CEO --detail "Dartmouth '02"

  # 3. Verified NOT an alum -> clear the flags for that company
  python scripts/verify.py unflag --company "Kendall Foods"

  # 4. Inspect what's recorded
  python scripts/verify.py show --company "Palmetto Pay"

Then: python scripts/report_opportunities.py   # re-rank with verified data
"""

from __future__ import annotations

import argparse
import csv
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from scripts import db

REPO_ROOT = Path(__file__).resolve().parent.parent


def resolve_company(conn, name: str):
    """Exact name_key match, else unique LIKE match. Returns row or None; prints
    and returns 'AMBIG' if more than one loose match."""
    key = " ".join(name.lower().split())
    row = conn.execute("SELECT * FROM companies WHERE name_key = ?", (key,)).fetchone()
    if row:
        return row
    rows = conn.execute(
        "SELECT * FROM companies WHERE name_key LIKE ?", (f"%{key}%",)
    ).fetchall()
    if len(rows) == 1:
        return rows[0]
    if len(rows) > 1:
        print(f"Ambiguous company '{name}'. Matches:")
        for r in rows:
            print(f"  - {r['name']}")
        return "AMBIG"
    return None


def recompute_rollup(conn, company_id: int) -> int:
    agg = conn.execute(
        "SELECT COUNT(*) n, SUM(is_tuck_alum) t FROM executives WHERE company_id = ?",
        (company_id,),
    ).fetchone()
    tuck = agg["t"] or 0
    conn.execute(
        "UPDATE companies SET has_tuck_alum = ?, tuck_alum_count = ? WHERE id = ?",
        (1 if tuck else 0, tuck, company_id),
    )
    return tuck


def cmd_worklist(args) -> int:
    with db.connect() as conn:
        rows = conn.execute(
            """
            SELECT c.id, c.name, c.ownership_type, c.company_stage, c.pe_sponsor,
                   c.has_tuck_alum, c.tuck_alum_count,
                   (SELECT COUNT(*) FROM jobs j WHERE j.company_id = c.id) AS open_jobs,
                   (SELECT MAX(o.total_score) FROM opportunity_scores o
                    JOIN jobs j2 ON j2.id = o.job_id WHERE j2.company_id = c.id) AS best_score
            FROM companies c
            WHERE (SELECT COUNT(*) FROM jobs j WHERE j.company_id = c.id) > 0
            ORDER BY (best_score IS NULL), best_score DESC, open_jobs DESC
            """
        ).fetchall()
    rows = rows[: args.top]
    if not rows:
        print("No companies with open jobs yet. Run the scrape + report first.")
        return 0

    # Console view
    print(f"\nTuck-directory worklist — top {len(rows)} companies to check:\n")
    print(f"{'#':>2}  {'score':>5}  {'jobs':>4}  {'tuck?':>5}  {'ownership':<12} company / execs to look up")
    print("-" * 88)
    with db.connect() as conn:
        for i, r in enumerate(rows, 1):
            score = f"{r['best_score']:.0f}" if r["best_score"] is not None else "—"
            tuck = "YES" if r["has_tuck_alum"] else ("—")
            execs = conn.execute(
                "SELECT name, title FROM executives WHERE company_id = ? ORDER BY COALESCE(seniority_rank,99)",
                (r["id"],),
            ).fetchall()
            who = "; ".join(f"{e['name']} ({e['title'] or '?'})" for e in execs) or "(no execs on file — look up leadership)"
            print(f"{i:>2}  {score:>5}  {r['open_jobs']:>4}  {tuck:>5}  {(r['ownership_type'] or '—'):<12} {r['name']}")
            print(f"{'':>28}{who}")

    # CSV export for working through in the directory
    out = Path(args.out) if args.out else (REPO_ROOT / "out" / "verify_worklist.csv")
    out.parent.mkdir(parents=True, exist_ok=True)
    with db.connect() as conn, open(out, "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["company", "best_score", "open_jobs", "ownership", "stage",
                    "current_tuck_flag", "execs_on_file",
                    "TUCK_alum_confirmed(y/n)", "alum_name", "alum_title", "alum_detail"])
        for r in rows:
            execs = conn.execute(
                "SELECT name, title FROM executives WHERE company_id = ? ORDER BY COALESCE(seniority_rank,99)",
                (r["id"],),
            ).fetchall()
            who = "; ".join(f"{e['name']} ({e['title'] or '?'})" for e in execs)
            w.writerow([r["name"], r["best_score"], r["open_jobs"], r["ownership_type"],
                        r["company_stage"], "yes" if r["has_tuck_alum"] else "", who, "", "", "", ""])
    print(f"\nWorklist CSV: {out}")
    print("Fill the last columns as you check each in the Tuck directory, then record with:")
    print('  python scripts/verify.py add-alum --company "..." --name "..." --title "..." --detail "..."')
    return 0


def cmd_add_alum(args) -> int:
    with db.connect() as conn:
        company = resolve_company(conn, args.company)
        if company is None:
            print(f"No company matching '{args.company}'. (It must have been scraped/linked first.)")
            return 1
        if company == "AMBIG":
            return 1
        cid = company["id"]
        name = args.name or "Confirmed via alumni directory"
        is_tuck = 0 if args.dartmouth and not args.tuck else 1  # default: Tuck unless --dartmouth-only
        if args.dartmouth_only:
            is_tuck = 0
        is_dart = 1 if (args.dartmouth or args.dartmouth_only or is_tuck) else 0  # Tuck implies Dartmouth
        try:
            conn.execute(
                """INSERT INTO executives
                     (company_id, name, title, linkedin_summary, is_tuck_alum, tuck_detail,
                      is_dartmouth_alum, source, confidence)
                   VALUES (?, ?, ?, ?, ?, ?, ?, 'tuck-directory-verified', 'high')""",
                (cid, name, args.title, args.summary, is_tuck, args.detail, is_dart),
            )
        except Exception:
            conn.execute(
                """UPDATE executives SET is_tuck_alum = ?, tuck_detail = COALESCE(?, tuck_detail),
                     is_dartmouth_alum = ?, source = 'tuck-directory-verified', confidence = 'high',
                     title = COALESCE(?, title)
                   WHERE company_id = ? AND name = ?""",
                (is_tuck, args.detail, is_dart, args.title, cid, name),
            )
        n = recompute_rollup(conn, cid)
        conn.execute(
            "UPDATE jobs SET ownership_type = ownership_type WHERE company_id = ?", (cid,)
        )  # no-op touch; scores refresh on report run
    kind = "Tuck" if is_tuck else "Dartmouth"
    print(f"Recorded {kind} alum '{name}' at {company['name']}. Company now has {n} Tuck alum(s).")
    print("Re-run: python scripts/report_opportunities.py")
    return 0


def cmd_unflag(args) -> int:
    with db.connect() as conn:
        company = resolve_company(conn, args.company)
        if not company or company == "AMBIG":
            if company is None:
                print(f"No company matching '{args.company}'.")
            return 1
        cid = company["id"]
        conn.execute(
            "UPDATE executives SET is_tuck_alum = 0, is_dartmouth_alum = 0, tuck_detail = NULL WHERE company_id = ?",
            (cid,),
        )
        recompute_rollup(conn, cid)
    print(f"Cleared Tuck/Dartmouth flags for {company['name']}.")
    return 0


def cmd_show(args) -> int:
    with db.connect() as conn:
        company = resolve_company(conn, args.company)
        if not company or company == "AMBIG":
            if company is None:
                print(f"No company matching '{args.company}'.")
            return 1
        cid = company["id"]
        print(f"\n{company['name']}")
        print(f"  ownership: {company['ownership_type'] or '—'} · stage: {company['company_stage'] or '—'}"
              f"{' · PE: ' + company['pe_sponsor'] if company['pe_sponsor'] else ''}")
        print(f"  tuck flag: {'YES (' + str(company['tuck_alum_count']) + ')' if company['has_tuck_alum'] else 'no'}")
        jobs = conn.execute("SELECT title, location FROM jobs WHERE company_id = ?", (cid,)).fetchall()
        print(f"  open jobs: {len(jobs)}")
        for j in jobs:
            print(f"    - {j['title']} ({j['location'] or '—'})")
        execs = conn.execute(
            "SELECT name, title, is_tuck_alum, tuck_detail, is_dartmouth_alum, confidence, source FROM executives WHERE company_id = ? ORDER BY COALESCE(seniority_rank,99)",
            (cid,),
        ).fetchall()
        print(f"  C-suite ({len(execs)}):")
        for e in execs:
            mark = f"  [TUCK: {e['tuck_detail'] or 'alum'}]" if e["is_tuck_alum"] else (" [Dartmouth]" if e["is_dartmouth_alum"] else "")
            print(f"    - {e['name']}, {e['title'] or '—'}{mark}  ({e['confidence'] or '?'} / {e['source'] or '?'})")
    return 0


def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)

    w = sub.add_parser("worklist", help="Export the shortlist of companies to check in the alumni directory")
    w.add_argument("--top", type=int, default=20)
    w.add_argument("--out", default=None)
    w.set_defaults(func=cmd_worklist)

    a = sub.add_parser("add-alum", help="Record a confirmed Tuck (or Dartmouth) alum")
    a.add_argument("--company", required=True)
    a.add_argument("--name", default=None, help="Alum name (omit to just flag the company)")
    a.add_argument("--title", default=None)
    a.add_argument("--detail", default=None, help='e.g. "Tuck MBA 2013"')
    a.add_argument("--summary", default=None, help="Optional LinkedIn-style summary")
    a.add_argument("--tuck", action="store_true", help="Force Tuck flag (default when neither flag given)")
    a.add_argument("--dartmouth", action="store_true", help="Also flag broader Dartmouth (Tuck implies this)")
    a.add_argument("--dartmouth-only", dest="dartmouth_only", action="store_true",
                   help="Dartmouth alum but NOT Tuck")
    a.set_defaults(func=cmd_add_alum)

    u = sub.add_parser("unflag", help="Clear Tuck/Dartmouth flags for a company (verified not an alum)")
    u.add_argument("--company", required=True)
    u.set_defaults(func=cmd_unflag)

    s = sub.add_parser("show", help="Show a company's jobs, execs, and flags")
    s.add_argument("--company", required=True)
    s.set_defaults(func=cmd_show)

    args = ap.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
