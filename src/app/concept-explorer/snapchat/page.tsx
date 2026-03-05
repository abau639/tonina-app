"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Target, Activity, Users, Lightbulb, AlertTriangle, CheckCircle2, Search, Briefcase, Zap } from "lucide-react";

// Desaturated, grayscale emoji logo
const DolphinLogo = ({ className = "text-2xl" }: { className?: string }) => (
  <span className={`inline-block grayscale opacity-80 select-none ${className}`} style={{ lineHeight: 1 }}>
    🐋
  </span>
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

// --- DATA & CONTENT ---
const ROLES = [
  { id: "pm", title: "Product Manager", icon: <Target className="w-5 h-5" />, desc: "Focuses on user experience, feature adoption, and solving the core problem." },
  { id: "finance", title: "Finance & Strategy", icon: <Activity className="w-5 h-5" />, desc: "Focuses on margin, LTV, churn reduction ROI, and resource allocation." },
  { id: "eng", title: "Engineering Lead", icon: <Zap className="w-5 h-5" />, desc: "Focuses on infrastructure, speed to market, and technical debt." },
  { id: "marketing", title: "Product Marketing", icon: <Users className="w-5 h-5" />, desc: "Focuses on narrative, PR perception, and top-of-funnel acquisition." }
];

const METRICS_DB = [
  { id: "churn_age", label: "Churn Rate by Age Cohort", optimal: true, data: "Teen churn (13-17) has accelerated from 4% to 9% monthly CAGR over the last 3 quarters. 18-24 cohort remains stable at 3%." },
  { id: "parent_del", label: "Vol. of Parent-Initiated Deletions", optimal: true, data: "Customer Support tickets requesting account deletion by parents increased 315% YoY." },
  { id: "new_funnel", label: "New User Acquisition Funnel", optimal: false, data: "CAC for the 13-17 demographic has increased 40%, but top-of-funnel clicks remain high. (Note: Pouring water into a leaky bucket)." },
  { id: "arpu_teen", label: "ARPU for Teen Segment", optimal: true, data: "Despite being our most engaged daily users, ARPU for 13-17 is $2.10 compared to $5.50 for 18-24. However, their LTV is massive if retained." },
  { id: "dev_cost", label: "Est. Development Cost & Timeline", optimal: false, data: "Building a parental linking system requires cross-functional backend work. Est. time: 14 weeks. Cost: $1.2M in engineering hours." },
  { id: "comp_safety", label: "Competitor Safety Feature Adoption", optimal: true, data: "TikTok and Instagram rolled out 'Family Pairing' last year; their teen retention stabilized within 2 quarters post-launch." },
  { id: "server_cost", label: "Server Infrastructure Load", optimal: false, data: "Current server load is operating at 78% capacity. Not an immediate bottleneck for this feature." },
  { id: "alt_monetize", label: "Alternative Monetization (Subscriptions)", optimal: false, data: "Snapchat+ is growing, but teen adoption is less than 1%. (Note: Doesn't solve the core safety/churn mandate)." }
];

const STRATEGIES = [
  { 
    id: "ab_test", 
    title: "The Measured Rollout (Dark Launch)", 
    desc: "Run a quiet A/B test in a smaller, representative market (e.g., Australia/New Zealand) targeting parents with marketing, measuring teen churn impact over 6 weeks before global launch.",
    score: "Optimal",
    risks: ["We continue bleeding users in the core US market for another 2 months.", "Competitors might announce further safety features, making us look slow."],
    opportunities: ["Allows us to catch UI friction points where teens might feel 'spied on' and abandon the app entirely.", "Provides hard data to align leadership before a high-stakes global PR push."]
  },
  { 
    id: "global_pr", 
    title: "The Blitz (Immediate Global Launch)", 
    desc: "Bypass extended testing. Push the engineering team to ship globally in 8 weeks accompanied by a massive PR campaign to win back the parental narrative.",
    score: "High Risk / High Reward",
    risks: ["If the implementation is clunky, teens will revolt and delete the app en masse.", "Engineering will incur massive technical debt rushing the backend linking systems."],
    opportunities: ["Instantly changes the media narrative.", "Immediately halts the parent-initiated churn if executed perfectly."]
  },
  { 
    id: "paywall", 
    title: "The Premium Safety Model", 
    desc: "Build the Family Center, but bundle it into Snapchat+. Parents must pay $3.99/mo to access supervision tools.",
    score: "Critical Failure",
    risks: ["Catastrophic PR nightmare ('Snapchat profits off child safety').", "Low adoption rate guarantees the churn problem continues unchecked."],
    opportunities: ["Short-term bump in Subscription Revenue (ARPU), though heavily offset by churn."]
  },
  { 
    id: "pivot", 
    title: "The Pivot (Ignore the Mandate)", 
    desc: "Argue that parental controls kill the 'cool factor'. Instead, divert resources to building viral Gen-AI lenses to out-acquire the churn.",
    score: "Career Limiting",
    risks: ["You are directly ignoring a leadership directive regarding a systemic threat.", "Acquisition costs will continue to rise while LTV plummets."],
    opportunities: ["A viral hit might temporarily mask the underlying retention issue."]
  }
];

export default function SnapchatCaseStudy() {
  const [step, setStep] = useState<"intro" | "role" | "context" | "data_gather" | "data_review" | "pitch" | "evaluation">("intro");
  const [role, setRole] = useState("");
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([]);
  const [strategy, setStrategy] = useState("");

  const toggleMetric = (id: string) => {
    if (selectedMetrics.includes(id)) {
      setSelectedMetrics(selectedMetrics.filter(m => m !== id));
    } else if (selectedMetrics.length < 3) {
      setSelectedMetrics([...selectedMetrics, id]);
    }
  };

  const currentRole = ROLES.find(r => r.id === role);
  const currentStrategy = STRATEGIES.find(s => s.id === strategy);

  if (step === "intro") {
    return (
      <main className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
        <GlobalNav />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-2xl bg-white p-10 md:p-14 rounded-3xl border border-slate-200 shadow-sm text-center">
            <div className="inline-flex items-center gap-2 bg-yellow-50 text-yellow-700 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border border-yellow-200 mb-6">
              Interactive Case Study
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 mb-4">Project: Family Center</h1>
            <p className="text-lg text-slate-500 mb-8 leading-relaxed">
              A crisis simulation. You will select a role, gather data under pressure, and present a strategic recommendation to a polarized leadership team.
            </p>
            <button 
              onClick={() => setStep("role")}
              className="bg-slate-900 text-white px-8 py-3.5 rounded-full font-bold hover:bg-slate-800 transition-all shadow-sm flex items-center gap-2 mx-auto"
            >
              Enter the War Room <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (step === "role") {
    return (
      <main className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
        <GlobalNav />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-3xl w-full bg-white p-8 md:p-12 rounded-3xl border border-slate-200 shadow-sm">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Select Your Role</h2>
            <p className="text-slate-500 mb-8">Your discipline dictates how your final strategy will be evaluated by leadership.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {ROLES.map(r => (
                <button 
                  key={r.id}
                  onClick={() => { setRole(r.id); setStep("context"); }}
                  className="text-left p-6 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-white hover:border-pink-300 hover:shadow-md transition-all group"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-white rounded-lg border border-slate-200 group-hover:text-pink-600 transition-colors">{r.icon}</div>
                    <h3 className="font-bold text-slate-900">{r.title}</h3>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">{r.desc}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (step === "context") {
    return (
      <main className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
        <GlobalNav />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-2xl w-full bg-white p-10 md:p-12 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-yellow-400"></div>
            <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
              <Briefcase className="w-3 h-3" /> Executive Briefing • {currentRole?.title}
            </h2>
            <h3 className="text-3xl font-bold text-slate-900 mb-6">The Mandate</h3>
            <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 mb-8 text-slate-700 leading-relaxed text-lg border-l-4 border-l-rose-500">
              <p><strong>Founded or unfounded, this is the context:</strong> User growth is plateauing. Teen churn is rising rapidly, driven heavily by parental bans and safety concerns.</p>
            </div>
            <p className="text-slate-600 mb-8 leading-relaxed">
              Leadership is polarized. Some believe adding supervision tools will alienate our core teen demographic. Others believe if we don't appease parents, the platform dies. You have 3 months to make an impact. No room to question the premise—just fix the churn.
            </p>
            <button 
              onClick={() => setStep("data_gather")}
              className="w-full bg-slate-900 text-white px-6 py-4 rounded-xl font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
            >
              Pull the Data <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (step === "data_gather") {
    return (
      <main className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
        <GlobalNav />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-4xl w-full bg-white p-8 md:p-12 rounded-3xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-end mb-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Data Acquisition</h2>
                <p className="text-slate-500">Select exactly <strong className="text-pink-600">3 metrics</strong> to build your case for the leadership meeting.</p>
              </div>
              <div className="text-sm font-bold bg-slate-100 px-4 py-2 rounded-lg text-slate-600">
                {selectedMetrics.length} / 3 Selected
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
              {METRICS_DB.map(m => {
                const isSelected = selectedMetrics.includes(m.id);
                return (
                  <button
                    key={m.id}
                    onClick={() => toggleMetric(m.id)}
                    className={`text-left p-4 rounded-xl border transition-all ${
                      isSelected 
                        ? 'bg-pink-50 border-pink-400 shadow-sm' 
                        : 'bg-white border-slate-200 hover:border-slate-300 text-slate-600'
                    } ${selectedMetrics.length >= 3 && !isSelected ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`font-medium ${isSelected ? 'text-pink-900' : 'text-slate-700'}`}>{m.label}</span>
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-pink-600" />}
                    </div>
                  </button>
                )
              })}
            </div>

            <button 
              disabled={selectedMetrics.length !== 3}
              onClick={() => setStep("data_review")}
              className={`w-full px-6 py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
                selectedMetrics.length === 3 
                  ? 'bg-slate-900 text-white hover:bg-slate-800 shadow-md' 
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Search className="w-4 h-4" /> Review Findings
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (step === "data_review") {
    const findings = METRICS_DB.filter(m => selectedMetrics.includes(m.id));
    const optimalCount = findings.filter(m => m.optimal).length;

    return (
      <main className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
        <GlobalNav />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-3xl w-full bg-white p-8 md:p-12 rounded-3xl border border-slate-200 shadow-sm">
            <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2"><Lightbulb className="w-6 h-6 text-yellow-500"/> Synthesis & Intelligence</h2>
            
            <div className="space-y-4 mb-8">
              {findings.map(f => (
                <div key={f.id} className="p-5 rounded-xl border border-slate-100 bg-slate-50">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{f.label}</span>
                  <p className="text-slate-800 leading-relaxed font-medium">{f.data}</p>
                </div>
              ))}
            </div>

            <div className={`p-4 rounded-xl border mb-8 ${optimalCount === 3 ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : optimalCount > 0 ? 'bg-blue-50 border-blue-200 text-blue-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
              <strong className="block mb-1">Signal Quality: {optimalCount}/3 Optimal</strong>
              <p className="text-sm">
                {optimalCount === 3 && "Excellent. You pulled highly actionable signals. Leadership will be forced to listen."}
                {optimalCount > 0 && optimalCount < 3 && "Mixed signals. You have some good data, but brought noise to the table. You'll have to rely heavily on your strategic intuition."}
                {optimalCount === 0 && "Poor signal. You pulled vanity metrics or irrelevant data. You are flying blind into this pitch."}
              </p>
            </div>

            <button 
              onClick={() => setStep("pitch")}
              className="w-full bg-slate-900 text-white px-6 py-4 rounded-xl font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
            >
              Enter the Pitch <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (step === "pitch") {
    return (
      <main className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
        <GlobalNav />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-3xl w-full bg-white p-8 md:p-12 rounded-3xl border border-slate-200 shadow-sm">
            <h2 className="text-[10px] font-bold text-rose-500 uppercase tracking-widest mb-2">The Boardroom</h2>
            <h3 className="text-2xl font-bold text-slate-900 mb-4">The Strategic Decision</h3>
            <p className="text-slate-600 mb-8 leading-relaxed">
              You present the data. Leadership immediately pushes back: <em>"If we add parental supervision, won't the teens just feel spied on and leave for a competitor with zero supervision?"</em> <br/><br/>
              As the lead <strong className="text-slate-900">{currentRole?.title}</strong>, what is your execution strategy?
            </p>

            <div className="space-y-4">
              {STRATEGIES.map(s => (
                <button
                  key={s.id}
                  onClick={() => { setStrategy(s.id); setStep("evaluation"); }}
                  className="w-full text-left p-6 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-white hover:border-pink-400 hover:shadow-md transition-all group"
                >
                  <h4 className="font-bold text-slate-900 text-lg mb-2 group-hover:text-pink-600 transition-colors">{s.title}</h4>
                  <p className="text-sm text-slate-600 leading-relaxed">{s.desc}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (step === "evaluation" && currentStrategy) {
    const findings = METRICS_DB.filter(m => selectedMetrics.includes(m.id));
    const optimalCount = findings.filter(m => m.optimal).length;
    
    return (
      <main className="min-h-screen bg-slate-950 text-slate-50 font-sans flex flex-col">
        <GlobalNav />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-4xl w-full py-12">
            
            <div className="text-center mb-12">
              <span className="text-pink-500 font-bold uppercase tracking-widest text-sm mb-4 block">Post-Mortem Review</span>
              <h1 className="text-4xl font-bold text-white mb-2">Strategy {currentStrategy.score}</h1>
              <p className="text-slate-400">Evaluating your execution as a {currentRole?.title}.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-8">
              {/* Risks */}
              <div className="bg-rose-950/20 border border-rose-900/50 p-6 rounded-2xl">
                <h3 className="text-rose-400 font-bold uppercase tracking-widest text-xs flex items-center gap-2 mb-4">
                  <AlertTriangle className="w-4 h-4" /> Realized Risks
                </h3>
                <ul className="space-y-3">
                  {currentStrategy.risks.map((r, i) => (
                    <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                      <span className="text-rose-500 mt-0.5">•</span> {r}
                    </li>
                  ))}
                  {optimalCount < 2 && (
                    <li className="text-sm text-slate-300 flex items-start gap-2 italic">
                      <span className="text-rose-500 mt-0.5">•</span> Your lack of optimal data going into the pitch severely weakened your authority in the room.
                    </li>
                  )}
                </ul>
              </div>

              {/* Opportunities */}
              <div className="bg-emerald-950/20 border border-emerald-900/50 p-6 rounded-2xl">
                <h3 className="text-emerald-400 font-bold uppercase tracking-widest text-xs flex items-center gap-2 mb-4">
                  <Target className="w-4 h-4" /> Captured Opportunities
                </h3>
                <ul className="space-y-3">
                  {currentStrategy.opportunities.map((o, i) => (
                    <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                      <span className="text-emerald-500 mt-0.5">•</span> {o}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Social Media / Market Reaction */}
            <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl text-center mb-10">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Market Reaction (T+90 Days)</h3>
              <p className="text-lg text-slate-300 leading-relaxed italic">
                {currentStrategy.id === "ab_test" && `"Snapchat's quiet rollout of Family Center in AUS shows promising retention stabilization. By addressing UI friction early, they avoided the expected teen exodus." - TechCrunch`}
                {currentStrategy.id === "global_pr" && `"Snapchat launches massive safety overhaul. Parents applaud, but initial data shows a spike in teen account deletions due to confusing privacy controls." - The Verge`}
                {currentStrategy.id === "paywall" && `"Outrage: Snapchat places child safety tools behind a $3.99 paywall. Stock drops 6% on the news." - Bloomberg`}
                {currentStrategy.id === "pivot" && `"Snapchat ignores safety concerns, launches new Gen-AI lenses. Top-of-funnel growth spikes temporarily, but underlying teen churn continues to hemorrhage." - WSJ`}
              </p>
            </div>

            <div className="flex justify-center">
              <Link 
                href="/concept-explorer"
                className="bg-white text-slate-900 px-8 py-3.5 rounded-full font-bold hover:bg-slate-200 transition-all shadow-sm flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" /> Return to Concepts
              </Link>
            </div>

          </div>
        </div>
      </main>
    );
  }

  return null;
}