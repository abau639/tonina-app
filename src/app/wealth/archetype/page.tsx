"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight, User, Heart, Brain, RefreshCcw, Activity, Share2, TrendingUp, TrendingDown, Minus, LineChart, Home, GraduationCap, ShieldCheck, Palmtree } from "lucide-react";

// --- CORE DATA STRUCTURES & CONFIGURATION --- //

const INITIAL_STATE = {
  HC: 40,   // Human Capital
  SC: 30,   // Social Capital
  WI: 50,   // Work Intensity
  RT: 50,   // Risk Tolerance
  FS: 50,   // Family Stability
  HLTH: 70, // Health
  LS: 60,   // Life Satisfaction
  NW: 0,    // Net Worth ($)
  SR: 0.15, // Savings Rate (15% default)
  flags: [] as string[] // Hidden state flags for complex branching
};

// High-Impact Age-Gated Decisions
const DECISIONS = [
  { minAge: 18, maxAge: 19, title: "The Academic Focus", text: "You are entering university. You need to declare your focus. What is your primary objective?", choices: [
    { text: "STEM: Optimize for technical skills.", deltas: { HC: +15, WI: +10, LS: -5, SR: +0.05 }, setFlags: ["stem"], narrative: "You embrace the grind of labs and code. The coursework is brutal, but the expected ROI is high." },
    { text: "Business: Optimize for earning & network.", deltas: { SC: +15, RT: +10, WI: +5 }, setFlags: ["business"], narrative: "You learn the language of capital. You are already thinking about leverage and margins." },
    { text: "Social Sciences & Humanities: Optimize for passion.", deltas: { LS: +15, HC: +5, RT: -10, SR: -0.05 }, setFlags: ["humanities"], narrative: "You study what you love and expand your worldview. The financial path forward is murky, but your soul is intact." },
    { text: "Arts & Design: Optimize for creativity.", deltas: { LS: +20, HC: +5, RT: +15, SR: -0.10 }, setFlags: ["arts"], narrative: "You dedicate yourself to creation. The portfolio is stunning, but the career stability is inherently chaotic." },
    { text: "Pre-Law / Public Policy: Optimize for impact.", deltas: { HC: +10, SC: +10, SR: -0.05 }, setFlags: ["pre_law"], narrative: "You prepare for a career in service and argumentation. You'll need more school, but the paths are powerful." },
    { text: "Pre-Med / Health: Optimize for prestige & stability.", deltas: { HC: +25, WI: +20, SR: -0.15, NW: -150000 }, setFlags: ["pre_med"], narrative: "You commit to a decade of training. You take on massive debt immediately, betting entirely on your future self." }
  ]},
  { minAge: 20, maxAge: 22, title: "The University Experience", text: "You have limited free time outside of classes. How do you spend it?", choices: [
    { text: "Grind Academics & Internships.", deltas: { HC: +15, WI: +15, LS: -10 }, narrative: "Your resume is flawless. Your social life is nonexistent." },
    { text: "Network & Socialize (Greek Life/Clubs).", deltas: { SC: +20, RT: +10, WI: -5 }, setFlags: ["networker"], narrative: "Your contact list is massive. You know exactly who to call for favors." },
    { text: "Work on Professor's Passion Projects.", deltas: { HC: +10, LS: +10, SC: +5 }, setFlags: ["academia"], narrative: "You fall in love with deep research and build a powerful mentor relationship." },
    { text: "Enjoy Freedom.", deltas: { LS: +20, WI: -15, HC: -5 }, setFlags: ["coast"], narrative: "These are the best years of your life. You make memories, but build no leverage." }
  ]},
  
  // DYNAMIC CAREER ENTRY (Age 23-26)
  { minAge: 23, maxAge: 26, title: "The First Offer", condition: (flags: string[]) => !flags.includes("pre_law") && !flags.includes("pre_med") && !flags.includes("arts"), text: "You have entered the real world. Multiple paths are open.", choices: [
    { text: "Corporate Titan: High pay, stable, slow.", deltas: { HC: +5, RT: -10, FS: +10, SR: +0.05, NW: +15000 }, narrative: "You enter the labyrinth of middle management. The paychecks clear every two weeks without fail." },
    { text: "Series A Startup: Low pay, high equity.", deltas: { HC: +15, WI: +15, RT: +20, SR: -0.05, NW: -5000 }, narrative: "You wear six different hats. The pay is low, but you are learning at hyper-speed." },
    { text: "Pursue a fully-funded PhD.", condition: (flags: string[]) => flags.includes("academia"), deltas: { HC: +30, WI: +10, LS: +15, NW: -15000, SR: -0.10 }, setFlags: ["phd"], narrative: "You stay in the ivory tower. Your human capital is immense, but you delay your earning years significantly." }
  ]},
  { minAge: 23, maxAge: 26, title: "The Law Crossroads", condition: (flags: string[]) => flags.includes("pre_law"), text: "You have passed the Bar. Where do you deploy your legal leverage?", choices: [
    { text: "BigLaw Associate: High pay, brutal hours.", deltas: { NW: -100000, HC: +20, WI: +40, SR: +0.15, LS: -15 }, narrative: "You take on huge debt, but your starting salary is astronomical. You essentially live at the office." },
    { text: "Public Defender / Non-Profit: Low pay, high impact.", deltas: { NW: -80000, HC: +10, LS: +20, SR: -0.05, SC: +15 }, setFlags: ["public_defender"], narrative: "You fight for the underserved. The work is deeply fulfilling, but the financial strain is constant." },
    { text: "Career Pivot: Consulting.", deltas: { NW: -150000, HC: +15, RT: +15, SR: +0.05 }, narrative: "You abandon law entirely to leverage your analytical skills in corporate strategy. The debt remains, but the ceiling is high." }
  ]},
  { minAge: 23, maxAge: 26, title: "The Residency Match", condition: (flags: string[]) => flags.includes("pre_med"), text: "You are officially a Doctor. Where do you practice?", choices: [
    { text: "Private Practice Hustle: High risk, high reward.", deltas: { NW: -250000, HC: +30, WI: +20, RT: +20, SR: +0.15 }, narrative: "You take on extreme debt to buy into a clinic. If it scales, you will be incredibly wealthy." },
    { text: "Major Hospital System: Stable, grueling.", deltas: { NW: -200000, HC: +25, WI: +30, SR: +0.10, HLTH: -10 }, narrative: "You become a cog in a massive healthcare machine. The income is guaranteed, but the burnout rate is severe." },
    { text: "Public Health & Research: Better hours, lower pay.", deltas: { NW: -150000, HC: +20, WI: -5, LS: +15, SR: -0.05 }, narrative: "You prioritize sanity and societal impact. You will never be a billionaire, but you sleep well at night." }
  ]},
  { minAge: 23, maxAge: 26, title: "The Creative's Dilemma", condition: (flags: string[]) => flags.includes("arts"), text: "You have a stellar portfolio. How do you monetize it?", choices: [
    { text: "Startup Founding Designer.", deltas: { RT: +25, WI: +15, SR: -0.05, NW: -2000 }, narrative: "You take a massive equity risk to define the visual language of a new tech company." },
    { text: "Sell Out: Corporate Marketing.", deltas: { HC: +5, LS: -15, SR: +0.05, NW: +10000 }, narrative: "You design banner ads for a bank. It crushes your soul, but the 401k match is excellent." },
    { text: "Starving Artist: Freelance Hustle.", deltas: { RT: +20, LS: +20, SR: -0.10, WI: +10 }, setFlags: ["coast"], narrative: "You answer to no one. Your income is incredibly volatile, but your creative freedom is absolute." }
  ]},

  { minAge: 27, maxAge: 30, title: "The Relationship", text: "You've been dating someone seriously. They want to merge finances and move to a new city for their career.", choices: [
    { text: "Commit and relocate.", deltas: { FS: +25, RT: -10, HC: -5, NW: -8000 }, setFlags: ["relocated"], onChoose: (s: any, addLog: Function) => {
        if (Math.random() < 0.5) {
            s.NW += 60000; s.HC += 10; s.SR += 0.05;
            addLog("Lucky Break: The relocation was a blessing in disguise. You instantly landed a massive promotion in the new city.");
        }
    }, narrative: "You prioritize the partnership. Moving is expensive, but your home life is rock solid." },
    { text: "Refuse. Break it off.", deltas: { FS: -20, WI: +15, LS: -15, SR: +0.05 }, narrative: "You choose your ambition. You are heartbroken, but completely unencumbered financially." },
  ]},
  { minAge: 31, maxAge: 33, title: "The Real Estate Question", text: "You have enough for a down payment on a house, or you can keep investing in the market.", choices: [
    { text: "Buy the house. Put down roots.", deltas: { RT: -15, FS: +15, SR: -0.05, NW: -50000 }, setFlags: ["owns_house"], narrative: "You are officially a homeowner. A massive chunk of liquid cash is gone to closing costs, but you're building physical equity." },
    { text: "Keep renting. Stay liquid.", deltas: { RT: +10, FS: -5, SR: +0.05 }, narrative: "You maintain total flexibility and keep shoveling money into index funds." }
  ]},
  { minAge: 34, maxAge: 36, title: "The Legacy Investment", condition: (flags: string[]) => flags.includes("relocated"), text: "Your family is growing, and you must decide how to handle the skyrocketing costs of future education.", choices: [
    { text: "Fully fund the 529 plans now.", deltas: { NW: -60000, FS: +20, SR: -0.05 }, setFlags: ["funded_legacy"], narrative: "You take a massive hit to your liquid net worth today to ensure the next generation starts with zero debt. The peace of mind is profound." },
    { text: "Rely on public schools and scholarships.", deltas: { NW: +15000, FS: -10, RT: +10 }, narrative: "You keep your capital invested in the market. It maximizes your own compounding, but introduces risk for your dependents." }
  ]},
  { minAge: 37, maxAge: 42, title: "The Shield: Physical Breakdown", text: "Years of stress and sitting manifest as severe, recurring back pain. The doctor prescribes 6 weeks of intensive physical therapy and a lifestyle overhaul.", choices: [
    { text: "Take the time off to heal.", deltas: { HLTH: +25, NW: -15000, WI: -15, SR: -0.05 }, setFlags: ["shield_active"], narrative: "You spend heavily on your biology and step back from work. You lose career momentum but feel a decade younger." },
    { text: "Work through the pain.", deltas: { HLTH: -30, WI: +10, LS: -20, SR: +0.02 }, setFlags: ["shield_failed"], narrative: "You pop ibuprofen, skip therapy, and keep grinding. The structural damage becomes permanent." }
  ]},
  
  // DYNAMIC MID-CAREER (Age 43-50)
  { minAge: 43, maxAge: 50, title: "The Partnership Track", condition: (flags: string[]) => flags.includes("pre_law"), text: "You have reached the make-or-break moment in your legal career.", choices: [
    { text: "Grind for Partner (120+ hr weeks).", deltas: { HC: +20, WI: +40, FS: -30, HLTH: -20, SR: +0.25 }, narrative: "You sell your soul for the equity slice. You are incredibly wealthy, and incredibly isolated." },
    { text: "Go In-House as General Counsel.", deltas: { HC: -5, WI: -20, FS: +20, LS: +10, SR: -0.05 }, narrative: "You accept a flat salary to reclaim your weekends. Your family finally sees you." },
    { text: "Retire Early & Live Frugally.", deltas: { WI: -80, SR: -0.40, LS: +30, RT: -20, FS: +10 }, setFlags: ["retired_early"], narrative: "You walk away from the law entirely. You survive purely on your portfolio." }
  ]},
  { minAge: 43, maxAge: 50, title: "The Attending Crossroads", condition: (flags: string[]) => flags.includes("pre_med"), text: "You are a senior physician. How do you structure your final working decades?", choices: [
    { text: "Chief of Surgery / Scale the Clinic.", deltas: { HC: +20, WI: +30, FS: -25, HLTH: -15, SR: +0.20 }, narrative: "You take on massive administrative overhead. The money is obscene, but the stress is lethal." },
    { text: "Maintain Clinical Shifts Only.", deltas: { WI: -10, FS: +15, LS: +10, SR: -0.05 }, narrative: "You step off the ambition treadmill to just practice medicine and go home." },
    { text: "Retire Early & Live Frugally.", deltas: { WI: -80, SR: -0.40, LS: +30, RT: -20, FS: +10 }, setFlags: ["retired_early"], narrative: "You walk away from medicine entirely. You survive purely on your portfolio." }
  ]},
  { minAge: 43, maxAge: 50, title: "The Creative Zenith", condition: (flags: string[]) => flags.includes("arts"), text: "Your portfolio has caught the eye of massive brands.", choices: [
    { text: "Scale your own independent agency.", deltas: { HC: +20, WI: +30, FS: -20, HLTH: -15, SR: +0.15 }, narrative: "You stop creating and start managing. The revenue spikes, but the stress of payroll is exhausting." },
    { text: "Accept a Massive Corporate Buyout.", deltas: { NW: +1500000, WI: -10, LS: -20, RT: -15 }, narrative: "You sell your IP to a conglomerate. You are instantly rich, but lose total control over your life's work." },
    { text: "Stay a Solo Artisan.", deltas: { WI: -10, LS: +25, SR: -0.05 }, narrative: "You reject scale. Your income stays flat, but your creative soul remains uncorrupted." }
  ]},
  { minAge: 43, maxAge: 50, title: "The Glass Ceiling", condition: (flags: string[]) => !flags.includes("pre_law") && !flags.includes("pre_med") && !flags.includes("arts") && (flags.includes("humanities") || flags.includes("public_defender") || flags.includes("coast")), text: "Your career progression slows. Without aggressive technical leverage or cutthroat drive, the C-Suite doors are closed.", choices: [
    { text: "Accept it. Focus on life outside work.", deltas: { WI: -20, LS: +20, FS: +15 }, narrative: "You make peace with your plateau. Your salary flatlines, but your weekends are entirely yours." },
    { text: "Pivot to middle-management bureaucracy.", deltas: { HC: +5, WI: +15, LS: -15, SR: +0.05 }, narrative: "You fight for a meager promotion. The bureaucracy is soul-crushing, but the extra cash flow helps." },
    { text: "Retire Early & Live Frugally.", deltas: { WI: -80, SR: -0.40, LS: +30, RT: -20, FS: +10 }, setFlags: ["retired_early"], narrative: "You walk away from the game entirely. Your working income drops to zero, and you must survive purely on your portfolio." }
  ]},
  { minAge: 43, maxAge: 50, title: "The Executive Crossroad", condition: (flags: string[]) => !flags.includes("pre_law") && !flags.includes("pre_med") && !flags.includes("arts") && !flags.includes("humanities") && !flags.includes("public_defender") && !flags.includes("coast"), text: "You are offered a VP/Executive position.", choices: [
    { text: "Accept the crown (120+ hr weeks).", deltas: { HC: +20, WI: +40, FS: -30, HLTH: -20, SR: +0.20 }, narrative: "You reach the apex of your field. The compensation is staggering, but you miss every family dinner." },
    { text: "Decline. Protect your time.", deltas: { HC: -10, WI: -15, FS: +20, LS: +15, SR: -0.05 }, narrative: "You step off the fast track. Your peers pass you by, but you coach your kid's soccer team." },
    { text: "Retire Early & Live Frugally.", deltas: { WI: -80, SR: -0.40, LS: +30, RT: -20, FS: +10 }, setFlags: ["retired_early"], narrative: "You walk away from the game entirely. Your working income drops to zero, and you must survive purely on your accumulated portfolio." }
  ]},

  { minAge: 51, maxAge: 59, title: "The Final Push", text: "You are approaching the finish line. How do you sprint?", condition: (flags: string[]) => !flags.includes("retired_early"), choices: [
    { text: "Coast to the end.", deltas: { WI: -30, HLTH: +15, LS: +10, SR: -0.05 }, narrative: "You mentally check out. You do the bare minimum, prioritizing your golf swing." },
    { text: "Squeeze every last dollar.", deltas: { WI: +20, HC: +10, HLTH: -20, FS: -10, SR: +0.10 }, narrative: "You take on one final, massive project. You maximize your exit multiple at the cost of your health." }
  ]}
];

// Events restricted by age and one-time flags to prevent repetitive rigging
const STOCHASTIC_EVENTS = [
  { prob: 0.05, name: "The Networking Leap", condition: (s:any, age:number) => age > 22 && age < 32 && s.SC > 40 && !s.flags.includes("evt_network"), effect: (s:any) => { s.flags.push("evt_network"); s.NW += 45000; s.RT += 15; s.HC += 10; return { text: "An old college connection recruited you to a high-growth company. It was risky, but the equity package was massive.", impact: "positive" }; } },
  { prob: 0.05, name: "Black Swan Crash", condition: (s:any, age:number) => age > 25 && !s.flags.includes("evt_crash"), effect: (s:any) => { s.flags.push("evt_crash"); s.NW *= 0.65; return { text: "A macroeconomic black swan event wiped 35% off your portfolio overnight.", impact: "negative" }; } },
  { prob: 0.05, name: "Bull Market Euphoria", condition: (s:any, age:number) => age > 25 && !s.flags.includes("evt_bull"), effect: (s:any) => { s.flags.push("evt_bull"); s.NW *= 1.40; return { text: "A historic bull run inflated your assets by 40%. You felt like a genius (you weren't).", impact: "positive" }; } },
  { prob: 0.04, name: "Medical Emergency", condition: (s:any) => !s.flags.includes("evt_med"), effect: (s:any) => { s.flags.push("evt_med"); s.HLTH -= 25; s.NW -= 20000; return { text: "An unexpected health crisis drained your energy and your emergency fund.", impact: "negative" }; } },
  { prob: 0.06, name: "Surprise Layoff", condition: (s:any, age:number) => age > 23 && s.WI > 0 && !s.flags.includes("evt_layoff"), effect: (s:any) => { s.flags.push("evt_layoff"); s.WI -= 20; s.HC -= 10; s.NW -= 30000; return { text: "Your division was restructured. You were walked out by security with a meager severance.", impact: "negative" }; } },
  { prob: 0.03, name: "Startup Acquisition", condition: (s:any) => s.RT > 60 && !s.flags.includes("evt_acq"), effect: (s:any) => { s.flags.push("evt_acq"); s.NW += 600000; s.SC += 20; return { text: "That risky equity actually paid off. A company you advised was acquired, landing you a massive windfall.", impact: "positive" }; } },
  { prob: 0.04, name: "Divorce / Breakup", condition: (s:any, age:number) => s.FS < 40 && age > 25, effect: (s:any) => { s.FS -= 30; s.NW *= 0.55; s.LS -= 20; s.flags.push("divorced"); return { text: "A major relationship shattered under the pressure of your choices. The emotional and legal costs severed your net worth.", impact: "negative" }; } },
  { prob: 0.05, name: "Unexpected Inheritance", condition: (s:any) => !s.flags.includes("evt_inherit"), effect: (s:any) => { s.flags.push("evt_inherit"); s.NW += 150000; return { text: "A distant relative passed, leaving you a $150,000 lump sum.", impact: "positive" }; } },
  { prob: 0.07, name: "Burnout Collapse", condition: (s:any) => s.WI > 80 && s.HLTH < 40 && !s.flags.includes("evt_burnout"), effect: (s:any) => { s.flags.push("evt_burnout"); s.WI -= 50; s.HLTH -= 20; s.LS -= 30; return { text: "Your body literally gave out from the hours. You were forced to take a 6-month leave of absence to recover.", impact: "negative" }; } },
];

// Formatter to handle negative Net Worth gracefully
const formatNW = (nw: number) => {
    const abs = Math.abs(nw);
    const prefix = nw < 0 ? "-$" : "$";
    return abs >= 1000000 
      ? `${prefix}${(abs/1000000).toFixed(1)}M` 
      : `${prefix}${(abs/1000).toFixed(0)}k`;
};

// --- EVALUATION & TONE ENGINE --- //

const evaluateRetirement = (s: any, addLog: Function) => {
  let { NW, HLTH, LS, FS, WI, flags } = s;
  
  if (flags.includes("owns_house")) {
      const roll = Math.random();
      if (roll < 0.20) {
          NW += 850000; 
          addLog("Real Estate Boom: Your property was in a rapidly gentrifying market, injecting $850k into your final net worth.");
      } else if (roll < 0.90) {
          NW += 300000; 
          addLog("Real Estate Reality: Your property appreciated at historic averages, adding a solid $300k to your net worth.");
      } else {
          NW += 50000;
          addLog("Real Estate Stagnation: High maintenance costs and a flat local market meant your home barely beat inflation.");
      }
  }

  let archetype = "";
  if (NW > 5000000 && LS > 50 && HLTH > 50) archetype = "Financial Apex";
  else if (NW > 3000000 && (HLTH < 40 || FS < 40)) archetype = "Corporate Burned Titan";
  else if (NW > 1000000 && LS > 70 && FS > 70) archetype = "Balanced Builder";
  else if (FS > 80 && NW < 2000000) archetype = "Family First";
  else if (LS > 80 && NW < 1000000) archetype = "Passion Path";
  else if (WI < 30 && HLTH < 40) archetype = "Burnout Spiral";
  else archetype = "The Everyday Survivor";

  let narrative = "";
  if (archetype === "Financial Apex") {
      narrative = `You hit the absolute summit with ${formatNW(NW)}. You made the hard tradeoffs early, took calculated risks, and let compounding do the heavy lifting. You have complete Freedom, a solid Legacy, and the health to actually enjoy it.`;
  } else if (archetype === "Corporate Burned Titan") {
      const divorceText = flags.includes("divorced") ? "Unfortunately, your life partner took half in the settlement, " : "Unfortunately, ";
      narrative = `You finish the rat race with ${formatNW(NW)}. You climbed to the very top of the ladder. ${divorceText}and you haven't slept eight hours since... well, who knows. At least the stock portfolio looks phenomenal.`;
  } else if (archetype === "Balanced Builder") {
      narrative = `You cross the finish line with ${formatNW(NW)}. Not enough to buy a private island, but enough to never look at a price tag at the grocery store again. You made smart compromises along the way, balancing ambition with reality. It's a solid, hard-fought existence.`;
  } else if (archetype === "Family First") {
      narrative = `Your net worth sits at ${formatNW(NW)}. You sacrificed maximum capital accumulation to be present for the people you love. Your financial fortress is modest, but your home is full. You won the game that actually matters.`;
  } else if (archetype === "Passion Path") {
      narrative = `You end with ${formatNW(NW)}. You completely rejected the traditional corporate grind to follow your own internal compass. The math doesn't look great on a spreadsheet, but your life satisfaction is off the charts.`;
  } else if (archetype === "Burnout Spiral") {
      narrative = `You end the simulation with ${formatNW(NW)}. The machine chewed you up and spat you out. You pushed too hard without building a safety net, and your health collapsed under the pressure. A brutal reality of the modern economy.`;
  } else {
      narrative = `You conclude your primary working years with ${formatNW(NW)}. Wall Street won't write books about you, but you survived the machine. You navigated the tradeoffs of daily life, weathered the storms, and came out the other side.`;
  }

  const investments = {
      fortress: flags.includes("owns_house"),
      legacy: flags.includes("funded_legacy") || FS >= 60, 
      shield: !flags.includes("shield_failed") && HLTH >= 60, 
      freedom: NW >= 1500000 
  };

  return { archetype, narrative, finalNW: NW, finalHealth: HLTH, finalFamily: FS, finalJoy: LS, investments };
};

export default function App() {
  const [gameState, setGameState] = useState<"intro" | "playing" | "consequence" | "ended">("intro");
  const [age, setAge] = useState(18);
  const [stats, setStats] = useState({ ...INITIAL_STATE, flags: [...INITIAL_STATE.flags] });
  const [currentDecision, setCurrentDecision] = useState<any>(null);
  
  const [lastConsequence, setLastConsequence] = useState<string>("");
  const [financialImpact, setFinancialImpact] = useState<"positive"|"negative"|"neutral">("neutral");
  const [lastEvent, setLastEvent] = useState<{text: string, impact: string} | null>(null);
  const [triggeredEventsLog, setTriggeredEventsLog] = useState<string[]>([]);
  
  const [history, setHistory] = useState<any[]>([]);
  const [retirementData, setRetirementData] = useState<any>(null);
  const [shareText, setShareText] = useState("Share Results");

  const getLifeStage = (currentAge: number) => {
    if (currentAge < 23) return "Student / Education";
    if (currentAge < 31) return "Young Professional";
    if (currentAge < 41) return "Mid-Career Builder";
    if (currentAge < 51) return "Peak Tradeoffs";
    return "Consolidation";
  };

  const getValidDecision = (currentAge: number, currentFlags: string[], currentHistory: any[]) => {
    const playedTitles = currentHistory.map(h => h.title);
    const valid = DECISIONS.filter(d => 
        currentAge >= d.minAge && 
        currentAge <= d.maxAge && 
        !playedTitles.includes(d.title) &&
        (!d.condition || d.condition(currentFlags))
    );
    if (valid.length === 0) return null;
    return valid[Math.floor(Math.random() * valid.length)];
  };

  const simulateQuietYear = (s: any, currentAge: number) => {
    const baseIncome = s.WI > 0 ? 40000 + ((currentAge - 18) * 3500) : 0; 
    const currentIncome = baseIncome * (1 + s.HC/100) * (1 + s.SC/200) * (s.WI/100);
    const marketReturn = 0.06 + ((s.RT - 50) / 100 * 0.08) + ((Math.random() * 0.1) - 0.05);
    const baseLivingCost = 30000;
    const expenses = Math.max(baseLivingCost, currentIncome * (1 - s.SR)) * (1 + (100 - s.FS)/200); 
    const savings = currentIncome - expenses;
    s.NW = (s.NW * (1 + marketReturn)) + savings;
    return s;
  };

  const advanceYear = () => {
    let nextAge = age + 1;
    let s = { ...stats };
    
    let dec = getValidDecision(nextAge, s.flags, history);
    while (!dec && nextAge < 60) {
      s = simulateQuietYear(s, nextAge);
      nextAge++;
      dec = getValidDecision(nextAge, s.flags, history);
    }

    setStats(s);
    setAge(nextAge);

    if (nextAge >= 60) {
      handleRetirement(s);
    } else {
      if (dec) {
          const validChoices = dec.choices.filter((c:any) => !c.condition || c.condition(s.flags));
          setCurrentDecision({ ...dec, choices: validChoices });
      }
      setGameState("playing");
    }
  };

  const handleRetirement = (finalStats: any) => {
      let finalLog = [...triggeredEventsLog];
      const addLog = (msg: string) => finalLog.push(msg);
      const data = evaluateRetirement(finalStats, addLog);
      setTriggeredEventsLog(finalLog);
      setRetirementData(data);
      setGameState("ended");
  };

  const handleChoice = (choice: any, title: string) => {
    let s = { ...stats, flags: [...stats.flags] };
    let newEventsLog = [...triggeredEventsLog];
    const addLog = (msg: string) => newEventsLog.push(msg);
    
    let impact: "positive"|"negative"|"neutral" = "neutral";
    if (choice.deltas.NW && choice.deltas.NW < 0) impact = "negative";
    else if (choice.deltas.NW && choice.deltas.NW > 0) impact = "positive";
    else if (choice.deltas.SR && choice.deltas.SR < 0) impact = "negative";
    else if (choice.deltas.SR && choice.deltas.SR > 0) impact = "positive";
    setFinancialImpact(impact);

    for (const [key, val] of Object.entries(choice.deltas)) {
      if (s.hasOwnProperty(key)) {
        (s as any)[key] += val as number;
      }
    }

    if (choice.setFlags) {
        choice.setFlags.forEach((f: string) => { if (!s.flags.includes(f)) s.flags.push(f); });
    }
    if (choice.onChoose) {
        choice.onChoose(s, addLog);
    }

    s.HC = Math.min(100, Math.max(0, s.HC));
    s.SC = Math.min(100, Math.max(0, s.SC));
    s.WI = Math.min(100, Math.max(0, s.WI));
    s.RT = Math.min(100, Math.max(0, s.RT));
    s.FS = Math.min(100, Math.max(0, s.FS));
    s.HLTH = Math.min(100, Math.max(0, s.HLTH));
    s.LS = Math.min(100, Math.max(0, s.LS));
    s.SR = Math.min(0.8, Math.max(0, s.SR));

    s = simulateQuietYear(s, age);

    let eventTriggered = null;
    for (let event of STOCHASTIC_EVENTS) {
      if (Math.random() < event.prob) {
        if (!event.condition || event.condition(s, age)) {
          eventTriggered = event.effect(s);
          newEventsLog.push(eventTriggered.text);
          break; 
        }
      }
    }

    setStats(s);
    setLastConsequence(choice.narrative);
    setLastEvent(eventTriggered);
    setTriggeredEventsLog(newEventsLog);
    setHistory([...history, { age, title, choice: choice.text }]);
    setGameState("consequence");
  };

  const startGame = () => {
    setStats({ ...INITIAL_STATE, flags: [] });
    setAge(18);
    setHistory([]);
    setTriggeredEventsLog([]);
    // Dynamically grab the first decision
    const firstDec = DECISIONS.find(d => 18 >= d.minAge && 18 <= d.maxAge) || DECISIONS[0];
    setCurrentDecision(firstDec);
    setShareText("Share Results");
    setGameState("playing");
  };

  const handleShare = async () => {
    if (!retirementData) return;
    
    const text = `I played Life: The Simulation and successfully retired as a "${retirementData.archetype}" with ${formatNW(retirementData.finalNW)}. Think you can navigate the tradeoffs better? Play at: https://tonina.me/wealth/archetype`;

    if (navigator.share) {
      try {
        await navigator.share({ title: 'Life: The Simulation', text });
      } catch (err) {
        console.log('Share error:', err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(text);
        setShareText("Copied to Clipboard!");
        setTimeout(() => setShareText("Share Results"), 2000);
      } catch (err) {
        console.error('Failed to copy', err);
        setShareText("Failed to Copy");
        setTimeout(() => setShareText("Share Results"), 2000);
      }
    }
  };


  // --- UI RENDERERS --- //

  if (gameState === "intro") {
    return (
      <main className="min-h-screen bg-zinc-950 text-zinc-50 font-sans flex items-center justify-center p-6 selection:bg-pink-900/30">
        <div className="max-w-2xl bg-zinc-900 p-10 md:p-14 rounded-3xl border border-zinc-800 shadow-2xl text-center">
          <div className="w-16 h-16 bg-zinc-800 text-zinc-300 rounded-2xl flex items-center justify-center mx-auto mb-8 border border-zinc-700">
            <Activity className="w-8 h-8" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-white mb-6">Life: The Simulation</h1>
          <p className="text-lg text-zinc-400 mb-8 leading-relaxed">
            Seven choices until retirement. What choices do you make?
          </p>
          <button 
            onClick={startGame}
            className="bg-white text-zinc-900 px-8 py-3.5 rounded-full font-bold hover:bg-zinc-200 transition-all shadow-sm flex items-center gap-2 mx-auto"
          >
            Let's Begin <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </main>
    );
  }

  if (gameState === "consequence") {
    return (
      <main className="min-h-screen bg-zinc-950 text-zinc-50 font-sans flex items-center justify-center p-6">
        <div className="max-w-2xl w-full bg-zinc-900 p-10 md:p-12 rounded-3xl border border-zinc-800 shadow-2xl">
          <div className="flex justify-between items-center mb-8 border-b border-zinc-800 pb-4">
            <span className="text-sm font-bold text-zinc-500 uppercase tracking-widest">The Fallout</span>
            <span className="text-xs font-bold bg-zinc-800 text-zinc-300 px-3 py-1 rounded-full border border-zinc-700">{getLifeStage(age)}</span>
          </div>

          <p className="text-xl text-zinc-300 leading-relaxed mb-8">{lastConsequence}</p>
          
          <div className="flex items-center gap-3 mb-8 p-4 bg-zinc-950 rounded-xl border border-zinc-800">
             <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Trajectory Impact:</span>
             {financialImpact === "positive" && <span className="flex items-center gap-1 text-emerald-400 text-sm font-bold"><TrendingUp className="w-4 h-4" /> Positive</span>}
             {financialImpact === "negative" && <span className="flex items-center gap-1 text-rose-400 text-sm font-bold"><TrendingDown className="w-4 h-4" /> Negative</span>}
             {financialImpact === "neutral" && <span className="flex items-center gap-1 text-zinc-400 text-sm font-bold"><Minus className="w-4 h-4" /> Neutral</span>}
          </div>

          {lastEvent && (
            <div className="bg-zinc-800/50 border border-zinc-700 p-5 rounded-xl mb-8 animate-fade-in">
              <div className="flex justify-between items-center mb-2">
                  <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                    <Activity className="w-3 h-3" /> Life Shock
                  </h3>
                  {lastEvent.impact === "positive" && <span className="text-emerald-400 font-bold text-xs">+</span>}
                  {lastEvent.impact === "negative" && <span className="text-rose-400 font-bold text-xs">-</span>}
              </div>
              <p className="text-zinc-300 text-sm leading-relaxed">{lastEvent.text}</p>
            </div>
          )}

          <button 
            onClick={advanceYear}
            className="w-full bg-white text-zinc-900 px-6 py-4 rounded-xl font-bold hover:bg-zinc-200 transition-all flex items-center justify-center gap-2"
          >
            Advance Timeline <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </main>
    );
  }

  if (gameState === "ended" && retirementData) {
    const safeNW = Math.max(0, retirementData.finalNW);
    const advisorUrl = `/wealth/advisor?cash=${Math.floor(safeNW)}`;

    return (
      <main className="min-h-screen bg-zinc-950 text-zinc-50 font-sans flex items-center justify-center p-6 selection:bg-pink-900/30">
        <div className="max-w-4xl w-full py-12">
          
          <div className="text-center mb-10 animate-fade-in">
            <span className="text-zinc-500 font-bold uppercase tracking-widest text-sm mb-4 block">You successfully retired as...</span>
            <h1 className="text-5xl font-bold text-white mb-2">{retirementData.archetype}</h1>
            <p className={`text-2xl font-bold mb-6 ${retirementData.finalNW >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {formatNW(retirementData.finalNW)} Final Net Worth
            </p>
            <p className="text-lg text-zinc-400 leading-relaxed max-w-2xl mx-auto">{retirementData.narrative}</p>
          </div>

          {/* 4 Investments Evaluation */}
          <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl shadow-lg mb-8">
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-6 text-center">The 4 Investments Evaluation</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className={`p-5 rounded-xl border flex flex-col items-center text-center ${retirementData.investments.fortress ? 'border-emerald-900/50 bg-emerald-950/20' : 'border-zinc-800 bg-zinc-950/50'}`}>
                    <Home className={`w-6 h-6 mb-2 ${retirementData.investments.fortress ? 'text-emerald-400' : 'text-zinc-600'}`} />
                    <span className="text-sm font-bold text-zinc-300 uppercase tracking-wider mb-2">The Fortress</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded mb-3 ${retirementData.investments.fortress ? 'bg-emerald-900 text-emerald-300' : 'bg-zinc-800 text-zinc-500'}`}>{retirementData.investments.fortress ? 'PASS' : 'FAIL'}</span>
                    <p className="text-sm text-zinc-400 leading-relaxed">Fully owning a home to secure your physical place in the world.</p>
                </div>
                <div className={`p-5 rounded-xl border flex flex-col items-center text-center ${retirementData.investments.legacy ? 'border-emerald-900/50 bg-emerald-950/20' : 'border-zinc-800 bg-zinc-950/50'}`}>
                    <GraduationCap className={`w-6 h-6 mb-2 ${retirementData.investments.legacy ? 'text-emerald-400' : 'text-zinc-600'}`} />
                    <span className="text-sm font-bold text-zinc-300 uppercase tracking-wider mb-2">The Legacy</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded mb-3 ${retirementData.investments.legacy ? 'bg-emerald-900 text-emerald-300' : 'bg-zinc-800 text-zinc-500'}`}>{retirementData.investments.legacy ? 'PASS' : 'FAIL'}</span>
                    <p className="text-sm text-zinc-400 leading-relaxed">Providing for family and building a stable foundational network.</p>
                </div>
                <div className={`p-5 rounded-xl border flex flex-col items-center text-center ${retirementData.investments.shield ? 'border-emerald-900/50 bg-emerald-950/20' : 'border-zinc-800 bg-zinc-950/50'}`}>
                    <ShieldCheck className={`w-6 h-6 mb-2 ${retirementData.investments.shield ? 'text-emerald-400' : 'text-zinc-600'}`} />
                    <span className="text-sm font-bold text-zinc-300 uppercase tracking-wider mb-2">The Shield</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded mb-3 ${retirementData.investments.shield ? 'bg-emerald-900 text-emerald-300' : 'bg-zinc-800 text-zinc-500'}`}>{retirementData.investments.shield ? 'PASS' : 'FAIL'}</span>
                    <p className="text-sm text-zinc-400 leading-relaxed">Maintaining physical health so medical costs don't drain wealth.</p>
                </div>
                <div className={`p-5 rounded-xl border flex flex-col items-center text-center ${retirementData.investments.freedom ? 'border-emerald-900/50 bg-emerald-950/20' : 'border-zinc-800 bg-zinc-950/50'}`}>
                    <Palmtree className={`w-6 h-6 mb-2 ${retirementData.investments.freedom ? 'text-emerald-400' : 'text-zinc-600'}`} />
                    <span className="text-sm font-bold text-zinc-300 uppercase tracking-wider mb-2">The Freedom</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded mb-3 ${retirementData.investments.freedom ? 'bg-emerald-900 text-emerald-300' : 'bg-zinc-800 text-zinc-500'}`}>{retirementData.investments.freedom ? 'PASS' : 'FAIL'}</span>
                    <p className="text-sm text-zinc-400 leading-relaxed">Having sufficient capital ($1.5M+) to live life on your own terms.</p>
                </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <button 
              onClick={startGame}
              className="w-full sm:w-auto bg-white text-zinc-900 px-8 py-3.5 rounded-full font-bold hover:bg-zinc-200 transition-all flex items-center justify-center gap-2"
            >
              <RefreshCcw className="w-4 h-4" /> Play Again
            </button>
            <button 
              onClick={handleShare}
              className="w-full sm:w-auto bg-transparent border border-zinc-700 text-zinc-300 px-8 py-3.5 rounded-full font-bold hover:bg-zinc-900 hover:text-white transition-all flex items-center justify-center gap-2"
            >
              <Share2 className="w-4 h-4" /> {shareText}
            </button>
            <Link 
              href={advisorUrl}
              className="w-full sm:w-auto bg-emerald-600 text-white px-8 py-3.5 rounded-full font-bold hover:bg-emerald-500 transition-all flex items-center justify-center gap-2"
            >
              <LineChart className="w-4 h-4" /> Build a Real Plan
            </Link>
          </div>

          {/* Decision Tree / Path Taken */}
          <div className="bg-zinc-900/50 border border-zinc-800/50 p-8 rounded-3xl animate-fade-in mt-8">
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-6">Your Path</h3>
            <div className="relative border-l border-zinc-700 ml-3 space-y-6">
                {history.map((h, i) => (
                    <div key={i} className="relative pl-6">
                        <div className="absolute -left-1.5 top-1.5 w-3 h-3 bg-emerald-500 rounded-full ring-4 ring-zinc-950"></div>
                        <p className="text-xs text-zinc-500 font-bold mb-1">Age {h.age} • {h.title}</p>
                        <p className="text-sm text-emerald-400 font-medium">{h.choice}</p>
                    </div>
                ))}
            </div>
          </div>

          {triggeredEventsLog.length > 0 && (
            <div className="bg-zinc-900/50 border border-zinc-800/50 p-8 rounded-3xl animate-fade-in mt-8">
              <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Unplanned Reality</h3>
              <ul className="space-y-4">
                {triggeredEventsLog.map((evt, i) => (
                  <li key={i} className="text-sm text-zinc-400 flex items-start gap-3 leading-relaxed">
                    <span className="text-pink-600 mt-1">•</span> {evt}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </main>
    );
  }

  // default: playing
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-50 font-sans flex flex-col items-center justify-center p-6 selection:bg-pink-900/30">
      <div className="max-w-3xl w-full">
        
        {/* HUD */}
        <div className="flex justify-start items-center mb-8 px-2">
          <div>
            <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Current Life Stage</div>
            <div className="text-lg font-bold text-zinc-100 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div> 
              {getLifeStage(age)}
            </div>
          </div>
        </div>

        {/* Scenario Card */}
        <div className="bg-zinc-900 p-8 md:p-12 rounded-3xl border border-zinc-800 shadow-2xl mb-6">
          <h2 className="text-3xl font-bold text-white mb-4">{currentDecision?.title}</h2>
          <p className="text-lg text-zinc-400 leading-relaxed mb-10">
            {currentDecision?.text}
          </p>

          <div className="space-y-4">
            {currentDecision?.choices.map((choice: any, idx: number) => (
              <button
                key={idx}
                onClick={() => handleChoice(choice, currentDecision.title)}
                className="w-full text-left p-6 rounded-2xl border border-zinc-800 bg-zinc-950 hover:bg-zinc-800 hover:border-zinc-700 transition-all duration-300 group"
              >
                <div className="flex justify-between items-center">
                  <span className="font-medium text-zinc-300 group-hover:text-white text-lg pr-4">{choice.text}</span>
                  <ArrowRight className="w-5 h-5 text-zinc-600 group-hover:text-white transition-colors opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 shrink-0" />
                </div>
              </button>
            ))}
          </div>
        </div>

      </div>
    </main>
  );
}