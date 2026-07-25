#!/usr/bin/env python3
"""Map each job's duties onto the fixed responsibility-family taxonomy.

This is what makes responsibilities *trackable*: instead of free-text bullet
points, every job is decomposed into a small set of canonical families
(FP&A, Forecasting & Modeling, Board Reporting, Strategic Finance, ...), each
with a phrased responsibility and a weight for how central it is to the role.
It also infers the role's seniority and primary role family.

Downstream you can then ask things like:
    SELECT rf.name, COUNT(*) FROM job_responsibilities jr
    JOIN responsibility_families rf ON rf.id = jr.family_id GROUP BY rf.name;

Processes jobs where resp_extracted = 0 and a description exists.

Usage:
    python scripts/extract_responsibilities.py
    python scripts/extract_responsibilities.py --limit 50 --batch 5
    python scripts/extract_responsibilities.py --model claude-sonnet-4-5

Needs ANTHROPIC_API_KEY.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

try:
    from dotenv import load_dotenv
    load_dotenv()
except Exception:
    pass

from scripts import db

DEFAULT_MODEL = "claude-sonnet-4-5"

SYSTEM_PROMPT = (
    "You classify job responsibilities into a fixed taxonomy. You return ONLY a JSON "
    "object with the exact keys requested — no prose, no markdown. Map only what the "
    "posting actually asks for; do not add duties that aren't in the text."
)

VALID_SENIORITY = {"ic", "manager", "director", "vp", "c-level"}


def build_prompt(job: dict, families: list) -> str:
    taxonomy = "\n".join(f"  - {f['slug']}: {f['name']} — {f['description']}" for f in families)
    desc = job.get("description") or "(no description)"
    return f"""Classify this finance job posting.

Title: {job.get('title')}
Company: {job.get('company')}
Location: {job.get('location') or '(n/a)'}

Description:
\"\"\"
{desc[:8000]}
\"\"\"

Responsibility families (map onto these slugs ONLY):
{taxonomy}

Return ONLY this JSON:

{{
  "seniority": "<one of: ic, manager, director, vp, c-level — infer from title + scope>",
  "role_family": "<the single best-fit slug from the taxonomy for the role overall>",
  "responsibilities": [
    {{
      "slug": "<a taxonomy slug this role clearly involves>",
      "responsibility_text": "<one concrete sentence describing this duty AS STATED for this role>",
      "weight": <0.0-1.0 — how central this family is to the role>
    }}
  ]
}}

Rules:
- Include a family only if the posting actually calls for it. 2-6 families is typical.
- weight ~1.0 for the core of the job, ~0.3 for a minor/occasional duty.
- Use only slugs from the list above. Return ONLY the JSON object."""


def call_llm(client, model: str, job: dict, families: list) -> dict:
    resp = client.messages.create(
        model=model,
        max_tokens=1500,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": build_prompt(job, families)}],
    )
    text = "".join(b.text for b in resp.content if b.type == "text").strip()
    if text.startswith("```"):
        text = text.split("```", 2)[1]
        if text.startswith("json"):
            text = text[4:]
    return json.loads(text.strip())


def process_one(client, model, row, families, valid_slugs) -> tuple[int, dict | None, str | None]:
    job = dict(row)
    try:
        data = call_llm(client, model, job, families)
        resp = [r for r in (data.get("responsibilities") or []) if r.get("slug") in valid_slugs]
        seniority = data.get("seniority")
        if seniority not in VALID_SENIORITY:
            seniority = None
        role_family = data.get("role_family") if data.get("role_family") in valid_slugs else None
        return job["id"], {"responsibilities": resp, "seniority": seniority, "role_family": role_family}, None
    except Exception as e:
        return job["id"], None, f"{type(e).__name__}: {e}"


def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--limit", type=int, default=None)
    ap.add_argument("--batch", type=int, default=5)
    ap.add_argument("--model", default=DEFAULT_MODEL)
    args = ap.parse_args(argv)

    if not os.environ.get("ANTHROPIC_API_KEY"):
        print("ANTHROPIC_API_KEY is not set. Add it to .env or your environment.")
        return 2

    import anthropic
    client = anthropic.Anthropic()

    families = [dict(f) for f in db.responsibility_families()]
    valid_slugs = {f["slug"] for f in families}
    if not families:
        print("No responsibility_families in the DB. Run init_db.py first.")
        return 2

    pending = db.jobs_pending_responsibilities(limit=args.limit)
    if not pending:
        print("No jobs pending responsibility extraction.")
        return 0

    print(f"Mapping responsibilities for {len(pending)} job(s) with {args.model}...")
    ok = fail = 0
    with ThreadPoolExecutor(max_workers=max(1, args.batch)) as pool:
        futures = [pool.submit(process_one, client, args.model, row, families, valid_slugs) for row in pending]
        for fut in as_completed(futures):
            job_id, result, err = fut.result()
            if err:
                print(f"  job {job_id}: FAILED {err}")
                db.mark_responsibilities_failed(job_id)
                fail += 1
                continue
            db.set_job_responsibilities(
                job_id, result["responsibilities"],
                seniority=result["seniority"], role_family=result["role_family"],
            )
            ok += 1

    print(f"\nDone. Mapped: {ok}, failed: {fail}.")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
