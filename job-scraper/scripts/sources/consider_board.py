"""Scraper for VC job boards powered by Consider (consider.com).

This covers the public boards for a16z, Sequoia Capital, VMG Partners, Kleiner
Perkins, and the public First Round jobs page. All of them are JavaScript-rendered
single-page apps with infinite scroll, so we use Playwright.

Two strategies, applied in order:

  1. Network interception. As the page loads, Consider's frontend fetches JSON
     from an internal API. We hook into the response stream and capture anything
     that looks like a jobs payload. This is fast and resilient to UI changes.

  2. DOM scraping fallback. If interception turns up nothing usable, scroll the
     page to load all jobs and parse the rendered cards. Less robust to UI
     changes but works without knowing the API path.

When the API path changes (which it occasionally does), the network interception
will still find it as long as the response is JSON with a list of jobs-shaped
objects. If that breaks too, see `references/sources.md` for how to discover the
new endpoint with Chrome DevTools.
"""

from __future__ import annotations

import json
import re
from typing import Iterable

from .base import matches_filters, normalize_job, sleep_a_bit


BOARDS = {
    "a16z": ("Andreessen Horowitz", "https://jobs.a16z.com/jobs"),
    "sequoia": ("Sequoia Capital", "https://jobs.sequoiacap.com/jobs"),
    "vmg": ("VMG Partners", "https://jobs.vmgpartners.com/jobs"),
    "kleiner_perkins": ("Kleiner Perkins", "https://jobs.kleinerperkins.com/jobs"),
    "firstround_public": ("First Round", "https://jobs.firstround.com/jobs"),
}


def fetch_jobs(
    board_slug: str,
    keywords: Iterable[str] | None = None,
    locations: Iterable[str] | None = None,
    max_scrolls: int = 40,
) -> list[dict]:
    """Fetch jobs from one Consider-powered board.

    `board_slug` must be one of the keys in `BOARDS`. The slug becomes the
    `source` field in the database so each board is distinguishable.
    """
    if board_slug not in BOARDS:
        raise ValueError(
            f"Unknown board {board_slug!r}. Known: {sorted(BOARDS)}"
        )

    board_company, url = BOARDS[board_slug]

    # Import inside the function so this module is importable without playwright
    # (e.g. for `--dry-run` or in environments where the browser isn't installed
    # yet).
    from playwright.sync_api import sync_playwright

    captured_payloads: list[dict] = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            user_agent=(
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/123.0.0.0 Safari/537.36"
            )
        )
        page = context.new_page()

        def on_response(response):
            ct = response.headers.get("content-type", "")
            if "application/json" not in ct:
                return
            try:
                data = response.json()
            except Exception:
                return
            # Anything that looks job-shaped gets captured for later parsing.
            if _looks_like_jobs_payload(data):
                captured_payloads.append(data)

        page.on("response", on_response)

        page.goto(url, wait_until="networkidle", timeout=60_000)
        sleep_a_bit(1.0)

        # Infinite-scroll until no more new content appears.
        _scroll_to_bottom(page, max_scrolls=max_scrolls)

        # Pull the rendered HTML in case we need to fall back.
        html = page.content()

        context.close()
        browser.close()

    # First strategy: parse what we intercepted.
    jobs: list[dict] = []
    for payload in captured_payloads:
        jobs.extend(_jobs_from_payload(payload, board_slug, board_company))

    # Fallback: scrape DOM if intercept came up empty.
    if not jobs:
        jobs = _jobs_from_html(html, board_slug, board_company)

    # Dedupe within this run by source_url.
    seen = set()
    unique = []
    for j in jobs:
        u = j.get("source_url")
        if u and u not in seen:
            seen.add(u)
            unique.append(j)

    if keywords or locations:
        unique = [j for j in unique if matches_filters(j, keywords, locations)]

    return unique


# ---------- network interception parsing ----------


def _looks_like_jobs_payload(data) -> bool:
    """Heuristic: is this JSON blob plausibly a list of job postings?"""
    if isinstance(data, dict):
        for key in ("jobs", "results", "items", "data", "hits"):
            if isinstance(data.get(key), list) and data[key]:
                return _looks_like_job(data[key][0])
        # Some APIs return the list at the top level under a different name.
        for v in data.values():
            if isinstance(v, list) and v and _looks_like_job(v[0]):
                return True
        return False
    if isinstance(data, list) and data:
        return _looks_like_job(data[0])
    return False


def _looks_like_job(obj) -> bool:
    if not isinstance(obj, dict):
        return False
    keys = {k.lower() for k in obj.keys()}
    # Need a title-ish and a company-ish field, or a clear job-posting shape.
    title_keys = {"title", "job_title", "name", "position"}
    company_keys = {"company", "company_name", "organization", "employer"}
    return bool(keys & title_keys) and (
        bool(keys & company_keys) or "description" in keys or "url" in keys
    )


def _jobs_from_payload(payload, board_slug: str, board_company: str) -> list[dict]:
    """Extract jobs from any payload that passed the heuristic check."""
    from .base import normalize_company_size, normalize_company_stage

    rows = _find_job_list(payload)
    out: list[dict] = []
    for row in rows:
        if not isinstance(row, dict):
            continue

        # Consider often nests company info under "organization" or "company".
        org = _company_info(row)

        out.append(
            normalize_job(
                source=board_slug,
                source_url=_first(row, ["url", "absolute_url", "apply_url", "link"]),
                title=_first(row, ["title", "job_title", "name", "position"]),
                company=_first(row, ["company", "company_name", "organization", "employer"])
                or (org.get("name") if org else None)
                or board_company,
                location=_extract_location(row),
                description=_first(row, ["description", "summary", "body"]),
                salary_raw=_first(row, ["salary", "compensation", "salary_range"]),
                posted_date=_first(row, ["posted_at", "created_at", "published_at", "date"]),
                company_size_employees=normalize_company_size(
                    _first(row, ["company_size", "size", "headcount", "employee_count", "num_employees"])
                    or (_first(org, ["size", "headcount", "employees", "company_size"]) if org else None)
                ),
                company_stage=normalize_company_stage(
                    _first(row, ["company_stage", "stage", "funding_stage"])
                    or (_first(org, ["stage", "funding_stage", "company_stage"]) if org else None)
                ),
                company_revenue=_first(row, ["revenue", "annual_revenue"])
                or (_first(org, ["revenue"]) if org else None),
                raw_json=row,
            )
        )
    # Drop ones missing title or url — they're not really jobs.
    return [j for j in out if j.get("title") and j.get("source_url")]


def _company_info(row: dict) -> dict | None:
    """Pull the nested company/organization object if present."""
    for key in ("organization", "company", "company_data", "employer"):
        v = row.get(key)
        if isinstance(v, dict):
            return v
    return None


def _find_job_list(payload):
    """Walk the payload looking for the first list of job-shaped dicts."""
    if isinstance(payload, list):
        return payload
    if isinstance(payload, dict):
        for key in ("jobs", "results", "items", "data", "hits"):
            v = payload.get(key)
            if isinstance(v, list) and v and isinstance(v[0], dict):
                return v
        for v in payload.values():
            if isinstance(v, list) and v and _looks_like_job(v[0]):
                return v
            if isinstance(v, dict):
                inner = _find_job_list(v)
                if inner:
                    return inner
    return []


def _first(obj, keys: list[str]):
    if not isinstance(obj, dict):
        return None
    for k in keys:
        if k in obj and obj[k]:
            return obj[k]
    # Try case-insensitive
    lower = {k.lower(): k for k in obj.keys()}
    for k in keys:
        if k.lower() in lower:
            v = obj[lower[k.lower()]]
            if v:
                return v
    return None


def _extract_location(row: dict) -> str | None:
    """Locations come in many shapes across Consider's APIs."""
    loc = _first(row, ["location", "locations", "location_name", "city"])
    if loc is None:
        return None
    if isinstance(loc, str):
        return loc
    if isinstance(loc, dict):
        # Common shapes: {"name": "NYC"}, {"city": "...", "country": "..."}
        return loc.get("name") or ", ".join(
            v for v in (loc.get("city"), loc.get("region"), loc.get("country")) if v
        )
    if isinstance(loc, list):
        parts = []
        for item in loc:
            if isinstance(item, str):
                parts.append(item)
            elif isinstance(item, dict):
                parts.append(item.get("name") or item.get("city") or "")
        return ", ".join(p for p in parts if p) or None
    return str(loc)


# ---------- HTML fallback ----------


def _scroll_to_bottom(page, max_scrolls: int = 40) -> None:
    """Scroll down until the page height stops growing or we hit max_scrolls."""
    last_height = 0
    for _ in range(max_scrolls):
        height = page.evaluate("() => document.body.scrollHeight")
        if height == last_height:
            break
        page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
        page.wait_for_timeout(800)
        last_height = height


def _jobs_from_html(html: str, board_slug: str, board_company: str) -> list[dict]:
    """Last-ditch fallback: look for JSON-LD JobPosting structured data, then
    fall back to BeautifulSoup heuristics. JSON-LD is included by Consider for
    SEO and is the most reliable HTML extraction path."""
    from bs4 import BeautifulSoup

    soup = BeautifulSoup(html, "html.parser")
    out: list[dict] = []

    # JSON-LD JobPosting blocks
    for script in soup.find_all("script", type="application/ld+json"):
        try:
            data = json.loads(script.string or "")
        except Exception:
            continue
        for posting in _iter_jobpostings(data):
            out.append(
                normalize_job(
                    source=board_slug,
                    source_url=posting.get("url") or posting.get("@id"),
                    title=posting.get("title"),
                    company=_hiring_org_name(posting) or board_company,
                    location=_jobposting_location(posting),
                    description=_clean_html(posting.get("description")),
                    salary_raw=_jobposting_salary(posting),
                    posted_date=posting.get("datePosted"),
                    raw_json=posting,
                )
            )

    return [j for j in out if j.get("title") and j.get("source_url")]


def _iter_jobpostings(data):
    """Yield every JobPosting object in a JSON-LD blob (may be nested in @graph)."""
    if isinstance(data, list):
        for item in data:
            yield from _iter_jobpostings(item)
    elif isinstance(data, dict):
        t = data.get("@type")
        if t == "JobPosting" or (isinstance(t, list) and "JobPosting" in t):
            yield data
        if "@graph" in data:
            yield from _iter_jobpostings(data["@graph"])


def _hiring_org_name(posting: dict) -> str | None:
    org = posting.get("hiringOrganization")
    if isinstance(org, dict):
        return org.get("name")
    if isinstance(org, str):
        return org
    return None


def _jobposting_location(posting: dict) -> str | None:
    loc = posting.get("jobLocation")
    parts: list[str] = []
    if isinstance(loc, list):
        items = loc
    elif isinstance(loc, dict):
        items = [loc]
    else:
        items = []
    for item in items:
        addr = item.get("address") if isinstance(item, dict) else None
        if isinstance(addr, dict):
            chunk = ", ".join(
                v
                for v in (
                    addr.get("addressLocality"),
                    addr.get("addressRegion"),
                    addr.get("addressCountry"),
                )
                if v
            )
            if chunk:
                parts.append(chunk)
    if posting.get("jobLocationType") == "TELECOMMUTE":
        parts.append("Remote")
    return " | ".join(parts) if parts else None


def _jobposting_salary(posting: dict) -> str | None:
    sal = posting.get("baseSalary")
    if not isinstance(sal, dict):
        return None
    value = sal.get("value")
    if isinstance(value, dict):
        lo = value.get("minValue")
        hi = value.get("maxValue")
        currency = sal.get("currency") or value.get("currency") or ""
        unit = value.get("unitText") or ""
        if lo or hi:
            return f"{currency} {lo or ''}-{hi or ''} {unit}".strip()
    return None


def _clean_html(html: str | None) -> str | None:
    if not html:
        return None
    # Cheap tag strip; we keep the full text for the LLM extraction step.
    text = re.sub(r"<[^>]+>", " ", html)
    text = re.sub(r"\s+", " ", text).strip()
    return text or None
