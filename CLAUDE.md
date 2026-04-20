# Tonina.me — Project Context

## What this is
Alfredo's personal portfolio + interactive finance tool. Every feature maps to a specific JD requirement at target companies (Uber, Reddit, Notion, Databricks). The site proves Strategic Finance × engineering depth to hiring managers.

## Tech stack
- **Framework**: Next.js 14 App Router, bootstrapped via T3 Stack
- **Language**: Strict TypeScript
- **Styling**: Tailwind CSS
- **Design system**: white/slate-50 bg · slate-900 text · **pink-600 accents** ("Tonina Pink") · "Business Casual / Databricks-inspired"
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
| `/wealth/advisor` | Scenario Planner (30-yr net worth model) | Notion / Databricks |
| `/wealth/archetype` | Wealth archetype tool | General |
| `/concept-explorer` | Hub | General |
| `/concept-explorer/doordash` | GAAP vs FCF scrollytelling | Reddit |
| `/concept-explorer/snapchat` | Project Family Center sim | Uber |
| `/concept-explorer/airbnb` | Take Rate / EBITDA sim | Uber |
| `/concept-explorer/saas` | SaaS metrics dictionary | Notion |
| `/concept-explorer/weather` | True Sensation weather (Phase 1: mock, Phase 2: Open-Meteo API) | General / DAU |
| `/lab` | Lab hub | General |
| `/lab/portfolio-tracker` | Portfolio tracker | Databricks |
| `/lab/game` | Game | General |
| `/blog` | Blog | General |
| `/journey` | Journey | General |

## Critical rules (hard-won)
1. **Ghost Digit bug** — All `onChange` handlers on number inputs must fall back to `0` on empty string, never `""`. Prevents divide-by-zero in amortization loops.
2. **Suspense boundary** — Any component using `useSearchParams()` MUST be wrapped in `<Suspense>` or Vercel prod build fails. The Scenario Planner already does this.
3. **SSR hydration** — Never use `Math.random()` or `Date.now()` for initial element IDs. Hardcode IDs; use `useEffect` for browser-only data.
4. **Chart.js plugin IDs** — Inline plugins passed to `<Bar plugins={[...]}>` must be stable (created once via `useRef`). Recreating a plugin with the same `id` crashes Chart.js. See `mbbPlugin` in `/wealth/advisor/page.tsx` for the ref pattern.

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
```
