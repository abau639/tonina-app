# Per-source notes

When a scraper breaks, start here. Each section covers the source's quirks, the current strategy, common failure modes, and how to discover new selectors or endpoints.

## a16z, Sequoia, VMG Partners, Kleiner Perkins, First Round (public)

All five are powered by **Consider** (consider.com). Same backend, same fetch logic, lives in `scripts/sources/consider_board.py`.

**Strategy**: Playwright opens the page, intercepts every JSON response, picks ones that look like job lists, and extracts. If interception finds nothing, falls back to parsing JSON-LD `<script type="application/ld+json">` blocks from the rendered HTML.

**What gets captured directly from the source (no LLM required)**:
- title, company, location, description, source_url
- `posted_date` when present
- `company_stage` — Consider tags startups by funding stage in its structured data. Look for `stage` or `funding_stage` in the captured payload.
- `company_size_employees` — sometimes present as `headcount` or `employee_count`.

**When it breaks**:
- *No payloads captured*: Consider may have changed their API path. Open the page in Chrome with DevTools → Network → XHR/Fetch, scroll the page, look for a JSON response that contains a list of job objects. The interception logic doesn't care about the URL — only the response shape. If the response shape changed (e.g. wrapped in an extra key), update `_find_job_list` in `consider_board.py`.
- *JSON-LD fallback also empty*: the page didn't render before timeout. Increase `wait_for_timeout` or scroll more aggressively (`max_scrolls` arg).
- *Wrong company name*: the board owner ("Andreessen Horowitz") is being used instead of the portfolio company. Check that the captured payload includes a nested `company` or `organization` object — adjust `_company_info` to read it.

**Rate limits**: Consider is friendly. We don't currently throttle aggressively; if you start seeing 429s, add a sleep between board fetches.

## First Round talent network (logged in)

Module: `scripts/sources/firstround_talent.py`. Hits `https://jobs.firstround.com/talent-network/recommended` which requires login.

**Auth flow**: First Round uses magic-link email login by default. With only `FIRSTROUND_EMAIL` set, the script opens a *headed* browser on first run so the user can click the magic link in their inbox. The Playwright session is saved to `.playwright-state/firstround/state.json` and reused for future headless runs. If `FIRSTROUND_PASSWORD` is also set and First Round supports password login for that account, we use that path and stay headless.

**Session expiry**: when the saved session goes stale, the page redirects to `/login` and the script raises with a clear message. Fix: delete `.playwright-state/firstround/` and run again.

**What gets captured**: same as Consider boards (it's the same Consider backend, just behind auth).

**Common failure modes**:
- *Login timeout*: the user took longer than 5 minutes to click the magic link. Re-run.
- *Empty results despite login*: the talent-network filters may have narrowed results to zero. Check the page manually in a logged-in browser.

## LinkedIn

Module: `scripts/sources/linkedin.py`. Uses the public **guest search endpoint** at `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search` which returns HTML cards. No login.

**Strategy**: paginate the guest search with `keywords` and `location` query params, parse cards into the cartesian product of `(keyword, location, page)`. For each found job, fetch the per-posting detail fragment at `/jobs-guest/jobs/api/jobPosting/{id}` to get the full description.

**Why this works without login**: LinkedIn renders search results to anyone in basic HTML for SEO/sharing. This is the same endpoint their own jobs page calls when you scroll while signed out.

**Caps**:
- `max_pages=4` per (keyword, location) combination → 100 jobs per pair. Crank higher only if you accept more ban risk.
- 1-2 second sleep between requests (configurable via `REQUEST_SLEEP_SECONDS`).

**When it breaks**:
- *HTTP 429*: rate limited. Stop immediately (the script does), wait an hour, lower `max_pages`, raise `REQUEST_SLEEP_SECONDS` to 4–6.
- *HTTP 451 or empty body before page 1*: that User-Agent or IP is blocked. Switch networks, rotate the UA string in the module.
- *Cards parse to None*: LinkedIn changed the card markup. Inspect a fresh response with `curl` plus the real UA — selectors are in `_parse_card`. The card-list container has been `li` for a long time but inner classes change.

**ToS**: scraping LinkedIn violates their Terms of Service. We don't use a logged-in cookie here, so the user's *account* isn't directly at risk — but their *IP* can be blocked, and aggressive scraping has been the subject of legal action against scrapers in the past (hiQ Labs vs LinkedIn).

## Indeed

Module: `scripts/sources/indeed.py`. Uses Playwright (not plain HTTP) because Indeed runs Cloudflare's JS challenge on `/jobs` and bare HTTP requests get blocked.

**Strategy**: navigate `https://www.indeed.com/jobs?q={keyword}&l={location}&start={n}` in headless Chromium, wait for cards to render, extract title/company/location/snippet/salary from each.

**What gets captured**: title, company, location, `salary_raw` (snippet only — Indeed shows a salary range on the card sometimes), and a short snippet as `description`. The full description is on the detail page; we don't fetch those by default to keep request volume low (visit a real Indeed page for 100 jobs → ban). The LLM extraction step works fine on the snippet; salary parsing and required experience are usually visible there.

**When it breaks**:
- *"Verify you are human" page*: Cloudflare detected us. Script bails cleanly. Try increasing `REQUEST_SLEEP_SECONDS`, switching IPs, or running headed (set `headless=False` in the module) so the Cloudflare browser fingerprint check passes more easily.
- *0 cards parsed*: Indeed shuffled their class names. Open a real result page in Chrome and update selectors in `_parse_card`. The stable hooks are `h2 a` for title and `[data-testid='*']` attributes when they exist.

**ToS**: scraping Indeed violates their Terms of Service. The user accepted the risk. The cleaner alternative is Indeed's Publisher API (signup required, free for some uses) or a third-party aggregator.

## Glassdoor

Module: `scripts/sources/glassdoor.py`. Uses Playwright. Similar Cloudflare situation to Indeed.

**Strategy**: navigate the search URL, dismiss any "create account" modal, scroll/paginate until no new cards, parse.

**What gets captured**: title, company, location, `salary_raw`. **No description** — Glassdoor's search results don't include even a snippet; you have to click into each posting. Fetching detail pages 1-by-1 trips bot detection quickly. The LLM extraction step will be weak on Glassdoor rows because there's nothing for it to read.

If the user really wants full Glassdoor descriptions, the practical answer is a third-party API (SerpAPI Google Jobs sometimes surfaces Glassdoor postings cleanly, or Bright Data has a Glassdoor scraper that handles the legal/anti-bot side).

**When it breaks**:
- *Login wall after ~10 results*: Glassdoor pushes "sign in to see more" aggressively. The script detects this and stops. Lower expectations: maybe 10-30 results per (keyword, location).
- *0 cards*: their list selectors changed. The stable hook is `[data-test='jobListing']`; if that's gone, find the new one with DevTools.

**ToS**: scraping Glassdoor violates their Terms of Service.

---

# Discovering a new Consider/Getro API endpoint

If you find a new VC job board and want to add it:

1. Open the jobs page in Chrome.
2. DevTools → Network → XHR/Fetch.
3. Reload. Look for responses with `Content-Type: application/json` containing a list of objects with `title`, `company`, etc.
4. If it's Consider-powered (search the page HTML for `consider.com`), it'll work out-of-the-box with `consider_board.fetch_jobs("new_slug", k, l)` — just add the URL to the `BOARDS` dict.
5. If it's Getro-powered, the API pattern is `https://job-boards-api.getro.com/...`. The interception code in `consider_board.py` will catch it too as long as the response shape has a `jobs` or `results` list.
6. Different platform? Write a new module under `scripts/sources/` and adapt the parser.
