"""LinkedIn jobs scraper.

LinkedIn exposes a guest endpoint that returns rendered HTML cards for jobs
without requiring a logged-in user. We hit that endpoint, parse the cards, then
fetch each job's detail page for the full description.

Endpoint:
    https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search
        ?keywords=...&location=...&start=0

This is what LinkedIn's own jobs page calls when you scroll. It's not a
documented API, it's against LinkedIn's Terms of Service to scrape, and they
have rate limits and IP-based blocks. The user explicitly accepted that risk
when building this skill.

Practical defenses:
- We sleep between requests (configurable via REQUEST_SLEEP_SECONDS).
- We use a realistic User-Agent.
- We default to a low page count; the user can crank `--max-pages` higher if
  they want more, accepting more block risk.
- We do NOT use a logged-in session here — the user's account shouldn't be at
  risk from this script. The IP can still get rate-limited.
"""

from __future__ import annotations

import re
from typing import Iterable
from urllib.parse import urlencode

from .base import matches_filters, normalize_job, sleep_a_bit


GUEST_SEARCH = "https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search"
JOB_DETAIL = "https://www.linkedin.com/jobs-guest/jobs/api/jobPosting"
USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/123.0.0.0 Safari/537.36"
)


def fetch_jobs(
    keywords: Iterable[str] | None = None,
    locations: Iterable[str] | None = None,
    max_pages: int = 4,
    fetch_descriptions: bool = True,
) -> list[dict]:
    import httpx
    from bs4 import BeautifulSoup

    # LinkedIn's search expects a single keyword string and a single location.
    # We iterate the cartesian product so a user can pass multiple of each.
    keyword_list = list(keywords) if keywords else [""]
    location_list = list(locations) if locations else [""]

    headers = {"User-Agent": USER_AGENT, "Accept-Language": "en-US,en;q=0.9"}
    out: list[dict] = []
    seen_ids: set[str] = set()

    with httpx.Client(headers=headers, timeout=30, follow_redirects=True) as client:
        for kw in keyword_list:
            for loc in location_list:
                for page_idx in range(max_pages):
                    params = {
                        "keywords": kw,
                        "location": loc,
                        "start": page_idx * 25,
                    }
                    url = f"{GUEST_SEARCH}?{urlencode(params)}"
                    try:
                        resp = client.get(url)
                    except httpx.HTTPError as e:
                        print(f"  LinkedIn search request failed: {e}")
                        break
                    if resp.status_code == 429:
                        print(
                            "  LinkedIn returned 429 (rate limited). Stopping this source."
                        )
                        return out
                    if resp.status_code != 200 or not resp.text.strip():
                        # 200 with empty body means no more pages.
                        break

                    soup = BeautifulSoup(resp.text, "html.parser")
                    cards = soup.select("li") or soup.select("div.base-card")
                    if not cards:
                        break

                    new_on_page = 0
                    for card in cards:
                        parsed = _parse_card(card)
                        if not parsed:
                            continue
                        if parsed["job_id"] in seen_ids:
                            continue
                        seen_ids.add(parsed["job_id"])

                        if fetch_descriptions:
                            try:
                                parsed["description"] = _fetch_description(
                                    client, parsed["job_id"]
                                )
                                sleep_a_bit(1.0)
                            except Exception as e:
                                print(
                                    f"  Couldn't fetch description for {parsed['job_id']}: {e}"
                                )

                        out.append(
                            normalize_job(
                                source="linkedin",
                                source_url=parsed["url"],
                                title=parsed["title"],
                                company=parsed["company"],
                                location=parsed["location"],
                                description=parsed.get("description"),
                                posted_date=parsed.get("posted_date"),
                                raw_json=parsed,
                            )
                        )
                        new_on_page += 1

                    if new_on_page == 0:
                        break
                    sleep_a_bit(2.0)

    if keywords or locations:
        out = [j for j in out if matches_filters(j, keywords, locations)]
    return out


def _parse_card(card) -> dict | None:
    """Extract title/company/location/url/job_id from a LinkedIn job card."""
    link = card.select_one("a.base-card__full-link, a.base-card__title-link, a[href*='/jobs/view/']")
    title_el = card.select_one(".base-search-card__title, h3")
    company_el = card.select_one(".base-search-card__subtitle, h4")
    location_el = card.select_one(".job-search-card__location")
    posted_el = card.select_one("time")

    if not link or not title_el:
        return None

    href = link.get("href") or ""
    m = re.search(r"/jobs/view/(\d+)", href)
    if not m:
        # Sometimes the id is in data-entity-urn
        urn = card.get("data-entity-urn") or ""
        m2 = re.search(r"jobPosting:(\d+)", urn)
        if not m2:
            return None
        job_id = m2.group(1)
    else:
        job_id = m.group(1)

    return {
        "job_id": job_id,
        "url": f"https://www.linkedin.com/jobs/view/{job_id}/",
        "title": title_el.get_text(strip=True),
        "company": company_el.get_text(strip=True) if company_el else "",
        "location": location_el.get_text(strip=True) if location_el else "",
        "posted_date": (posted_el.get("datetime") if posted_el else None),
    }


def _fetch_description(client, job_id: str) -> str | None:
    """Pull the full description from the guest job detail endpoint."""
    from bs4 import BeautifulSoup

    resp = client.get(f"{JOB_DETAIL}/{job_id}")
    if resp.status_code != 200 or not resp.text.strip():
        return None
    soup = BeautifulSoup(resp.text, "html.parser")
    desc_el = soup.select_one(".description__text, .show-more-less-html__markup")
    if not desc_el:
        return None
    text = re.sub(r"\s+", " ", desc_el.get_text(" ", strip=True))
    return text.strip() or None
