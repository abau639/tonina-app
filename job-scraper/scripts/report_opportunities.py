#!/usr/bin/env python3
"""Rank local opportunities against your profile and write a report.

Pure Python over the structured database — NO API key or network required. It
reads config/profile.json, scores every job on five axes, persists the scores to
opportunity_scores, and writes:
    out/opportunities.md    — ranked list + analytics, Markdown
    out/opportunities.html  — same, styled (Tonina pink) for the portfolio

Score axes (weights come from profile.json -> weights, summing to 100):
    role           title match vs target titles x seniority fit
    responsibility overlap of the job's responsibility-families with your strengths
    location       inside the radius / remote / unknown / outside
    stage          your preference over funding stage & ownership (PE etc.)
    network        Tuck (or broader Dartmouth) alum in the company C-suite  <- the edge

Runs fine before enrichment: unmapped responsibilities and un-enriched companies
score neutrally and are flagged 'pending' so the ranking degrades gracefully.

Usage:
    python scripts/report_opportunities.py
    python scripts/report_opportunities.py --top 40 --min-score 0
    python scripts/report_opportunities.py --profile config/profile.json
"""

from __future__ import annotations

import argparse
import html
import json
import sys
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from scripts import db

REPO_ROOT = Path(__file__).resolve().parent.parent


def _fmt_date(ts) -> str | None:
    """A timestamp/date string -> YYYY-MM-DD (drops any time component)."""
    if not ts:
        return None
    s = str(ts).strip().replace("T", " ")
    return s.split(" ")[0] or None


def _days_since(ts) -> int | None:
    d = _fmt_date(ts)
    if not d:
        return None
    try:
        then = datetime.strptime(d, "%Y-%m-%d")
        return max(0, (datetime.now() - then).days)
    except ValueError:
        return None


def _freshness(job) -> str:
    """Human 'posted / first seen / last confirmed' line for a job."""
    posted = _fmt_date(job["posted_date"])
    first = _fmt_date(job["first_seen_at"])
    last = _fmt_date(job["last_seen_at"])
    parts = []
    if posted:
        parts.append(f"posted {posted}")
    if first:
        age = _days_since(first)
        parts.append(f"first seen {first}" + (f" ({age}d ago)" if age is not None else ""))
    if last and last != first:
        parts.append(f"last confirmed {last}")
    return " · ".join(parts)


def load_profile(path: str) -> dict:
    return json.loads((REPO_ROOT / path if not Path(path).is_absolute() else Path(path)).read_text())


# ---------- scoring ----------


def score_role(job, profile) -> tuple[float, str]:
    title = (job["title"] or "").lower()
    includes = profile.get("target_titles_include", [])
    excludes = profile.get("target_titles_exclude", [])
    if any(x in title for x in excludes):
        base, why = 0.1, "title looks off-target"
    elif any(x in title for x in includes):
        base, why = 1.0, "title on target"
    elif "finance" in title or "financial" in title or "fp&a" in title:
        base, why = 0.5, "finance-adjacent title"
    else:
        base, why = 0.25, "title not a finance match"
    sen = job["seniority"]
    sw = profile.get("seniority_weight", {})
    smul = sw.get(sen, 0.6) if sen else 0.6
    return round(base * smul, 3), f"{why}; seniority={sen or 'unknown'}"


def score_responsibility(job, profile) -> tuple[float, str, list[str]]:
    fams = db.job_family_slugs(job["id"])  # [(slug, weight)]
    strengths = profile.get("strength_families", {})
    if not fams:
        return 0.5, "responsibilities not yet mapped (neutral)", []
    num = sum(w * strengths.get(slug, 0.0) for slug, w in fams)
    den = sum(w for _, w in fams) or 1.0
    matched = [slug for slug, _ in fams if strengths.get(slug, 0) >= 0.8]
    return round(num / den, 3), f"{len(fams)} families mapped", matched


def _is_remote(job) -> bool:
    try:
        if job["is_remote"]:
            return True
    except (KeyError, IndexError):
        pass
    return "remote" in (job["location"] or "").lower()


def score_location(job, profile) -> tuple[float, str]:
    radius = profile.get("location", {}).get("radius_miles", 50)
    d = job["distance_miles"]
    if d is not None:
        if d <= radius:
            return 1.0, f"~{d:g} mi from center"
        return 0.3, f"~{d:g} mi (outside {radius} mi)"
    if _is_remote(job):
        return 0.7, "remote"
    return 0.5, "distance unknown"


def score_stage(job, profile) -> tuple[float, str]:
    prefs = profile.get("stage_preference", {})
    ownership = job["ownership_type"] or job["c_ownership"]
    stage = job["company_stage"] or job["c_stage"]
    if ownership == "pe-owned":
        return float(prefs.get("pe-owned", 0.7)), "PE-owned"
    if stage:
        return float(prefs.get(stage, prefs.get("unknown", 0.6))), f"stage={stage}"
    return float(prefs.get("unknown", 0.6)), "stage unknown"


def score_network(job, profile) -> tuple[float, str]:
    tuck = job["c_tuck_count"] or 0
    if tuck:
        return 1.0, f"{tuck} Tuck alum(s) in C-suite"
    # broader Dartmouth check
    if job["company_id"]:
        with db.connect() as conn:
            r = conn.execute(
                "SELECT SUM(is_dartmouth_alum) AS d FROM executives WHERE company_id = ?",
                (job["company_id"],),
            ).fetchone()
        if r and (r["d"] or 0):
            return 0.4, f"{r['d']} Dartmouth alum(s) in C-suite"
    return 0.0, "no Tuck/Dartmouth signal"


def score_job(job, profile) -> dict:
    w = profile.get("weights", {"role": 30, "responsibility": 30, "location": 15, "stage": 10, "network": 15})
    r, r_why = score_role(job, profile)
    resp, resp_why, matched = score_responsibility(job, profile)
    loc, loc_why = score_location(job, profile)
    st, st_why = score_stage(job, profile)
    net, net_why = score_network(job, profile)
    total = (r * w["role"] + resp * w["responsibility"] + loc * w["location"]
             + st * w["stage"] + net * w["network"])
    return {
        "total": round(total, 1),
        "role": round(r * w["role"], 1),
        "responsibility": round(resp * w["responsibility"], 1),
        "location": round(loc * w["location"], 1),
        "stage": round(st * w["stage"], 1),
        "network": round(net * w["network"], 1),
        "matched_families": matched,
        "rationale": " · ".join([r_why, resp_why, loc_why, st_why, net_why]),
        "net_why": net_why,
    }


# ---------- analytics ----------


def analytics() -> dict:
    with db.connect() as conn:
        total_jobs = conn.execute("SELECT COUNT(*) c FROM jobs").fetchone()["c"]
        fam = conn.execute(
            """SELECT rf.name, COUNT(*) c FROM job_responsibilities jr
               JOIN responsibility_families rf ON rf.id = jr.family_id
               GROUP BY rf.name ORDER BY c DESC"""
        ).fetchall()
        own = conn.execute(
            "SELECT COALESCE(ownership_type,'(unknown)') o, COUNT(*) c FROM companies GROUP BY o ORDER BY c DESC"
        ).fetchall()
        stage = conn.execute(
            "SELECT COALESCE(company_stage,'(unknown)') s, COUNT(*) c FROM companies GROUP BY s ORDER BY c DESC"
        ).fetchall()
        tuck_companies = conn.execute(
            "SELECT name, tuck_alum_count FROM companies WHERE has_tuck_alum = 1 ORDER BY tuck_alum_count DESC"
        ).fetchall()
        n_companies = conn.execute("SELECT COUNT(*) c FROM companies").fetchone()["c"]
        n_enriched = conn.execute("SELECT COUNT(*) c FROM companies WHERE enriched = 1").fetchone()["c"]
        n_resp = conn.execute("SELECT COUNT(DISTINCT job_id) c FROM job_responsibilities").fetchone()["c"]
        n_remote = conn.execute("SELECT COUNT(*) c FROM jobs WHERE is_remote = 1").fetchone()["c"]
        n_stale = conn.execute("SELECT COUNT(*) c FROM jobs WHERE status = 'stale'").fetchone()["c"]
        n_active = conn.execute("SELECT COUNT(*) c FROM jobs WHERE status = 'active'").fetchone()["c"]
        n_comp = conn.execute("SELECT COUNT(*) c FROM jobs WHERE salary_min IS NOT NULL OR salary_max IS NOT NULL").fetchone()["c"]
        # Base-comp snapshot by stage (only rows that quote pay).
        comp = conn.execute(
            """SELECT COALESCE(company_stage,'(unknown)') s, COUNT(*) n,
                      CAST(AVG(salary_min) AS INT) avg_min, CAST(AVG(salary_max) AS INT) avg_max
               FROM jobs WHERE salary_min IS NOT NULL OR salary_max IS NOT NULL
               GROUP BY s ORDER BY avg_max DESC"""
        ).fetchall()
        n_equity = conn.execute("SELECT COUNT(*) c FROM jobs WHERE equity_offered IS NOT NULL").fetchone()["c"]
        fresh_row = conn.execute(
            "SELECT MAX(last_seen_at) refreshed, MIN(first_seen_at) oldest FROM jobs"
        ).fetchone()
        last_scrape = conn.execute("SELECT MAX(started_at) s FROM scrape_runs").fetchone()["s"]
    return {
        "data_refreshed": fresh_row["refreshed"] if fresh_row else None,
        "oldest_seen": fresh_row["oldest"] if fresh_row else None,
        "last_scrape": last_scrape,
        "total_jobs": total_jobs, "families": fam, "ownership": own, "stage": stage,
        "tuck_companies": tuck_companies, "n_companies": n_companies,
        "n_enriched": n_enriched, "n_resp": n_resp, "n_remote": n_remote,
        "n_comp": n_comp, "comp_by_stage": comp, "n_equity": n_equity,
        "n_stale": n_stale, "n_active": n_active,
    }


def execs_for(company_id) -> list:
    if not company_id:
        return []
    with db.connect() as conn:
        return conn.execute(
            """SELECT name, title, linkedin_summary, is_tuck_alum, tuck_detail, is_dartmouth_alum, linkedin_url, confidence
               FROM executives WHERE company_id = ? ORDER BY COALESCE(seniority_rank, 99), id""",
            (company_id,),
        ).fetchall()


# ---------- rendering ----------


def render_markdown(profile, ranked, stats) -> str:
    now = datetime.now().strftime("%Y-%m-%d %H:%M")
    loc = profile.get("location", {})
    L = []
    L.append(f"# Local Opportunities — {profile.get('name','')} · {loc.get('center','')} ({loc.get('radius_miles','')} mi)\n")
    L.append(f"_Generated {now} · profile: `{profile.get('profile_key')}`_\n")
    refreshed = _fmt_date(stats.get("data_refreshed"))
    if refreshed:
        L.append(f"_Data as of last scrape: **{refreshed}**. Each job's `first seen` date is its "
                 f"original capture date and is preserved on every re-run — if a role is still up "
                 f"tomorrow, it keeps today's date._\n")
    L.append(f"**{stats['total_jobs']}** jobs · **{stats['n_companies']}** companies "
             f"(**{stats['n_enriched']}** enriched) · **{stats['n_resp']}** with mapped responsibilities · "
             f"**{len(stats['tuck_companies'])}** companies with a Tuck alum in the C-suite\n")

    if stats["n_enriched"] == 0 or stats["n_resp"] == 0:
        L.append("> ⚠️ **Enrichment pending.** Company C-suite / Tuck flags and responsibility "
                 "families aren't populated yet, so `stage`, `network`, and `responsibility` scores "
                 "are neutral. Run `enrich_companies.py` and `extract_responsibilities.py` "
                 "(needs `ANTHROPIC_API_KEY`) to light them up.\n")

    L.append("\n## Ranked opportunities\n")
    for i, (job, sc) in enumerate(ranked, 1):
        tuck = (job["c_tuck_count"] or 0) > 0
        flag = " ⭐ **TUCK WARM INTRO**" if tuck else ""
        stale = (job["status"] or "active") == "stale"
        if stale:
            flag += " · 🔴 STALE (likely filled)"
        dist = f" · ~{job['distance_miles']:g} mi" if job["distance_miles"] is not None else ""
        own = job["ownership_type"] or job["c_ownership"] or "—"
        stage = job["company_stage"] or job["c_stage"] or "—"
        pe = f" ({job['c_pe_sponsor']})" if job["c_pe_sponsor"] else ""
        sal = ""
        if job["salary_min"] or job["salary_max"]:
            sal = f" · 💰 {job['salary_currency'] or '$'}{job['salary_min'] or '?'}–{job['salary_max'] or '?'}"
        comp_extra = " · ".join(
            x for x in (
                (f"equity: {job['equity_offered']}" if job["equity_offered"] else ""),
                (f"bonus: {job['bonus_text']}" if job["bonus_text"] else ""),
            ) if x
        )
        remote_tag = " · 🏠 remote" if _is_remote(job) else ""
        L.append(f"### {i}. {job['title']} — {job['company']}  ·  score {sc['total']}{flag}")
        L.append(f"- **Where:** {job['location'] or '—'}{dist}{remote_tag}")
        L.append(f"- **Ownership / stage:** {own} · {stage}{pe}{sal}"
                 + (f" · {comp_extra}" if comp_extra else ""))
        fresh = _freshness(job)
        if fresh:
            L.append(f"- **Timing:** {fresh}")
        L.append(f"- **Score breakdown:** role {sc['role']} · resp {sc['responsibility']} · "
                 f"loc {sc['location']} · stage {sc['stage']} · network {sc['network']}")
        if sc["matched_families"]:
            L.append(f"- **Plays to your strengths:** {', '.join(sc['matched_families'])}")
        L.append(f"- **Why:** {sc['rationale']}")
        ex = execs_for(job["company_id"])
        if ex:
            L.append("- **C-suite:**")
            for e in ex:
                marks = ""
                if e["is_tuck_alum"]:
                    marks = f"  ⭐ _Tuck: {e['tuck_detail'] or 'alum'}_"
                elif e["is_dartmouth_alum"]:
                    marks = "  · _Dartmouth alum_"
                summ = f" — {e['linkedin_summary']}" if e["linkedin_summary"] else ""
                conf = f" _(conf: {e['confidence']})_" if e["confidence"] else ""
                L.append(f"    - **{e['name']}**, {e['title'] or '—'}{marks}{summ}{conf}")
        if job["source_url"]:
            L.append(f"- **Apply:** {job['source_url']}")
        L.append("")

    L.append("\n## Responsibility families across all roles (what the market wants)\n")
    if stats["families"]:
        for f in stats["families"]:
            L.append(f"- {f['name']}: **{f['c']}**")
    else:
        L.append("_No responsibilities mapped yet — run extract_responsibilities.py._")

    L.append("\n## Compensation snapshot\n")
    L.append(f"_{stats['n_comp']} of {stats['total_jobs']} listings quote pay · "
             f"{stats['n_equity']} mention equity · {stats['n_remote']} are remote._\n")
    if stats["total_jobs"] and stats["n_comp"] / stats["total_jobs"] < 0.6:
        L.append("> ℹ️ Many listings omit pay — several states (**Florida included**) have no "
                 "pay-transparency law, so blank compensation is expected, not a scrape miss. "
                 "The ranking never penalizes a role for not posting pay.\n")
    if stats["comp_by_stage"]:
        L.append("| Stage | # with pay | avg base min | avg base max |")
        L.append("|---|---|---|---|")
        for r in stats["comp_by_stage"]:
            lo = f"${r['avg_min']:,}" if r["avg_min"] else "—"
            hi = f"${r['avg_max']:,}" if r["avg_max"] else "—"
            L.append(f"| {r['s']} | {r['n']} | {lo} | {hi} |")
    else:
        L.append("_No listings quote pay yet — run extract_fields.py._")

    L.append("\n## Ownership & stage mix\n")
    L.append("**Ownership:** " + ", ".join(f"{o['o']} ({o['c']})" for o in stats["ownership"]))
    L.append("\n**Stage:** " + ", ".join(f"{s['s']} ({s['c']})" for s in stats["stage"]))

    L.append("\n## Companies with a Tuck alum in leadership (your warm intros)\n")
    if stats["tuck_companies"]:
        for c in stats["tuck_companies"]:
            L.append(f"- **{c['name']}** — {c['tuck_alum_count']} Tuck alum(s)")
    else:
        L.append("_None found yet (or enrichment pending)._")
    return "\n".join(L) + "\n"


def render_html(profile, ranked, stats) -> str:
    now = datetime.now().strftime("%Y-%m-%d %H:%M")
    loc = profile.get("location", {})
    e = html.escape

    def esc(x):
        return e(str(x)) if x is not None else "—"

    cards = []
    for i, (job, sc) in enumerate(ranked, 1):
        tuck = (job["c_tuck_count"] or 0) > 0
        badge = '<span class="tuck">⭐ TUCK WARM INTRO</span>' if tuck else ""
        stale = (job["status"] or "active") == "stale"
        stale_badge = '<span class="stale">🔴 stale · likely filled</span>' if stale else ""
        dist = f"~{job['distance_miles']:g} mi" if job["distance_miles"] is not None else ""
        own = esc(job["ownership_type"] or job["c_ownership"])
        stage = esc(job["company_stage"] or job["c_stage"])
        pe = f" ({e(job['c_pe_sponsor'])})" if job["c_pe_sponsor"] else ""
        sal = ""
        if job["salary_min"] or job["salary_max"]:
            sal = f'<span class="pill">💰 {esc(job["salary_currency"] or "$")}{esc(job["salary_min"])}–{esc(job["salary_max"])}</span>'
        if job["equity_offered"]:
            sal += f'<span class="pill">📈 {e(str(job["equity_offered"]))}</span>'
        if job["bonus_text"]:
            sal += f'<span class="pill">🎯 {e(str(job["bonus_text"]))}</span>'
        if _is_remote(job):
            sal += '<span class="pill green">🏠 remote</span>'
        bars = "".join(
            f'<div class="bar"><span>{k}</span><div class="track"><div class="fill" style="width:{min(100, sc[k]/max(1,mx)*100):.0f}%"></div></div><b>{sc[k]}</b></div>'
            for k, mx in (("role", 30), ("responsibility", 30), ("location", 15), ("stage", 10), ("network", 15))
        )
        fam = ""
        if sc["matched_families"]:
            fam = '<div class="fams">' + "".join(f'<span class="pill green">{e(s)}</span>' for s in sc["matched_families"]) + "</div>"
        exs = execs_for(job["company_id"])
        exhtml = ""
        if exs:
            rows = []
            for x in exs:
                mark = ""
                if x["is_tuck_alum"]:
                    mark = f'<span class="tuck-sm">Tuck: {e(x["tuck_detail"] or "alum")}</span>'
                elif x["is_dartmouth_alum"]:
                    mark = '<span class="dart-sm">Dartmouth</span>'
                summ = e(x["linkedin_summary"]) if x["linkedin_summary"] else ""
                rows.append(f'<li><b>{e(x["name"])}</b>, {esc(x["title"])} {mark}<br><span class="muted">{summ}</span></li>')
            exhtml = f'<details><summary>C-suite ({len(exs)})</summary><ul class="execs">{"".join(rows)}</ul></details>'
        apply = f'<a class="apply" href="{e(job["source_url"])}" target="_blank" rel="noopener">Apply ↗</a>' if job["source_url"] else ""
        fresh_html = e(_freshness(job))
        fresh_div = f'<div class="freshness">🗓 {fresh_html}</div>' if fresh_html else ""
        cards.append(f"""
        <article class="card{' tuckcard' if tuck else ''}{' stalecard' if stale else ''}">
          <div class="rank">#{i}</div>
          <div class="body">
            <h3>{e(job['title'])} <span class="co">{e(job['company'])}</span> {badge} {stale_badge}</h3>
            <div class="meta">{esc(job['location'])} {('· ' + dist) if dist else ''} · <b>{own}</b> · {stage}{pe} {sal}</div>
            {fresh_div}
            {fam}
            <div class="score">score <b>{sc['total']}</b></div>
            <div class="bars">{bars}</div>
            <div class="why muted">{e(sc['rationale'])}</div>
            {exhtml}
            {apply}
          </div>
        </article>""")

    fam_rows = "".join(
        f'<tr><td>{e(f["name"])}</td><td class="num">{f["c"]}</td></tr>' for f in stats["families"]
    ) or '<tr><td colspan="2" class="muted">Not mapped yet</td></tr>'
    comp_rows = "".join(
        f'<tr><td>{e(r["s"])}</td><td class="num">{r["n"]}</td>'
        f'<td class="num">{("$%s"%format(r["avg_min"],",")) if r["avg_min"] else "—"}</td>'
        f'<td class="num">{("$%s"%format(r["avg_max"],",")) if r["avg_max"] else "—"}</td></tr>'
        for r in stats["comp_by_stage"]
    ) or '<tr><td colspan="4" class="muted">No pay data yet — run extract_fields.py</td></tr>'
    comp_note = ""
    if stats["total_jobs"] and stats["n_comp"] / stats["total_jobs"] < 0.6:
        comp_note = ('<p class="muted" style="font-size:12.5px;margin-top:8px">ℹ️ Many listings omit pay — '
                     'several states (<b>Florida included</b>) have no pay-transparency law, so blank '
                     'compensation is expected, not a scrape miss. Ranking never penalizes a role for it.</p>')
    own_rows = ", ".join(f'{e(o["o"])} <b>({o["c"]})</b>' for o in stats["ownership"])
    stage_rows = ", ".join(f'{e(s["s"])} <b>({s["c"]})</b>' for s in stats["stage"])
    tuck_rows = "".join(
        f'<li><b>{e(c["name"])}</b> — {c["tuck_alum_count"]} Tuck alum(s)</li>' for c in stats["tuck_companies"]
    ) or '<li class="muted">None found yet (or enrichment pending).</li>'

    pending_banner = ""
    if stats["n_enriched"] == 0 or stats["n_resp"] == 0:
        pending_banner = ('<div class="banner">⚠️ <b>Enrichment pending.</b> C-suite / Tuck flags and '
                          'responsibility families aren\'t populated yet — <code>stage</code>, '
                          '<code>network</code> and <code>responsibility</code> scores are neutral until you run '
                          '<code>enrich_companies.py</code> and <code>extract_responsibilities.py</code>.</div>')

    return f"""<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Local Opportunities — {e(profile.get('name',''))}</title>
<style>
:root {{ --pink:#db2777; --ink:#0f172a; --muted:#64748b; --line:#e2e8f0; --bg:#f8fafc; }}
* {{ box-sizing:border-box; }}
body {{ font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif; color:var(--ink); background:var(--bg); margin:0; line-height:1.5; }}
.wrap {{ max-width:960px; margin:0 auto; padding:32px 20px 80px; }}
h1 {{ font-size:26px; margin:0 0 4px; }}
.sub {{ color:var(--muted); margin:0 0 18px; }}
.stats {{ display:flex; flex-wrap:wrap; gap:10px; margin:0 0 20px; }}
.stat {{ background:#fff; border:1px solid var(--line); border-radius:12px; padding:10px 14px; font-size:14px; }}
.stat b {{ color:var(--pink); font-size:18px; display:block; }}
.banner {{ background:#fff7ed; border:1px solid #fed7aa; border-radius:12px; padding:12px 16px; margin:0 0 20px; font-size:14px; }}
.card {{ display:flex; gap:16px; background:#fff; border:1px solid var(--line); border-radius:16px; padding:18px; margin:0 0 14px; }}
.tuckcard {{ border-color:var(--pink); box-shadow:0 0 0 2px rgba(219,39,119,.10); }}
.rank {{ font-weight:800; color:var(--muted); font-size:15px; min-width:34px; }}
.body {{ flex:1; min-width:0; }}
h3 {{ margin:0 0 4px; font-size:17px; }}
.co {{ color:var(--pink); font-weight:600; }}
.meta {{ color:var(--muted); font-size:13.5px; margin-bottom:8px; }}
.freshness {{ color:var(--muted); font-size:12px; margin:0 0 6px; }}
.pill {{ display:inline-block; background:#f1f5f9; border-radius:999px; padding:2px 9px; font-size:12px; margin-right:4px; }}
.pill.green {{ background:#ecfdf5; color:#047857; }}
.fams {{ margin:6px 0; }}
.tuck {{ background:var(--pink); color:#fff; border-radius:999px; padding:2px 10px; font-size:11px; font-weight:700; margin-left:6px; }}
.stale {{ background:#fee2e2; color:#b91c1c; border-radius:999px; padding:2px 10px; font-size:11px; font-weight:700; margin-left:6px; }}
.stalecard {{ opacity:0.6; }}
.tuck-sm {{ background:var(--pink); color:#fff; border-radius:6px; padding:1px 6px; font-size:11px; }}
.dart-sm {{ background:#065f46; color:#fff; border-radius:6px; padding:1px 6px; font-size:11px; }}
.score {{ font-size:13px; color:var(--muted); margin:8px 0 2px; }}
.score b {{ color:var(--ink); font-size:16px; }}
.bars {{ display:grid; grid-template-columns:1fr 1fr; gap:4px 18px; margin:6px 0; }}
.bar {{ display:flex; align-items:center; gap:6px; font-size:11.5px; color:var(--muted); }}
.bar span {{ width:96px; text-transform:capitalize; }}
.bar b {{ width:30px; text-align:right; color:var(--ink); }}
.track {{ flex:1; height:6px; background:#f1f5f9; border-radius:4px; overflow:hidden; }}
.fill {{ height:100%; background:var(--pink); }}
.why {{ font-size:12.5px; margin:6px 0; }}
.muted {{ color:var(--muted); }}
details {{ margin:6px 0; font-size:13px; }}
summary {{ cursor:pointer; color:var(--pink); font-weight:600; }}
ul.execs {{ margin:8px 0; padding-left:18px; }}
ul.execs li {{ margin:5px 0; }}
.apply {{ display:inline-block; margin-top:8px; background:var(--ink); color:#fff; text-decoration:none; padding:6px 14px; border-radius:8px; font-size:13px; }}
.grid {{ display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-top:24px; }}
.panel {{ background:#fff; border:1px solid var(--line); border-radius:16px; padding:18px; }}
.panel h2 {{ font-size:15px; margin:0 0 10px; }}
table {{ width:100%; border-collapse:collapse; font-size:13px; }}
td {{ padding:4px 0; border-bottom:1px solid var(--line); }}
th {{ padding:4px 0; border-bottom:2px solid var(--line); font-size:11.5px; color:var(--muted); font-weight:600; }}
td.num, th.num {{ text-align:right; }}
td.num {{ font-weight:700; color:var(--pink); }}
@media (max-width:640px) {{ .grid,.bars {{ grid-template-columns:1fr; }} .bar span{{width:110px;}} }}
</style></head><body><div class="wrap">
<h1>Local Opportunities — {e(profile.get('name',''))}</h1>
<p class="sub">{e(str(loc.get('center','')))} · {e(str(loc.get('radius_miles','')))} mi · Strategic Finance / Finance leadership · generated {now}{(' · data as of ' + e(str(_fmt_date(stats.get('data_refreshed'))))) if stats.get('data_refreshed') else ''}</p>
<p class="sub" style="font-size:12.5px;margin-top:-8px">Each job's <b>first seen</b> date is its original capture date — preserved on every re-run, so a role still up tomorrow keeps today's date.</p>
<div class="stats">
  <div class="stat"><b>{stats['total_jobs']}</b>jobs in radius</div>
  <div class="stat"><b>{stats['n_companies']}</b>companies</div>
  <div class="stat"><b>{stats['n_remote']}</b>remote</div>
  <div class="stat"><b>{stats['n_stale']}</b>stale (likely filled)</div>
  <div class="stat"><b>{len(stats['tuck_companies'])}</b>with Tuck alumni</div>
</div>
{pending_banner}
<h2>Ranked opportunities</h2>
{''.join(cards) if cards else '<p class="muted">No jobs in the database yet. Run the scrape first.</p>'}
<div class="panel" style="margin-top:24px"><h2>Compensation snapshot <span class="muted" style="font-weight:400">· {stats['n_comp']}/{stats['total_jobs']} quote pay · {stats['n_equity']} mention equity</span></h2>
  <table><thead><tr><th style="text-align:left">Stage</th><th class="num">#</th><th class="num">avg base min</th><th class="num">avg base max</th></tr></thead>{comp_rows}</table>{comp_note}</div>
<div class="grid">
  <div class="panel"><h2>What the market wants</h2><table>{fam_rows}</table></div>
  <div class="panel"><h2>Your warm intros (Tuck alumni)</h2><ul>{tuck_rows}</ul>
    <h2 style="margin-top:16px">Ownership mix</h2><p class="muted" style="font-size:13px">{own_rows or '—'}</p>
    <h2 style="margin-top:12px">Stage mix</h2><p class="muted" style="font-size:13px">{stage_rows or '—'}</p>
  </div>
</div>
</div></body></html>"""


def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--profile", default="config/profile.json")
    ap.add_argument("--top", type=int, default=50, help="Max opportunities to list")
    ap.add_argument("--min-score", type=float, default=0.0)
    ap.add_argument("--outdir", default="out")
    ap.add_argument("--remote", choices=["include", "exclude", "only"], default="include",
                    help="Remote roles: include (default), exclude them, or show only them")
    ap.add_argument("--status", choices=["all", "active", "stale"], default="all",
                    help="Job status: all (default, stale flagged), active only, or stale only")
    args = ap.parse_args(argv)

    profile = load_profile(args.profile)
    pkey = profile.get("profile_key", "default")

    jobs = db.all_jobs_for_scoring()
    if not jobs:
        print("No jobs in the database. Run the scrape (and ideally enrichment) first.")
        # Still emit an empty report so the plumbing is verifiable.
    scored = []
    for job in jobs:
        sc = score_job(job, profile)
        db.upsert_opportunity_score(job["id"], pkey, sc, sc["rationale"])
        scored.append((job, sc))

    def remote_ok(job) -> bool:
        r = _is_remote(job)
        if args.remote == "only":
            return r
        if args.remote == "exclude":
            return not r
        return True

    def status_ok(job) -> bool:
        st = (job["status"] or "active")
        if args.status == "active":
            return st != "stale"
        if args.status == "stale":
            return st == "stale"
        return True

    scored.sort(key=lambda t: t[1]["total"], reverse=True)
    ranked = [t for t in scored
              if t[1]["total"] >= args.min_score and remote_ok(t[0]) and status_ok(t[0])][: args.top]
    if args.remote != "include":
        print(f"(remote filter: {args.remote})")
    if args.status != "all":
        print(f"(status filter: {args.status})")

    stats = analytics()
    outdir = REPO_ROOT / args.outdir
    outdir.mkdir(parents=True, exist_ok=True)
    (outdir / "opportunities.md").write_text(render_markdown(profile, ranked, stats))
    (outdir / "opportunities.html").write_text(render_html(profile, ranked, stats))

    print(f"Scored {len(scored)} jobs. Wrote:")
    print(f"  {outdir/'opportunities.md'}")
    print(f"  {outdir/'opportunities.html'}")
    if ranked:
        print("\nTop 5:")
        for job, sc in ranked[:5]:
            tuck = " [TUCK]" if (job["c_tuck_count"] or 0) else ""
            print(f"  {sc['total']:5.1f}  {job['title']} — {job['company']}{tuck}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
