# Local Opportunities — Job Scraper + Company Intelligence

A two-layer pipeline that turns "what finance jobs exist near me, and which ones
should I chase given my profile?" into a ranked, queryable database and a report.

Built on top of the `job-scraper` skill (the raw scrapers are vendored under
`scripts/sources/`) and extended with the pieces this project actually asked for:

| Ask | Where it lives |
|---|---|
| Jobs within **50 miles** of a city | `scripts/lib/metro.py` (haversine radius → location list) |
| **Industry / role** filter | `--keywords` on the scraper; `config/search.json` |
| A **family of responsibilities** that's easily tracked | `responsibility_families` taxonomy + `scripts/extract_responsibilities.py` |
| **C-suite profiles** + LinkedIn summaries | `executives` table + `scripts/enrich_companies.py` |
| **Tuck MBA alumni** flag | `executives.is_tuck_alum` → rolled up to `companies.has_tuck_alum`; verified by hand via `scripts/verify.py` against your alumni directory |
| **Stage / series / PE-owned** | `companies.ownership_type`, `company_stage`, `pe_sponsor`, `last_round` |
| **Salary + comp** | `jobs.salary_min/max/currency/period` plus `equity_offered`, `bonus_text` (LLM-extracted); a compensation snapshot in the report |
| **Remote toggle** | `jobs.is_remote` flag + `report_opportunities.py --remote include\|exclude\|only` (and `REMOTE=` in the pipeline) |
| **More VC / PE boards** | `config/boards.json` registry + `--sources vc\|pe\|boards` group aliases |
| **Local opportunities for *your* profile** | `scripts/report_opportunities.py` → ranked report |

Target for this build: **Miami, FL · 50 mi · Strategic Finance / FP&A + Finance leadership.**
Configured in `config/search.json` and `config/profile.json` — edit those to retarget.

**Runs local-only by design.** This tool and its database are meant to stay on your
machine — it is deliberately NOT wired into the tonina.me site and does not deploy to
Vercel. The database holds personal data about third-party executives; keep it local.
It uses **no personal-account logins** (see the access table below).

---

## ⚠️ Why the live scrape can't run in Claude's cloud environment

This tool was authored in a Claude Code cloud session whose **egress policy blocks
job sites** (LinkedIn, Indeed, Glassdoor, and the VC boards all return `403` at the
proxy) and which has **no `ANTHROPIC_API_KEY`**. So the two network/LLM stages —
scraping and enrichment — are built and tested but were **not run against live data
here**. Run them on your own machine (or any environment with open egress + a key),
where the commands below work as written.

The profile-fit **report is pure Python** and runs anywhere once the DB has rows.
To see the whole thing working offline right now:

```bash
python3 scripts/init_db.py
python3 scripts/seed_sample.py           # inserts clearly-fictional "(SAMPLE)" rows
python3 -c "from scripts import db; db.annotate_distances('Miami, FL', 50)"
python3 scripts/report_opportunities.py  # writes out/opportunities.{md,html}
python3 scripts/seed_sample.py --purge   # remove the sample rows when done
```

---

## Setup (local machine)

```bash
cd job-scraper
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python -m playwright install chromium          # for the VC boards + fallbacks
cp .env.example .env                            # then add ANTHROPIC_API_KEY
python scripts/init_db.py
```

`.env` holds `ANTHROPIC_API_KEY` (enrichment + extraction) and optional scraper
knobs like `REQUEST_SLEEP_SECONDS`. It is gitignored — never commit it.

## Run the full pipeline

```bash
# 0. Turn "50 mi around Miami" into the location list (inspect it)
python scripts/lib/metro.py --center "Miami, FL" --radius 50

# 1. Scrape jobs (LinkedIn/Indeed/Glassdoor carry the Miami metro volume;
#    the VC boards carry the cleanest company_stage data)
python scripts/scrape.py \
  --sources linkedin,indeed,glassdoor,a16z,sequoia,vmg,kleiner_perkins,firstround_public \
  --keywords "strategic finance,FP&A,finance manager,director of finance,head of finance,vp finance,CFO" \
  --locations "$(python scripts/lib/metro.py --center 'Miami, FL' --radius 50 --no-remote --json | python -c 'import sys,json;print(",".join(json.load(sys.stdin)["locations"]))')"

# 2. LLM pass: salaries, degrees, experience (fills the jobs table)
python scripts/extract_fields.py

# 3. Map each job onto the trackable responsibility families
python scripts/extract_responsibilities.py

# 4. Company intelligence: ownership / stage / PE + C-suite + Tuck flags
python scripts/enrich_companies.py

# 5. Annotate distance-from-center, then rank against your profile
python -c "from scripts import db; db.annotate_distances('Miami, FL', 50)"
python scripts/report_opportunities.py --top 50
open out/opportunities.html
```

`run_pipeline.sh` wraps steps 1–5 with the Miami defaults.

## Verify Tuck alumni by hand (the chosen, zero-risk workflow)

The report narrows you to a shortlist of companies worth pursuing. Rather than
scraping LinkedIn for education data, you confirm Tuck/Dartmouth alumni against your
own **alumni directory** (the authoritative, sanctioned source) and record what you
find. No logins, no scraping, no account risk — it all stays local.

```bash
# a) Export the shortlist to work through in the directory (also writes a CSV)
python scripts/verify.py worklist --top 20

# b) Record a confirmed alum (name optional; --dartmouth-only for non-Tuck Dartmouth)
python scripts/verify.py add-alum --company "Palmetto Pay" \
    --name "Marisol Reyes" --title CEO --detail "Tuck MBA 2013"

# c) Verified NOT an alum? clear the flag.   Inspect anytime with `show`.
python scripts/verify.py unflag --company "Kendall Foods"
python scripts/verify.py show   --company "Palmetto Pay"

# d) Re-rank — verified warm-intros rise to the top
python scripts/report_opportunities.py
```

`enrich_companies.py` still populates ownership / stage / PE and a *best-guess* C-suite
(so the worklist tells you who to look up), but the Tuck flag you act on is the one
**you** verify here — recorded with `confidence: high`, `source: tuck-directory-verified`.

## Toggles: remote, compensation, and more boards

```bash
# Remote roles: keep them (default), drop them, or see only remote
python scripts/report_opportunities.py --remote include
python scripts/report_opportunities.py --remote exclude
python scripts/report_opportunities.py --remote only
REMOTE=only ./run_pipeline.sh              # same toggle through the pipeline

# Compensation is captured automatically by extract_fields.py:
#   base salary_min/max + equity_offered + bonus_text, plus a
#   "Compensation snapshot" (avg base by stage) in the report.

# Search more VC / PE portfolio boards. Group aliases expand to config/boards.json:
python scripts/scrape.py --sources vc      --keywords "FP&A,strategic finance"   # all VC + growth boards
python scripts/scrape.py --sources pe      --keywords "finance"                  # PE / growth-equity boards
python scripts/scrape.py --sources boards                                        # every configured board
python scripts/scrape.py --sources insightpartners,battery,greylock              # specific ones
# Add your own: edit config/boards.json (slug, company, url, type). Most VC talent
# boards run on the 'Consider' platform (jobs.<firm>.com) and parse out of the box.
```

## Query it directly

```sql
-- Series A/B companies hiring finance in-radius
SELECT j.title, j.company, c.company_stage, c.ownership_type, j.distance_miles
FROM jobs j JOIN companies c ON c.id = j.company_id
WHERE c.company_stage IN ('series-a','series-b') AND j.distance_miles <= 50;

-- Every company where a Tuck alum sits in the C-suite (your warm intros)
SELECT c.name, e.name, e.title, e.tuck_detail
FROM companies c JOIN executives e ON e.company_id = c.id
WHERE e.is_tuck_alum = 1;

-- What the local market wants, by responsibility family
SELECT rf.name, COUNT(*) n FROM job_responsibilities jr
JOIN responsibility_families rf ON rf.id = jr.family_id
GROUP BY rf.name ORDER BY n DESC;

-- PE-owned employers and their sponsors
SELECT name, pe_sponsor, last_round FROM companies WHERE ownership_type = 'pe-owned';

-- Compensation: base range + equity/bonus for the roles that quote pay
SELECT title, company, salary_min, salary_max, equity_offered, bonus_text
FROM jobs WHERE salary_min IS NOT NULL ORDER BY salary_max DESC;

-- Remote roles only, on-target and finance-adjacent
SELECT title, company, salary_min, salary_max FROM jobs WHERE is_remote = 1;
```

## Schema

See `schema.sql`. Layers: `jobs` + `scrape_runs` (raw scrape, from the skill),
then `companies`, `executives`, `responsibility_families` + `job_responsibilities`,
and `opportunity_scores` (the ranking snapshot).

## Honesty about the data

- **`enrich_companies.py` is best-effort and only a starting point.** It grounds on the
  company's own site when reachable and tags every executive with a confidence level,
  with hard instructions not to invent people or alumni claims. Treat its `confidence: low`
  execs and any Tuck guesses as **leads to verify, not facts** — the authoritative Tuck
  flags come from you, via `scripts/verify.py` against your alumni directory. (No
  logged-in LinkedIn scraping is used or recommended; it risks your account.)
- **The `(SAMPLE)` rows are fictional** and exist only to demo the pipeline. Purge with
  `python scripts/seed_sample.py --purge`.
- LinkedIn/Indeed/Glassdoor scraping is against those sites' ToS and can get an IP
  rate-limited. The scrapers sleep between requests; keep `REQUEST_SLEEP_SECONDS` sane.
