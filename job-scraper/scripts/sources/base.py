"""Shared helpers and the Source protocol.

Every source module exports a `fetch_jobs(keywords, locations) -> list[dict]`
function. A job dict has, at minimum:

    {
        "source": "linkedin",              # short slug, matches the module name
        "source_url": "https://...",       # canonical URL of the job posting
        "title": "Senior Product Manager",
        "company": "Stripe",
        "location": "Remote — US",
        "description": "We are looking for...",
        # Optional but capture when the source provides them directly:
        "salary_raw": "$180k - $220k",
        "posted_date": "2026-05-01",
        "company_size_employees": "51-200",
        "company_revenue": "$10M-$50M",
        "company_stage": "series-b",
        "raw_json": {...},                  # whatever the source returned
    }
"""

from __future__ import annotations

import os
import re
import time
from typing import Iterable


def sleep_a_bit(default: float = 2.0) -> None:
    """Polite sleep between requests. Configurable via REQUEST_SLEEP_SECONDS."""
    seconds = float(os.environ.get("REQUEST_SLEEP_SECONDS", default))
    time.sleep(seconds)


def normalize_job(source: str, **kwargs) -> dict:
    """Construct a job dict with the source slug attached.

    None values are dropped so they don't overwrite existing data on duplicate
    upserts.
    """
    job = {"source": source}
    job.update({k: v for k, v in kwargs.items() if v is not None})
    return job


# ---------- Location matching ----------
#
# Real-world locations show up in many forms for the same place. We tokenize
# each side, expand a small set of common aliases (state names <-> abbrevs,
# metro-area subsumption, remote synonyms), and check for token-subset match.


_REMOTE_SYNONYMS = {
    "remote",
    "anywhere",
    "worldwide",
    "distributed",
    "wfh",
    "work-from-home",
    "work-from-anywhere",
    "fully-remote",
    "100-remote",
    "telecommute",
    "telework",
    "virtual",
}

# Minimal US state alias map. Add to it as needed.
_STATE_ALIASES: dict[str, set[str]] = {
    "fl": {"florida"},
    "florida": {"fl"},
    "ny": {"new", "york"},
    "ca": {"california", "calif"},
    "california": {"ca"},
    "tx": {"texas"},
    "texas": {"tx"},
    "wa": {"washington"},
    "washington": {"wa"},
    "ma": {"massachusetts", "mass"},
    "massachusetts": {"ma"},
    "il": {"illinois"},
    "illinois": {"il"},
    "co": {"colorado"},
    "colorado": {"co"},
    "ga": {"georgia"},
    "georgia": {"ga"},
    "or": {"oregon"},
    "oregon": {"or"},
    "nc": {"north", "carolina"},
    "pa": {"pennsylvania"},
    "pennsylvania": {"pa"},
    "nj": {"new", "jersey"},
    "az": {"arizona"},
    "arizona": {"az"},
    "dc": {"d.c.", "district", "columbia"},
    "uk": {"united", "kingdom", "britain"},
    "us": {"united", "states", "usa"},
}

# Metro-area subsumption: when a filter touches one of these cities, also
# consider nearby cities as matches. Only city tokens — state names are handled
# separately via _STATE_ALIASES.
_METRO_NEIGHBORS: dict[str, set[str]] = {
    "miami": {"fort", "lauderdale", "sunrise", "hialeah", "doral", "pompano"},
    "fort lauderdale": {"miami", "sunrise", "pompano", "hialeah"},
    "sunrise": {"miami", "fort", "lauderdale", "plantation"},
    "san francisco": {"oakland", "berkeley", "bay", "area", "sf"},
    "new york": {"nyc", "brooklyn", "manhattan", "queens", "bronx"},
    "los angeles": {"la", "santa", "monica", "pasadena", "hollywood"},
    "boston": {"cambridge", "somerville"},
    "seattle": {"bellevue", "redmond"},
}

# Regional aliases — match any city within the region. These are intentionally
# narrow; broad regions like "Bay Area" are already handled via the metro map.
_REGION_ALIASES: dict[str, set[str]] = {
    "south florida": {"miami", "fort", "lauderdale", "sunrise", "hialeah", "doral", "pompano"},
}


def _normalize(text: str) -> str:
    text = text.lower()
    # Treat punctuation as whitespace.
    text = re.sub(r"[,;/|()\-—–_]+", " ", text)
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def _tokenize(text: str) -> set[str]:
    if not text:
        return set()
    return {t for t in _normalize(text).split() if t}


def _is_remote_filter(filter_text: str) -> bool:
    norm = _normalize(filter_text).replace(" ", "-")
    return norm in _REMOTE_SYNONYMS or any(s in _REMOTE_SYNONYMS for s in _tokenize(filter_text))


def _location_is_remote(location: str) -> bool:
    norm = _normalize(location)
    if not norm:
        return False
    return any(syn.replace("-", " ") in norm for syn in _REMOTE_SYNONYMS) or "remote" in norm


_STATE_ABBREVS = {a for a in _STATE_ALIASES if len(a) == 2}

# All tokens that name a US state (both abbrevs and full names). These shouldn't
# count as "substantive" location tokens — "florida" matching "florida" alone
# is too weak ("miami FL" shouldn't match "Tampa FL").
_STATE_TOKENS: set[str] = set(_STATE_ABBREVS)
for k, vs in _STATE_ALIASES.items():
    if len(k) > 2:
        _STATE_TOKENS.add(k)
    for v in vs:
        if len(v) > 2:
            _STATE_TOKENS.add(v)


def _apply_state_aliases(tokens: set[str]) -> set[str]:
    out = set(tokens)
    for t in list(tokens):
        if t in _STATE_ALIASES:
            out.update(_STATE_ALIASES[t])
    return out


def _apply_metro_expansion(aliased_tokens: set[str], original_norm: str) -> set[str]:
    """Add metro-area neighbors and regional aliases."""
    out = set(aliased_tokens)
    for region, members in _REGION_ALIASES.items():
        if region in original_norm:
            out.update(members)
            out.update(region.split())
    for metro, neighbors in _METRO_NEIGHBORS.items():
        if metro in original_norm:
            out.update(neighbors)
            out.update(metro.split())
            continue
        # Also membership via neighbor tokens (e.g. "Hialeah, FL" contains
        # "hialeah" which is a neighbor of "miami").
        if aliased_tokens & neighbors:
            out.update(neighbors)
            out.update(metro.split())
    return out


def location_matches(candidate: str | None, filter_text: str) -> bool:
    """Does this job's location match a single filter string?

    Algorithm:
      1. Remote filter ("remote", "anywhere", ...) only matches remote jobs.
      2. Otherwise: tokenize both sides, expand state aliases (FL <-> florida)
         and metro neighbors (miami <-> fort lauderdale <-> sunrise <-> ...).
      3. Match if any non-state filter token (after expansion) appears in the
         candidate's expanded tokens, AND if the filter mentions a state, the
         candidate mentions the same state.
    """
    if not filter_text or not filter_text.strip():
        return True
    candidate = candidate or ""

    if _is_remote_filter(filter_text):
        return _location_is_remote(candidate)

    if not candidate.strip():
        return False

    filter_raw_norm = _normalize(filter_text)
    candidate_raw_norm = _normalize(candidate)

    filter_tokens = _tokenize(filter_text)
    candidate_tokens = _tokenize(candidate)

    filter_aliased = _apply_state_aliases(filter_tokens)
    candidate_aliased = _apply_state_aliases(candidate_tokens)

    filter_expanded = _apply_metro_expansion(filter_aliased, filter_raw_norm)
    candidate_expanded = _apply_metro_expansion(candidate_aliased, candidate_raw_norm)

    filter_states = filter_aliased & _STATE_ABBREVS
    candidate_states = candidate_aliased & _STATE_ABBREVS

    # If the filter pins a state, the candidate must reference that state too.
    if filter_states and not (filter_states & candidate_aliased):
        return False

    # Substantive tokens exclude both state abbrevs and full state names.
    filter_substantive = filter_expanded - _STATE_TOKENS
    candidate_substantive = candidate_expanded - _STATE_TOKENS

    if not filter_substantive:
        # Filter is just a state — state check above already passed.
        return bool(filter_states)

    return bool(filter_substantive & candidate_substantive)


def matches_filters(
    job: dict,
    keywords: Iterable[str] | None,
    locations: Iterable[str] | None,
) -> bool:
    """Case-insensitive substring match on title/description/company for keywords,
    fuzzy token-based match for locations. None or empty filters pass everything.

    A job passes if it matches ANY keyword AND ANY location (when those filters
    are provided).
    """
    if keywords:
        kws = [k for k in keywords if k and k.strip()]
        if kws:
            haystack = " ".join(
                str(job.get(k, "") or "")
                for k in ("title", "description", "company")
            ).lower()
            if not any(kw.lower() in haystack for kw in kws):
                return False

    if locations:
        locs = [l for l in locations if l and l.strip()]
        if locs:
            candidate = job.get("location") or ""
            if not any(location_matches(candidate, l) for l in locs):
                return False

    return True


# ---------- Company stage normalization ----------
#
# Different sources spell company stages differently. Normalize to a small,
# queryable enum.


_STAGE_PATTERNS = [
    (r"\bpre[\-\s]?seed\b", "pre-seed"),
    (r"\bseed\b", "seed"),
    (r"\bseries\s*a\b", "series-a"),
    (r"\bseries\s*b\b", "series-b"),
    (r"\bseries\s*c\b", "series-c"),
    (r"\bseries\s*d\b", "series-d"),
    (r"\bseries\s*e\b", "series-e"),
    (r"\bseries\s*f\b", "series-f"),
    (r"\bgrowth\b", "growth"),
    (r"\blate[\-\s]?stage\b", "late-stage"),
    (r"\bpublic(ly)?[\s\-]?traded\b", "public"),
    (r"\bipo\b", "public"),
    (r"\bpublic\b", "public"),
    (r"\bacquired\b", "acquired"),
    (r"\bprivate\b", "private"),
]


def normalize_company_stage(raw: str | None) -> str | None:
    """Map a free-text stage string to one of the canonical values, or None."""
    if not raw:
        return None
    text = raw.lower()
    for pat, label in _STAGE_PATTERNS:
        if re.search(pat, text):
            return label
    return None


# ---------- Company size normalization ----------
#
# Map various employee-count phrasings to canonical buckets.


def normalize_company_size(raw: str | None) -> str | None:
    """Map a free-text employee count to a canonical LinkedIn-style bucket."""
    if not raw:
        return None
    text = raw.lower().replace(",", "")
    # Look for explicit ranges first.
    m = re.search(r"(\d+)\s*[\-–to]+\s*(\d+)\s*employees?", text)
    if not m:
        m = re.search(r"(\d+)\s*[\-–to]+\s*(\d+)", text) if "employee" in text else None
    if m:
        lo, hi = int(m.group(1)), int(m.group(2))
        return _bucket(lo, hi)
    m = re.search(r"(\d+)\s*\+\s*employees?", text)
    if m:
        n = int(m.group(1))
        return _bucket(n, None)
    m = re.search(r"(\d+)\s*employees?", text)
    if m:
        n = int(m.group(1))
        return _bucket(n, n)
    return None


_BUCKETS = [
    (1, 10, "1-10"),
    (11, 50, "11-50"),
    (51, 200, "51-200"),
    (201, 500, "201-500"),
    (501, 1000, "501-1000"),
    (1001, 5000, "1001-5000"),
    (5001, 10000, "5001-10000"),
    (10001, None, "10001+"),
]


def _bucket(lo: int, hi: int | None) -> str:
    target = lo if hi is None else (lo + hi) // 2
    for b_lo, b_hi, label in _BUCKETS:
        if b_hi is None and target >= b_lo:
            return label
        if b_hi is not None and b_lo <= target <= b_hi:
            return label
    return _BUCKETS[-1][2]
