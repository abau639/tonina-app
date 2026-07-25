#!/usr/bin/env python3
"""Insert a small set of FICTIONAL sample rows to demo the full pipeline offline.

Everything inserted here is made up. Company names carry a "(SAMPLE)" suffix and
source = 'sample-demo' so it's unmistakable and easy to purge:

    python scripts/seed_sample.py --purge      # remove all sample rows
    DELETE FROM jobs WHERE source = 'sample-demo';   -- equivalent raw SQL

The point is to prove init_db -> link -> annotate -> responsibilities -> report
works end to end and to show what the rendered report looks like WITHOUT scraping
or an API key. The people below are not real; the Tuck flags are illustrative.

Run the real pipeline (LinkedIn/Indeed/VC boards + LLM enrichment) to populate
genuine data. See README.md.
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from scripts import db

SUFFIX = " (SAMPLE)"

# (title, company, location, ownership, stage, pe_sponsor, salary_min, salary_max,
#  seniority, [ (family_slug, weight, text) ], [ execs ])
SAMPLES = [
    (
        "Director of Strategic Finance", "Palmetto Pay" + SUFFIX, "Miami, FL",
        "vc-backed", "series-b", None, 190000, 230000, "director",
        [("strategic-finance", 1.0, "Own capital allocation and fundraising models"),
         ("forecasting-modeling", 1.0, "Driver-based 3-statement model"),
         ("mgmt-board-reporting", 0.9, "Monthly board deck and investor KPIs"),
         ("business-partnering", 0.7, "Partner with GTM on pipeline")],
        [("Marisol Reyes", "CEO", 1, True, "Tuck MBA 2013", True,
          "Fintech operator; co-founded Palmetto Pay after leading payments at a public processor. Scaled the company through Series B."),
         ("David Kwan", "CFO", 2, False, None, False,
          "Ex-investment-banking, joined from a growth-stage lender to build the finance function.")],
    ),
    (
        "VP of Finance", "Coral Health Analytics" + SUFFIX, "Fort Lauderdale, FL",
        "vc-backed", "series-c", None, 220000, 270000, "vp",
        [("fpa-planning", 1.0, "Own the annual operating plan"),
         ("forecasting-modeling", 0.9, "Maintain the long-range model"),
         ("systems-data", 0.8, "Stand up NetSuite + Looker reporting"),
         ("leadership-team", 0.8, "Build a team of 4")],
        [("Priya Nair", "CEO", 1, False, None, True,
          "Dartmouth undergrad; physician-turned-founder in health analytics."),
         ("Tom Alvarez", "COO", 2, False, None, False, "Operations leader from a national payer.")],
    ),
    (
        "Senior FP&A Manager", "Biscayne Logistics" + SUFFIX, "Doral, FL",
        "pe-owned", "private", "Sunbelt Capital Partners", 140000, 170000, "manager",
        [("fpa-planning", 1.0, "Budgeting and variance analysis"),
         ("mgmt-board-reporting", 0.9, "Sponsor reporting package"),
         ("unit-economics", 0.6, "Lane-level margin analysis")],
        [("Greg Santos", "CEO", 1, True, "Tuck MBA 2008", True,
          "PE-backed operator brought in by Sunbelt Capital to run the platform; prior GM at a 3PL."),
         ("Anna Bell", "CFO", 2, False, None, False, "Controllership-heavy CFO from a PE portfolio company.")],
    ),
    (
        "Head of Finance", "Sunrise Robotics" + SUFFIX, "Sunrise, FL",
        "vc-backed", "series-a", None, 170000, 210000, "director",
        [("strategic-finance", 1.0, "First finance hire; own everything"),
         ("treasury-capital", 0.9, "Manage runway and next raise"),
         ("forecasting-modeling", 0.9, "Build the model from scratch")],
        [("Lena Fischer", "CEO", 1, False, None, False, "Robotics PhD founder.")],
    ),
    (
        "Corporate FP&A Analyst", "Atlantic Media Group" + SUFFIX, "Miami Beach, FL",
        "public", "public", None, 95000, 120000, "ic",
        [("fpa-planning", 0.9, "Support the corporate budget cycle"),
         ("mgmt-board-reporting", 0.7, "Assemble the earnings support schedules")],
        [("Robert King", "CFO", 1, False, None, False, "Public-company finance veteran.")],
    ),
    (
        "Finance Business Partner, GTM", "Everglade SaaS" + SUFFIX, "Boca Raton, FL",
        "vc-backed", "growth", None, 150000, 185000, "manager",
        [("business-partnering", 1.0, "Partner with the CRO on GTM"),
         ("unit-economics", 0.9, "LTV/CAC and cohort analysis"),
         ("forecasting-modeling", 0.8, "Bookings and revenue forecast")],
        [("Sofia Marchetti", "CEO", 1, True, "Tuck MBA 2016", True,
          "SaaS founder; scaled to growth stage. Active in the Tuck alumni network in Florida."),
         ("James Okoro", "President", 2, False, None, False, "Revenue leader from enterprise SaaS.")],
    ),
    (
        "Controller", "Kendall Foods" + SUFFIX, "Kendall, FL",
        "bootstrapped", "private", None, 130000, 155000, "director",
        [("accounting-close", 1.0, "Own the month-end close"),
         ("fpa-planning", 0.6, "Light budgeting support")],
        [("Maria Gomez", "CEO", 1, False, None, False, "Second-generation family-business owner.")],
    ),
    (
        "Senior Financial Advisor", "Gables Wealth Partners" + SUFFIX, "Coral Gables, FL",
        "private-other", "private", None, 80000, 120000, "ic",
        [("business-partnering", 0.5, "Client-facing advisory")],
        [("Andrew Blake", "Managing Partner", 1, False, None, False, "Wealth advisory principal.")],
    ),
]


def purge() -> None:
    with db.connect() as conn:
        conn.execute("DELETE FROM executives WHERE company_id IN (SELECT id FROM companies WHERE name LIKE '%(SAMPLE)')")
        conn.execute("DELETE FROM job_responsibilities WHERE job_id IN (SELECT id FROM jobs WHERE source='sample-demo')")
        conn.execute("DELETE FROM opportunity_scores WHERE job_id IN (SELECT id FROM jobs WHERE source='sample-demo')")
        conn.execute("DELETE FROM jobs WHERE source='sample-demo'")
        conn.execute("DELETE FROM companies WHERE name LIKE '%(SAMPLE)'")
    print("Purged all sample-demo rows.")


def seed() -> None:
    slug_to_id = db.family_ids_by_slug()
    if not slug_to_id:
        print("Run init_db.py first (responsibility_families is empty).")
        return
    n = 0
    for idx, (title, company, loc, own, stage, pe, smin, smax, sen, fams, execs) in enumerate(SAMPLES):
        url = f"https://example.com/sample/{idx}"
        with db.connect() as conn:
            # job
            try:
                jid = conn.execute(
                    """INSERT INTO jobs (source, source_url, title, company, location,
                        description, company_stage, ownership_type, salary_min, salary_max,
                        salary_currency, seniority, extracted, resp_extracted)
                       VALUES ('sample-demo', ?, ?, ?, ?, ?, ?, ?, ?, ?, 'USD', ?, 1, 1)""",
                    (url, title, company, loc, f"[SAMPLE] {title} at {company}.", stage, own, smin, smax, sen),
                ).lastrowid
            except Exception:
                continue
            # company
            key = " ".join(company.lower().split())
            row = conn.execute("SELECT id FROM companies WHERE name_key=?", (key,)).fetchone()
            if row:
                cid = row["id"]
            else:
                cid = conn.execute("INSERT INTO companies (name, name_key) VALUES (?, ?)", (company, key)).lastrowid
            conn.execute(
                """UPDATE companies SET ownership_type=?, company_stage=?, pe_sponsor=?,
                   hq_location=?, enriched=1, last_enriched_at=CURRENT_TIMESTAMP,
                   enrichment_notes='FICTIONAL sample data' WHERE id=?""",
                (own, stage, pe, loc, cid),
            )
            conn.execute("UPDATE jobs SET company_id=? WHERE id=?", (cid, jid))
            # responsibilities
            for slug, w, text in fams:
                fid = slug_to_id.get(slug)
                if fid:
                    conn.execute(
                        "INSERT OR IGNORE INTO job_responsibilities (job_id, family_id, responsibility_text, weight) VALUES (?,?,?,?)",
                        (jid, fid, text, w),
                    )
            # execs
            tuck_ct = 0
            for name, etitle, rank, is_tuck, tuck_detail, is_dart, summ in execs:
                if is_tuck:
                    tuck_ct += 1
                conn.execute(
                    """INSERT OR IGNORE INTO executives (company_id, name, title, seniority_rank,
                        linkedin_summary, is_tuck_alum, tuck_detail, is_dartmouth_alum, source, confidence)
                       VALUES (?,?,?,?,?,?,?,?, 'sample-demo', 'low')""",
                    (cid, name, etitle, rank, summ, 1 if is_tuck else 0, tuck_detail, 1 if is_dart else 0),
                )
            conn.execute("UPDATE companies SET has_tuck_alum=?, tuck_alum_count=? WHERE id=?",
                         (1 if tuck_ct else 0, tuck_ct, cid))
        n += 1
    print(f"Seeded {n} FICTIONAL sample jobs (source='sample-demo'). Purge with --purge.")


if __name__ == "__main__":
    if "--purge" in sys.argv:
        purge()
    else:
        seed()
