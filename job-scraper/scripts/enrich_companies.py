#!/usr/bin/env python3
"""Enrich companies: ownership / funding stage / PE sponsor + C-suite team.

For each company with open jobs (companies.enriched = 0) this fills:
  - ownership_type (vc-backed | pe-owned | public | bootstrapped | private-other | unknown)
  - company_stage, last_round, last_round_amount, total_raised, lead_investors, pe_sponsor
  - hq_location, industry, size_employees, revenue, website, linkedin_url
  - the executive team (name, title, LinkedIn-style summary, education) with a
    per-person Tuck / Dartmouth alum flag  ->  the company gets has_tuck_alum rolled up.

Grounding: if the company has (or the model proposes) a website, we fetch the
/about and /team/leadership pages and hand that text to the model as evidence,
which sharply reduces hallucination. Where we can't ground, the model falls back
to its own knowledge and everything is tagged with a confidence level.

Anti-fabrication is enforced in the prompt: the model must NOT invent executives
or alumni claims; unknown -> empty list / null / low confidence. Treat any
low-confidence exec as a lead to verify, not a fact.

Usage:
    python scripts/enrich_companies.py                 # all pending
    python scripts/enrich_companies.py --limit 20
    python scripts/enrich_companies.py --no-web        # skip website grounding
    python scripts/enrich_companies.py --model claude-sonnet-4-5

Needs ANTHROPIC_API_KEY (Anthropic egress is allowed even in locked-down sandboxes;
website grounding needs general egress and silently degrades when blocked).
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
    "You are a company-intelligence researcher for a Strategic Finance job seeker. "
    "You return ONLY a JSON object with the exact keys requested — no prose, no markdown. "
    "Accuracy over completeness. NEVER invent people, funding rounds, or alumni facts. "
    "If you are not confident a person currently holds the role, do not list them. "
    "Use null / empty arrays / confidence:'low' rather than guessing. The user will "
    "verify low-confidence items before acting on them."
)


def build_prompt(company_name: str, grounding: str | None, sample_locations: list[str]) -> str:
    loc_hint = f"Some job postings list locations: {', '.join(sample_locations[:5])}." if sample_locations else ""
    ground_block = (
        f"\nEvidence fetched from the company's own website (use as primary truth):\n\"\"\"\n{grounding[:6000]}\n\"\"\"\n"
        if grounding else "\n(No website evidence available — rely on your own knowledge and lower the confidence accordingly.)\n"
    )
    return f"""Research the company "{company_name}". {loc_hint}
{ground_block}
Return ONLY this JSON object. Use null when unknown; do NOT guess.

{{
  "website": "<homepage URL or null>",
  "linkedin_url": "<company LinkedIn URL or null>",
  "hq_location": "<City, ST/Country or null>",
  "industry": "<short industry label or null>",
  "short_description": "<one sentence on what they do, or null>",
  "ownership_type": "<one of: vc-backed, pe-owned, public, bootstrapped, private-other, unknown>",
  "company_stage": "<one of: pre-seed, seed, series-a, series-b, series-c, series-d, series-e, series-f, growth, late-stage, public, private, acquired, or null>",
  "last_round": "<e.g. 'Series B', 'Buyout', 'IPO', or null>",
  "last_round_amount": "<e.g. '$45M' or null>",
  "last_round_date": "<YYYY-MM or YYYY or null>",
  "total_raised": "<e.g. '$120M' or null>",
  "lead_investors": <JSON array of investor / PE-sponsor names, or null>,
  "pe_sponsor": "<the private-equity owner's name if ownership_type is pe-owned, else null>",
  "size_employees": "<one of: '1-10','11-50','51-200','201-500','501-1000','1001-5000','5001-10000','10001+', or null>",
  "revenue": "<e.g. '$10M-$50M' or null>",
  "confidence": "<high | medium | low — your overall confidence in the company-level facts>",
  "executives": [
    {{
      "name": "<full name>",
      "title": "<CEO, CFO, COO, CTO, President, etc.>",
      "seniority_rank": <1 for CEO, then 2..n; integer>,
      "linkedin_url": "<their LinkedIn URL or null>",
      "linkedin_summary": "<2-4 sentence summary of their background as it would read from their LinkedIn: current role, notable prior companies, tenure. Null if you don't know their background.>",
      "education": <JSON array of {{"school": "...", "degree": "...", "year": "<or null>"}}, or null>,
      "prior_companies": <JSON array of notable prior employers, or null>,
      "is_tuck_alum": <true ONLY if they attended the Tuck School of Business at Dartmouth; else false>,
      "tuck_detail": "<e.g. 'Tuck MBA 2014' — the specific evidence; null if not a Tuck alum>",
      "is_dartmouth_alum": <true if they attended Dartmouth College in any program (incl. Tuck); else false>,
      "confidence": "<high | medium | low for THIS person specifically>"
    }}
  ],
  "notes": "<one line on provenance / what to double-check, or null>"
}}

Rules:
- ownership_type: publicly traded -> 'public'; owned by a PE firm / taken private in a buyout -> 'pe-owned' (name the firm in pe_sponsor); venture-backed startup -> 'vc-backed'; profitable/no outside capital -> 'bootstrapped'; private but ownership unclear -> 'private-other'; truly unknown -> 'unknown'.
- executives: list the C-suite / top leadership you are confident about (aim for CEO, CFO, COO, CTO/CPO, President where they exist). If you don't know the real leaders, return an empty array [] — do NOT fabricate.
- is_tuck_alum must be reserved for the Tuck School of Business at Dartmouth specifically (an MBA program). Do not confuse it with other schools.
- Return ONLY the JSON object."""


def fetch_grounding(company_name: str, website: str | None) -> str | None:
    """Best-effort fetch of the company's about/team pages for grounding. Returns
    None when there's no site or egress is blocked."""
    if not website:
        return None
    try:
        import httpx
        from bs4 import BeautifulSoup
    except Exception:
        return None

    base = website if website.startswith("http") else f"https://{website}"
    candidates = [base, base.rstrip("/") + "/about", base.rstrip("/") + "/team",
                  base.rstrip("/") + "/leadership", base.rstrip("/") + "/company"]
    chunks: list[str] = []
    headers = {"User-Agent": "Mozilla/5.0 (compatible; job-scraper/1.0)"}
    try:
        with httpx.Client(headers=headers, timeout=15, follow_redirects=True) as client:
            for url in candidates:
                try:
                    r = client.get(url)
                    if r.status_code == 200 and r.text:
                        soup = BeautifulSoup(r.text, "html.parser")
                        for tag in soup(["script", "style", "nav", "footer"]):
                            tag.decompose()
                        text = " ".join(soup.get_text(" ").split())
                        if text:
                            chunks.append(f"[{url}] {text[:2500]}")
                except Exception:
                    continue
                if sum(len(c) for c in chunks) > 6000:
                    break
    except Exception:
        return None
    return "\n\n".join(chunks) or None


def call_llm(client, model: str, company_name: str, grounding: str | None, locs: list[str]) -> dict:
    resp = client.messages.create(
        model=model,
        max_tokens=2500,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": build_prompt(company_name, grounding, locs)}],
    )
    text = "".join(b.text for b in resp.content if b.type == "text").strip()
    if text.startswith("```"):
        text = text.split("```", 2)[1]
        if text.startswith("json"):
            text = text[4:]
    return json.loads(text.strip())


def _company_fields(data: dict) -> dict:
    lead = data.get("lead_investors")
    return {
        "website": data.get("website"),
        "linkedin_url": data.get("linkedin_url"),
        "hq_location": data.get("hq_location"),
        "industry": data.get("industry"),
        "short_description": data.get("short_description"),
        "ownership_type": data.get("ownership_type"),
        "company_stage": data.get("company_stage"),
        "last_round": data.get("last_round"),
        "last_round_amount": data.get("last_round_amount"),
        "last_round_date": data.get("last_round_date"),
        "total_raised": data.get("total_raised"),
        "lead_investors": json.dumps(lead) if isinstance(lead, list) else (lead or None),
        "pe_sponsor": data.get("pe_sponsor"),
        "size_employees": data.get("size_employees"),
        "revenue": data.get("revenue"),
        "enrichment_notes": data.get("notes"),
    }


def process_one(client, model: str, row, use_web: bool, sample_locs: dict) -> tuple[int, dict | None, list | None, str | None]:
    cid = row["id"]
    name = row["name"]
    try:
        grounding = fetch_grounding(name, None) if use_web else None
        data = call_llm(client, model, name, grounding, sample_locs.get(cid, []))
        execs = data.get("executives") or []
        if not isinstance(execs, list):
            execs = []
        return cid, _company_fields(data), execs, None
    except Exception as e:
        return cid, None, None, f"{type(e).__name__}: {e}"


def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--limit", type=int, default=None)
    ap.add_argument("--batch", type=int, default=4, help="Concurrent API calls")
    ap.add_argument("--model", default=DEFAULT_MODEL)
    ap.add_argument("--no-web", action="store_true", help="Skip website grounding")
    args = ap.parse_args(argv)

    if not os.environ.get("ANTHROPIC_API_KEY"):
        print("ANTHROPIC_API_KEY is not set. Add it to .env or your environment.")
        return 2

    import anthropic
    client = anthropic.Anthropic()

    # Make sure every company referenced by a job exists and is linked.
    linked = db.link_jobs_to_companies()
    if linked:
        print(f"Linked {linked} job(s) to companies.")

    pending = db.companies_pending_enrichment(limit=args.limit)
    if not pending:
        print("No companies pending enrichment.")
        return 0

    # Gather a few sample job locations per company to help the model.
    sample_locs: dict[int, list[str]] = {}
    with db.connect() as conn:
        for row in pending:
            locs = conn.execute(
                "SELECT DISTINCT location FROM jobs WHERE company_id = ? AND location IS NOT NULL LIMIT 5",
                (row["id"],),
            ).fetchall()
            sample_locs[row["id"]] = [l["location"] for l in locs]

    print(f"Enriching {len(pending)} companies with {args.model} (web grounding: {not args.no_web})...")
    ok = fail = tuck = 0
    with ThreadPoolExecutor(max_workers=max(1, args.batch)) as pool:
        futures = [pool.submit(process_one, client, args.model, row, not args.no_web, sample_locs) for row in pending]
        for fut in as_completed(futures):
            cid, fields, execs, err = fut.result()
            if err:
                print(f"  company {cid}: FAILED {err}")
                db.mark_company_enrich_failed(cid)
                fail += 1
                continue
            db.update_company_enrichment(cid, fields, execs)
            ok += 1
            n_tuck = sum(1 for e in (execs or []) if e.get("is_tuck_alum"))
            tuck += n_tuck
            if n_tuck:
                print(f"  company {cid}: {n_tuck} Tuck alum(s) found ***")

    print(f"\nDone. Enriched: {ok}, failed: {fail}. Executives flagged as Tuck alumni: {tuck}.")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
