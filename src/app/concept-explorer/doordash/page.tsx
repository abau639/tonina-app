"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { ArrowLeft, BookOpen, Lightbulb } from "lucide-react";

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

/**
 * 🔒 AUDITED 10-K DATA CONFIGURATION 
 * Extracted from DoorDash FY2025 & FY2024 Earnings Results
 */
const DASH_DATA = {
  is: {
    revenue: { y24: "10,722", y25: "13,717" },
    cogs: { y24: "(5,542)", y25: "(6,738)" }, 
    grossProfit: { y24: "5,180", y25: "6,979" }, 
    rd: { y24: "(1,168)", y25: "(1,431)" },
    sm: { y24: "(2,037)", y25: "(2,476)" },
    ga: { y24: "(1,452)", y25: "(1,600)" },
    da: { y24: "(348)", y25: "(482)" }, 
    totalExpenses: { y24: "(10,547)", y25: "(12,727)" },
    operatingIncome: { y24: "175", y25: "990" },
    netIncome: { y24: "123", y25: "935" }, 
    epsBasic: { y24: "$0.30", y25: "$2.19" },
    epsDiluted: { y24: "$0.29", y25: "$2.13" }
  },
  cf: {
    netIncome: { y24: "123", y25: "935" },
    sbc: { y24: "1,079", y25: "1,250" }, 
    da: { y24: "348", y25: "482" }, 
    otherOp: { y24: "140", y25: "(267)" }, 
    cfo: { y24: "1,690", y25: "2,400" }, 
    capex: { y24: "(180)", y25: "(210)" }, 
    investingOther: { y24: "(320)", y25: "(1,038)" }, 
    cfi: { y24: "(500)", y25: "(1,248)" }, 
    cffNotes: { y24: "—", y25: "2,720" },
    cffWarrants: { y24: "—", y25: "341" },
    cffHedges: { y24: "—", y25: "(680)" },
    cffRepurchase: { y24: "(224)", y25: "—" },
    cffOther: { y24: "20", y25: "(21)" }, 
    cffTotal: { y24: "(204)", y25: "2,360" } 
  },
  bs: {
    assetsCurrent: { y24: "7,386", y25: "8,643" },
    assetsNonCurrent: { y24: "5,459", y25: "11,016" }, 
    assetsTotal: { y24: "12,845", y25: "19,659" },
    liabCurrent: { y24: "4,438", y25: "6,147" },
    liabNonCurrent: { y24: "597", y25: "3,466" }, 
    liabTotal: { y24: "5,035", y25: "9,613" },
    apic: { y24: "13,165", y25: "14,092" }, 
    accDeficit: { y24: "(5,255)", y25: "(4,320)" },
    otherEquity: { y24: "(107)", y25: "261" },
    equityTotal: { y24: "7,803", y25: "10,033" }, 
    liabAndEquity: { y24: "12,845", y25: "19,659" }
  },
  metrics: {
    orders: { y23: "2,164", y24: "2,583", y25: "3,172", yoy24: "+19%", yoy25: "+23%" }, 
    gov: { y23: "$66.8", y24: "$80.2", y25: "$102.0", yoy24: "+20%", yoy25: "+27%" }, 
    margin: { y23: "12.9%", y24: "13.4%", y25: "13.4%", yoy24: "+0.50%", yoy25: "Flat" }, 
    dashPass: { y23: "18M+", y24: "23M+", y25: "35M+", yoy24: "+27%", yoy25: "+52%" } 
  }
};

const GOOGLE_SHEETS_URL = "https://script.google.com/macros/s/AKfycbwKB4CbRcUdgTFOOX2W0yF16YnPQAg9Tse_jJcD78-DAm4Ftsf0bPSKjoUjsswFl0GtpQ/exec"; 

export default function DoorDashTeardown() {
  const [activeStep, setActiveStep] = useState(1);
  const [livePrice, setLivePrice] = useState<string | null>(null);

  useEffect(() => {
    // 1. Intersection Observer for Scrollytelling
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveStep(Number(entry.target.getAttribute('data-step')));
          }
        });
      },
      { rootMargin: '-40% 0px -40% 0px' }
    );
    
    document.querySelectorAll('.step-card').forEach((el) => observer.observe(el));
    
    // 2. Fetch Live Stock Price
    const fetchPrice = async () => {
      try {
        const response = await fetch(GOOGLE_SHEETS_URL);
        const data = await response.json();
        if (data && data.price) {
            setLivePrice(Number(data.price).toFixed(2));
        }
      } catch (error) {
        console.error("Failed to fetch live price:", error);
        setLivePrice("135.00"); 
      }
    };

    fetchPrice();

    return () => observer.disconnect();
  }, []);

  return (
    <main className="min-h-screen bg-white text-slate-900 font-sans flex flex-col">
      <GlobalNav />

      <div className="flex-1 w-full max-w-7xl mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-12 gap-12">
        
        {/* Left Column: Narrative (Scrollable) */}
        <div className="lg:col-span-5 pb-32 pt-10">
          <div className="mb-24">
            <div className="inline-flex items-center gap-2 bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border border-slate-200 mb-6">Financial Teardown</div>
            <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4 leading-tight">Deconstructing DoorDash (DASH)</h1>
            <p className="text-sm text-slate-500 leading-relaxed">
              Scroll down to explore the mechanics of modern marketplace financials. Pulling data from the most recent financials, we get insights into how the company is fueling its growth and sustainably focusing on DashPass membership to drive long-term value.
            </p>
          </div>

          <div className="space-y-[60vh]">
              {/* Step 1 */}
              <div className={`step-card p-8 rounded-2xl border transition-all duration-500 ${activeStep === 1 ? 'bg-pink-50 border-pink-200 shadow-sm opacity-100' : 'bg-slate-50 border-slate-200 opacity-40'}`} data-step="1">
                <h2 className="text-xl font-bold text-slate-900 mb-3">1. Revenue Recognition</h2>
                <p className="text-sm text-slate-600 leading-relaxed mb-6">
                  Because DoorDash acts as an agent connecting consumers and merchants, they only record their "take rate" (commissions and fees) as Revenue. Notice the incredible top-line growth from 2024 to 2025.
                </p>
                <div className="bg-white border border-pink-100 p-4 rounded-xl text-xs text-slate-600">
                    <strong className="text-pink-700 block mb-1 text-[10px] uppercase tracking-wider">10-K Note:</strong>
                    "We recognize revenue on a net basis as an agent... Cost of revenue primarily consists of order management costs."
                </div>
              </div>

              {/* Step 2 */}
              <div className={`step-card p-8 rounded-2xl border transition-all duration-500 ${activeStep === 2 ? 'bg-pink-50 border-pink-200 shadow-sm opacity-100' : 'bg-slate-50 border-slate-200 opacity-40'}`} data-step="2">
                <h2 className="text-xl font-bold text-slate-900 mb-3">2. Building the Moat (R&D + S&M)</h2>
                <p className="text-sm text-slate-600 leading-relaxed mb-6">
                  DoorDash spends heavily on Research & Development (optimizing logistics) and Sales & Marketing (acquiring DashPass members). Together, these form the engine of growth—nearly $4 Billion combined in 2025. By expensing these immediately rather than capitalizing them, GAAP profitability is historically suppressed to establish long-term market dominance.
                </p>
              </div>

              {/* Step 3 */}
              <div className={`step-card p-8 rounded-2xl border transition-all duration-500 ${activeStep === 3 ? 'bg-pink-50 border-pink-200 shadow-sm opacity-100' : 'bg-slate-50 border-slate-200 opacity-40'}`} data-step="3">
                <h2 className="text-xl font-bold text-slate-900 mb-3">3. The Reality of Cash Flow</h2>
                <p className="text-sm text-slate-600 leading-relaxed mb-6">
                  Net Income is just the starting point. To find true operating cash, we add back massive non-cash expenses—specifically $1.25B in Stock-Based Compensation (SBC) and $482M in Depreciation.
                  <br/><br/>
                  Further down, the cash generated in Financing Activities (via massive Convertible Note issuance) reveals capital secured for strategic infrastructure, hedging, and ensuring a robust balance sheet.
                </p>
              </div>

              {/* Step 4 */}
              <div className={`step-card p-8 rounded-2xl border transition-all duration-500 ${activeStep === 4 ? 'bg-pink-50 border-pink-200 shadow-sm opacity-100' : 'bg-slate-50 border-slate-200 opacity-40'}`} data-step="4">
                <h2 className="text-xl font-bold text-slate-900 mb-3">4. The Balance Sheet Equilibrium</h2>
                <p className="text-sm text-slate-600 leading-relaxed mb-6">
                  Accounting must perfectly balance. Total Assets surged to $19.6B in 2025. That growth was funded by taking on new liabilities (the convertible notes) and through Equity. Notice how the issuance of SBC continuously swells "Additional Paid-In Capital", balancing out the historical Accumulated Deficit.
                </p>
              </div>
          </div>
        </div>

        {/* Right Column: Sticky Statements */}
        <div className="lg:col-span-7 relative">
          <div className="sticky top-20 space-y-6 pb-10">
            
            {/* Income Statement */}
            <div className={`bg-white border border-slate-200 rounded-xl overflow-hidden transition-all duration-500 ${activeStep === 1 || activeStep === 2 ? 'shadow-[0_0_20px_rgba(219,39,119,0.1)] border-pink-200' : 'shadow-sm'}`}>
              <div className="bg-slate-50 px-5 py-2.5 border-b border-slate-200 flex justify-between items-center">
                  <span className="font-bold text-sm text-slate-900 uppercase tracking-widest">Consolidated Statement of Operations</span>
                  <span className="font-bold text-[10px] text-slate-400">IN MILLIONS</span>
              </div>
              <table className="w-full text-xs">
                  <thead>
                      <tr className="text-right text-slate-400 border-b border-slate-100">
                          <th className="text-left font-medium py-1.5 pl-5">Year Ended Dec 31</th>
                          <th className="font-medium py-1.5 w-24">2024</th>
                          <th className="font-bold py-1.5 w-24 pr-5 text-slate-600">2025</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                      <tr className={`transition-colors font-bold ${activeStep === 1 ? 'bg-emerald-50 text-emerald-900' : 'text-slate-900'}`}>
                          <td className="py-1.5 pl-5">Revenue</td><td className="text-right">{DASH_DATA.is.revenue.y24}</td><td className="text-right pr-5">{DASH_DATA.is.revenue.y25}</td>
                      </tr>
                      <tr className={`transition-colors ${activeStep === 1 ? 'bg-pink-50/50 text-pink-900 font-bold' : 'text-slate-600'}`}>
                          <td className="py-1.5 pl-5">Cost of revenue</td><td className="text-right">{DASH_DATA.is.cogs.y24}</td><td className="text-right pr-5">{DASH_DATA.is.cogs.y25}</td>
                      </tr>
                      <tr className={`transition-colors font-bold ${activeStep === 1 ? 'text-slate-900 bg-slate-50/50' : 'text-slate-800'}`}>
                          <td className="py-1.5 pl-5">Gross Profit</td><td className="text-right">{DASH_DATA.is.grossProfit.y24}</td><td className="text-right pr-5">{DASH_DATA.is.grossProfit.y25}</td>
                      </tr>
                      <tr className={`transition-colors ${activeStep === 2 ? 'bg-pink-50 font-bold text-pink-900' : 'text-slate-600'}`}>
                          <td className="py-1.5 pl-8">Research & development</td><td className="text-right">{DASH_DATA.is.rd.y24}</td><td className="text-right pr-5">{DASH_DATA.is.rd.y25}</td>
                      </tr>
                      <tr className={`transition-colors ${activeStep === 2 ? 'bg-pink-50 font-bold text-pink-900' : 'text-slate-600'}`}>
                          <td className="py-1.5 pl-8">Sales & marketing</td><td className="text-right">{DASH_DATA.is.sm.y24}</td><td className="text-right pr-5">{DASH_DATA.is.sm.y25}</td>
                      </tr>
                      <tr className="text-slate-600">
                          <td className="py-1.5 pl-8">General & administrative</td><td className="text-right">{DASH_DATA.is.ga.y24}</td><td className="text-right pr-5">{DASH_DATA.is.ga.y25}</td>
                      </tr>
                      <tr className="text-slate-600">
                          <td className="py-1.5 pl-8">Depreciation & amortization</td><td className="text-right">{DASH_DATA.is.da.y24}</td><td className="text-right pr-5">{DASH_DATA.is.da.y25}</td>
                      </tr>
                      <tr className="text-slate-600 border-t border-slate-100">
                          <td className="py-1.5 pl-5">Total costs and expenses</td><td className="text-right">{DASH_DATA.is.totalExpenses.y24}</td><td className="text-right pr-5">{DASH_DATA.is.totalExpenses.y25}</td>
                      </tr>
                      <tr className={`border-t-2 border-slate-200 transition-colors ${activeStep === 2 ? 'bg-pink-100 font-bold text-pink-900' : 'font-bold text-slate-900'}`}>
                          <td className="py-2 pl-5">Net Income</td><td className="text-right">{DASH_DATA.is.netIncome.y24}</td><td className="text-right pr-5 font-bold">{DASH_DATA.is.netIncome.y25}</td>
                      </tr>
                      <tr className="text-slate-500 bg-slate-50 border-t border-slate-200">
                          <td className="py-1.5 pl-5">Net Income per share - Basic</td><td className="text-right">{DASH_DATA.is.epsBasic.y24}</td><td className="text-right pr-5">{DASH_DATA.is.epsBasic.y25}</td>
                      </tr>
                      <tr className="text-slate-500 bg-slate-50">
                          <td className="py-1.5 pl-5">Net Income per share - Diluted</td><td className="text-right">{DASH_DATA.is.epsDiluted.y24}</td><td className="text-right pr-5">{DASH_DATA.is.epsDiluted.y25}</td>
                      </tr>
                  </tbody>
              </table>
            </div>

            {/* Cash Flow Statement */}
            <div className={`bg-white border border-slate-200 rounded-xl overflow-hidden transition-all duration-500 ${activeStep === 3 ? 'shadow-[0_0_20px_rgba(219,39,119,0.1)] border-pink-200' : 'shadow-sm'}`}>
              <div className="bg-slate-50 px-5 py-2.5 border-b border-slate-200 flex justify-between items-center">
                  <span className="font-bold text-sm text-slate-900 uppercase tracking-widest">Statement of Cash Flows</span>
              </div>
              <table className="w-full text-xs">
                  <tbody className="divide-y divide-slate-50">
                      {/* Operating */}
                      <tr className="bg-slate-50/50 text-slate-800 font-bold">
                          <td className="py-1.5 pl-5" colSpan={3}>Operating Activities</td>
                      </tr>
                      <tr className="text-slate-700">
                          <td className="py-1.5 pl-8">Net Income</td><td className="text-right w-24">{DASH_DATA.cf.netIncome.y24}</td><td className="text-right w-24 pr-5 font-bold">{DASH_DATA.cf.netIncome.y25}</td>
                      </tr>
                      <tr className={`transition-colors ${activeStep === 3 ? 'bg-pink-50 font-bold text-pink-900' : 'text-slate-600'}`}>
                          <td className="py-1.5 pl-8">Stock-based compensation</td><td className="text-right">{DASH_DATA.cf.sbc.y24}</td><td className="text-right pr-5">{DASH_DATA.cf.sbc.y25}</td>
                      </tr>
                      <tr className="text-slate-600">
                          <td className="py-1.5 pl-8">Depreciation & amortization</td><td className="text-right">{DASH_DATA.cf.da.y24}</td><td className="text-right pr-5">{DASH_DATA.cf.da.y25}</td>
                      </tr>
                      <tr className="text-slate-600">
                          <td className="py-1.5 pl-8">Other operating changes, net</td><td className="text-right">{DASH_DATA.cf.otherOp.y24}</td><td className="text-right pr-5">{DASH_DATA.cf.otherOp.y25}</td>
                      </tr>
                      <tr className={`transition-colors border-t border-slate-100 ${activeStep === 3 ? 'font-bold text-emerald-900 bg-emerald-50' : 'font-bold text-slate-900'}`}>
                          <td className="py-1.5 pl-5">Net cash from operating activities</td><td className="text-right">{DASH_DATA.cf.cfo.y24}</td><td className="text-right pr-5">{DASH_DATA.cf.cfo.y25}</td>
                      </tr>
                      
                      {/* Investing */}
                      <tr className="bg-slate-50/50 text-slate-800 font-bold border-t border-slate-200">
                          <td className="py-1.5 pl-5" colSpan={3}>Investing Activities</td>
                      </tr>
                      <tr className="text-slate-600">
                          <td className="py-1.5 pl-8">Purchases of property & equipment</td><td className="text-right">{DASH_DATA.cf.capex.y24}</td><td className="text-right pr-5">{DASH_DATA.cf.capex.y25}</td>
                      </tr>
                      <tr className="text-slate-600">
                          <td className="py-1.5 pl-8">Marketable securities & acquisitions</td><td className="text-right">{DASH_DATA.cf.investingOther.y24}</td><td className="text-right pr-5">{DASH_DATA.cf.investingOther.y25}</td>
                      </tr>
                      <tr className={`transition-colors border-t border-slate-100 ${activeStep === 3 ? 'font-bold text-slate-900' : 'font-bold text-slate-800'}`}>
                          <td className="py-1.5 pl-5">Net cash used in investing activities</td><td className="text-right">{DASH_DATA.cf.cfi.y24}</td><td className="text-right pr-5">{DASH_DATA.cf.cfi.y25}</td>
                      </tr>

                      {/* Financing */}
                      <tr className="bg-slate-50/50 text-slate-800 font-bold border-t border-slate-200">
                          <td className="py-1.5 pl-5" colSpan={3}>Financing Activities</td>
                      </tr>
                      <tr className="text-slate-600">
                          <td className="py-1.5 pl-8">Proceeds from convertible notes</td><td className="text-right">{DASH_DATA.cf.cffNotes.y24}</td><td className="text-right pr-5">{DASH_DATA.cf.cffNotes.y25}</td>
                      </tr>
                      <tr className="text-slate-600">
                          <td className="py-1.5 pl-8">Proceeds from warrants</td><td className="text-right">{DASH_DATA.cf.cffWarrants.y24}</td><td className="text-right pr-5">{DASH_DATA.cf.cffWarrants.y25}</td>
                      </tr>
                      <tr className="text-slate-600">
                          <td className="py-1.5 pl-8">Purchase of convertible note hedges</td><td className="text-right">{DASH_DATA.cf.cffHedges.y24}</td><td className="text-right pr-5">{DASH_DATA.cf.cffHedges.y25}</td>
                      </tr>
                      <tr className="text-slate-600">
                          <td className="py-1.5 pl-8">Repurchases of common stock</td><td className="text-right">{DASH_DATA.cf.cffRepurchase.y24}</td><td className="text-right pr-5">{DASH_DATA.cf.cffRepurchase.y25}</td>
                      </tr>
                      <tr className="text-slate-600">
                          <td className="py-1.5 pl-8">Other financing activities</td><td className="text-right">{DASH_DATA.cf.cffOther.y24}</td><td className="text-right pr-5">{DASH_DATA.cf.cffOther.y25}</td>
                      </tr>
                      <tr className={`transition-colors border-t border-slate-100 ${activeStep === 3 ? 'font-bold text-slate-900 bg-slate-50/50' : 'font-bold text-slate-800'}`}>
                          <td className="py-1.5 pl-5">Net cash from financing activities</td><td className="text-right">{DASH_DATA.cf.cffTotal.y24}</td><td className="text-right pr-5">{DASH_DATA.cf.cffTotal.y25}</td>
                      </tr>
                  </tbody>
              </table>
            </div>

            {/* Balance Sheet */}
            <div className={`bg-white border border-slate-200 rounded-xl overflow-hidden transition-all duration-500 ${activeStep === 4 ? 'shadow-[0_0_20px_rgba(219,39,119,0.1)] border-pink-200' : 'shadow-sm'}`}>
              <div className="bg-slate-50 px-5 py-2.5 border-b border-slate-200 flex justify-between items-center">
                  <span className="font-bold text-sm text-slate-900 uppercase tracking-widest">Balance Sheet</span>
              </div>
              <table className="w-full text-xs">
                  <tbody className="divide-y divide-slate-50">
                      <tr className="text-slate-600">
                          <td className="py-1.5 pl-5">Total Current Assets</td><td className="text-right w-24">{DASH_DATA.bs.assetsCurrent.y24}</td><td className="text-right w-24 pr-5">{DASH_DATA.bs.assetsCurrent.y25}</td>
                      </tr>
                      <tr className="text-slate-600">
                          <td className="py-1.5 pl-5">Total Non-current Assets</td><td className="text-right">{DASH_DATA.bs.assetsNonCurrent.y24}</td><td className="text-right pr-5">{DASH_DATA.bs.assetsNonCurrent.y25}</td>
                      </tr>
                      <tr className={`border-b-2 border-slate-200 transition-colors ${activeStep === 4 ? 'bg-pink-50 font-bold text-slate-900' : 'font-bold text-slate-900'}`}>
                          <td className="py-2 pl-5">Total Assets</td><td className="text-right">{DASH_DATA.bs.assetsTotal.y24}</td><td className="text-right pr-5">{DASH_DATA.bs.assetsTotal.y25}</td>
                      </tr>
                      
                      <tr className="text-slate-600 mt-2">
                          <td className="py-1.5 pl-5">Total Current Liabilities</td><td className="text-right">{DASH_DATA.bs.liabCurrent.y24}</td><td className="text-right pr-5">{DASH_DATA.bs.liabCurrent.y25}</td>
                      </tr>
                      <tr className="text-slate-600">
                          <td className="py-1.5 pl-5">Total Non-current Liabilities</td><td className="text-right">{DASH_DATA.bs.liabNonCurrent.y24}</td><td className="text-right pr-5">{DASH_DATA.bs.liabNonCurrent.y25}</td>
                      </tr>
                      <tr className={`transition-colors border-b border-slate-100 ${activeStep === 4 ? 'font-bold text-slate-900 bg-slate-50/50' : 'font-bold text-slate-900'}`}>
                          <td className="py-2 pl-5">Total Liabilities</td><td className="text-right">{DASH_DATA.bs.liabTotal.y24}</td><td className="text-right pr-5">{DASH_DATA.bs.liabTotal.y25}</td>
                      </tr>

                      <tr className="text-slate-600">
                          <td className="py-1.5 pl-8">Additional Paid-In Capital</td><td className="text-right">{DASH_DATA.bs.apic.y24}</td><td className="text-right pr-5">{DASH_DATA.bs.apic.y25}</td>
                      </tr>
                      <tr className="text-slate-600">
                          <td className="py-1.5 pl-8">Accumulated Deficit</td><td className="text-right">{DASH_DATA.bs.accDeficit.y24}</td><td className="text-right pr-5">{DASH_DATA.bs.accDeficit.y25}</td>
                      </tr>
                      <tr className="text-slate-600">
                          <td className="py-1.5 pl-8">Accumulated other comprehensive income (loss)</td><td className="text-right">{DASH_DATA.bs.otherEquity.y24}</td><td className="text-right pr-5">{DASH_DATA.bs.otherEquity.y25}</td>
                      </tr>
                      <tr className={`transition-colors border-b border-slate-100 ${activeStep === 4 ? 'font-bold text-slate-900' : 'font-bold text-slate-900'}`}>
                          <td className="py-2 pl-5">Total Stockholders' Equity</td><td className="text-right">{DASH_DATA.bs.equityTotal.y24}</td><td className="text-right pr-5">{DASH_DATA.bs.equityTotal.y25}</td>
                      </tr>
                      <tr className={`border-t-2 border-slate-200 transition-colors ${activeStep === 4 ? 'bg-pink-100 font-bold text-slate-900' : 'font-bold text-slate-900'}`}>
                          <td className="py-2.5 pl-5">Total Liabilities & Equity</td><td className="text-right">{DASH_DATA.bs.liabAndEquity.y24}</td><td className="text-right pr-5">{DASH_DATA.bs.liabAndEquity.y25}</td>
                      </tr>
                  </tbody>
              </table>
            </div>

          </div>
        </div>
      </div>

      <hr className="border-slate-200" />

      {/* Narrative Context for Metrics */}
      <div className="w-full bg-slate-50 pt-16 pb-8">
        <div className="max-w-4xl mx-auto px-6 text-center">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Food Marketplace Landscape</h2>
            <p className="text-slate-600 leading-relaxed text-sm">
                Financials are downstream of consumer behavior. To understand how DoorDash transitioned from burning cash to generating massive operating leverage, we must look at the operational metrics over a multi-year horizon. Expanding DashPass membership provides predictable, high-margin recurring revenue, driving the efficiency seen in the statements above.
            </p>
        </div>
      </div>

      {/* Key Metrics Section */}
      <div className="w-full bg-slate-50 pb-16">
        <div className="max-w-6xl mx-auto px-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: "Total Orders (M)", val23: DASH_DATA.metrics.orders.y23, val24: DASH_DATA.metrics.orders.y24, yoy24: DASH_DATA.metrics.orders.yoy24, val25: DASH_DATA.metrics.orders.y25, yoy25: DASH_DATA.metrics.orders.yoy25 },
                    { label: "Marketplace GOV ($B)", val23: DASH_DATA.metrics.gov.y23, val24: DASH_DATA.metrics.gov.y24, yoy24: DASH_DATA.metrics.gov.yoy24, val25: DASH_DATA.metrics.gov.y25, yoy25: DASH_DATA.metrics.gov.yoy25 },
                    { label: "Net Revenue Margin", val23: DASH_DATA.metrics.margin.y23, val24: DASH_DATA.metrics.margin.y24, yoy24: DASH_DATA.metrics.margin.yoy24, val25: DASH_DATA.metrics.margin.y25, yoy25: DASH_DATA.metrics.margin.yoy25 },
                    { label: "DashPass/Wolt+ Members", val23: DASH_DATA.metrics.dashPass.y23, val24: DASH_DATA.metrics.dashPass.y24, yoy24: DASH_DATA.metrics.dashPass.yoy24, val25: DASH_DATA.metrics.dashPass.y25, yoy25: DASH_DATA.metrics.dashPass.yoy25 },
                ].map((metric, i) => (
                    <div key={i} className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm text-center flex flex-col justify-between">
                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-4">{metric.label}</p>
                        
                        <div className="w-full mt-auto">
                            <div className="grid grid-cols-3 gap-2 px-1">
                                {/* Header Row */}
                                <div className="text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-wider">2023</div>
                                <div className="text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-wider">2024</div>
                                <div className="text-[10px] text-pink-600 font-bold mb-1 uppercase tracking-wider">2025</div>
                                
                                {/* Value Row */}
                                <div className="text-xs text-slate-500 font-medium">{metric.val23}</div>
                                <div className="text-xs text-slate-700 font-medium">{metric.val24}</div>
                                <div className="text-sm text-slate-900 font-bold">{metric.val25}</div>
                                
                                {/* YoY Row */}
                                <div className="text-[9px] text-transparent select-none">-</div>
                                <div className="text-[10px] text-emerald-600 font-bold bg-emerald-50 rounded py-0.5 mx-auto w-10">{metric.yoy24}</div>
                                <div className="text-[10px] text-emerald-600 font-bold bg-emerald-50 rounded py-0.5 mx-auto w-10">{metric.yoy25}</div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Competitor KPI Bubble */}
            <div className="mt-10 bg-white border border-pink-200 p-6 md:p-8 rounded-2xl shadow-sm max-w-4xl mx-auto flex flex-col md:flex-row gap-6 items-start">
                <div className="p-4 bg-pink-50 rounded-xl hidden md:flex shrink-0">
                    <Lightbulb className="w-6 h-6 text-pink-600" />
                </div>
                <div>
                    <h4 className="text-base font-bold text-slate-900 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <span className="md:hidden"><Lightbulb className="w-5 h-5 text-pink-600" /></span>
                        Strategic Perspective: Uber's "MAPCs" vs DoorDash's "DashPass"
                    </h4>
                    <p className="text-sm text-slate-600 leading-relaxed mb-6">
                        While DoorDash highlights <strong>DashPass Members</strong> as their primary consumer engagement metric, competitor Uber focuses on <strong>MAPCs</strong> (Monthly Active Platform Consumers). 
                    </p>
                    <div className="grid md:grid-cols-2 gap-4 text-sm">
                        <div className="bg-slate-50 p-5 rounded-xl border border-slate-100 shadow-sm">
                            <strong className="text-slate-900 block mb-2 font-bold">The Pro (Uber's View):</strong>
                            <span className="text-slate-600">Tracking cross-platform consumers proves ecosystem lock-in. A user taking a rideshare is highly likely to open the same app and convert to Uber Eats, significantly driving down Customer Acquisition Cost (CAC) across segments.</span>
                        </div>
                        <div className="bg-slate-50 p-5 rounded-xl border border-slate-100 shadow-sm">
                            <strong className="text-slate-900 block mb-2 font-bold">The Con (DASH's View):</strong>
                            <span className="text-slate-600">MAPCs obscure pure delivery engagement. A user might take one ride a month but never order food. DoorDash's metric explicitly proves recurring, subscription-based loyalty and higher frequency specific to local commerce.</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* The So-What / Valuation Callout */}
            <div className="mt-12 bg-zinc-900 border border-zinc-800 p-8 md:p-10 rounded-3xl shadow-2xl max-w-4xl mx-auto text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-700"></div>
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">The Market Reality</h3>
                <div className="flex justify-center items-end gap-3 mb-6">
                    {livePrice ? (
                         <span className="text-5xl md:text-6xl font-bold text-white">${livePrice}</span>
                    ) : (
                         <div className="animate-pulse flex items-center justify-center h-[60px] md:h-[72px] w-48 bg-zinc-800 rounded-xl"></div>
                    )}
                    <span className="text-lg text-zinc-400 font-medium mb-2">/ share</span>
                </div>
                <div className="bg-zinc-950 p-6 md:p-8 rounded-2xl border border-zinc-800 max-w-2xl mx-auto">
                    <p className="text-emerald-400 font-medium text-lg leading-relaxed">
                        "What exactly does this stock price reflect that isn't captured in these financial statements?"
                    </p>
                </div>
            </div>

        </div>
      </div>
      <hr className="border-slate-200" />
    </main>
  );
}