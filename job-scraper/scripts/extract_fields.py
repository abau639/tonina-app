#!/usr/bin/env python3
"""Run LLM extraction over jobs where `extracted = 0` and fill in structured fields.

Reads job descriptions and produces normalized values for:
  - brief_description
  - salary_min / salary_max / salary_currency / salary_period
  - required_experience_years / required_experience_text
  - required_degrees / preferred_degrees (JSON arrays)
  - start_date
  - company_size_employees / company_revenue / company_stage  (only filled if NULL)

Usage:
    python scripts/extract_fields.py                # process all pending
    python scripts/extract_fields.py --limit 50     # cap for testing
    python scripts/extract_fields.py --batch 5      # how many concurrent API calls
    python scripts/extract_fields.py --model claude-sonnet-4-5

Needs ANTHROPIC_API_KEY in env (load from .env).
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
import traceback
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

try:
    from dotenv import load_dotenv

    load_dotenv()
except Exception:
    pass

from scripts import db
from scripts.sources.base import normalize_company_size, normalize_company_stage


DEFAULT_MODEL = "claude-sonnet-4-5"


SYSTEM_PROMPT = """You extract structured data from job postings. You return ONLY a JSON object with the exact keys specified — no prose, no markdown, no commentary. Use null for any field you cannot confidently determine from the text provided. Do not guess; if it's not in the description, return null."""


def build_user_prompt(job: dict) -> str:
    title = job["title"]
    company = job["company"]
    location = job.get("location") or "(not provided)"
    salary_raw = job.get("salary_raw") or "(not provided)"
    description = job.get("description") or "(not provided)"

    return f"""Extract structured fields from this job posting.

Title: {title}
Company: {company}
Location: {location}
Salary (as posted): {salary_raw}

Description:
\"\"\"
{description}
\"\"\"

Return a JSON object with these exact keys. Use null when the information is not in the text. Do not infer or guess — return null if unsure.

{{
  "brief_description": "<1-2 sentence summary of the role, or null>",
  "salary_min":        <integer in major currency units (e.g. dollars, not cents), annualized, or null>,
  "salary_max":        <integer, annualized, or null>,
  "salary_currency":   "<3-letter code like USD, EUR, GBP, or null>",
  "salary_period":     "<one of: year, month, hour, contract, or null>",
  "equity_offered":    "<short string if equity/options/RSUs are mentioned, e.g. '0.1%-0.3%' or 'equity offered', else null>",
  "bonus_text":        "<short string if a bonus/commission/sign-on is mentioned, e.g. '15% target bonus', else null>",
  "required_experience_years": <number — minimum years required, e.g. 3 or 5.0, or null>,
  "required_experience_text":  "<the exact phrase from the description, e.g. '5+ years of ML engineering', or null>",
  "required_degrees":  <JSON array of degree names that are REQUIRED, e.g. ["Bachelor's"], or null. Use the strings: "High School", "Associate's", "Bachelor's", "Master's", "MBA", "PhD", "JD", "MD". Empty array [] if the posting explicitly says no degree required.>,
  "preferred_degrees": <JSON array of degree names that are PREFERRED or "nice to have", same format, or null>,
  "start_date":        "<ISO-8601 date YYYY-MM-DD if a specific start date is stated, or null>",
  "company_size_employees": "<one of: '1-10', '11-50', '51-200', '201-500', '501-1000', '1001-5000', '5001-10000', '10001+', or null. Only set this if the description clearly mentions an employee count.>",
  "company_revenue":  "<a short string like '$10M-$50M' or '$1B+' if the description mentions revenue or ARR, else null>",
  "company_stage":    "<one of: 'pre-seed', 'seed', 'series-a', 'series-b', 'series-c', 'series-d', 'series-e', 'series-f', 'growth', 'late-stage', 'public', 'private', 'acquired', or null. Only set if the description clearly mentions funding stage or 'publicly traded' etc.>"
}}

Important:
- Annualize salaries (e.g. $50/hour → 104000 with period='hour' AND give the min/max as annualized, or leave as-is with period='hour' if the source clearly quotes hourly)
- If salary is a single number not a range, set both min and max to that number
- required_degrees is what's mandatory; preferred_degrees is what's nice-to-have. A "Bachelor's degree required" → required:["Bachelor's"]. "Master's preferred" → preferred:["Master's"].
- Return ONLY the JSON object, no other text."""


def call_llm(client, model: str, job: dict) -> dict:
    """One API call. Returns the parsed JSON dict, or raises."""
    response = client.messages.create(
        model=model,
        max_tokens=1500,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": build_user_prompt(job)}],
    )
    text = "".join(block.text for block in response.content if block.type == "text").strip()
    # Tolerate models that wrap in ```json fences despite the instructions.
    if text.startswith("```"):
        text = text.split("```", 2)[1]
        if text.startswith("json"):
            text = text[4:]
    text = text.strip()
    return json.loads(text)


def normalize_extracted(data: dict) -> dict:
    """Clean up the LLM output before writing to the database."""
    out: dict = {}
    out["brief_description"] = _as_str(data.get("brief_description"))
    out["salary_min"] = _as_int(data.get("salary_min"))
    out["salary_max"] = _as_int(data.get("salary_max"))
    out["salary_currency"] = _as_str(data.get("salary_currency"))
    out["salary_period"] = _as_str(data.get("salary_period"))
    out["equity_offered"] = _as_str(data.get("equity_offered"))
    out["bonus_text"] = _as_str(data.get("bonus_text"))
    out["required_experience_years"] = _as_float(data.get("required_experience_years"))
    out["required_experience_text"] = _as_str(data.get("required_experience_text"))
    out["required_degrees"] = _as_json_array(data.get("required_degrees"))
    out["preferred_degrees"] = _as_json_array(data.get("preferred_degrees"))
    out["start_date"] = _as_str(data.get("start_date"))
    # Pass through company fields, but lightly normalize via base.py.
    out["company_size_employees"] = normalize_company_size(
        _as_str(data.get("company_size_employees"))
    ) or _as_str(data.get("company_size_employees"))
    out["company_revenue"] = _as_str(data.get("company_revenue"))
    out["company_stage"] = normalize_company_stage(_as_str(data.get("company_stage")))
    return out


def _as_str(v):
    if v is None:
        return None
    s = str(v).strip()
    return s if s else None


def _as_int(v):
    if v is None or v == "":
        return None
    try:
        return int(float(v))
    except (TypeError, ValueError):
        return None


def _as_float(v):
    if v is None or v == "":
        return None
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def _as_json_array(v):
    if v is None:
        return None
    if isinstance(v, list):
        return json.dumps(v)
    if isinstance(v, str):
        try:
            parsed = json.loads(v)
            if isinstance(parsed, list):
                return json.dumps(parsed)
        except Exception:
            return json.dumps([s.strip() for s in v.split(",") if s.strip()])
    return None


def process_one(client, model: str, row) -> tuple[int, dict | None, str | None]:
    job = dict(row)
    try:
        raw = call_llm(client, model, job)
        return job["id"], normalize_extracted(raw), None
    except Exception as e:
        return job["id"], None, f"{type(e).__name__}: {e}"


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--limit", type=int, default=None, help="Max number of jobs to process")
    parser.add_argument("--batch", type=int, default=5, help="Concurrent API calls (default 5)")
    parser.add_argument("--model", default=DEFAULT_MODEL, help=f"Anthropic model (default {DEFAULT_MODEL})")
    args = parser.parse_args(argv)

    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        print("ANTHROPIC_API_KEY is not set. Add it to .env or your environment.")
        return 2

    import anthropic

    client = anthropic.Anthropic(api_key=api_key)

    pending = db.jobs_pending_extraction(limit=args.limit)
    if not pending:
        print("Nothing pending — `extracted` column is already filled for all rows.")
        return 0

    print(f"Extracting fields for {len(pending)} job(s) using {args.model}...")
    succeeded = 0
    failed = 0

    with ThreadPoolExecutor(max_workers=max(1, args.batch)) as pool:
        futures = {
            pool.submit(process_one, client, args.model, row): row["id"]
            for row in pending
        }
        for fut in as_completed(futures):
            job_id, fields, err = fut.result()
            if err:
                print(f"  job {job_id}: FAILED {err}")
                db.mark_extraction_failed(job_id)
                failed += 1
            else:
                db.update_extracted(job_id, fields)
                succeeded += 1
                if succeeded % 25 == 0:
                    print(f"  ...{succeeded} extracted so far")

    print()
    print(f"Done. Succeeded: {succeeded}, failed: {failed}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
