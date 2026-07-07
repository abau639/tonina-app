"use client";

import Link from "next/link";
import { useState, useRef } from "react";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

const DolphinLogo = ({ className = "text-2xl" }: { className?: string }) => (
  <span className={`inline-block grayscale opacity-80 select-none ${className}`} style={{ lineHeight: 1 }}>🐋</span>
);

const GlobalNav = () => (
  <nav className="sticky top-0 z-50 w-full border-b border-slate-100 bg-white/80 backdrop-blur-md">
    <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
      <div className="flex items-center gap-8">
        <Link href="/" className="font-bold tracking-tight text-slate-900 text-lg flex items-center gap-2 hover:opacity-80 transition-opacity">
          <DolphinLogo /> Tonina.me
        </Link>
        <div className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
          <Link href="/concept-explorer" className="text-pink-600 font-bold transition-colors">Concept Explorer</Link>
          <Link href="/wealth" className="hover:text-slate-900 transition-colors">Tonina Wealth</Link>
          <Link href="/lab" className="hover:text-slate-900 transition-colors">The Lab</Link>
          <Link href="/blog" className="hover:text-slate-900 transition-colors">Tonina Blog</Link>
        </div>
      </div>
    </div>
  </nav>
);

// ── DATA ─────────────────────────────────────────────────────────────────────

const CHART_LABELS = ["Month 0", "Q1", "Q2", "Q3", "Q4", "Q5", "Q6"];
const BLENDED_DATA = [3.10, 3.10, 3.10, 3.20, 3.10, 3.20, 3.20];
const PAYBACK_DATA = [4.0, 4.2, 5.5, 6.8, 8.0, 9.5, 11.0];

const QUARTERLY_TABLE = [
  { q: "Q1", blended: "3.1x", payback: "4.2 mo", hot: false },
  { q: "Q2", blended: "3.1x", payback: "5.5 mo", hot: false },
  { q: "Q3", blended: "3.2x", payback: "6.8 mo", hot: false },
  { q: "Q4", blended: "3.1x", payback: "8.0 mo", hot: true },
  { q: "Q5", blended: "3.2x", payback: "9.5 mo", hot: true },
  { q: "Q6", blended: "3.2x", payback: "11.0 mo", hot: true, threshold: true },
];

const BASE = {
  totalBudget: 500_000,
  psBudget: 425_000,
  psCAC: 72,
  psPayback: 11,
  affiliateBudget: 75_000,
  affiliateCAC: 40,
  affiliatePayback: 5,
  organicVolume: 1_200,
};

function simulate(pct: number) {
  const shift = BASE.psBudget * (pct / 100);
  const psCustomers = Math.floor((BASE.psBudget - shift) / BASE.psCAC);
  const affiliateCustomers = Math.floor((BASE.affiliateBudget + shift) / BASE.affiliateCAC);
  const totalPaid = psCustomers + affiliateCustomers;
  const blendedPayback = (psCustomers * BASE.psPayback + affiliateCustomers * BASE.affiliatePayback) / totalPaid;
  return {
    psCustomers,
    affiliateCustomers,
    totalCustomers: totalPaid + BASE.organicVolume,
    blendedPayback,
    cashAtRisk: BASE.totalBudget * blendedPayback,
  };
}

// ── COMPONENTS ───────────────────────────────────────────────────────────────

function MetricCard({
  label,
  value,
  change,
  sentiment,
  note,
}: {
  label: string;
  value: string;
  change?: string;
  sentiment: "good" | "warn" | "neutral";
  note?: string;
}) {
  return (
    <div className={`rounded-xl border p-4 ${sentiment === "warn" ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-white"}`}>
      <div className="text-xs font-bold text-slate-500 mb-1 uppercase tracking-widest">{label}</div>
      <div className="text-2xl font-black text-slate-900 mb-1">{value}</div>
      {change && (
        <div className={`text-xs font-bold ${sentiment === "good" ? "text-emerald-600" : sentiment === "warn" ? "text-amber-600" : "text-slate-400"}`}>
          {change}
        </div>
      )}
      {note && <div className="text-[10px] text-slate-400 mt-1">{note}</div>}
    </div>
  );
}

// ── PAGE ─────────────────────────────────────────────────────────────────────

export default function CACCaseStudy() {
  const [viewMode, setViewMode] = useState<"blended" | "channel">("blended");
  const [realloc, setRealloc] = useState(0);

  const base = simulate(0);
  const sim = simulate(realloc);

  const annotationPlugin = useRef({
    id: "month11Marker",
    afterDraw(chart: ChartJS) {
      const { ctx, scales, chartArea } = chart;
      if (!scales.x || !chartArea) return;
      const x3 = scales.x.getPixelForValue(3);
      const x4 = scales.x.getPixelForValue(4);
      const mx = x3 + (2 / 3) * (x4 - x3);

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(mx, chartArea.top + 14);
      ctx.lineTo(mx, chartArea.bottom);
      ctx.strokeStyle = "#f97316";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 4]);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = "#f97316";
      ctx.font = "bold 10px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Month 11", mx, chartArea.top + 10);
      ctx.restore();
    },
  }).current;

  const bActive = viewMode === "blended";
  const cActive = viewMode === "channel";

  const chartData = {
    labels: CHART_LABELS,
    datasets: [
      {
        label: "Blended LTV:CAC",
        data: BLENDED_DATA,
        borderColor: bActive ? "#db2777" : "#e2e8f0",
        borderWidth: bActive ? 3 : 1.5,
        pointBackgroundColor: bActive ? "#db2777" : "#e2e8f0",
        pointRadius: bActive ? 5 : 3,
        tension: 0.3,
        yAxisID: "yLeft",
      },
      {
        label: "Paid Social Payback",
        data: PAYBACK_DATA,
        borderColor: cActive ? "#ef4444" : "#e2e8f0",
        borderWidth: cActive ? 3 : 1.5,
        pointBackgroundColor: cActive ? "#ef4444" : "#e2e8f0",
        pointRadius: cActive ? 5 : 3,
        tension: 0.3,
        yAxisID: "yRight",
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    layout: { padding: { top: 16 } },
    interaction: { mode: "index" as const, intersect: false },
    scales: {
      x: {
        grid: { color: "#f1f5f9" },
        ticks: { font: { size: 11 }, color: "#94a3b8" },
      },
      yLeft: {
        type: "linear" as const,
        position: "left" as const,
        min: 0,
        max: 5,
        grid: { color: "#f1f5f9" },
        ticks: {
          callback: (v: number | string) => `${v}x`,
          font: { size: 11 },
          color: bActive ? "#db2777" : "#94a3b8",
          stepSize: 1,
        },
        title: {
          display: true,
          text: "Blended LTV:CAC",
          color: bActive ? "#db2777" : "#94a3b8",
          font: { size: 11 },
        },
      },
      yRight: {
        type: "linear" as const,
        position: "right" as const,
        min: 0,
        max: 14,
        grid: { drawOnChartArea: false },
        ticks: {
          callback: (v: number | string) => `${v} mo`,
          font: { size: 11 },
          color: cActive ? "#ef4444" : "#94a3b8",
          stepSize: 2,
        },
        title: {
          display: true,
          text: "Paid Social Payback",
          color: cActive ? "#ef4444" : "#94a3b8",
          font: { size: 11 },
        },
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          label: (ctx: any) =>
            ctx.dataset.label === "Blended LTV:CAC"
              ? ` LTV:CAC: ${ctx.parsed.y}x`
              : ` Payback: ${ctx.parsed.y} months`,
        },
      },
    },
  };

  const psDelta = sim.psCustomers - base.psCustomers;
  const totalDelta = sim.totalCustomers - base.totalCustomers;
  const paybackDelta = sim.blendedPayback - base.blendedPayback;
  const cashDelta = sim.cashAtRisk - base.cashAtRisk;
  const isBase = realloc === 0;

  return (
    <main className="min-h-screen bg-white text-slate-900 font-sans selection:bg-pink-100 flex flex-col">
      <GlobalNav />

      <div className="max-w-3xl mx-auto px-6 pt-16 pb-24 w-full flex-1">
        <Link href="/concept-explorer" className="inline-flex items-center text-sm font-bold text-slate-400 hover:text-slate-900 transition-colors mb-10">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Concepts
        </Link>

        {/* Header */}
        <div className="mb-16">
          <div className="inline-flex items-center gap-2 bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border border-slate-200 mb-4">
            CFO Case Study
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-900 mb-5 leading-tight">
            The Channel That Looked Fine Until It Wasn&apos;t
          </h1>
          <p className="text-lg text-slate-500 leading-relaxed">
            What blended metrics hide, and the call that actually protects the business.
          </p>
        </div>

        {/* ── Beat 1 ── */}
        <section className="mb-14">
          <div className="text-[10px] font-bold uppercase tracking-widest text-pink-600 mb-3">01 — The Metric That Looks Fine</div>
          <div className="flex items-end gap-4 mb-5">
            <span className="text-7xl font-black text-slate-900 leading-none">3.2x</span>
            <span className="text-base text-slate-500 pb-2">Blended LTV:CAC</span>
          </div>
          <p className="text-base text-slate-700 leading-relaxed">
            An e-commerce company runs paid social as its primary acquisition channel. This number goes in the board deck without a second glance. It looks healthy. It is not the whole story.
          </p>
        </section>

        {/* ── Beat 2 + Chart ── */}
        <section className="mb-14">
          <div className="text-[10px] font-bold uppercase tracking-widest text-pink-600 mb-3">02 — The Blind Spot</div>
          <p className="text-base text-slate-700 leading-relaxed mb-3">
            Channel-level CAC on paid social crept up 60% over 18 months. Payback period stretched from 4 months to 11. The deterioration is masked by a stable organic cohort propping up the blended average — the board is looking at a mix of a healthy channel and a decaying one, and cannot tell which is which.
          </p>
          <p className="text-sm text-slate-500 leading-relaxed mb-8">
            The company kept shifting more budget into paid social over this period — 75% to 85% of total spend — precisely because the blended number held steady. The reallocation was happening in the wrong direction the entire time.
          </p>

          {/* Toggle */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl mb-2 w-fit">
            <button
              onClick={() => setViewMode("blended")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${bActive ? "bg-white text-pink-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
            >
              Board View
            </button>
            <button
              onClick={() => setViewMode("channel")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${cActive ? "bg-white text-red-500 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
            >
              Channel Reality
            </button>
          </div>
          <p className="text-[11px] text-slate-400 mb-4">
            {bActive
              ? "Blended LTV:CAC — the number in every board deck. Flat. Reassuring. Incomplete."
              : "Paid social payback period — what channel-level data showed the whole time."}
          </p>

          {/* Chart */}
          <div className="bg-slate-50 rounded-2xl border border-slate-100 p-6 mb-1">
            <div className="flex flex-wrap items-center gap-5 mb-5">
              <div className="flex items-center gap-2">
                <div className="w-8 rounded" style={{ height: 3, background: bActive ? "#db2777" : "#cbd5e1" }}></div>
                <span className={`text-xs font-semibold ${bActive ? "text-pink-600" : "text-slate-400"}`}>Blended LTV:CAC</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 rounded" style={{ height: 3, background: cActive ? "#ef4444" : "#cbd5e1" }}></div>
                <span className={`text-xs font-semibold ${cActive ? "text-red-500" : "text-slate-400"}`}>Paid Social Payback</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-5 border-t-2 border-dashed border-orange-400"></div>
                <span className="text-xs font-semibold text-orange-500">Month 11</span>
              </div>
            </div>
            <Line data={chartData} options={chartOptions} plugins={[annotationPlugin]} />
          </div>
          <p className="text-xs text-slate-400 text-right mb-0">18-month period · illustrative data</p>
        </section>

        {/* ── Beat 3 ── */}
        <section className="mb-14">
          <div className="text-[10px] font-bold uppercase tracking-widest text-pink-600 mb-3">03 — Where It Breaks</div>
          <div className="border-l-4 border-orange-400 pl-5 mb-5">
            <p className="text-base font-bold text-slate-900 mb-2">Month 11. That is the threshold.</p>
            <p className="text-base text-slate-700 leading-relaxed">
              By this point, paid social is structurally dependent on continued fundraising just to fund its own payback period. The channel no longer self-funds its own growth. Scaling it further increases cash burn per new customer — even though the blended metric still reads as acceptable.
            </p>
          </div>
          <p className="text-sm text-slate-500 leading-relaxed">
            This is not a future risk. It is a present condition. The company is already past the break-even point on its primary acquisition channel, and the board deck does not show it.
          </p>
        </section>

        {/* ── Board Deck vs. Reality Table ── */}
        <section className="mb-14">
          <div className="text-[10px] font-bold uppercase tracking-widest text-pink-600 mb-3">Internal Data · Six Quarters</div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Six Quarters. Nobody Said Anything.</h2>
          <p className="text-sm text-slate-500 leading-relaxed mb-6">
            Left column: what was in the board deck each quarter. Right column: what channel-level data showed. The left column never changed.
          </p>
          <div className="rounded-2xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest w-16">Quarter</th>
                  <th className="text-left px-5 py-3 text-[10px] font-bold text-pink-600 uppercase tracking-widest">Board-Reported (Blended LTV:CAC)</th>
                  <th className="text-left px-5 py-3 text-[10px] font-bold text-red-500 uppercase tracking-widest">Channel Reality (Paid Social Payback)</th>
                </tr>
              </thead>
              <tbody>
                {QUARTERLY_TABLE.map((row) => (
                  <tr key={row.q} className={`border-b border-slate-100 last:border-0 ${row.threshold ? "bg-red-50" : ""}`}>
                    <td className="px-5 py-3.5 font-bold text-slate-500">{row.q}</td>
                    <td className="px-5 py-3.5 font-mono text-slate-700">{row.blended}</td>
                    <td className="px-5 py-3.5 font-mono font-bold">
                      <span className={row.hot ? "text-red-500" : "text-slate-700"}>{row.payback}</span>
                      {row.threshold && (
                        <span className="ml-2 text-[10px] uppercase tracking-widest bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold">Threshold</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-400 mt-3">
            Blended LTV:CAC is the standard board metric. Paid social payback is the number that was not being reported up.
          </p>
        </section>

        {/* ── Beat 4 + Simulator ── */}
        <section className="mb-14">
          <div className="text-[10px] font-bold uppercase tracking-widest text-pink-600 mb-3">04 — The Reallocation Simulator</div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">What Happens When You Shift the Budget</h2>
          <p className="text-sm text-slate-500 leading-relaxed mb-8">
            The recommendation: cap paid social spend growth and reallocate up to 30% of its budget to the affiliate channel, which holds a stable 5-month payback. Organic is excluded — free channels do not scale on demand, which is exactly why the company leaned harder on paid social as it decayed.
          </p>

          {/* Slider */}
          <div className="bg-slate-50 rounded-2xl border border-slate-100 p-6 mb-5">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-bold text-slate-700">Reallocation: Paid Social → Affiliate</label>
              <span className="text-2xl font-black text-pink-600">{realloc}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={30}
              step={1}
              value={realloc}
              onChange={(e) => setRealloc(Number(e.target.value))}
              className="w-full accent-pink-600 mb-2"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              <span>0% (Base)</span>
              <span>30% (Recommended cap)</span>
            </div>
          </div>

          {/* Metric cards */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <MetricCard
              label="Total Customers / Month"
              value={sim.totalCustomers.toLocaleString()}
              change={isBase ? undefined : `+${totalDelta.toLocaleString()} vs. base`}
              sentiment={isBase ? "neutral" : totalDelta >= 0 ? "good" : "warn"}
              note="All channels combined"
            />
            <MetricCard
              label="Paid Social Volume"
              value={sim.psCustomers.toLocaleString()}
              change={isBase ? undefined : `${psDelta.toLocaleString()} vs. base`}
              sentiment={isBase ? "neutral" : "warn"}
              note="The number the board watches"
            />
            <MetricCard
              label="Blended Payback Period"
              value={`${sim.blendedPayback.toFixed(1)} mo`}
              change={isBase ? undefined : `${paybackDelta.toFixed(1)} mo vs. base`}
              sentiment={isBase ? "neutral" : paybackDelta < 0 ? "good" : "warn"}
              note="Paid channels only"
            />
            <MetricCard
              label="Cash Tied to Payback"
              value={`$${(sim.cashAtRisk / 1_000_000).toFixed(2)}M`}
              change={isBase ? undefined : `${cashDelta < 0 ? "-" : "+"}$${Math.abs(cashDelta / 1_000).toFixed(0)}K vs. base`}
              sentiment={isBase ? "neutral" : cashDelta < 0 ? "good" : "warn"}
              note="Monthly spend × payback months"
            />
          </div>

          {!isBase && (
            <div className="text-xs text-slate-600 bg-slate-50 rounded-xl p-4 border border-slate-100 leading-relaxed">
              <strong className="text-slate-800">What the board sees:</strong> paid social volume dropped{" "}
              {(((base.psCustomers - sim.psCustomers) / base.psCustomers) * 100).toFixed(0)}% — looks like slower growth.{" "}
              <strong className="text-slate-800">What actually happened:</strong> total customer acquisition went up{" "}
              {(((sim.totalCustomers - base.totalCustomers) / base.totalCustomers) * 100).toFixed(0)}% and cash efficiency improved.
            </div>
          )}
        </section>

        {/* ── Beat 5 — CFO Callout ── */}
        <section>
          <div className="bg-pink-50 border border-pink-100 rounded-2xl p-8">
            <div className="text-[10px] font-bold uppercase tracking-widest text-pink-600 mb-4">05 — The Call + The Tradeoff</div>
            <h2 className="text-xl font-bold text-slate-900 mb-6">What to tell the board</h2>

            <div className="space-y-4 text-sm text-slate-700 leading-relaxed mb-6">
              <p>
                <strong className="text-slate-900">The recommendation:</strong> cap paid social spend growth and reallocate 30% of budget to the affiliate channel (5-month payback), even though that channel has lower absolute volume.
              </p>
              <p>
                <strong className="text-slate-900">What you give up:</strong> slower headline growth this quarter. A less impressive top-of-funnel number.
              </p>
              <p>
                <strong className="text-slate-900">What you protect:</strong> the company stops being structurally dependent on future fundraising just to keep customer acquisition running.
              </p>
            </div>

            <div className="border-t border-pink-200 pt-5 mb-5">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-4 h-4 text-pink-600 mt-0.5 shrink-0" />
                <p className="text-sm text-pink-900 leading-relaxed">
                  <strong>The uncomfortable truth to name directly:</strong> the growth rate reported to investors is not sustainable at the current CAC trajectory. Continuing to present it inside a blended metric is a credibility problem, not just a math problem.
                </p>
              </div>
            </div>

            <Link href="/concept-explorer/saas" className="text-xs font-bold text-pink-600 hover:text-pink-700 transition-colors">
              New to LTV:CAC or payback period? See the SaaS metrics dictionary →
            </Link>
          </div>
        </section>
      </div>

      <footer className="border-t border-slate-100 bg-white py-8 mt-auto w-full">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6 text-sm font-medium text-slate-500">
          <div className="flex gap-6">
            <Link href="/terms" className="hover:text-slate-900 transition-colors">Terms</Link>
            <Link href="/privacy" className="hover:text-slate-900 transition-colors">Privacy</Link>
          </div>
          <p className="text-xs text-slate-400">© {new Date().getFullYear()} Tonina.me</p>
        </div>
      </footer>
    </main>
  );
}
