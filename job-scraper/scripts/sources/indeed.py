"""Indeed scraper.

Indeed is the hardest of the public sources. They use Cloudflare and rotate
their HTML class names frequently. We use Playwright (not a plain HTTP client)
so JavaScript runs and the Cloudflare JS challenge passes. Even then this
scraper is fragile and is the most likely thing in the skill to break first.

If it's broken: open https://www.indeed.com/jobs?q=... in Chrome with DevTools,
inspect the job cards in the rendered DOM, and update the selectors below. The
shape of the data (title/company/location/url/description) doesn't change — only
the class names do.

Scraping Indeed violates their Terms of Service. The user accepted that.
"""

from __future__ import annotations

import re
from typing import Iterable
from urllib.parse import urlencode, urljoin

from .base import matches_filters, normalize_job, sleep_a_bit


SEARCH_URL = "https://www.indeed.com/jobs"
USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/123.0.0.0 Safari/537.36"
)


def fetch_jobs(
    keywords: Iterable[str] | None = None,
    locations: Iterable[str] | None = None,
    max_pages: int = 3,
) -> list[dict]:
    from playwright.sync_api import sync_playwright

    keyword_list = list(keywords) if keywords else [""]
    location_list = list(locations) if locations else [""]

    out: list[dict] = []
    seen_keys: set[str] = set()

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(user_agent=USER_AGENT)
        page = context.new_page()

        for kw in keyword_list:
            for loc in location_list:
                for page_idx in range(max_pages):
                    params = {"q": kw, "l": loc, "start": page_idx * 10}
                    url = f"{SEARCH_URL}?{urlencode(params)}"
                    try:
                        page.goto(url, wait_until="domcontentloaded", timeout=60_000)
                    except Exception as e:
                        print(f"  Indeed page load failed: {e}")
                        break

                    # If Cloudflare or "are you a robot" is showing, bail clearly.
                    body_text = page.locator("body").inner_text()[:2000].lower()
                    if (
                        "verify you are human" in body_text
                        or "additional verification required" in body_text
                    ):
                        print("  Indeed is showing a bot check. Stopping this source.")
                        context.close()
                        browser.close()
                        return out

                    page.wait_for_timeout(1500)

                    cards = page.locator(
                        "div.job_seen_beacon, div.cardOutline, a.tapItem"
                    )
                    count = cards.count()
                    if count == 0:
                        break

                    page_new = 0
                    for i in range(count):
                        card = cards.nth(i)
                        try:
                            parsed = _parse_card(card, page)
                        except Exception:
                            continue
                        if not parsed:
                            continue
                        key = parsed["source_url"]
                        if key in seen_keys:
                            continue
                        seen_keys.add(key)
                        out.append(normalize_job(source="indeed", **parsed))
                        page_new += 1

                    if page_new == 0:
                        break
                    sleep_a_bit(2.0)

        context.close()
        browser.close()

    if keywords or locations:
        out = [j for j in out if matches_filters(j, keywords, locations)]
    return out


def _parse_card(card, page) -> dict | None:
    """Extract fields from one Indeed result card.

    Indeed's class names shift frequently. The strategy here is to look at the
    rendered text and use stable role-y selectors (h2 a, span[data-testid]) and
    fall back to text content where needed.
    """
    title_el = card.locator("h2 a, a.jcs-JobTitle, h2.jobTitle a").first
    if title_el.count() == 0:
        return None
    title = title_el.inner_text().strip()
    href = title_el.get_attribute("href") or ""
    url = urljoin("https://www.indeed.com", href)

    company = ""
    company_el = card.locator(
        "[data-testid='company-name'], span.companyName, .companyName"
    ).first
    if company_el.count():
        company = company_el.inner_text().strip()

    location = ""
    location_el = card.locator(
        "[data-testid='text-location'], div.companyLocation, .companyLocation"
    ).first
    if location_el.count():
        location = location_el.inner_text().strip()

    salary_raw = None
    salary_el = card.locator(
        "[data-testid='attribute_snippet_testid'], div.salary-snippet, .salary-snippet-container"
    ).first
    if salary_el.count():
        salary_raw = salary_el.inner_text().strip() or None

    snippet = ""
    snippet_el = card.locator("[data-testid='jobsnippet_footer'], div.job-snippet").first
    if snippet_el.count():
        snippet = snippet_el.inner_text().strip()

    if not title or not url:
        return None

    return {
        "source_url": url,
        "title": title,
        "company": company or "Unknown",
        "location": location or None,
        "salary_raw": salary_raw,
        "description": snippet or None,  # Indeed search only gives a snippet
    }
