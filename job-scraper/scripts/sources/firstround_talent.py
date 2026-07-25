"""First Round talent network scraper (requires login).

The public First Round jobs board at https://jobs.firstround.com/jobs is handled
by consider_board.py; this module handles the personalized recommendations at
https://jobs.firstround.com/talent-network/recommended which require a logged-in
session.

Credentials come from FIRSTROUND_EMAIL and FIRSTROUND_PASSWORD in .env. The
Playwright session is persisted in .playwright-state/firstround/ so MFA or
email-link confirmation only needs to happen once. If the session expires, the
script raises a clear error and the user can re-run it with headed=True to log
in again interactively.

First Round's auth flow uses email magic-links rather than a password in many
cases. If FIRSTROUND_PASSWORD is empty, we open a headed browser so the user can
solve the magic-link step manually; the session is then persisted for future
headless runs.
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Iterable

from .base import matches_filters, normalize_job, sleep_a_bit
from .consider_board import (
    _jobs_from_payload,
    _jobs_from_html,
    _looks_like_jobs_payload,
    _scroll_to_bottom,
)


REPO_ROOT = Path(__file__).resolve().parent.parent.parent
STATE_DIR = REPO_ROOT / ".playwright-state" / "firstround"
RECOMMENDED_URL = "https://jobs.firstround.com/talent-network/recommended"
LOGIN_URL = "https://jobs.firstround.com/login"


def fetch_jobs(
    keywords: Iterable[str] | None = None,
    locations: Iterable[str] | None = None,
) -> list[dict]:
    from playwright.sync_api import sync_playwright

    email = os.environ.get("FIRSTROUND_EMAIL", "").strip()
    password = os.environ.get("FIRSTROUND_PASSWORD", "").strip()
    if not email:
        raise RuntimeError(
            "FIRSTROUND_EMAIL is not set. Add it to .env or skip this source."
        )

    STATE_DIR.mkdir(parents=True, exist_ok=True)
    state_file = STATE_DIR / "state.json"

    captured: list[dict] = []

    with sync_playwright() as p:
        # If we don't have saved auth yet AND no password is configured, run
        # headed so the user can complete the magic-link flow once.
        first_time = not state_file.exists()
        headless = not (first_time and not password)

        browser = p.chromium.launch(headless=headless)
        context_kwargs = {
            "user_agent": (
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/123.0.0.0 Safari/537.36"
            )
        }
        if state_file.exists():
            context_kwargs["storage_state"] = str(state_file)

        context = browser.new_context(**context_kwargs)
        page = context.new_page()

        page.on(
            "response",
            lambda r: _maybe_capture(r, captured),
        )

        # Try to land on the recommended page. If we get redirected to login,
        # do the auth dance.
        page.goto(RECOMMENDED_URL, wait_until="domcontentloaded", timeout=60_000)
        sleep_a_bit(1.0)

        if "login" in page.url or page.locator("input[type='email']").count() > 0:
            _log_in(page, email, password)
            page.goto(RECOMMENDED_URL, wait_until="domcontentloaded", timeout=60_000)
            sleep_a_bit(1.0)

        # Bail out clearly if we still aren't where we expect to be.
        if "talent-network" not in page.url and "recommended" not in page.url:
            context.close()
            browser.close()
            raise RuntimeError(
                f"After login, expected to be on the talent network but ended up at {page.url}. "
                "Re-run with FIRSTROUND_PASSWORD set, or delete .playwright-state/firstround/ "
                "and try again to re-auth."
            )

        _scroll_to_bottom(page, max_scrolls=60)
        html = page.content()

        # Save state for next time.
        context.storage_state(path=str(state_file))

        context.close()
        browser.close()

    jobs: list[dict] = []
    for payload in captured:
        jobs.extend(_jobs_from_payload(payload, "firstround", "First Round"))
    if not jobs:
        jobs = _jobs_from_html(html, "firstround", "First Round")

    # Dedupe
    seen = set()
    out = []
    for j in jobs:
        u = j.get("source_url")
        if u and u not in seen:
            seen.add(u)
            out.append(j)

    if keywords or locations:
        out = [j for j in out if matches_filters(j, keywords, locations)]

    return out


def _maybe_capture(response, captured: list[dict]) -> None:
    ct = response.headers.get("content-type", "")
    if "application/json" not in ct:
        return
    try:
        data = response.json()
    except Exception:
        return
    if _looks_like_jobs_payload(data):
        captured.append(data)


def _log_in(page, email: str, password: str) -> None:
    """Best-effort login. If there's no password, we expect the user to do the
    magic-link step in the headed browser; we just wait for the page to navigate
    away from /login."""
    # Try to fill the email field if present.
    email_inputs = page.locator("input[type='email'], input[name='email']")
    if email_inputs.count():
        email_inputs.first.fill(email)

    if password:
        pw_inputs = page.locator("input[type='password']")
        if pw_inputs.count():
            pw_inputs.first.fill(password)
            # Submit
            page.keyboard.press("Enter")
            page.wait_for_load_state("domcontentloaded", timeout=30_000)
            return

    # No password — submit email and wait for the user to click the magic link.
    submit = page.locator("button[type='submit']")
    if submit.count():
        submit.first.click()

    # Wait up to 5 minutes for the user to complete the magic-link flow.
    try:
        page.wait_for_url(lambda url: "login" not in url, timeout=300_000)
    except Exception as e:
        raise RuntimeError(
            "Timed out waiting for magic-link login. Re-run with FIRSTROUND_PASSWORD set, "
            "or complete the email confirmation step faster."
        ) from e
