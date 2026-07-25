"""SQLite helpers. Used by scrape.py and extract_fields.py."""

from __future__ import annotations

import json
import os
import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Iterable, Iterator

REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_DB = REPO_ROOT / "jobs.db"


def db_path() -> Path:
    return Path(os.environ.get("JOBS_DB_PATH", DEFAULT_DB))


@contextmanager
def connect() -> Iterator[sqlite3.Connection]:
    conn = sqlite3.connect(db_path())
    conn.row_factory = sqlite3.Row
    # Enable foreign keys and a reasonable busy timeout in case of concurrent reads.
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA busy_timeout = 5000")
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


# ---------- jobs ----------


def upsert_jobs(jobs: Iterable[dict]) -> tuple[int, int]:
    """Insert new jobs, update last_seen_at on duplicates. Returns (total, new).

    If a duplicate already exists but the new scrape carries non-null company
    metadata (size/stage/revenue) that wasn't there before, we merge those in
    too so a richer source can fill gaps left by a poorer one.
    """
    total = 0
    new = 0
    with connect() as conn:
        cur = conn.cursor()
        for job in jobs:
            total += 1
            # is_remote defaults to 0 (matches the schema default) when the source
            # doesn't tell us; JobSpy provides a real boolean.
            is_remote = 1 if job.get("is_remote") else 0
            payload = (
                job.get("source"),
                job.get("source_url"),
                job.get("title"),
                job.get("company"),
                job.get("location"),
                job.get("description"),
                job.get("salary_raw"),
                job.get("posted_date"),
                job.get("company_size_employees"),
                job.get("company_revenue"),
                job.get("company_stage"),
                # Structured fields some sources (e.g. JobSpy) provide directly.
                job.get("salary_min"),
                job.get("salary_max"),
                job.get("salary_currency"),
                job.get("salary_period"),
                is_remote,
                json.dumps(job.get("raw_json")) if job.get("raw_json") is not None else None,
            )
            try:
                cur.execute(
                    """
                    INSERT INTO jobs (
                        source, source_url, title, company, location,
                        description, salary_raw, posted_date,
                        company_size_employees, company_revenue, company_stage,
                        salary_min, salary_max, salary_currency, salary_period, is_remote,
                        raw_json
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    payload,
                )
                new += 1
            except sqlite3.IntegrityError:
                # Duplicate (company, title, source_url) — refresh last_seen_at
                # and backfill any metadata that wasn't previously set.
                cur.execute(
                    """
                    UPDATE jobs
                    SET last_seen_at = CURRENT_TIMESTAMP,
                        company_size_employees = COALESCE(company_size_employees, ?),
                        company_revenue        = COALESCE(company_revenue,        ?),
                        company_stage          = COALESCE(company_stage,          ?),
                        salary_min             = COALESCE(salary_min,             ?),
                        salary_max             = COALESCE(salary_max,             ?),
                        salary_currency        = COALESCE(salary_currency,        ?),
                        salary_period          = COALESCE(salary_period,          ?),
                        is_remote              = MAX(is_remote, ?)
                    WHERE company = ? AND title = ? AND source_url = ?
                    """,
                    (
                        job.get("company_size_employees"),
                        job.get("company_revenue"),
                        job.get("company_stage"),
                        job.get("salary_min"),
                        job.get("salary_max"),
                        job.get("salary_currency"),
                        job.get("salary_period"),
                        is_remote,
                        job.get("company"),
                        job.get("title"),
                        job.get("source_url"),
                    ),
                )
    return total, new


def jobs_pending_extraction(limit: int | None = None) -> list[sqlite3.Row]:
    """Return jobs where extracted = 0."""
    sql = "SELECT * FROM jobs WHERE extracted = 0 ORDER BY id"
    if limit is not None:
        sql += f" LIMIT {int(limit)}"
    with connect() as conn:
        return conn.execute(sql).fetchall()


def update_extracted(job_id: int, fields: dict) -> None:
    """Write the LLM-extracted fields back to a job row.

    Company metadata (size/stage/revenue) is only filled if currently NULL —
    the scraper had first crack and we trust it over LLM inference.
    """
    role_cols = [
        "brief_description",
        "equity_offered",
        "bonus_text",
        "required_experience_years",
        "required_experience_text",
        "required_degrees",
        "preferred_degrees",
        "start_date",
    ]
    # Only filled if currently NULL — a scraper that provided structured salary
    # (e.g. JobSpy) or company metadata is trusted over LLM inference.
    coalesced_cols = [
        "salary_min",
        "salary_max",
        "salary_currency",
        "salary_period",
        "company_size_employees",
        "company_revenue",
        "company_stage",
    ]

    sets = [f"{c} = ?" for c in role_cols]
    sets += [f"{c} = COALESCE({c}, ?)" for c in coalesced_cols]
    sets.append("extracted = 1")

    values = [fields.get(c) for c in role_cols] + [fields.get(c) for c in coalesced_cols] + [job_id]
    with connect() as conn:
        conn.execute(f"UPDATE jobs SET {', '.join(sets)} WHERE id = ?", values)


def mark_extraction_failed(job_id: int) -> None:
    with connect() as conn:
        conn.execute("UPDATE jobs SET extracted = -1 WHERE id = ?", (job_id,))


# ---------- scrape_runs ----------


def start_run(source: str, keywords: str | None = None, locations: str | None = None) -> int:
    with connect() as conn:
        cur = conn.execute(
            "INSERT INTO scrape_runs (source, status, keywords, locations) VALUES (?, 'running', ?, ?)",
            (source, keywords, locations),
        )
        return cur.lastrowid


def finish_run(
    run_id: int,
    status: str,
    jobs_found: int = 0,
    jobs_new: int = 0,
    error: str | None = None,
) -> None:
    with connect() as conn:
        conn.execute(
            """
            UPDATE scrape_runs
            SET finished_at = CURRENT_TIMESTAMP,
                status = ?, jobs_found = ?, jobs_new = ?, error_message = ?
            WHERE id = ?
            """,
            (status, jobs_found, jobs_new, error, run_id),
        )


# ---------- companies ----------


def _name_key(name: str) -> str:
    return " ".join((name or "").lower().split())


def ensure_company(name: str) -> int:
    """Get-or-create a company row by normalized name. Returns company_id."""
    key = _name_key(name)
    with connect() as conn:
        row = conn.execute("SELECT id FROM companies WHERE name_key = ?", (key,)).fetchone()
        if row:
            return row["id"]
        cur = conn.execute(
            "INSERT INTO companies (name, name_key) VALUES (?, ?)", (name, key)
        )
        return cur.lastrowid


def link_jobs_to_companies() -> int:
    """Create a companies row for every distinct job.company and set jobs.company_id.
    Also copies the job's scraped company_stage up to the company if the company
    doesn't have one yet. Returns number of jobs linked."""
    linked = 0
    with connect() as conn:
        companies = conn.execute("SELECT DISTINCT company FROM jobs WHERE company IS NOT NULL").fetchall()
        for c in companies:
            name = c["company"]
            key = _name_key(name)
            row = conn.execute("SELECT id FROM companies WHERE name_key = ?", (key,)).fetchone()
            if row:
                cid = row["id"]
            else:
                cid = conn.execute(
                    "INSERT INTO companies (name, name_key) VALUES (?, ?)", (name, key)
                ).lastrowid
            cur = conn.execute(
                "UPDATE jobs SET company_id = ? WHERE company = ? AND (company_id IS NULL OR company_id != ?)",
                (cid, name, cid),
            )
            linked += cur.rowcount
            # Seed company stage from the best job-level stage we have.
            conn.execute(
                """
                UPDATE companies SET company_stage = COALESCE(company_stage, (
                    SELECT company_stage FROM jobs
                    WHERE company = ? AND company_stage IS NOT NULL LIMIT 1
                )),
                size_employees = COALESCE(size_employees, (
                    SELECT company_size_employees FROM jobs
                    WHERE company = ? AND company_size_employees IS NOT NULL LIMIT 1
                ))
                WHERE id = ?
                """,
                (name, name, cid),
            )
    return linked


def companies_pending_enrichment(limit: int | None = None) -> list[sqlite3.Row]:
    sql = """
        SELECT c.*, (SELECT COUNT(*) FROM jobs j WHERE j.company_id = c.id) AS open_jobs
        FROM companies c WHERE c.enriched = 0 ORDER BY open_jobs DESC, c.id
    """
    if limit is not None:
        sql += f" LIMIT {int(limit)}"
    with connect() as conn:
        return conn.execute(sql).fetchall()


COMPANY_ENRICH_COLS = [
    "website", "linkedin_url", "hq_location", "industry", "short_description",
    "ownership_type", "company_stage", "last_round", "last_round_amount",
    "last_round_date", "total_raised", "lead_investors", "pe_sponsor",
    "size_employees", "revenue", "enrichment_notes",
]


def update_company_enrichment(company_id: int, fields: dict, executives: list[dict] | None = None) -> None:
    """Write company-level enrichment and (re)insert its executives. Recomputes the
    Tuck-alum rollup on the company from the executives written."""
    sets = [f"{c} = COALESCE(?, {c})" for c in COMPANY_ENRICH_COLS]
    sets.append("enriched = 1")
    sets.append("last_enriched_at = CURRENT_TIMESTAMP")
    values = [fields.get(c) for c in COMPANY_ENRICH_COLS] + [company_id]
    with connect() as conn:
        conn.execute(f"UPDATE companies SET {', '.join(sets)} WHERE id = ?", values)
        tuck = 0
        for ex in executives or []:
            is_tuck = 1 if ex.get("is_tuck_alum") else 0
            tuck += is_tuck
            try:
                conn.execute(
                    """
                    INSERT INTO executives
                        (company_id, name, title, seniority_rank, linkedin_url,
                         linkedin_summary, education, prior_companies,
                         is_tuck_alum, tuck_detail, is_dartmouth_alum, source, confidence)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        company_id, ex.get("name"), ex.get("title"), ex.get("seniority_rank"),
                        ex.get("linkedin_url"), ex.get("linkedin_summary"),
                        json.dumps(ex.get("education")) if ex.get("education") is not None else None,
                        json.dumps(ex.get("prior_companies")) if ex.get("prior_companies") is not None else None,
                        is_tuck, ex.get("tuck_detail"),
                        1 if ex.get("is_dartmouth_alum") else 0,
                        ex.get("source"), ex.get("confidence"),
                    ),
                )
            except sqlite3.IntegrityError:
                conn.execute(
                    """
                    UPDATE executives SET
                        linkedin_url = COALESCE(?, linkedin_url),
                        linkedin_summary = COALESCE(?, linkedin_summary),
                        education = COALESCE(?, education),
                        is_tuck_alum = ?, tuck_detail = COALESCE(?, tuck_detail),
                        is_dartmouth_alum = ?
                    WHERE company_id = ? AND name = ? AND title IS ?
                    """,
                    (
                        ex.get("linkedin_url"), ex.get("linkedin_summary"),
                        json.dumps(ex.get("education")) if ex.get("education") is not None else None,
                        is_tuck, ex.get("tuck_detail"),
                        1 if ex.get("is_dartmouth_alum") else 0,
                        company_id, ex.get("name"), ex.get("title"),
                    ),
                )
        # Recompute the rollup from the authoritative executives table.
        agg = conn.execute(
            "SELECT COUNT(*) AS n, SUM(is_tuck_alum) AS t FROM executives WHERE company_id = ?",
            (company_id,),
        ).fetchone()
        tuck_count = agg["t"] or 0
        conn.execute(
            "UPDATE companies SET has_tuck_alum = ?, tuck_alum_count = ? WHERE id = ?",
            (1 if tuck_count else 0, tuck_count, company_id),
        )
        # Propagate ownership_type down to that company's jobs.
        conn.execute(
            "UPDATE jobs SET ownership_type = COALESCE(?, ownership_type) WHERE company_id = ?",
            (fields.get("ownership_type"), company_id),
        )


def mark_company_enrich_failed(company_id: int) -> None:
    with connect() as conn:
        conn.execute("UPDATE companies SET enriched = -1 WHERE id = ?", (company_id,))


# ---------- responsibilities ----------


def family_ids_by_slug() -> dict[str, int]:
    with connect() as conn:
        rows = conn.execute("SELECT id, slug FROM responsibility_families").fetchall()
    return {r["slug"]: r["id"] for r in rows}


def responsibility_families() -> list[sqlite3.Row]:
    with connect() as conn:
        return conn.execute(
            "SELECT * FROM responsibility_families ORDER BY sort_order"
        ).fetchall()


def jobs_pending_responsibilities(limit: int | None = None) -> list[sqlite3.Row]:
    sql = "SELECT * FROM jobs WHERE resp_extracted = 0 AND description IS NOT NULL ORDER BY id"
    if limit is not None:
        sql += f" LIMIT {int(limit)}"
    with connect() as conn:
        return conn.execute(sql).fetchall()


def set_job_responsibilities(job_id: int, families: list[dict], seniority: str | None = None,
                             role_family: str | None = None) -> None:
    """families: list of {slug, responsibility_text, weight}. Marks resp_extracted=1."""
    slug_to_id = family_ids_by_slug()
    with connect() as conn:
        conn.execute("DELETE FROM job_responsibilities WHERE job_id = ?", (job_id,))
        for f in families:
            fid = slug_to_id.get(f.get("slug"))
            if fid is None:
                continue
            try:
                conn.execute(
                    """INSERT INTO job_responsibilities (job_id, family_id, responsibility_text, weight)
                       VALUES (?, ?, ?, ?)""",
                    (job_id, fid, f.get("responsibility_text"), float(f.get("weight") or 1.0)),
                )
            except sqlite3.IntegrityError:
                pass
        conn.execute(
            "UPDATE jobs SET resp_extracted = 1, seniority = COALESCE(?, seniority), role_family = COALESCE(?, role_family) WHERE id = ?",
            (seniority, role_family, job_id),
        )


def mark_responsibilities_failed(job_id: int) -> None:
    with connect() as conn:
        conn.execute("UPDATE jobs SET resp_extracted = -1 WHERE id = ?", (job_id,))


# ---------- location annotation ----------


def annotate_remote() -> int:
    """Set jobs.is_remote from the location text. Returns count flagged remote."""
    from scripts.sources.base import _location_is_remote

    flagged = 0
    with connect() as conn:
        rows = conn.execute("SELECT id, location FROM jobs").fetchall()
        for r in rows:
            remote = 1 if _location_is_remote(r["location"] or "") else 0
            conn.execute("UPDATE jobs SET is_remote = ? WHERE id = ?", (remote, r["id"]))
            flagged += remote
    return flagged


def annotate_distances(center_city: str, radius_miles: float) -> int:
    """Set radius_center + distance_miles on jobs whose location maps to a known
    metro city. Best-effort; jobs we can't map keep NULL distance."""
    from scripts.lib import metro

    center = metro.resolve_center(center_city)
    if center is None:
        return 0
    updated = 0
    with connect() as conn:
        rows = conn.execute("SELECT id, location FROM jobs").fetchall()
        for r in rows:
            hit = metro.nearest_known_city(r["location"] or "")
            if not hit:
                continue
            city_name = hit[0]
            coord = metro.CITY_COORDS.get(city_name)
            if not coord:
                continue
            dist = round(metro.haversine_miles(center, coord), 1)
            conn.execute(
                "UPDATE jobs SET radius_center = ?, distance_miles = ? WHERE id = ?",
                (center_city, dist, r["id"]),
            )
            updated += 1
    return updated


# ---------- opportunity scores ----------


def upsert_opportunity_score(job_id: int, profile_key: str, scores: dict, rationale: str) -> None:
    with connect() as conn:
        conn.execute(
            """
            INSERT INTO opportunity_scores
                (job_id, profile_key, total_score, role_score, responsibility_score,
                 location_score, stage_score, network_score, rationale)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(job_id, profile_key) DO UPDATE SET
                total_score = excluded.total_score,
                role_score = excluded.role_score,
                responsibility_score = excluded.responsibility_score,
                location_score = excluded.location_score,
                stage_score = excluded.stage_score,
                network_score = excluded.network_score,
                rationale = excluded.rationale,
                scored_at = CURRENT_TIMESTAMP
            """,
            (
                job_id, profile_key, scores.get("total"), scores.get("role"),
                scores.get("responsibility"), scores.get("location"),
                scores.get("stage"), scores.get("network"), rationale,
            ),
        )


def all_jobs_for_scoring() -> list[sqlite3.Row]:
    with connect() as conn:
        return conn.execute(
            """
            SELECT j.*, c.ownership_type AS c_ownership, c.company_stage AS c_stage,
                   c.has_tuck_alum AS c_has_tuck, c.tuck_alum_count AS c_tuck_count,
                   c.pe_sponsor AS c_pe_sponsor, c.last_round AS c_last_round
            FROM jobs j LEFT JOIN companies c ON j.company_id = c.id
            """
        ).fetchall()


def job_family_slugs(job_id: int) -> list[tuple[str, float]]:
    with connect() as conn:
        rows = conn.execute(
            """
            SELECT rf.slug, jr.weight FROM job_responsibilities jr
            JOIN responsibility_families rf ON rf.id = jr.family_id
            WHERE jr.job_id = ?
            """,
            (job_id,),
        ).fetchall()
    return [(r["slug"], r["weight"]) for r in rows]
