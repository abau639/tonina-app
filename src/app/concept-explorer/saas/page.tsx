"use client";

import Link from "next/link";
import { useState } from "react";
import { BookOpen, DollarSign, Users, Activity, BarChart3 } from "lucide-react";

// Desaturated, grayscale emoji logo
const DolphinLogo = ({ className = "text-2xl" }: { className?: string }) => (
  <span className={`inline-block grayscale opacity-80 select-none ${className}`} style={{ lineHeight: 1 }}>
    🐋
  </span>
);

const CATEGORIES = [
  { id: "all", label: "All Metrics" },
  { id: "revenue", label: "Revenue & Growth" },
  { id: "acquisition", label: "Acquisition" },
  { id: "retention", label: "Retention & Loyalty" },
  { id: "efficiency", label: "Financial Efficiency" },
];

const METRICS = [
  // REVENUE
  {
    category: "revenue",
    title: "ARR / MRR",
    name: "Annual / Monthly Recurring Revenue",
    formula: "Total predictable subscription revenue normalized to a yearly/monthly amount.",
    description: "The lifeblood of SaaS. It excludes one-time fees (like implementation) and focuses purely on the predictable revenue engine.",
    icon: <DollarSign className="w-5 h-5 text-emerald-500" />
  },
  {
    category: "revenue",
    title: "Net New MRR",
    name: "Net New Monthly Recurring Revenue",
    formula: "(New MRR + Expansion MRR) - (Churned MRR + Contraction MRR)",
    description: "The true measure of growth in a given month. If this number is negative, the business is shrinking regardless of new sales.",
    icon: <DollarSign className="w-5 h-5 text-emerald-500" />
  },
  {
    category: "revenue",
    title: "TCV vs. ACV",
    name: "Total Contract Value vs. Annual Contract Value",
    formula: "TCV = Total value over entire contract length. ACV = TCV / Years.",
    description: "A massive 3-year deal has a high TCV, but investors look at ACV to understand the actual annual revenue run-rate.",
    icon: <DollarSign className="w-5 h-5 text-emerald-500" />
  },

  // ACQUISITION
  {
    category: "acquisition",
    title: "CAC",
    name: "Customer Acquisition Cost",
    formula: "Total S&M Spend / Number of New Customers Acquired",
    description: "How much it costs to buy a customer. If CAC is rising faster than LTV, the Go-To-Market (GTM) motion is becoming inefficient.",
    icon: <Users className="w-5 h-5 text-blue-500" />
  },
  {
    category: "acquisition",
    title: "Pipeline Coverage",
    name: "Sales Pipeline Coverage Ratio",
    formula: "Total Unclosed Pipeline Value / Sales Quota Target",
    description: "A leading indicator for future sales. Generally, B2B companies want 3x-4x coverage because they assume they will only win 25-33% of the deals they pitch.",
    icon: <Users className="w-5 h-5 text-blue-500" />
  },
  {
    category: "acquisition",
    title: "DAU / MAU Ratio",
    name: "Daily Active Users to Monthly Active Users",
    formula: "DAU / MAU (Expressed as a %)",
    description: "A pure measure of product stickiness. A 50% ratio means the average user logs in 15 out of 30 days a month. Ideal for PLG (Product-Led Growth).",
    icon: <Users className="w-5 h-5 text-blue-500" />
  },

  // RETENTION
  {
    category: "retention",
    title: "Gross Retention Rate",
    name: "Gross Revenue Retention (GRR)",
    formula: "(Starting MRR - Downgrades - Churn) / Starting MRR",
    description: "Measures how well you keep your existing revenue without relying on upselling. GRR maxes out at 100%. High GRR means a highly sticky, necessary product.",
    icon: <Activity className="w-5 h-5 text-rose-500" />
  },
  {
    category: "retention",
    title: "Net Dollar Retention",
    name: "Net Revenue Retention (NDR)",
    formula: "(Starting MRR + Expansion - Contraction - Churn) / Starting MRR",
    description: "The holy grail of SaaS. An NDR > 100% means the company grows even if they acquire zero new customers because existing customers are upgrading.",
    icon: <Activity className="w-5 h-5 text-rose-500" />
  },
  {
    category: "retention",
    title: "NPS",
    name: "Net Promoter Score",
    formula: "% Promoters (Score 9-10) - % Detractors (Score 0-6)",
    description: "A qualitative survey metric that highly correlates with future churn. If NPS drops, NDR will usually drop 1-2 quarters later.",
    icon: <Activity className="w-5 h-5 text-rose-500" />
  },

  // EFFICIENCY
  {
    category: "efficiency",
    title: "Rule of 40",
    name: "The Growth + Profitability Benchmark",
    formula: "YoY Revenue Growth Rate (%) + EBITDA Margin (%)",
    description: "A quick health check for late-stage SaaS. If the sum is > 40%, the business is balancing growth and burn effectively.",
    icon: <BarChart3 className="w-5 h-5 text-purple-500" />
  },
  {
    category: "efficiency",
    title: "SaaS Magic Number",
    name: "Sales Efficiency Ratio",
    formula: "Current Qtr Net New ARR / Previous Qtr S&M Spend",
    description: "Tells you if you should pour more fuel on the fire. A Magic Number > 0.75 indicates efficient S&M; < 0.5 means you have a leaky bucket.",
    icon: <BarChart3 className="w-5 h-5 text-purple-500" />
  },
  {
    category: "efficiency",
    title: "CAC Payback",
    name: "CAC Payback Period",
    formula: "CAC / (ARPU * Gross Margin)",
    description: "How many months it takes to earn back the cost of acquiring the customer. Best-in-class startups aim for < 12 months.",
    icon: <BarChart3 className="w-5 h-5 text-purple-500" />
  }
];

export default function SaasDictionary() {
  const [activeFilter, setActiveFilter] = useState("all");

  const filteredMetrics = activeFilter === "all" 
    ? METRICS 
    : METRICS.filter(m => m.category === activeFilter);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-24">
      {/* Global Nav Banner */}
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

      <header className="max-w-3xl mx-auto px-6 pt-16 pb-10 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 mb-4">The Language of SaaS</h1>
        <p className="text-lg text-slate-500 leading-relaxed">
          A definitive primer on the metrics that drive software valuation. Understand how modern businesses measure growth, retention, and capital efficiency.
        </p>
      </header>

      <div className="max-w-6xl mx-auto px-6">
        
        {/* Filters */}
        <div className="flex flex-wrap justify-center gap-2 mb-12">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveFilter(cat.id)}
              className={`px-5 py-2 text-xs font-bold uppercase tracking-wider rounded-full transition-all ${
                activeFilter === cat.id 
                  ? 'bg-slate-900 text-white shadow-md' 
                  : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Dictionary Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMetrics.map((metric, idx) => (
            <div key={idx} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 mb-1">{metric.title}</h3>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{metric.name}</span>
                </div>
                <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                  {metric.icon}
                </div>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-4 mt-auto">
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Calculation</span>
                <div className="text-sm font-semibold text-pink-600 leading-snug">{metric.formula}</div>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">
                {metric.description}
              </p>
            </div>
          ))}
        </div>

      </div>
    </main>
  );
}