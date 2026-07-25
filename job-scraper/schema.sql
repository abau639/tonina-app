-- Local Opportunities job scraper — extended SQLite schema.
-- Idempotent: safe to re-run. Superset of the base job-scraper skill schema
-- (jobs + scrape_runs) plus a company-intelligence layer:
--   companies             one row per employer, with ownership / funding stage
--   executives            C-suite people, LinkedIn summaries, Tuck-alum flag
--   responsibility_families   fixed taxonomy of finance responsibility "families"
--   job_responsibilities  which families each job asks for (the trackable map)
--   opportunity_scores    profile-fit ranking, written by report_opportunities.py
--
-- Design note: the raw scrape (jobs/scrape_runs) is filled by the vendored skill
-- scrapers. Everything else is filled by the enrichment + report passes, which
-- need network + an ANTHROPIC_API_KEY and are meant to run on the user's machine.

-- ---------------------------------------------------------------------------
-- jobs — raw listings (unchanged from the skill, plus a few local-search cols)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    source TEXT NOT NULL,
    source_url TEXT NOT NULL,
    title TEXT NOT NULL,
    company TEXT NOT NULL,
    location TEXT,
    description TEXT,
    salary_raw TEXT,
    posted_date TEXT,

    company_size_employees TEXT,
    company_revenue TEXT,
    company_stage TEXT,                  -- pre-seed..public | private | acquired

    -- LLM-extracted role fields (extract_fields.py)
    brief_description TEXT,
    salary_min INTEGER,
    salary_max INTEGER,
    salary_currency TEXT,
    salary_period TEXT,
    equity_offered TEXT,                 -- e.g. "0.1%-0.3%", "equity", or null
    bonus_text TEXT,                     -- e.g. "15% target bonus", "sign-on", or null
    required_experience_years REAL,
    required_experience_text TEXT,
    required_degrees TEXT,               -- JSON array
    preferred_degrees TEXT,              -- JSON array
    start_date TEXT,

    -- Local-opportunities additions
    company_id INTEGER,                  -- FK -> companies.id, linked post-scrape
    ownership_type TEXT,                 -- vc-backed | pe-owned | public | bootstrapped | private-other | unknown
    radius_center TEXT,                  -- e.g. "Miami, FL" — the search anchor this job matched
    distance_miles REAL,                 -- approx miles from radius_center (best-effort)
    is_remote INTEGER NOT NULL DEFAULT 0,-- 1 if the listing is remote/anywhere
    seniority TEXT,                      -- ic | manager | director | vp | c-level (LLM-extracted)
    role_family TEXT,                    -- fp&a | strategic-finance | controller | ... (LLM-extracted)

    raw_json TEXT,
    extracted INTEGER NOT NULL DEFAULT 0,   -- 0 pending, 1 done, -1 failed
    resp_extracted INTEGER NOT NULL DEFAULT 0, -- responsibility-family pass: 0/1/-1
    first_seen_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_seen_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(company, title, source_url),
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_jobs_source ON jobs(source);
CREATE INDEX IF NOT EXISTS idx_jobs_company ON jobs(company);
CREATE INDEX IF NOT EXISTS idx_jobs_company_id ON jobs(company_id);
CREATE INDEX IF NOT EXISTS idx_jobs_extracted ON jobs(extracted);
CREATE INDEX IF NOT EXISTS idx_jobs_resp_extracted ON jobs(resp_extracted);
CREATE INDEX IF NOT EXISTS idx_jobs_stage ON jobs(company_stage);
CREATE INDEX IF NOT EXISTS idx_jobs_location ON jobs(location);
CREATE INDEX IF NOT EXISTS idx_jobs_role_family ON jobs(role_family);

-- ---------------------------------------------------------------------------
-- scrape_runs — per-run log (unchanged from the skill)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS scrape_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source TEXT NOT NULL,
    started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    finished_at TIMESTAMP,
    status TEXT NOT NULL DEFAULT 'running',
    jobs_found INTEGER NOT NULL DEFAULT 0,
    jobs_new INTEGER NOT NULL DEFAULT 0,
    error_message TEXT,
    keywords TEXT,
    locations TEXT
);
CREATE INDEX IF NOT EXISTS idx_scrape_runs_source ON scrape_runs(source);
CREATE INDEX IF NOT EXISTS idx_scrape_runs_started ON scrape_runs(started_at);

-- ---------------------------------------------------------------------------
-- companies — one row per employer, with ownership / stage / PE intelligence
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS companies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    name_key TEXT NOT NULL,              -- lower(trim(name)) for dedup
    website TEXT,
    linkedin_url TEXT,
    hq_location TEXT,
    industry TEXT,
    short_description TEXT,

    -- Ownership & stage — the "what series / PE-owned" question
    ownership_type TEXT,                 -- vc-backed | pe-owned | public | bootstrapped | private-other | unknown
    company_stage TEXT,                  -- pre-seed..series-f | growth | late-stage | public | private | acquired
    last_round TEXT,                     -- e.g. "Series B", "Buyout", "IPO"
    last_round_amount TEXT,              -- e.g. "$45M"
    last_round_date TEXT,                -- ISO if known
    total_raised TEXT,                   -- e.g. "$120M"
    lead_investors TEXT,                 -- JSON array of investor / PE-sponsor names
    pe_sponsor TEXT,                     -- named PE owner, when ownership_type = pe-owned
    size_employees TEXT,                 -- LinkedIn-style bucket
    revenue TEXT,

    -- Network signal — the whole point of "benefit from knowing my profile"
    has_tuck_alum INTEGER NOT NULL DEFAULT 0,   -- 1 if any exec is a Tuck (Dartmouth) alum
    tuck_alum_count INTEGER NOT NULL DEFAULT 0,

    enriched INTEGER NOT NULL DEFAULT 0,        -- 0 pending, 1 done, -1 failed
    enrichment_notes TEXT,                      -- provenance / confidence / caveats
    first_seen_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_enriched_at TIMESTAMP,

    UNIQUE(name_key)
);
CREATE INDEX IF NOT EXISTS idx_companies_ownership ON companies(ownership_type);
CREATE INDEX IF NOT EXISTS idx_companies_stage ON companies(company_stage);
CREATE INDEX IF NOT EXISTS idx_companies_tuck ON companies(has_tuck_alum);
CREATE INDEX IF NOT EXISTS idx_companies_enriched ON companies(enriched);

-- ---------------------------------------------------------------------------
-- executives — the C-suite team per company, with LinkedIn summaries
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS executives (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    title TEXT,                          -- CEO, CFO, COO, CTO, President, ...
    seniority_rank INTEGER,              -- 1=CEO ... helps ordering
    linkedin_url TEXT,
    linkedin_summary TEXT,               -- 2-4 sentence summary of their profile
    education TEXT,                      -- JSON array of {school, degree, year}
    prior_companies TEXT,                -- JSON array of notable prior employers

    -- Tuck / Dartmouth network flag
    is_tuck_alum INTEGER NOT NULL DEFAULT 0,
    tuck_detail TEXT,                    -- e.g. "Tuck MBA 2014" — the matched evidence
    is_dartmouth_alum INTEGER NOT NULL DEFAULT 0,  -- broader Dartmouth (undergrad etc.)

    source TEXT,                         -- where this came from (company site, LLM research, ...)
    confidence TEXT,                     -- high | medium | low
    first_seen_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(company_id, name, title),
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_execs_company ON executives(company_id);
CREATE INDEX IF NOT EXISTS idx_execs_tuck ON executives(is_tuck_alum);

-- ---------------------------------------------------------------------------
-- responsibility_families — fixed taxonomy so responsibilities are trackable
-- (seeded below; the LLM maps each job's duties onto these buckets)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS responsibility_families (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS job_responsibilities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id INTEGER NOT NULL,
    family_id INTEGER NOT NULL,
    responsibility_text TEXT,            -- the specific duty phrased for this job
    weight REAL NOT NULL DEFAULT 1.0,    -- how central this family is to the role (0-1)
    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
    FOREIGN KEY (family_id) REFERENCES responsibility_families(id) ON DELETE CASCADE,
    UNIQUE(job_id, family_id)
);
CREATE INDEX IF NOT EXISTS idx_jobresp_job ON job_responsibilities(job_id);
CREATE INDEX IF NOT EXISTS idx_jobresp_family ON job_responsibilities(family_id);

-- ---------------------------------------------------------------------------
-- opportunity_scores — profile-fit ranking snapshot (report_opportunities.py)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS opportunity_scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id INTEGER NOT NULL,
    profile_key TEXT NOT NULL,           -- which profile config produced this
    total_score REAL NOT NULL,
    role_score REAL,
    responsibility_score REAL,
    location_score REAL,
    stage_score REAL,
    network_score REAL,                  -- Tuck / Dartmouth warmth bonus
    rationale TEXT,                      -- human-readable "why this ranks here"
    scored_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
    UNIQUE(job_id, profile_key)
);
CREATE INDEX IF NOT EXISTS idx_oppscore_total ON opportunity_scores(total_score);

-- ---------------------------------------------------------------------------
-- Seed the responsibility taxonomy. INSERT OR IGNORE keeps it idempotent.
-- Tuned for Strategic Finance / FP&A / Finance-leadership roles.
-- ---------------------------------------------------------------------------
INSERT OR IGNORE INTO responsibility_families (slug, name, description, sort_order) VALUES
  ('fpa-planning',        'FP&A: Budgeting & Planning',         'Annual operating plan, budgets, headcount planning, variance analysis.', 1),
  ('forecasting-modeling','Forecasting & Financial Modeling',   'Building and maintaining 3-statement / driver-based models, scenario and sensitivity analysis.', 2),
  ('mgmt-board-reporting','Management & Board/Investor Reporting','Monthly/quarterly reporting packages, board decks, investor updates, KPI dashboards.', 3),
  ('strategic-finance',   'Strategic Finance / Corp Dev / M&A',  'Strategic finance, corporate development, M&A, diligence, capital allocation, fundraising support.', 4),
  ('business-partnering', 'Business Partnering & Decision Support','Partnering with GTM/Product/Ops leaders, ad-hoc analysis, driving business decisions.', 5),
  ('unit-economics',      'Unit Economics / Pricing / Monetization','Unit economics, pricing, LTV/CAC, cohort and margin analysis, monetization strategy.', 6),
  ('accounting-close',    'Accounting / Close / Controllership', 'Month-end close, GAAP, revenue recognition, controls, audit support.', 7),
  ('treasury-capital',    'Treasury / Capital / Fundraising',    'Cash management, treasury, debt/equity raises, cap table, runway management.', 8),
  ('systems-data',        'Systems, Data & BI',                  'ERP/NetSuite, SQL, BI tools (Looker/Tableau), automation, data pipelines for finance.', 9),
  ('leadership-team',     'Team Leadership & Management',        'Building and managing the finance team, hiring, mentoring, cross-functional leadership.', 10);
