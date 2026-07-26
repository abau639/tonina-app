#!/usr/bin/env bash
# One-command pipeline for the Miami / 50mi / finance target.
# Needs: pip install -r requirements.txt, playwright chromium, and ANTHROPIC_API_KEY in .env.
# Retarget by editing config/search.json + config/profile.json (and CENTER/RADIUS below).
set -euo pipefail
cd "$(dirname "$0")"

CENTER="${CENTER:-Miami, FL}"
RADIUS="${RADIUS:-50}"
REMOTE="${REMOTE:-include}"   # include | exclude | only
KEYWORDS="${KEYWORDS:-strategic finance,FP&A,finance manager,director of finance,head of finance,vp finance,CFO,finance business partner}"
# 'aggregators' = JobSpy sites (linkedin,indeed,glassdoor,google,zip_recruiter).
# 'vc'/'pe' = the VC/PE portfolio boards from config/boards.json.
# This is broad (many boards) and slower; trim to specific slugs to go faster.
SOURCES="${SOURCES:-aggregators,vc,pe}"

echo "==> init db"
python scripts/init_db.py

echo "==> expand radius: $CENTER / $RADIUS mi"
LOCATIONS="$(python scripts/lib/metro.py --center "$CENTER" --radius "$RADIUS" --no-remote --json \
  | python -c 'import sys,json;print(",".join(json.load(sys.stdin)["locations"]))')"
echo "    locations: $LOCATIONS,Remote"

echo "==> scrape"
python scripts/scrape.py --sources "$SOURCES" --keywords "$KEYWORDS" --locations "$LOCATIONS,Remote"

echo "==> extract role fields (salary/degrees/experience)"
python scripts/extract_fields.py || echo "   (skipped/failed — needs ANTHROPIC_API_KEY)"

echo "==> map responsibility families"
python scripts/extract_responsibilities.py || echo "   (skipped/failed — needs ANTHROPIC_API_KEY)"

echo "==> enrich companies (ownership / stage / PE / C-suite / Tuck)"
python scripts/enrich_companies.py || echo "   (skipped/failed — needs ANTHROPIC_API_KEY)"

echo "==> annotate distances + remote"
python -c "from scripts import db; print('in-radius annotated:', db.annotate_distances('$CENTER', $RADIUS)); print('remote flagged:', db.annotate_remote())"

echo "==> mark stale (>3 business days unseen)"
python scripts/mark_stale.py --days 3

echo "==> rank + report"
python scripts/report_opportunities.py --top 50 --remote "$REMOTE"

echo "==> done. open out/opportunities.html"
