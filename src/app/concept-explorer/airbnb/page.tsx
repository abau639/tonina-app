// @ts-nocheck
"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Home as HomeIcon, Globe, AlertCircle, CheckCircle2, User } from "lucide-react";

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

// --- SCENARIO DATA ---

const SCENARIOS = [
  {
    id: 1,
    title: "The Price-Sensitive Guest",
    icon: <User className="w-5 h-5" />,
    context: "A young family booking a 7-night stay in Orlando. Base rate is $1,500. They are highly price-sensitive and comparing your final checkout price directly against a local Marriott.",
    hostProfile: "Individual host renting out their secondary home. Airbnb provides 90% of their annual booking volume. They have low leverage.",
    basePrice: 1500,
    idealHostFee: 14, 
    idealGuestFee: 3, 
  },
  {
    id: 2,
    title: "The Mega-Property Manager",
    icon: <HomeIcon className="w-5 h-5" />,
    context: "A corporate property management firm booking a luxury ski chalet in Aspen for 4 nights. Base rate is $8,000. The guest is wealthy and price-insensitive.",
    hostProfile: "A massive conglomerate managing 200+ properties. They use a unified channel manager (booking software) and threaten to move all inventory exclusively to VRBO if your fees are too high.",
    basePrice: 8000,
    idealHostFee: 3, 
    idealGuestFee: 14, 
  },
  {
    id: 3,
    title: "The New Market Launch",
    icon: <Globe className="w-5 h-5" />,
    context: "You are launching operations in a highly regulated, emerging market (e.g., a tier-2 city in Southeast Asia). Base rate is $300. You have zero brand awareness here.",
    hostProfile: "Skeptical locals who have never used short-term rental platforms. Guests are equally hesitant.",
    basePrice: 300,
    idealHostFee: 0, 
    idealGuestFee: 0,
  }
];

export default function AirbnbLedger() {
  const [activeStep, setActiveStep] = useState(0); 
  const [ledger, setLedger] = useState<Record<number, { hostFee: number, guestFee: number }>>({
    1: { hostFee: 3, guestFee: 14 }, 
    2: { hostFee: 3, guestFee: 14 },
    3: { hostFee: 3, guestFee: 14 },
  });

  const currentScenario = SCENARIOS[activeStep - 1];

  const handleSliderChange = (type: 'hostFee' | 'guestFee', value: number) => {
    setLedger(prev => ({
      ...prev,
      [currentScenario.id]: {
        ...prev[currentScenario.id],
        [type]: value
      }
    }));
  };

  const evaluateScenario = (scenarioId: number) => {
    const choice = ledger[scenarioId];
    const s = SCENARIOS.find(x => x.id === scenarioId);
    if (!s) return null;

    let status = "success";
    let message = "";

    if (scenarioId === 1) { 
      if (choice.guestFee > 10) {
        status = "fail";
        message = "Cart Abandonment. The guest saw the massive fee at checkout and booked the Marriott instead. You earned $0.";
      } else if (choice.hostFee < 10) {
        status = "suboptimal";
        message = "Transaction cleared, but you left money on the table. The host has zero leverage and would have accepted a higher fee.";
      } else {
        status = "success";
        message = "Perfect execution. You shifted the fee burden to the captive host, ensuring the price-sensitive guest completed the booking.";
      }
    } else if (scenarioId === 2) { 
      if (choice.hostFee > 8) {
        status = "fail";
        message = "Host Churn. The Mega-Manager was furious with the fees and pulled all 200 properties from your platform. Devastating loss of supply.";
      } else if (choice.guestFee < 10) {
        status = "suboptimal";
        message = "Transaction cleared, but you missed margins. This luxury guest is price-insensitive; they would have easily paid a 14% premium.";
      } else {
        status = "success";
        message = "Perfect execution. You appeased the powerful supply side while extracting maximum value from the wealthy demand side.";
      }
    } else if (scenarioId === 3) { 
      if (choice.hostFee > 0 || choice.guestFee > 5) {
        status = "fail";
        message = "Liquidity Failure. By charging standard fees in a brand new, skeptical market, the 'Cold Start' problem kills adoption. The platform fails to launch.";
      } else {
        status = "success";
        message = "Strategic foresight. By subsidizing the transaction (0% fees), you eat a loss today to build the vital network liquidity needed for tomorrow.";
      }
    }

    const hostRevenue = s.basePrice * (1 - (choice.hostFee / 100));
    const guestPays = s.basePrice * (1 + (choice.guestFee / 100));
    const airbnbTakes = (s.basePrice * (choice.hostFee / 100)) + (s.basePrice * (choice.guestFee / 100));
    const takeRate = ((choice.hostFee + choice.guestFee)).toFixed(1);

    return { status, message, hostRevenue, guestPays, airbnbTakes, takeRate };
  };

  if (activeStep === 0) {
    return (
      <main className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
        <GlobalNav />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-2xl bg-white p-10 md:p-14 rounded-3xl border border-slate-200 shadow-sm text-center">
            <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border border-emerald-200 mb-6">
              Marketplace Economics
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 mb-4">The Deal Desk Ledger</h1>
            <p className="text-lg text-slate-500 mb-8 leading-relaxed">
              A "Take Rate" isn't a flat tax—it's a delicate negotiation between supply leverage and demand elasticity. Play as the CFO of a two-sided marketplace. Adjust the fee structures to maximize corporate EBITDA without losing the transactions.
            </p>
            <button 
              onClick={() => setActiveStep(1)}
              className="bg-slate-900 text-white px-8 py-3.5 rounded-full font-bold hover:bg-slate-800 transition-all shadow-sm flex items-center gap-2 mx-auto"
            >
              Open the Ledger <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (activeStep > 0 && activeStep <= SCENARIOS.length) {
    const currentFees = ledger[currentScenario.id];
    
    return (
      <main className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
        <GlobalNav />
        <div className="flex-1 max-w-4xl mx-auto w-full px-6 py-12">
          
          <div className="flex justify-between items-center mb-8">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Transaction {activeStep} of {SCENARIOS.length}</span>
            <span className="text-xs font-bold bg-slate-200 text-slate-600 px-3 py-1 rounded-full">Base Rate: ${currentScenario.basePrice}</span>
          </div>

          <div className="bg-white p-8 md:p-10 rounded-3xl border border-slate-200 shadow-sm mb-8">
            <h2 className="text-3xl font-bold text-slate-900 mb-6 flex items-center gap-3">
              <div className="p-3 bg-pink-50 text-pink-600 rounded-xl">{currentScenario.icon}</div>
              {currentScenario.title}
            </h2>
            
            <div className="grid md:grid-cols-2 gap-6 mb-10">
              <div className="bg-slate-50 p-5 rounded-xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Demand (The Guest)</span>
                <p className="text-sm text-slate-700 leading-relaxed">{currentScenario.context}</p>
              </div>
              <div className="bg-slate-50 p-5 rounded-xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Supply (The Host)</span>
                <p className="text-sm text-slate-700 leading-relaxed">{currentScenario.hostProfile}</p>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-8">
              <h3 className="text-lg font-bold text-slate-900 mb-6">Fee Negotiation</h3>
              
              <div className="space-y-8">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="font-bold text-slate-700">Host Service Fee</span>
                    <span className="font-bold text-pink-600">{currentFees.hostFee}%</span>
                  </div>
                  <input 
                    type="range" min="0" max="20" step="1" 
                    value={currentFees.hostFee} 
                    onChange={(e) => handleSliderChange('hostFee', Number(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-pink-600" 
                  />
                  <div className="flex justify-between text-xs text-slate-400 mt-2">
                    <span>Subsidized (0%)</span>
                    <span>Aggressive (20%)</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <span className="font-bold text-slate-700">Guest Service Fee</span>
                    <span className="font-bold text-pink-600">{currentFees.guestFee}%</span>
                  </div>
                  <input 
                    type="range" min="0" max="20" step="1" 
                    value={currentFees.guestFee} 
                    onChange={(e) => handleSliderChange('guestFee', Number(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-pink-600" 
                  />
                  <div className="flex justify-between text-xs text-slate-400 mt-2">
                    <span>Subsidized (0%)</span>
                    <span>Aggressive (20%)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button 
              onClick={() => setActiveStep(activeStep + 1)}
              className="bg-slate-900 text-white px-8 py-3.5 rounded-full font-bold hover:bg-slate-800 transition-all shadow-sm flex items-center gap-2"
            >
              Lock In Fees & Next <ArrowRight className="w-4 h-4" />
            </button>
          </div>

        </div>
      </main>
    );
  }

  if (activeStep > SCENARIOS.length) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-50 font-sans flex flex-col">
        <GlobalNav />
        <div className="flex-1 max-w-4xl mx-auto w-full px-6 py-12">
          
          <div className="text-center mb-12">
            <span className="text-pink-500 font-bold uppercase tracking-widest text-sm mb-4 block">CFO Performance Review</span>
            <h1 className="text-4xl font-bold text-white mb-2">Transaction Post-Mortem</h1>
            <p className="text-slate-400">Let's see how your Take Rate strategy held up to reality.</p>
          </div>

          <div className="space-y-6 mb-12">
            {SCENARIOS.map(s => {
              const evalResult = evaluateScenario(s.id);
              if (!evalResult) return null;

              return (
                <div key={s.id} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl relative overflow-hidden">
                  <div className={`absolute top-0 left-0 w-1.5 h-full ${evalResult.status === 'success' ? 'bg-emerald-500' : evalResult.status === 'fail' ? 'bg-rose-500' : 'bg-yellow-500'}`}></div>
                  
                  <div className="pl-4">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        {evalResult.status === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                        {evalResult.status === 'fail' && <AlertCircle className="w-5 h-5 text-rose-500" />}
                        {evalResult.status === 'suboptimal' && <AlertCircle className="w-5 h-5 text-yellow-500" />}
                        {s.title}
                      </h3>
                      <div className="text-right">
                        <span className="block text-[10px] text-slate-500 uppercase tracking-widest font-bold">Platform Revenue</span>
                        <span className={`text-xl font-bold ${evalResult.status === 'fail' ? 'text-slate-600 line-through' : 'text-white'}`}>
                          ${evalResult.airbnbTakes.toLocaleString()}
                        </span>
                      </div>
                    </div>
                    
                    <p className={`text-sm leading-relaxed mb-4 ${evalResult.status === 'success' ? 'text-emerald-200' : evalResult.status === 'fail' ? 'text-rose-200' : 'text-yellow-200'}`}>
                      {evalResult.message}
                    </p>

                    <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-800 text-xs">
                      <div><span className="text-slate-500 block mb-1">Host Keeps</span><span className="text-slate-300">${evalResult.hostRevenue.toLocaleString()}</span></div>
                      <div><span className="text-slate-500 block mb-1">Guest Pays</span><span className="text-slate-300">${evalResult.guestPays.toLocaleString()}</span></div>
                      <div><span className="text-slate-500 block mb-1">Effective Take Rate</span><span className="text-slate-300 font-bold text-pink-400">{evalResult.takeRate}%</span></div>
                    </div>
                  </div>
                </div>
              )
            })}
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
      </main>
    );
  }

  return null;
}
