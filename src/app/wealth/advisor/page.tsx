"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { 
    Home, Car, GraduationCap, Baby, Dog, Heart, 
    Banknote, Settings2, Plus, X, Menu, Palmtree, Trash2, LineChart, HelpCircle
} from "lucide-react";

// Inject site-wide font and slate text color into Chart.js defaults
ChartJS.defaults.font.family = "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";
ChartJS.defaults.color = "#64748b";
ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend);

const DolphinLogo = ({ className = "text-2xl" }: { className?: string }) => (
  <span className={`inline-block grayscale opacity-80 select-none ${className}`} style={{ lineHeight: 1 }}>
    🐋
  </span>
);

const formatMoney = (num: number | undefined) => {
    if (num === undefined || isNaN(num)) return "$0";
    const isNegative = num < 0;
    const absVal = Math.abs(num);
    return (isNegative ? "-$" : "$") + Math.round(absVal).toLocaleString();
};

const InfoTooltip = ({ text }: { text: string }) => (
    <div className="group relative inline-flex items-center ml-1.5 cursor-help">
        <HelpCircle className="w-3.5 h-3.5 text-slate-400 hover:text-pink-500 transition-colors" />
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-56 p-2.5 bg-slate-900 text-white text-xs leading-relaxed rounded-md shadow-xl z-50 pointer-events-none text-center">
            {text}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900"></div>
        </div>
    </div>
);

function calculateProjection(params: any) {
    const {
        inputs, loans, milestones, houseGoals,
        carGoals, degreeGoals, childGoals, petGoals,
        weddingGoals, bigSpendGoals, categories, allocations
    } = params;

    const months = 30 * 12; 
    const data = [];
    let currentCash = inputs.cash;
    let currentInv = inputs.investments;
    let houseAsset = 0, houseDebt = 0, otherAssets = 0, otherDebts = 0;
    let existingLoans = loans.map((l: any) => ({ ...l }));
    let degreeDebt = 0;
    let activeMortgages: any[] = [];
    let activeDegreeLoans: any[] = [];

    for (let m = 0; m <= months; m++) {
        const yearIndex = Math.floor(m / 12);
        const isYearStart = (m % 12 === 0);

        if (milestones.includes('Real Estate') && isYearStart) {
            houseGoals.forEach((house: any) => {
                if (yearIndex === house.year) {
                    const downPmt = house.cost * (house.downPercent / 100);
                    if (currentCash >= downPmt) {
                        currentCash -= downPmt; 
                        houseAsset += house.cost; 
                        const newDebt = (house.cost - downPmt);
                        houseDebt += newDebt;
                        activeMortgages.push({ balance: newDebt, rate: house.rate, term: 360 });
                    }
                }
            });
        }
        
        if (milestones.includes('New Car') && isYearStart) {
            carGoals.forEach((car: any) => {
                if (yearIndex === car.year && car.type === 'finance') { currentCash -= car.down; otherAssets += car.cost; otherDebts += (car.cost - car.down); } 
            });
        }
        if (milestones.includes('Wedding') && isYearStart) weddingGoals.forEach((w: any) => { if (yearIndex === w.year) currentCash -= w.cost; });
        
        if (milestones.includes('Degree') && isYearStart) {
            degreeGoals.forEach((deg: any) => { 
                if (yearIndex === deg.year) { 
                    currentCash -= deg.paidByCash; 
                    if (deg.useLoan) {
                        degreeDebt += deg.loanAmount;
                        activeDegreeLoans.push({ balance: deg.loanAmount, rate: deg.loanRate, term: deg.loanTermMonths });
                    }
                } 
            });
        }

        if (milestones.includes('Big Spend') && isYearStart) bigSpendGoals.forEach((b: any) => { if (yearIndex === b.year) currentCash -= b.cost; });

        currentInv *= (1 + (inputs.investmentRate / 100 / 12));
        if (houseAsset > 0) houseAsset *= (1 + (0.03 / 12));
        if (otherAssets > 0) otherAssets *= (1 - (0.15 / 12)); // 15% annual vehicle depreciation

        let totalDebtPayment = 0;
        
        existingLoans.forEach((l: any) => {
            if (l.balance > 0) {
                const r = (l.rate || 0) / 100 / 12;
                const pmt = l.payment; 
                const principal = pmt - (l.balance * r);
                totalDebtPayment += l.payment; 
                l.balance -= principal; 
                if (l.balance < 0) l.balance = 0;
                l.termRemaining = Math.max(0, l.termRemaining - 1);
            }
        });

        activeDegreeLoans.forEach((dl) => {
            if (dl.balance > 0) {
                const r = dl.rate / 100 / 12;
                const pmt = (dl.balance * r) / (1 - Math.pow(1 + r, -dl.term)) || 0;
                totalDebtPayment += pmt;
                const principal = pmt - (dl.balance * r);
                degreeDebt -= principal;
                dl.balance -= principal;
                if (dl.balance < 0) dl.balance = 0;
                dl.term = Math.max(0, dl.term - 1);
            }
        });
        if (degreeDebt < 0) degreeDebt = 0;
        
        if (houseDebt > 0) {
            let totalMortgagePrincipal = 0;
            activeMortgages.forEach((mtg) => {
                if (mtg.balance > 0) {
                    const r = mtg.rate / 100 / 12;
                    const pmt = (mtg.balance * r) / (1 - Math.pow(1 + r, -mtg.term)) || 0;
                    totalDebtPayment += pmt;
                    const principal = pmt - (mtg.balance * r);
                    totalMortgagePrincipal += principal;
                    mtg.balance -= principal;
                    if (mtg.balance < 0) mtg.balance = 0;
                }
            });
            houseDebt -= totalMortgagePrincipal;
            if (houseDebt < 0) houseDebt = 0;
        }

        let baseExp = 0;
        Object.entries(categories).forEach(([cat, amount]) => {
            const val = (allocations[cat as string] !== undefined ? allocations[cat as string] : amount);
            if (cat === 'Investments') currentInv += val; else baseExp += (val as number);
        });

        if (milestones.includes('Child')) childGoals.forEach((c: any) => { if (yearIndex >= c.startYear) baseExp += c.cost; });
        if (milestones.includes('Pet')) petGoals.forEach((p: any) => { if (yearIndex >= p.startYear && yearIndex < (p.startYear + 12)) baseExp += (p.food + p.toys + p.insurance); });

        currentCash += (inputs.salary - baseExp - totalDebtPayment);

        // Map strictly 5 year intervals for a clean look
        if (m === 0 || m % 60 === 0) {
            const existingLoanDebt = existingLoans.reduce((a: any, b: any) => a + b.balance, 0);
            const totalLiabilities = Math.round(houseDebt + otherDebts + degreeDebt + existingLoanDebt);
            const totalAssets = Math.round(currentCash + currentInv + houseAsset + otherAssets);
            
            data.push({
                yearLabel: `Year ${Math.floor(m / 12)}`,
                netWorth: totalAssets - totalLiabilities, 
                assets: totalAssets, 
                liabilities: totalLiabilities
            });
        }
    }
    return data;
}

const FormattedInput = ({ label, value, onChange, prefix = "$", suffix = "", tooltip = "" }: any) => {
    const [displayVal, setDisplayVal] = useState("");
    useEffect(() => {
        if (value === 0 || value === undefined) setDisplayVal("");
        else setDisplayVal(value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ","));
    }, [value]);

    const handleChange = (e: any) => {
        const raw = e.target.value.replace(/,/g, '');
        // FIX: Force a true zero if the user clears the box.
        if (raw === '') {
            setDisplayVal('');
            onChange(0); 
        } else if (raw === '-') {
            setDisplayVal('-');
        } else if (!isNaN(Number(raw))) {
            setDisplayVal(e.target.value);
            onChange(Number(raw));
        }
    };
    
    return (
        <div className="font-sans flex flex-col">
            <div className="flex items-center mb-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">{label}</label>
                {tooltip && <InfoTooltip text={tooltip} />}
            </div>
            <div className="relative">
                {prefix && <span className="absolute left-3 top-2.5 text-slate-400 text-sm">{prefix}</span>}
                <input type="text" value={displayVal} onChange={handleChange} className={`w-full h-10 text-sm border border-slate-200 rounded-md focus:ring-1 focus:ring-pink-500 outline-none transition-all ${prefix ? 'pl-7' : 'pl-3'} ${suffix ? 'pr-8' : 'pr-3'}`} />
                {suffix && <span className="absolute right-3 top-2.5 text-slate-400 text-sm">{suffix}</span>}
            </div>
        </div>
    );
};

function AdvisorContent() {
    const searchParams = useSearchParams();
    const importedCash = searchParams.get("cash");

    const [inputs, setInputs] = useState({ salary: 4500, cash: importedCash ? parseInt(importedCash) : 24000, investments: 20000, investmentRate: 10 });
    const [loans, setLoans] = useState<any[]>([{ id: Date.now(), name: "Student Loan", balance: 30000, payment: 350, rate: 5.5, termRemaining: 120, type: 'student' }]);
    const [milestones, setMilestones] = useState<string[]>([]);
    
    const [houseGoals, setHouseGoals] = useState([{ id: Date.now(), cost: 400000, downPercent: 10, year: 5, rate: 6.5 }]); 
    const [carGoals, setCarGoals] = useState([{ id: Date.now(), type: 'finance', cost: 25000, year: 3, down: 3000 }]);
    const [degreeGoals, setDegreeGoals] = useState([{ id: Date.now(), cost: 40000, year: 2, paidByCash: 40000, useLoan: false, loanAmount: 30000, loanRate: 6.5, loanTermMonths: 120 }]);
    const [childGoals, setChildGoals] = useState([{ id: Date.now(), cost: 1500, startYear: 5 }]);
    const [petGoals, setPetGoals] = useState([{ id: Date.now(), food: 50, toys: 20, insurance: 40, startYear: 1 }]);
    const [weddingGoals, setWeddingGoals] = useState([{ id: Date.now(), cost: 20000, year: 3 }]);
    const [bigSpendGoals, setBigSpendGoals] = useState([{ id: Date.now(), cost: 10000, year: 1 }]);
    const [retireGoal, setRetireGoal] = useState({ mode: 'target_amount', targetAmount: 2000000, targetAge: 60, currentAge: 25 });
    
    const [categories, setCategories] = useState({ "Rent/Housing": 1500, "Groceries": 500, "Travel": 200, "Investments": 300, "Utilities": 150, "Shopping & Misc": 100 });
    const [allocations, setAllocations] = useState<Record<string, number>>({});
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const toggleMilestone = (m: string) => milestones.includes(m) ? setMilestones(milestones.filter(x=>x!==m)) : setMilestones([...milestones, m]); 

    const projectionData = useMemo(() => calculateProjection({
        inputs, loans, milestones, houseGoals, carGoals, degreeGoals, 
        childGoals, petGoals, weddingGoals, bigSpendGoals, categories, allocations
    }), [inputs, loans, categories, allocations, milestones, houseGoals, carGoals, degreeGoals, childGoals, petGoals, weddingGoals, bigSpendGoals]);

    const totalOverhead = useMemo(() => {
        let total = loans.reduce((a,b)=>a+b.payment,0);
        Object.entries(categories).forEach(([c, a]) => { if(c!=='Investments') total += (allocations[c]!==undefined ? allocations[c] : a); });
        if(milestones.includes('Child')) childGoals.forEach(c=>total+=c.cost);
        if(milestones.includes('Pet')) petGoals.forEach(p=>total+=(p.food+p.toys+p.insurance));
        return total;
    }, [loans, categories, allocations, milestones, childGoals, petGoals]);

    const totalSpent = totalOverhead + (allocations['Investments'] !== undefined ? allocations['Investments'] : categories['Investments']);
    const overspend = totalSpent > inputs.salary;

    // Building the complex mixed-chart datasets (Bars + Retirement Lines)
    const chartDatasets: any[] = [
        { type: 'bar' as const, label: 'Total Assets', data: projectionData.map(d => d.assets), backgroundColor: '#cbd5e1', borderRadius: 4 },
        { type: 'bar' as const, label: 'Liabilities (Debt)', data: projectionData.map(d => -d.liabilities), backgroundColor: '#f43f5e', borderRadius: 4 },
        { type: 'bar' as const, label: 'Net Worth', data: projectionData.map(d => d.netWorth), backgroundColor: '#0f172a', borderRadius: 4 },
    ];

    let highlightIndex = -1;

    if (milestones.includes('Retire')) {
        if (retireGoal.mode === 'target_amount') {
            chartDatasets.push({
                type: 'line' as const,
                label: 'Target Net Worth',
                data: projectionData.map(() => retireGoal.targetAmount),
                borderColor: '#fb7185', // Pink 400
                borderWidth: 2,
                borderDash: [5, 5],
                pointRadius: 0,
                fill: false,
            });
        } else if (retireGoal.mode === 'target_age') {
            const targetYearOffset = retireGoal.targetAge - retireGoal.currentAge;
            highlightIndex = Math.round(targetYearOffset / 5);
            // Ensure bounds
            if (highlightIndex < 0) highlightIndex = 0;
            if (highlightIndex >= projectionData.length) highlightIndex = projectionData.length - 1;
        }
    }

    return (
        <div className="flex flex-col min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-pink-100">
            
            <nav className="sticky top-0 z-50 w-full border-b border-slate-100 bg-white/80 backdrop-blur-md">
                <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
                    <div className="flex items-center gap-8">
                        <Link href="/" className="font-bold tracking-tight text-slate-900 text-lg flex items-center gap-2 hover:opacity-80 transition-opacity">
                            <DolphinLogo /> Tonina.me
                        </Link>
                        <div className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
                            <Link href="/concept-explorer" className="hover:text-slate-900 transition-colors">Concept Explorer</Link>
                            <Link href="/wealth" className="text-pink-600 font-bold transition-colors">Tonina Wealth</Link>
                            <Link href="/lab" className="hover:text-slate-900 transition-colors">The Lab</Link>
                            <Link href="/blog" className="hover:text-slate-900 transition-colors">Tonina Blog</Link>
                        </div>
                    </div>
                    <div className="flex items-center gap-6 text-sm font-medium text-slate-600">
                        <button className="md:hidden text-slate-500 hover:text-slate-900" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                        </button>
                    </div>
                </div>
            </nav>

            <main className="flex-1 w-full max-w-5xl mx-auto px-6 py-12 space-y-16">
                
                <div className="text-center max-w-2xl mx-auto mb-4">
                    <div className="inline-flex items-center gap-2 bg-pink-50 text-pink-700 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border border-pink-100 mb-4">
                        Interactive Modeling
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-900 mb-6">The Scenario Planner</h1>
                </div>

                {/* Structured Onboarding / Intro */}
                <div className="max-w-3xl mx-auto bg-white p-8 rounded-3xl border border-slate-200 shadow-sm mb-12 text-slate-600 leading-relaxed">
                    <h3 className="text-lg font-bold text-slate-900 mb-3">Welcome!</h3>
                    <p className="mb-4">
                        Financial independence isn't about avoiding $5 lattes. It's about taking control and preparing yourself for major life events. Shall we start?
                    </p>
                    <div className="grid md:grid-cols-3 gap-6 mt-8">
                        <div>
                            <span className="flex items-center gap-2 font-bold text-slate-900 text-sm mb-2"><div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[10px]">1-2</div> Baseline</span>
                            <p className="text-xs">Helps establish your current financial reality and limits.</p>
                        </div>
                        <div>
                            <span className="flex items-center gap-2 font-bold text-slate-900 text-sm mb-2"><div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[10px]">3</div> Aspirations</span>
                            <p className="text-xs">Account for major life choices like weddings or real estate.</p>
                        </div>
                        <div>
                            <span className="flex items-center gap-2 font-bold text-slate-900 text-sm mb-2"><div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[10px]">4</div> Trajectory</span>
                            <p className="text-xs">Plot the impact of your decisions over the next 30 years.</p>
                        </div>
                    </div>
                </div>

                {/* --- STEP 1: BASELINE --- */}
                <section>
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-sm shadow-sm">1</div>
                        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">The Setup</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        
                        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                            <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2"><Banknote className="w-5 h-5 text-pink-600"/> The Assets</h3>
                            <div className="space-y-4">
                                <FormattedInput 
                                    label="Monthly Income" 
                                    tooltip="Your net pay. This is what you actually have leftover after taxes, 401k deductions, and healthcare premiums."
                                    value={inputs.salary} 
                                    onChange={(v:number) => setInputs({...inputs, salary: v})} 
                                />
                                <div className="grid grid-cols-2 gap-4">
                                    <FormattedInput 
                                        label="Liquid Cash" 
                                        tooltip="Cash in your checking accounts, savings accounts, wallet, or anywhere readily accessible."
                                        value={inputs.cash} 
                                        onChange={(v:number) => setInputs({...inputs, cash: v})} 
                                    />
                                    <FormattedInput 
                                        label="Investments" 
                                        tooltip="Capital deployed in retirement accounts, brokerage accounts (stocks, bonds, ETFs), and crypto."
                                        value={inputs.investments} 
                                        onChange={(v:number) => setInputs({...inputs, investments: v})} 
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-bold text-slate-900 flex items-center gap-2"><Settings2 className="w-5 h-5 text-pink-600"/> Current Liabilities</h3>
                                <button onClick={() => setLoans([...loans, {id: Date.now(), balance: 0, payment: 0, rate: 0, termRemaining: 60, type: 'loan'}])} className="text-xs font-bold text-pink-600 bg-pink-50 px-3 py-1.5 rounded-lg hover:bg-pink-100 transition-colors">+ Add Debt</button>
                            </div>
                            <div className="space-y-4 flex-1">
                                {loans.map((loan, i) => (
                                    <div key={loan.id} className="bg-slate-50 p-4 rounded-xl border border-slate-100 relative pr-10">
                                        <button onClick={() => setLoans(loans.filter(l => l.id !== loan.id))} className="absolute top-4 right-3 p-1.5 bg-white border border-slate-200 text-slate-400 hover:text-rose-500 hover:bg-rose-50 hover:border-rose-200 rounded-md transition-colors"><Trash2 className="w-3.5 h-3.5"/></button>
                                        
                                        <div className="grid grid-cols-2 gap-4 mb-4">
                                            <FormattedInput label="Balance Remaining" value={loan.balance} onChange={(v:number) => setLoans(loans.map(l => l.id === loan.id ? {...l, balance: v} : l))} />
                                            <div className="font-sans flex flex-col">
                                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Type</label>
                                                <div className="relative">
                                                    <select value={loan.type} onChange={(e) => setLoans(loans.map(l => l.id === loan.id ? {...l, type: e.target.value} : l))} className="w-full h-10 px-3 text-sm border border-slate-200 rounded-md outline-none focus:ring-1 focus:ring-pink-500 bg-white">
                                                        <option value="student">Student Loan</option>
                                                        <option value="loan">Personal Loan</option>
                                                        <option value="mortgage">Mortgage</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="grid grid-cols-3 gap-4">
                                            <FormattedInput label="Term" value={loan.termRemaining} onChange={(v:number) => setLoans(loans.map(l => l.id === loan.id ? {...l, termRemaining: v} : l))} prefix="" tooltip="How many months until this loan is fully paid off?" />
                                            <FormattedInput label="Monthly Pmt" value={loan.payment} onChange={(v:number) => setLoans(loans.map(l => l.id === loan.id ? {...l, payment: v} : l))} />
                                            <FormattedInput label="Rate %" value={loan.rate} onChange={(v:number) => setLoans(loans.map(l => l.id === loan.id ? {...l, rate: v} : l))} prefix="" suffix="%" />
                                        </div>
                                    </div>
                                ))}
                                {loans.length === 0 && <p className="text-sm text-slate-400 italic py-4 text-center">No active debts. You are debt free.</p>}
                            </div>
                        </div>

                    </div>
                </section>

                {/* --- STEP 2: EXPENSES --- */}
                <section>
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-sm shadow-sm">2</div>
                        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Monthly Expenses</h2>
                    </div>
                    <div className="bg-white p-8 md:p-10 rounded-3xl border border-slate-200 shadow-sm">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                            {Object.entries(categories).map(([cat, initialAmount]) => {
                                const currentVal = allocations[cat as string] !== undefined ? allocations[cat as string] : (initialAmount as number);
                                return (
                                    <div key={cat}>
                                        <div className="flex justify-between items-center mb-2 text-sm">
                                            <span className="font-semibold text-slate-700">{cat}</span>
                                            <span className={`font-bold ${cat==='Investments'?'text-emerald-600':'text-slate-900'}`}>{formatMoney(currentVal)}</span>
                                        </div>
                                        <input 
                                            type="range" min="0" max={inputs.salary} step="50" 
                                            value={currentVal} 
                                            onChange={(e) => setAllocations((prev: Record<string, number>) => ({...prev, [cat]: Number(e.target.value)}))} 
                                            className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-pink-600" 
                                        />
                                    </div>
                                )
                            })}
                        </div>
                        
                        {overspend && (
                            <div className="mt-10 p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm font-bold text-center animate-pulse flex items-center justify-center gap-2">
                                <Heart className="w-4 h-4" /> WARNING: TOTAL SPENDING ({formatMoney(totalSpent)}) EXCEEDS POST-TAX INCOME ({formatMoney(inputs.salary)})
                            </div>
                        )}
                    </div>
                </section>

                {/* --- STEP 3: MILESTONES --- */}
                <section>
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-sm shadow-sm">3</div>
                        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Life Events & Aspirations</h2>
                    </div>
                    <div className="bg-white p-8 md:p-10 rounded-3xl border border-slate-200 shadow-sm">
                        
                        <div className="flex flex-wrap gap-2 mb-10 pb-8 border-b border-slate-100">
                            {['Real Estate', 'New Car', 'Degree', 'Child', 'Pet', 'Wedding', 'Big Spend', 'Retire'].map(m => (
                                <button 
                                    key={m} onClick={() => toggleMilestone(m)}
                                    className={`px-5 py-2.5 text-sm font-bold rounded-full transition-all ${milestones.includes(m) ? 'bg-slate-900 text-white shadow-md' : 'bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'}`}
                                > {m} </button>
                            ))}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {milestones.includes('Real Estate') && (
                                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-6">
                                    <div className="flex justify-between items-center border-b border-slate-200 pb-4">
                                        <h4 className="font-bold text-lg flex items-center gap-2"><Home className="w-5 h-5 text-pink-600"/> Real Estate</h4>
                                        <button onClick={()=>setHouseGoals([...houseGoals, {id: Date.now(), cost: 400000, downPercent: 10, year: 5, rate: 6.5}])} className="text-xs text-pink-600 bg-pink-50 px-3 py-1.5 rounded-lg font-bold hover:bg-pink-100">+ Add Property</button>
                                    </div>
                                    {houseGoals.length > 1 && (
                                        <div className="bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold p-3 rounded-lg text-center italic">
                                            Building a real estate empire, mogul? Don't forget property taxes.
                                        </div>
                                    )}
                                    {houseGoals.map((house, idx) => (
                                        <div key={house.id} className="bg-white p-5 rounded-xl border border-slate-200 relative pr-10">
                                            <button onClick={()=>setHouseGoals(houseGoals.filter(h=>h.id!==house.id))} className="absolute top-5 right-3 p-1.5 bg-slate-50 border border-slate-200 text-slate-400 hover:text-rose-500 hover:bg-rose-50 hover:border-rose-200 rounded-md transition-colors"><Trash2 className="w-4 h-4"/></button>
                                            <FormattedInput label={`Target Value (Property ${idx+1})`} value={house.cost} onChange={(v:number)=>{let g=[...houseGoals]; g[idx].cost=v; setHouseGoals(g)}} />
                                            <div className="grid grid-cols-2 gap-4 mt-4">
                                                <FormattedInput label="Down Payment %" value={house.downPercent} onChange={(v:number)=>{let g=[...houseGoals]; g[idx].downPercent=v; setHouseGoals(g)}} suffix="%" prefix="" />
                                                <FormattedInput label="Mortgage Rate" value={house.rate} onChange={(v:number)=>{let g=[...houseGoals]; g[idx].rate=v; setHouseGoals(g)}} suffix="%" prefix="" />
                                            </div>
                                            <div className="mt-4 pt-4 border-t border-slate-100">
                                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Purchase Year (from now): {house.year}</label>
                                                <input type="range" min="1" max="30" value={house.year} onChange={(e)=>{let g=[...houseGoals]; g[idx].year=Number(e.target.value); setHouseGoals(g)}} className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-pink-600" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            
                            {milestones.includes('New Car') && (
                                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-6">
                                    <div className="flex justify-between items-center border-b border-slate-200 pb-4">
                                        <h4 className="font-bold text-lg flex items-center gap-2"><Car className="w-5 h-5 text-pink-600"/> Vehicles</h4>
                                        <button onClick={()=>setCarGoals([...carGoals, {id: Date.now(), type: 'finance', cost: 25000, year: 3, down: 3000}])} className="text-xs text-pink-600 bg-pink-50 px-3 py-1.5 rounded-lg font-bold hover:bg-pink-100">+ Add Vehicle</button>
                                    </div>
                                    {carGoals.map((car, idx) => (
                                        <div key={car.id} className="bg-white p-5 rounded-xl border border-slate-200 relative pr-10">
                                            <button onClick={()=>setCarGoals(carGoals.filter(c=>c.id!==car.id))} className="absolute top-5 right-3 p-1.5 bg-slate-50 border border-slate-200 text-slate-400 hover:text-rose-500 hover:bg-rose-50 hover:border-rose-200 rounded-md transition-colors"><Trash2 className="w-4 h-4"/></button>
                                            <div className="space-y-4">
                                                <FormattedInput label={`Target Value (Vehicle ${idx+1})`} value={car.cost} onChange={(v:number)=>{let g=[...carGoals]; g[idx].cost=v; setCarGoals(g)}} />
                                                <div className="grid grid-cols-2 gap-4">
                                                    <FormattedInput label="Down Payment" value={car.down} onChange={(v:number)=>{let g=[...carGoals]; g[idx].down=v; setCarGoals(g)}} />
                                                    <FormattedInput label="Purchase Year" value={car.year} onChange={(v:number)=>{let g=[...carGoals]; g[idx].year=v; setCarGoals(g)}} prefix="" />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {milestones.includes('Degree') && (
                                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-6">
                                    <div className="flex justify-between items-center border-b border-slate-200 pb-4">
                                        <h4 className="font-bold text-lg flex items-center gap-2"><GraduationCap className="w-5 h-5 text-pink-600"/> Education</h4>
                                        <button onClick={()=>setDegreeGoals([...degreeGoals, {id: Date.now(), cost: 40000, year: 2, paidByCash: 40000, useLoan: false, loanAmount: 30000, loanRate: 6.5, loanTermMonths: 120}])} className="text-xs text-pink-600 bg-pink-50 px-3 py-1.5 rounded-lg font-bold hover:bg-pink-100">+ Add Degree</button>
                                    </div>
                                    {degreeGoals.map((deg, idx) => (
                                        <div key={deg.id} className="bg-white p-5 rounded-xl border border-slate-200 relative pr-10">
                                            <button onClick={()=>setDegreeGoals(degreeGoals.filter(d=>d.id!==deg.id))} className="absolute top-5 right-3 p-1.5 bg-slate-50 border border-slate-200 text-slate-400 hover:text-rose-500 hover:bg-rose-50 hover:border-rose-200 rounded-md transition-colors"><Trash2 className="w-4 h-4"/></button>
                                            <div className="space-y-4">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <FormattedInput label={`Total Cost (Deg ${idx+1})`} value={deg.cost} onChange={(v:number)=>{let g=[...degreeGoals]; g[idx].cost=v; setDegreeGoals(g)}} />
                                                    <FormattedInput label="Start Year" value={deg.year} onChange={(v:number)=>{let g=[...degreeGoals]; g[idx].year=v; setDegreeGoals(g)}} prefix="" />
                                                </div>
                                                
                                                <div className="pt-4 border-t border-slate-100">
                                                    <div className="flex items-center gap-3 mb-4 cursor-pointer" onClick={() => {let g=[...degreeGoals]; g[idx].useLoan = !g[idx].useLoan; setDegreeGoals(g)}}>
                                                        <div className={`w-10 h-5 rounded-full transition-colors relative ${deg.useLoan ? 'bg-pink-600' : 'bg-slate-300'}`}>
                                                            <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${deg.useLoan ? 'translate-x-5' : 'translate-x-0'}`}></div>
                                                        </div>
                                                        <label className="text-xs font-bold text-slate-700 cursor-pointer">Finance with a Loan?</label>
                                                    </div>

                                                    {deg.useLoan ? (
                                                        <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-100">
                                                            <FormattedInput label="Cash Upfront" value={deg.paidByCash} onChange={(v:number)=>{let g=[...degreeGoals]; g[idx].paidByCash=v; setDegreeGoals(g)}} />
                                                            <FormattedInput label="Loan Amount" value={deg.loanAmount} onChange={(v:number)=>{let g=[...degreeGoals]; g[idx].loanAmount=v; setDegreeGoals(g)}} />
                                                            <FormattedInput label="Loan Rate" value={deg.loanRate} onChange={(v:number)=>{let g=[...degreeGoals]; g[idx].loanRate=v; setDegreeGoals(g)}} suffix="%" prefix="" />
                                                            <FormattedInput label="Term" tooltip="How many months to pay this off?" value={deg.loanTermMonths} onChange={(v:number)=>{let g=[...degreeGoals]; g[idx].loanTermMonths=v; setDegreeGoals(g)}} prefix="" />
                                                        </div>
                                                    ) : (
                                                        <div className="grid grid-cols-1">
                                                            <FormattedInput label="Paid by Cash (Total)" value={deg.paidByCash} onChange={(v:number)=>{let g=[...degreeGoals]; g[idx].paidByCash=v; setDegreeGoals(g)}} />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {milestones.includes('Child') && (
                                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-6">
                                    <div className="flex justify-between items-center border-b border-slate-200 pb-4">
                                        <h4 className="font-bold text-lg flex items-center gap-2"><Baby className="w-5 h-5 text-pink-600"/> Dependents</h4>
                                        <button onClick={()=>setChildGoals([...childGoals, {id: Date.now(), cost: 1500, startYear: 2}])} className="text-xs text-pink-600 bg-pink-50 px-3 py-1.5 rounded-lg font-bold hover:bg-pink-100">+ Add Child</button>
                                    </div>
                                    {childGoals.length >= 2 && (
                                        <div className="bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold p-3 rounded-lg text-center italic">
                                            Single-handedly breaking the declining population trend. Respect.
                                        </div>
                                    )}
                                    {childGoals.map((child, idx) => (
                                        <div key={child.id} className="bg-white p-5 rounded-xl border border-slate-200 relative pr-10">
                                            <button onClick={()=>setChildGoals(childGoals.filter(c=>c.id!==child.id))} className="absolute top-5 right-3 p-1.5 bg-slate-50 border border-slate-200 text-slate-400 hover:text-rose-500 hover:bg-rose-50 hover:border-rose-200 rounded-md transition-colors"><Trash2 className="w-4 h-4"/></button>
                                            <div className="grid grid-cols-2 gap-4">
                                                <FormattedInput label={`Monthly Cost (Ch ${idx+1})`} value={child.cost} onChange={(v:number)=>{let g=[...childGoals]; g[idx].cost=v; setChildGoals(g)}} />
                                                <FormattedInput label="Start Year" value={child.startYear} onChange={(v:number)=>{let g=[...childGoals]; g[idx].startYear=v; setChildGoals(g)}} prefix="" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {milestones.includes('Pet') && (
                                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-6">
                                    <div className="flex justify-between items-center border-b border-slate-200 pb-4">
                                        <h4 className="font-bold text-lg flex items-center gap-2"><Dog className="w-5 h-5 text-pink-600"/> Pets</h4>
                                        <button onClick={()=>setPetGoals([...petGoals, {id: Date.now(), food: 50, toys: 20, insurance: 40, startYear: 1}])} className="text-xs text-pink-600 bg-pink-50 px-3 py-1.5 rounded-lg font-bold hover:bg-pink-100">+ Add Pet</button>
                                    </div>
                                    {petGoals.length > 1 && (
                                        <div className="bg-orange-50 border border-orange-200 text-orange-700 text-xs font-bold p-3 rounded-lg text-center italic">
                                            Feeling lonely? You can always adopt from the shelter today.
                                        </div>
                                    )}
                                    {petGoals.map((pet, idx) => (
                                        <div key={pet.id} className="bg-white p-5 rounded-xl border border-slate-200 relative pr-10">
                                            <button onClick={()=>setPetGoals(petGoals.filter(p=>p.id!==pet.id))} className="absolute top-5 right-3 p-1.5 bg-slate-50 border border-slate-200 text-slate-400 hover:text-rose-500 hover:bg-rose-50 hover:border-rose-200 rounded-md transition-colors"><Trash2 className="w-4 h-4"/></button>
                                            <div className="grid grid-cols-2 gap-4">
                                                <FormattedInput label={`Monthly Cost (Pet ${idx+1})`} value={pet.food + pet.toys + pet.insurance} onChange={(v:number)=>{let g=[...petGoals]; g[idx].food=v; g[idx].toys=0; g[idx].insurance=0; setPetGoals(g)}} />
                                                <FormattedInput label="Start Year" value={pet.startYear} onChange={(v:number)=>{let g=[...petGoals]; g[idx].startYear=v; setPetGoals(g)}} prefix="" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {milestones.includes('Wedding') && (
                                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-6">
                                    <div className="flex justify-between items-center border-b border-slate-200 pb-4">
                                        <h4 className="font-bold text-lg flex items-center gap-2"><Heart className="w-5 h-5 text-pink-600"/> Wedding</h4>
                                        <button onClick={() => setWeddingGoals([...weddingGoals, {id: Date.now(), cost: 20000, year: 2}])} className="text-xs text-pink-600 bg-pink-50 px-3 py-1.5 rounded-lg font-bold hover:bg-pink-100">+ Add Wedding</button>
                                    </div>
                                    {weddingGoals.length > 1 && (
                                        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold p-3 rounded-lg text-center italic">
                                            Planning a second wedding already? Bold strategy.
                                        </div>
                                    )}
                                    {weddingGoals.map((w, idx) => (
                                        <div key={w.id} className="bg-white p-5 rounded-xl border border-slate-200 relative pr-10">
                                            <button onClick={()=>setWeddingGoals(weddingGoals.filter(x=>x.id!==w.id))} className="absolute top-5 right-3 p-1.5 bg-slate-50 border border-slate-200 text-slate-400 hover:text-rose-500 hover:bg-rose-50 hover:border-rose-200 rounded-md transition-colors"><Trash2 className="w-4 h-4"/></button>
                                            <div className="grid grid-cols-2 gap-4">
                                                <FormattedInput label={`Cost (W ${idx+1})`} value={w.cost} onChange={(v:number) => {const newW = [...weddingGoals]; newW[idx].cost = v; setWeddingGoals(newW);}} />
                                                <FormattedInput label="Year" value={w.year} onChange={(v:number) => {const newW = [...weddingGoals]; newW[idx].year = v; setWeddingGoals(newW);}} prefix="" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {milestones.includes('Big Spend') && (
                                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-6">
                                    <div className="flex justify-between items-center border-b border-slate-200 pb-4">
                                        <h4 className="font-bold text-lg flex items-center gap-2"><Banknote className="w-5 h-5 text-pink-600"/> Big Spends</h4>
                                        <button onClick={() => setBigSpendGoals([...bigSpendGoals, {id: Date.now(), cost: 10000, year: 1}])} className="text-xs text-pink-600 bg-pink-50 px-3 py-1.5 rounded-lg font-bold hover:bg-pink-100">+ Add Exp</button>
                                    </div>
                                    {bigSpendGoals.length > 1 && (
                                        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold p-3 rounded-lg text-center italic">
                                            It's probably time to talk to someone about these spending habits.
                                        </div>
                                    )}
                                    {bigSpendGoals.map((b, idx) => (
                                        <div key={b.id} className="bg-white p-5 rounded-xl border border-slate-200 relative pr-10">
                                            <button onClick={()=>setBigSpendGoals(bigSpendGoals.filter(x=>x.id!==b.id))} className="absolute top-5 right-3 p-1.5 bg-slate-50 border border-slate-200 text-slate-400 hover:text-rose-500 hover:bg-rose-50 hover:border-rose-200 rounded-md transition-colors"><Trash2 className="w-4 h-4"/></button>
                                            <div className="grid grid-cols-2 gap-4">
                                                <FormattedInput label={`Cost (Spend ${idx+1})`} value={b.cost} onChange={(v:number) => {const newB = [...bigSpendGoals]; newB[idx].cost = v; setBigSpendGoals(newB);}} />
                                                <FormattedInput label="Year" value={b.year} onChange={(v:number) => {const newB = [...bigSpendGoals]; newB[idx].year = v; setBigSpendGoals(newB);}} prefix="" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {milestones.includes('Retire') && (
                                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                                    <div className="flex justify-between items-center border-b border-slate-200 pb-4 mb-6">
                                        <h4 className="font-bold text-lg flex items-center gap-2"><Palmtree className="w-5 h-5 text-pink-600"/> Retirement Goal</h4>
                                    </div>
                                    <div className="flex gap-1 bg-white border border-slate-200 p-1 rounded-md mb-6">
                                        <button onClick={()=>setRetireGoal({...retireGoal, mode:'target_amount'})} className={`flex-1 text-sm py-2 rounded-sm font-bold transition-colors ${retireGoal.mode==='target_amount'?'bg-slate-100 text-slate-900 shadow-sm':'text-slate-500 hover:text-slate-700'}`}>Target Capital</button>
                                        <button onClick={()=>setRetireGoal({...retireGoal, mode:'target_age'})} className={`flex-1 text-sm py-2 rounded-sm font-bold transition-colors ${retireGoal.mode==='target_age'?'bg-slate-100 text-slate-900 shadow-sm':'text-slate-500 hover:text-slate-700'}`}>Target Age</button>
                                    </div>
                                    {retireGoal.mode === 'target_amount' ? (
                                        <FormattedInput label="Target Net Worth" value={retireGoal.targetAmount} onChange={(v:number)=>setRetireGoal({...retireGoal, targetAmount:v})} />
                                    ) : (
                                        <div className="grid grid-cols-2 gap-4">
                                            <FormattedInput label="Current Age" value={retireGoal.currentAge} onChange={(v:number)=>setRetireGoal({...retireGoal, currentAge:v})} prefix="" />
                                            <FormattedInput label="Retire Age" value={retireGoal.targetAge} onChange={(v:number)=>setRetireGoal({...retireGoal, targetAge:v})} prefix="" />
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                {/* --- STEP 4: RESULTS --- */}
                <section>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-sm shadow-sm"><LineChart className="w-4 h-4"/></div>
                        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Future Trajectory</h2>
                    </div>
                    
                    <p className="text-sm text-slate-500 italic mb-6 leading-relaxed">
                        *Annual projections assume: investments grow by {inputs.investmentRate}% in line with historic S&P 500 growth rates, real estate appreciates 3%, and vehicles lose 15% of their value.
                    </p>

                    <div className="bg-white p-8 md:p-10 rounded-3xl border border-slate-200 shadow-sm mb-6">
                        <div className="h-[400px] w-full">
                            <Bar 
                                data={{
                                    labels: projectionData.map(d => d.yearLabel),
                                    datasets: chartDatasets
                                }} 
                                options={{ 
                                    responsive: true, 
                                    maintainAspectRatio: false, 
                                    interaction: { mode: 'index', intersect: false },
                                    plugins: { 
                                        legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8, font: { size: 12 } } } 
                                    },
                                    scales: { 
                                        y: { 
                                            title: {
                                                display: true,
                                                text: '$ 000s',
                                                color: '#0f172a',
                                                font: { size: 11, weight: 'bold' }
                                            },
                                            grid: { color: '#f1f5f9' }, 
                                            ticks: { 
                                                color: '#0f172a',
                                                font: { size: 11, weight: 'bold' }, 
                                                callback: (v) => (Number(v) / 1000).toLocaleString()
                                            } 
                                        }, 
                                        x: { 
                                            grid: { display: false }, 
                                            ticks: { font: { size: 11 } } 
                                        } 
                                    } 
                                }} 
                                plugins={[{
                                    id: 'mbbHighlight',
                                    beforeDatasetsDraw: (chart) => {
                                        if (highlightIndex >= 0 && highlightIndex < chart.data.labels.length) {
                                            const ctx = chart.ctx;
                                            const xCenter = chart.scales.x.getPixelForTick(highlightIndex);
                                            const tickWidth = chart.scales.x.width / chart.data.labels.length;
                                            const boxWidth = tickWidth * 0.85; 
                                            const xStart = xCenter - boxWidth / 2;
                                            const yTop = chart.chartArea.top + 15;
                                            const yBottom = chart.chartArea.bottom;
                            
                                            ctx.save();
                                            
                                            // Draw shaded background behind bars
                                            ctx.fillStyle = 'rgba(251, 113, 133, 0.05)'; 
                                            ctx.fillRect(xStart, yTop, boxWidth, yBottom - yTop);
                            
                                            // Draw dashed border
                                            ctx.strokeStyle = '#fb7185';
                                            ctx.lineWidth = 1.5;
                                            ctx.setLineDash([4, 4]);
                                            ctx.strokeRect(xStart, yTop, boxWidth, yBottom - yTop);
                                            
                                            // Label
                                            ctx.fillStyle = '#be123c'; 
                                            ctx.font = 'bold 11px Inter, sans-serif';
                                            ctx.textAlign = 'center';
                                            ctx.fillText('Target', xCenter, yTop - 5);
                                            
                                            ctx.restore();
                                        }
                                    }
                                }]}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Starting Status View */}
                        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-6 border-b border-slate-100 pb-3">Starting Baseline</h3>
                            <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                                <div>
                                    <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Cash After Expenses</span>
                                    <span className={`text-2xl font-bold ${inputs.salary - totalSpent >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{formatMoney(inputs.salary - totalSpent)}</span>
                                </div>
                                <div>
                                    <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Total Assets</span>
                                    <span className="text-2xl font-bold text-slate-900">{formatMoney(projectionData[0]?.assets)}</span>
                                </div>
                                <div>
                                    <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Total Debt</span>
                                    <span className="text-2xl font-bold text-rose-600">{formatMoney(projectionData[0]?.liabilities)}</span>
                                </div>
                                <div>
                                    <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Starting Net Worth</span>
                                    <span className="text-2xl font-bold text-slate-500">{formatMoney(projectionData[0]?.netWorth)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Year 30 View */}
                        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-6 border-b border-slate-100 pb-3">Year 30 Horizon</h3>
                            <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                                <div>
                                    <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Projected Assets</span>
                                    <span className="text-2xl font-bold text-slate-900">{formatMoney(projectionData[projectionData.length - 1]?.assets)}</span>
                                </div>
                                <div>
                                    <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Remaining Debt</span>
                                    <span className="text-2xl font-bold text-rose-600">{formatMoney(Math.abs(projectionData[projectionData.length - 1]?.liabilities || 0))}</span>
                                </div>
                                <div className="col-span-2 pt-2">
                                    <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Final Net Worth</span>
                                    <span className="text-3xl font-bold text-slate-500 tracking-tight">{formatMoney(projectionData[projectionData.length - 1]?.netWorth)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            <footer className="border-t border-slate-100 bg-white py-10 mt-auto w-full">
                <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6 text-sm font-medium text-slate-500">
                <div className="flex gap-6">
                    <Link href="/terms" className="hover:text-slate-900 transition-colors">Terms</Link>
                    <Link href="/privacy" className="hover:text-slate-900 transition-colors">Privacy</Link>
                </div>
                <p className="text-xs text-slate-400">© {new Date().getFullYear()} Tonina.me</p>
                </div>
            </footer>
        </div>
    );
}

export default function AdvisorTool() {
  return (
    <Suspense fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans text-slate-500">
            Loading Scenario Planner...
        </div>
    }>
      <AdvisorContent />
    </Suspense>
  );
}