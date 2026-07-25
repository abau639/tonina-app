"""Glassdoor scraper.

Glassdoor is similar to Indeed in difficulty: Cloudflare, login walls that
appear after a couple of clicks, frequent layout changes. We use Playwright to
get past the JS challenge and grab whatever shows in the public-facing job
search before a login wall appears.

Set REQUEST_SLEEP_SECONDS higher (e.g. 4) if you see CAPTCHAs.

Scraping Glassdoor violates their Terms of Service. The user accepted that.
"""

from __future__ import annotations

import re
from typing import Iterable
from urllib.parse import urlencode, urljoin

from .base import matches_filters, normalize_job, sleep_a_bit


SEARCH_URL = "https://www.glassdoor.com/Job/jobs.htm"
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
                params = {"sc.keyword": kw, "locT": "C", "locName": loc}
                url = f"{SEARCH_URL}?{urlencode(params)}"
                try:
                    page.goto(url, wait_until="domcontentloaded", timeout=60_000)
                except Exception as e:
                    print(f"  Glassdoor page load failed: {e}")
                    continue

                # Try to close the "create account" modal if it appears.
                for selector in ["button[aria-label='Close']", "span.SVGInline", "[data-test='modal-close']"]:
                    try:
                        if page.locator(selector).count():
                            page.locator(selector).first.click(timeout=2000)
                            page.wait_for_timeout(500)
                    except Exception:
                        pass

                page.wait_for_timeout(1500)

                # Glassdoor uses an infinite scroll-ish list. Click "show more"
                # or scroll a few times.
                for _ in range(max_pages):
                    cards_now = page.locator("li[data-test='jobListing'], .react-job-listing").count()
                    show_more = page.locator(
                        "button[data-test='load-more'], button:has-text('Show more')"
                    ).first
                    if show_more.count():
                        try:
                            show_more.click(timeout=3000)
                            page.wait_for_timeout(1500)
                        except Exception:
                            page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
                            page.wait_for_timeout(1500)
                    else:
                        page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
                        page.wait_for_timeout(1500)
                    cards_after = page.locator("li[data-test='jobListing'], .react-job-listing").count()
                    if cards_after == cards_now:
                        break

                # Check for the login wall and bail clearly if it showed up.
                body_text = page.locator("body").inner_text()[:2000].lower()
                if "sign in" in body_text and "see more results" in body_text:
                    print("  Glassdoor is showing a login wall. Stopping this source.")
                    break

                cards = page.locator("li[data-test='jobListing'], .react-job-listing")
                count = cards.count()
                if count == 0:
                    continue

                for i in range(count):
                    card = cards.nth(i)
                    try:
                        parsed = _parse_card(card)
                    except Exception:
                        continue
                    if not parsed:
                        continue
                    key = parsed["source_url"]
                    if key in seen_keys:
                        continue
                    seen_keys.add(key)
                    out.append(normalize_job(source="glassdoor", **parsed))

                sleep_a_bit(2.0)

        context.close()
        browser.close()

    if keywords or locations:
        out = [j for j in out if matches_filters(j, keywords, locations)]
    return out


def _parse_card(card) -> dict | None:
    title_el = card.locator(
        "a[data-test='job-link'], a.jobLink, a.JobCard_jobTitle"
    ).first
    if title_el.count() == 0:
        return None
    title = title_el.inner_text().strip()
    href = title_el.get_attribute("href") or ""
    url = urljoin("https://www.glassdoor.com", href)

    company = ""
    company_el = card.locator(
        "[data-test='employer-name'], .EmployerProfile_compactEmployerName"
    ).first
    if company_el.count():
        company = company_el.inner_text().strip()

    location = ""
    loc_el = card.locator(
        "[data-test='emp-location'], .JobCard_location"
    ).first
    if loc_el.count():
        location = loc_el.inner_text().strip()

    salary_raw = None
    sal_el = card.locator(
        "[data-test='detailSalary'], .JobCard_salaryEstimate"
    ).first
    if sal_el.count():
        salary_raw = sal_el.inner_text().strip() or None

    if not title or not url:
        return None

    return {
        "source_url": url,
        "title": title,
        "company": company or "Unknown",
        "location": location or None,
        "salary_raw": salary_raw,
        "description": None,  # Search results don't include full descriptions; would need a per-job page fetch.
    }
