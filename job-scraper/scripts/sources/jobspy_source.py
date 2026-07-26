"""Adapter for JobSpy (pip: python-jobspy) — the maintained multi-board scraper.

We depend on JobSpy rather than fork it: job scrapers rot as sites change their
markup, and JobSpy's whole value is that upstream keeps them working. This module
is the only glue — it calls jobspy.scrape_jobs() for ONE site and maps the returned
DataFrame rows into our job-dict schema. Everything downstream (radius, company
enrichment, responsibility families, Tuck scoring, report) is unchanged.

JobSpy covers the aggregators: linkedin, indeed, glassdoor, google, zip_recruiter.
The VC/PE portfolio boards are NOT in JobSpy — those stay on our consider_board
scraper. Both plug into scrape.py behind the same --sources interface.

JobSpy gives us structured data our old scrapers didn't: native `distance` (miles)
radius, is_remote, annualized min/max salary, company_num_employees, company_revenue.
So these land without needing the LLM extraction pass to parse them.
"""

from __future__ import annotations

import json
import math
from pathlib import Path
from typing import Iterable

from .base import normalize_job, normalize_company_size

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
SEARCH_CFG = REPO_ROOT / "config" / "search.json"

# JobSpy site slugs we expose.
SITES = ["linkedin", "indeed", "glassdoor", "google", "zip_recruiter"]

# CLI-set overrides (scrape.py fills these from --results-wanted / --hours-old).
# Anything here beats config/search.json for this process.
OVERRIDES: dict = {}

_INTERVAL_TO_PERIOD = {
    "yearly": "year", "annual": "year", "annually": "year",
    "monthly": "month", "weekly": "week", "daily": "day", "hourly": "hour",
}


def _clean(v):
    """pandas gives NaN/NaT for missing cells; turn those into None."""
    if v is None:
        return None
    try:
        if isinstance(v, float) and math.isnan(v):
            return None
    except (TypeError, ValueError):
        pass
    s = str(v).strip()
    if not s or s.lower() in ("nan", "none", "nat"):
        return None
    return v


def _load_search_cfg() -> dict:
    try:
        return json.loads(SEARCH_CFG.read_text())
    except Exception:
        return {}


def fetch_jobs(
    site: str,
    keywords: Iterable[str] | None = None,
    locations: Iterable[str] | None = None,
) -> list[dict]:
    """Scrape one JobSpy site. Reads center city + radius + volume knobs from
    config/search.json so we issue one efficient query per keyword (JobSpy's
    `distance` covers the metro natively — no need to fan out over our city list).
    The passed `locations` list is used only as a light post-filter safety net."""
    try:
        from jobspy import scrape_jobs  # pip install python-jobspy
    except Exception as e:
        raise RuntimeError(
            "JobSpy is not installed. Run `pip install python-jobspy` "
            f"(or `pip install -r requirements.txt`). Import error: {e}"
        )

    cfg = _load_search_cfg()
    center = cfg.get("center_city") or "Miami, FL"
    radius = int(cfg.get("radius_miles") or 50)
    # CLI overrides (OVERRIDES) beat config; fall back to config, then a default.
    results_wanted = int(OVERRIDES.get("results_wanted") or cfg.get("results_wanted") or 50)
    hours_old = OVERRIDES.get("hours_old", cfg.get("hours_old"))  # None = no recency filter
    country = cfg.get("country_indeed") or "usa"

    keyword_list = [k for k in (keywords or []) if k and k.strip()] or [""]

    out: list[dict] = []
    seen: set[str] = set()

    for kw in keyword_list:
        kwargs = dict(
            site_name=[site],
            search_term=kw or None,
            location=center,
            distance=radius,
            results_wanted=results_wanted,
            country_indeed=country,
            description_format="markdown",
            enforce_annual_salary=True,
            linkedin_fetch_description=(site == "linkedin"),
            verbose=0,
        )
        if hours_old:
            kwargs["hours_old"] = int(hours_old)

        try:
            df = scrape_jobs(**kwargs)
        except Exception as e:
            # One keyword failing shouldn't sink the source; log and continue.
            print(f"  jobspy[{site}] keyword {kw!r} failed: {type(e).__name__}: {e}")
            continue

        if df is None or len(df) == 0:
            continue

        for row in df.to_dict("records"):
            job = _row_to_job(site, row)
            if not job:
                continue
            url = job.get("source_url")
            if url and url in seen:
                continue
            if url:
                seen.add(url)
            out.append(job)

    return out


def _get(row: dict, *keys):
    """Case-insensitive fetch across possible column spellings; first non-empty."""
    lower = {str(k).lower(): k for k in row}
    for k in keys:
        if k in row and _clean(row[k]) is not None:
            return _clean(row[k])
        lk = k.lower()
        if lk in lower and _clean(row[lower[lk]]) is not None:
            return _clean(row[lower[lk]])
    return None


def _row_to_job(site: str, row: dict) -> dict | None:
    title = _get(row, "title")
    url = _get(row, "job_url", "job_url_direct")
    if not title or not url:
        return None

    company = _get(row, "company") or ""
    location = _get(row, "location")
    if not location:
        city = _get(row, "city")
        state = _get(row, "state")
        location = ", ".join(x for x in (city, state) if x) or None

    # Structured salary — JobSpy already annualized it (enforce_annual_salary=True).
    smin = _get(row, "min_amount")
    smax = _get(row, "max_amount")
    currency = _get(row, "currency")
    interval = _get(row, "interval")
    period = _INTERVAL_TO_PERIOD.get(str(interval).lower()) if interval else None
    salary_raw = None
    if smin or smax:
        salary_raw = f"{currency or ''} {smin or ''}-{smax or ''} /{interval or ''}".strip()

    is_remote = _get(row, "is_remote")
    is_remote = 1 if (is_remote is True or str(is_remote).lower() == "true") else 0

    def _num(v):
        try:
            return int(float(v))
        except (TypeError, ValueError):
            return None

    return normalize_job(
        source=site,
        source_url=url,
        title=title,
        company=company,
        location=location,
        description=_get(row, "description"),
        salary_raw=salary_raw,
        posted_date=_get(row, "date_posted"),
        company_size_employees=normalize_company_size(_get(row, "company_num_employees"))
        or _get(row, "company_num_employees"),
        company_revenue=_get(row, "company_revenue"),
        # Structured fields written straight through by db.upsert_jobs:
        salary_min=_num(smin),
        salary_max=_num(smax),
        salary_currency=currency,
        salary_period=period,
        is_remote=is_remote,
        raw_json=row,
    )
