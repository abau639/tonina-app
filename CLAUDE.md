# Tonina.me — Project Context

## What this is
Alfredo's personal portfolio + interactive finance tool. Every feature maps to a specific JD requirement at target companies (Uber, Reddit, Notion, Databricks). The site proves Strategic Finance × engineering depth to hiring managers.

## Tech stack
- **Framework**: Next.js 14 App Router, bootstrapped via T3 Stack
- **Language**: Strict TypeScript
- **Styling**: Tailwind CSS
- **Design system** (Theme A, "Navy bands"): navy (`bg-navy`, #0f1b2d) nav and hero bands, alternating white and `bg-mist` sections, `text-ink` body text, **pink-600 only for actions and small labels**. Headings use Sora (`font-display`, applied to h1-h3 globally); body uses Source Sans 3. Text wordmark "Tonina." replaces the whale emoji.
- **Charts**: Chart.js + react-chartjs-2
- **Analytics**: PostHog — custom `PostHogPageView` listener in `src/app/providers.tsx` (SPA soft-route fix)
- **Hosting**: Vercel — `git push origin main` auto-deploys, no manual step
- **DB**: Prisma + PostgreSQL (optional locally, not required for most features)

## Local dev
```bash
npm install
npm run dev          # → localhost:3000
```
Requires `.env` with `NEXTAUTH_URL=http://localhost:3000` and `NEXTAUTH_SECRET=anything`.

## Route map
| Route | Feature | JD target |
|---|---|---|
| `/` | Homepage | General |
| `/wealth` | Plan Your Path hub (nav label "Plan Your Path"; avoid "advice"/"advisor" wording in UI) | General |
| `/wealth/planner` | Scenario Planner (30-yr net worth model) | Notion / Databricks |
| `/wealth/archetype` | Wealth archetype tool | General |
| `/money` | How Money Works hub: concept library, each concept opens with a real-life question | General |
| `/money/lottery` | Lesson 1, time value of money: lottery cash now vs. 30 payments (no taxes on purpose; lesson 2 covers taxes) | General |
| `/about` | Alfredo's story (numbered path) | General |
| `/concept-explorer` | Case Studies industry library; case list lives in `concept-explorer/cases.ts` (nav label "Case Studies") | General |
| `/concept-explorer/cac` | Channel-level CAC CFO case study | General |
| `/concept-explorer/doordash` | GAAP vs FCF scrollytelling | Reddit |
| `/concept-explorer/snapchat` | Project Family Center sim | Uber |
| `/concept-explorer/saas` | SaaS metrics dictionary | Notion |
| `/concept-explorer/weather` | True Sensation weather (Phase 1: mock, Phase 2: Open-Meteo API). Not linked from the hub or sitemap. | General / DAU |
| `/blog` | Blog | General |
| `/terms`, `/privacy`, `/refunds` | Legal pages | General |

Retired routes (`/lab/*`, `/journey`, `/sandbox/*`, `/concept-explorer/airbnb`, `/blog/why-i-built-this` → `/about`) redirect via `next.config.js`.

## Writing
All user-facing copy (lessons, posts, emails, case studies) follows `VOICE.md`.

## Shared layout & SEO
- The primary call to action is the email signup (`EmailSignup` component → `/api/subscribe`). It posts to the Kit form in `src/lib/newsletter.ts` (form number only, no keys or Vercel settings needed). Env vars can switch it to beehiiv or the Kit API.
- Every page uses `SiteNav` and `SiteFooter` from `src/app/_components/`. Don't inline a nav or footer.
- Page titles use the root template `%s | Tonina.me`. Client pages get their metadata from a sibling `layout.tsx`.
- When adding a route, add it to `src/app/sitemap.ts`.
- Legal wording (footer disclaimer, session consent, affiliate disclosure) lives in `src/lib/legal.ts`. Reuse it; don't rewrite it inline.
- Canonical URL comes from `src/lib/site.ts` (`NEXT_PUBLIC_SITE_URL`, defaults to https://tonina.me).

## Critical rules (hard-won)
1. **Ghost Digit bug** — All `onChange` handlers on number inputs must fall back to `0` on empty string, never `""`. Prevents divide-by-zero in amortization loops.
2. **Suspense boundary** — Any component using `useSearchParams()` MUST be wrapped in `<Suspense>` or Vercel prod build fails. The Scenario Planner already does this.
3. **SSR hydration** — Never use `Math.random()` or `Date.now()` for initial element IDs. Hardcode IDs; use `useEffect` for browser-only data.
4. **Chart.js plugin IDs** — Inline plugins passed to `<Bar plugins={[...]}>` must be stable (created once via `useRef`). Recreating a plugin with the same `id` crashes Chart.js. See `mbbPlugin` in `/wealth/planner/page.tsx` for the ref pattern.

## Weather module (True Sensation)
- **Phase 1** (current): mocked data, Boston default
- **Phase 2** (next): `/api/weather` serverless route → Open-Meteo API (free, no key) + Open-Meteo geocoding
- Color gradient: black (-40°C) → deep blue (0°C) → cyan (10°C) → green (20°C) → amber (30°C) → red (40°C)
- Period split: Morning · Afternoon · Evening (no time labels in UI)
- Shows: RealFeel (big, color-coded) + Actual temp (small) + gear icon pills

## Env vars
```
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<any string locally>
DATABASE_URL=postgresql://... (optional locally)
# Phase 2 weather (no key needed for Open-Meteo):
# ACCUWEATHER_KEY=... (if switching to AccuWeather later)
# Newsletter signup (pick one):
# NEWSLETTER_PROVIDER=beehiiv  BEEHIIV_API_KEY=...  BEEHIIV_PUBLICATION_ID=pub_...
# NEWSLETTER_PROVIDER=kit      KIT_API_KEY=... (v3 API key or v4 kit_ key)  KIT_FORM_ID=... (required with a v3 key)
```
Set these inside the tonina-app project (Settings → Environment Variables), for Production and Preview with no branch filter. Team-level shared variables only apply once linked to the project. Vercel reads them at build time, so redeploy after changing them. `GET /api/subscribe` shows which ones a deployment sees.
