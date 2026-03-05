"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { api } from "~/trpc/react";
import { signOut } from "next-auth/react";
import {
  Chart,
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ArcElement
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { 
    Home, Car, GraduationCap, Baby, Dog, Heart, 
    Banknote, Palmtree, Settings2, Plus, X, LineChart, Menu 
} from "lucide-react";

const DolphinLogo = ({ className = "w-6 h-6" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M2 15c2.5 0 4.5-2 7-2s4.5 2 7 2 4.5-2 7-2" />
    <path d="M9 13c0-4.5 2.5-8 5.5-10-1.5 3-1.5 6 1 8.5" />
  </svg>
);

// SHADCN UI Imports
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

// Register ChartJS
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler, ArcElement);

// --- 1. HELPERS & DATA ---

const PET_DATA: Record<string, { life: number, note?: string }> = {
    'Tonina': { life: 40, note: "River required!" },
    'Bird': { life: 10 },
    'Cat': { life: 15 },
    'Cow': { life: 20 },
    'Dog': { life: 13 },
    'Elephant': { life: 60 },
    'Fish': { life: 3 },
    'Giraffe': { life: 25 },
    'Pig': { life: 18 },
    'Rhino': { life: 40 },
    'Toucan': { life: 20 },
};

const formatMoney = (num: number | undefined) => {
    if (num === undefined || isNaN(num)) return "$0";
    const isNegative = num < 0;
    const absVal = Math.abs(num);
    return (isNegative ? "-$" : "$") + Math.round(absVal).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

// --- 2. LOGIC EXTRACTION ---

function calculateMonthlyExpenses(params: any) {
    const { loans, categories, allocations, milestones, childGoals, petGoals } = params;
    let total = loans.reduce((a: any, b: any) => a + b.payment, 0);
    Object.entries(categories).forEach(([cat, amount]) => {
        if (cat !== 'Investments') {
            total += (allocations[cat as string] !== undefined ? allocations[cat as string] : amount);
        }
    });
    if (milestones.includes('Child')) childGoals.forEach((c: any) => total += c.cost);
    if (milestones.includes('Pet')) petGoals.forEach((p: any) => total += (p.food + p.toys + p.insurance));
    return total;
}

function calculateProjection(params: any) {
    const {
        inputs, loans, projectionYears, milestones, houseGoal,
        carGoals, degreeGoals, childGoals, petGoals,
        weddingGoals, bigSpendGoals, retireGoal, categories, allocations
    } = params;

    const months = projectionYears * 12;
    const data = [];
    let currentCash = inputs.cash;
    let currentInv = inputs.investments;
    let houseAsset = 0, houseDebt = 0, otherAssets = 0, otherDebts = 0;
    let existingLoans = loans.map((l: any) => ({ ...l }));
    let degreeDebt = 0;

    let retireIndex = -1;

    for (let m = 0; m <= months; m++) {
        const yearIndex = Math.floor(m / 12);
        const isYearStart = (m % 12 === 0);

        // --- MILESTONES ---
        if (milestones.includes('Buy House') && yearIndex === houseGoal.year && isYearStart) {
            const downPmt = houseGoal.cost * (houseGoal.downPercent / 100);
            if (currentCash >= downPmt) {
                currentCash -= downPmt; houseAsset += houseGoal.cost; houseDebt += (houseGoal.cost - downPmt);
            }
        }

        if (milestones.includes('New Car') && isYearStart) {
            carGoals.forEach((car: any) => {
                if (yearIndex === car.year) {
                    if (car.type === 'cash') { currentCash -= car.cost; otherAssets += car.cost; } 
                    else if (car.type === 'finance') { currentCash -= car.down; otherAssets += car.cost; otherDebts += (car.cost - car.down); } 
                    else if (car.type === 'lease') { currentCash -= (car.down || 0); }
                }
            });
        }

        if (milestones.includes('Wedding Event') && isYearStart) weddingGoals.forEach((w: any) => { if (yearIndex === w.year) currentCash -= w.cost; });
        if (milestones.includes('Big Spend') && isYearStart) bigSpendGoals.forEach((b: any) => { if (yearIndex === b.year) currentCash -= b.cost; });

        if (milestones.includes('Degree')) {
            degreeGoals.forEach((deg: any) => {
                if (yearIndex >= deg.year && yearIndex < (deg.year + deg.yearsDuration)) {
                    currentCash -= ((deg.paidByCash / deg.yearsDuration) / 12);
                    degreeDebt += ((deg.paidByLoan / deg.yearsDuration) / 12);
                }
            });
        }

        // --- GROWTH ---
        currentInv *= (1 + (inputs.investmentRate / 100 / 12));
        if (houseAsset > 0) houseAsset *= (1 + (0.03 / 12));
        if (otherAssets > 0) otherAssets *= (1 - (0.012));

        // --- PAYMENTS ---
        let totalDebtPayment = 0;
        existingLoans.forEach((l: any) => {
            if (['loan', 'mortgage', 'student'].includes(l.type) && l.balance > 0) {
                const r = (l.rate || 0) / 100 / 12;
                const pmt = l.payment; const principal = pmt - (l.balance * r);
                totalDebtPayment += l.payment; l.balance -= principal; if (l.balance < 0) l.balance = 0;
            }
        });

        if (houseDebt > 0) {
            const r = houseGoal.rate / 100 / 12;
            const pmt = (houseDebt * r) / (1 - Math.pow(1 + r, -360)) || 0;
            totalDebtPayment += pmt; houseDebt -= (pmt - (houseDebt * r)); if (houseDebt < 0) houseDebt = 0;
        }

        if (milestones.includes('New Car')) {
            carGoals.forEach((car: any) => {
                if (car.type === 'finance' && otherDebts > 0) {
                    const monthsSinceBuy = m - (car.year * 12);
                    if (monthsSinceBuy >= 0 && monthsSinceBuy < car.term) {
                        const r = car.rate / 100 / 12; const pmt = ((car.cost - car.down) * r) / (1 - Math.pow(1 + r, -car.term)) || 0;
                        totalDebtPayment += pmt; otherDebts -= (pmt - (otherDebts * r));
                    }
                }
                if (car.type === 'lease') {
                     const monthsSinceBuy = m - (car.year * 12);
                     if (monthsSinceBuy >= 0 && monthsSinceBuy < car.leaseTerm) totalDebtPayment += car.leasePmt;
                }
            });
            if (otherDebts < 0) otherDebts = 0;
        }

        // --- EXPENSES ---
        let baseExp = 0;
        Object.entries(categories).forEach(([cat, amount]) => {
            const val = (allocations[cat as string] !== undefined ? allocations[cat as string] : amount);
            if (cat === 'Investments') currentInv += val; else baseExp += (val as number);
        });

        if (milestones.includes('Child')) childGoals.forEach((c: any) => { if (yearIndex >= c.startYear) baseExp += c.cost; });
        if (milestones.includes('Pet')) petGoals.forEach((p: any) => {
            const life = PET_DATA[p.type as keyof typeof PET_DATA]?.life || 15;
            if (yearIndex >= p.startYear && yearIndex < (p.startYear + life)) baseExp += (p.food + p.toys + p.insurance);
        });

        currentCash += (inputs.salary - baseExp - totalDebtPayment);

        if (m === 0 || m % 12 === 0) {
            const existingLoanDebt = existingLoans.reduce((a: any, b: any) => a + (b.type !== 'lease' ? b.balance : 0), 0);
            const totalLiabilities = Math.round(houseDebt + otherDebts + degreeDebt + existingLoanDebt);
            const totalAssets = Math.round(currentCash + currentInv + houseAsset + otherAssets);
            const netWorth = totalAssets - totalLiabilities;

            if (milestones.includes('Retire')) {
                if (retireGoal.mode === 'target_amount' && retireIndex === -1 && netWorth >= retireGoal.targetAmount) retireIndex = yearIndex;
                if (retireGoal.mode === 'target_age' && yearIndex === (retireGoal.targetAge - retireGoal.currentAge)) retireIndex = yearIndex;
            }

            data.push({
                yearLabel: 2026 + Math.floor(m / 12),
                netWorth, cash: Math.round(currentCash), investments: Math.round(currentInv),
                realEstate: Math.round(houseAsset), liabilities: Math.round(totalLiabilities),
                isRetirement: yearIndex === retireIndex
            });
        }
    }
    return data;
}

// --- 3. UI COMPONENTS ---

const FormattedInput = ({ label, value, onChange, prefix = "$", suffix = "" }: any) => {
    const [displayVal, setDisplayVal] = useState("");
    useEffect(() => {
        if (value === 0 || value === undefined) setDisplayVal("");
        else setDisplayVal(value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ","));
    }, [value]);

    const handleChange = (e: any) => {
        const raw = e.target.value.replace(/,/g, '');
        if (raw === '-' || raw === '' || !isNaN(Number(raw))) {
            setDisplayVal(e.target.value);
            if (raw !== '-' && raw !== '') onChange(Number(raw));
        }
    };
    return (
        <div className="space-y-1.5 font-sans">
            <Label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide">{label}</Label>
            <div className="relative">
                {prefix && <span className="absolute left-3 top-2.5 text-zinc-400 text-sm">{prefix}</span>}
                <Input
                    type="text"
                    value={displayVal}
                    onChange={handleChange}
                    className={`h-10 text-sm border-zinc-200 focus-visible:ring-zinc-400 rounded-md ${prefix ? 'pl-7' : ''} ${suffix ? 'pr-8' : ''}`}
                />
                {suffix && <span className="absolute right-3 top-2.5 text-zinc-400 text-sm">{suffix}</span>}
            </div>
        </div>
    );
};

const InputModal = ({ show, onClose, loans, setLoans }: any) => {
    if (!show) return null;
    return (
        <div className="fixed inset-0 bg-zinc-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl overflow-hidden flex flex-col my-8 border border-zinc-200">
                <div className="px-6 py-4 border-b border-zinc-200 flex justify-between items-center bg-zinc-50">
                    <h2 className="text-lg font-semibold text-zinc-900">Manage Liabilities</h2>
                    <button onClick={onClose} className="text-zinc-400 hover:text-zinc-900 transition-colors"><X className="w-5 h-5"/></button>
                </div>
                <div className="p-6 space-y-6">
                    <div className="flex justify-between items-end">
                        <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Active Facilities</h3>
                        <Button size="sm" variant="outline" className="h-8 text-xs border-zinc-200" onClick={() => setLoans([...loans, { id: Date.now(), name: 'New Loan', balance: 0, payment: 0, rate: 0, type: 'loan' }])}>
                            <Plus className="w-3 h-3 mr-1" /> Add Facility
                        </Button>
                    </div>
                    <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                        {loans.map((loan: any, i: number) => (
                            <div key={loan.id || i} className="bg-white p-4 rounded-md border border-zinc-200 space-y-4 relative">
                                <button onClick={() => setLoans(loans.filter((_: any, idx: number) => idx !== i))} className="absolute top-2 right-2 p-1 text-zinc-300 hover:text-red-500 transition-colors"><X className="w-4 h-4"/></button>
                                <div className="pr-8">
                                    <Label className="text-[10px] uppercase text-zinc-500 mb-1.5 block font-semibold tracking-wide">Facility Type</Label>
                                    <select
                                        value={loan.type}
                                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => { const newLoans = [...loans]; newLoans[i].type = e.target.value; setLoans(newLoans); }}
                                        className="w-full h-10 px-3 rounded-md border border-zinc-200 bg-zinc-50 text-sm focus:ring-1 focus:ring-zinc-400 outline-none"
                                    >
                                        <option value="loan">Personal Loan</option>
                                        <option value="student">Student Loan</option>
                                        <option value="mortgage">Mortgage</option>
                                        <option value="lease">Lease</option>
                                    </select>
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                    <FormattedInput label="Balance" value={loan.balance} onChange={(v: number) => { const l = [...loans]; l[i].balance = v; setLoans(l); }} />
                                    <FormattedInput label="Rate %" value={loan.rate} onChange={(v: number) => { const l = [...loans]; l[i].rate = v; setLoans(l); }} suffix="%" />
                                    <FormattedInput label="Monthly Pmt" value={loan.payment} onChange={(v: number) => { const l = [...loans]; l[i].payment = v; setLoans(l); }} />
                                </div>
                            </div>
                        ))}
                        {loans.length === 0 && <p className="text-center text-zinc-400 text-sm py-4">No active facilities recorded.</p>}
                    </div>
                </div>
                <div className="p-4 border-t border-zinc-200 bg-zinc-50 flex justify-end">
                    <Button onClick={onClose} className="bg-zinc-900 text-white hover:bg-zinc-800">Done</Button>
                </div>
            </div>
        </div>
    );
};


// --- MAIN DASHBOARD EXPORT ---
export default function Dashboard() {
    // State
    const [inputs, setInputs] = useState({ salary: 8000, cash: 15000, investments: 50000, investmentRate: 7 });
    const [loans, setLoans] = useState<any[]>([{ name: "Student Loan", balance: 12000, payment: 250, rate: 4.5, type: 'student' }]);
    
    const [milestones, setMilestones] = useState(['Financial Independence']);
    const [houseGoal, setHouseGoal] = useState({ cost: 500000, downPercent: 20, year: 5, rate: 6.5 }); 
    const [carGoals, setCarGoals] = useState([{ id:1, type: 'finance', cost: 35000, year: 3, down: 5000, rate: 7, term: 60, leasePmt: 450, leaseTerm: 36, buyoutPercent: 50 }]);
    const [degreeGoals, setDegreeGoals] = useState([{ id:1, type: 'Masters', cost: 40000, year: 2, yearsDuration: 2, paidByCash: 10000, paidByScholarship: 5000, paidByLoan: 25000 }]);
    const [childGoals, setChildGoals] = useState([{ id:1, name: "Child 1", cost: 1500, startYear: 2 }]);
    const [petGoals, setPetGoals] = useState([{ id:1, type: "Dog", startYear: 1, food: 50, toys: 20, insurance: 40, litter: 0 }]);
    const [weddingGoals, setWeddingGoals] = useState([{ id:1, cost: 20000, year: 2 }]);
    const [bigSpendGoals, setBigSpendGoals] = useState([{ id:1, cost: 10000, year: 1 }]);
    const [retireGoal, setRetireGoal] = useState({ mode: 'target_amount', targetAmount: 2500000, targetAge: 55, currentAge: 30 });
    
    const [categories] = useState({ "Rent/Housing": 2000, "Groceries": 600, "Travel": 300, "Gifts": 100, "Investments": 500, "Household Improvements": 100, "Utilities": 200, "Insurance": 150 });
    const [allocations, setAllocations] = useState<Record<string, number>>({});
    
    const [projectionYears, setProjectionYears] = useState(30);
    const [chartMode, setChartMode] = useState<'growth' | 'breakdown'>('growth');
    const [showInputModal, setShowInputModal] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    // DB SYNC
    const utils = api.useUtils();
    const { data: serverData, isLoading } = api.financials.getUserData.useQuery();
    const saveMutation = api.financials.saveData.useMutation({
        onSuccess: () => { utils.financials.getUserData.invalidate(); alert("Progress Saved."); },
        onError: (e) => {
            if (e.message.includes("Record to update not found")) { alert("Session invalid. Signing out..."); signOut(); } 
            else { alert("Error: " + e.message); }
        }
    });

    useEffect(() => {
        if (serverData) {
            setInputs({
                salary: serverData.salary ?? 8000, cash: serverData.cash ?? 15000,
                investments: serverData.investments ?? 50000, investmentRate: serverData.investmentRate ?? 7
            });
            // Fix: Place id after spread to prevent TypeScript overwrite errors, and fallback to index if missing
            if (serverData.loans && serverData.loans.length > 0) setLoans(serverData.loans.map((l: any, i: number) => ({ ...l, id: l.id || i })));
            if (serverData.expenseData) {
                try {
                    const saved = JSON.parse(serverData.expenseData);
                    if (saved.allocations) setAllocations(saved.allocations);
                    if (saved.milestones) {
                        setMilestones(saved.milestones.list || ['Financial Independence']);
                        if (saved.milestones.houseGoal) setHouseGoal(saved.milestones.houseGoal);
                        if (saved.milestones.carGoals) setCarGoals(saved.milestones.carGoals);
                        if (saved.milestones.petGoals) setPetGoals(saved.milestones.petGoals);
                        if (saved.milestones.degreeGoals) setDegreeGoals(saved.milestones.degreeGoals);
                        if (saved.milestones.childGoals) setChildGoals(saved.milestones.childGoals);
                        if (saved.milestones.weddingGoals) setWeddingGoals(saved.milestones.weddingGoals);
                        if (saved.milestones.bigSpendGoals) setBigSpendGoals(saved.milestones.bigSpendGoals);
                        if (saved.milestones.retireGoal) setRetireGoal(saved.milestones.retireGoal);
                    }
                } catch(e) {}
            }
        }
    }, [serverData]);

    const handleSave = () => {
        const expenseDataObj = {
            allocations,
            milestones: { list: milestones, houseGoal, carGoals, degreeGoals, childGoals, petGoals, weddingGoals, bigSpendGoals, retireGoal }
        };
        saveMutation.mutate({ 
            ...inputs, 
            loans: loans.map(l => ({...l, name: 'Loan', type: l.type || 'loan'})), 
            milestones: [],
            expenseData: JSON.stringify(expenseDataObj) 
        });
    };

    const toggleMilestone = (m: string) => { 
        if (milestones.includes(m)) setMilestones(milestones.filter((x:string) => x !== m)); 
        else setMilestones([...milestones, m]); 
    };

    const projectionData = useMemo(() => calculateProjection({
        inputs, loans, projectionYears, milestones, houseGoal, carGoals, degreeGoals, 
        childGoals, petGoals, weddingGoals, bigSpendGoals, retireGoal, categories, allocations
    }), [inputs, loans, categories, allocations, milestones, houseGoal, carGoals, degreeGoals, childGoals, petGoals, weddingGoals, bigSpendGoals, projectionYears, retireGoal]);

    const totalMonthlyExpenses = useMemo(() => calculateMonthlyExpenses({
        loans, categories, allocations, milestones, childGoals, petGoals
    }), [loans, categories, allocations, milestones, childGoals, petGoals]);

    if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-zinc-50 text-zinc-500 font-sans text-sm">Loading Environment...</div>;

    return (
        <div className="flex flex-col min-h-screen bg-zinc-50 font-sans text-zinc-900">
            {/* Professional Top Navigation */}
            <nav className="h-14 bg-white border-b border-zinc-200 flex items-center justify-between px-6 sticky top-0 z-30">
                <div className="flex items-center gap-8">
                    <Link href="/" className="font-bold text-lg text-zinc-900 tracking-tight flex items-center gap-2 hover:opacity-80">
                        <DolphinLogo className="w-5 h-5 text-zinc-900" />
                        Tonina.me
                    </Link>
                    <div className="hidden md:flex gap-1 text-sm font-medium">
                        <Link href="/concept-explorer" className="px-3 py-1.5 text-zinc-500 hover:text-zinc-900 rounded-md transition-colors">Concept-Explorer</Link>
                        <Link href="/wealth" className="px-3 py-1.5 text-zinc-900 bg-zinc-100 rounded-md transition-colors">Tonina Wealth</Link>
                        <Link href="/sandbox" className="px-3 py-1.5 text-zinc-500 hover:text-zinc-900 rounded-md transition-colors">Sandbox</Link>
                        <Link href="/blog" className="px-3 py-1.5 text-zinc-500 hover:text-zinc-900 rounded-md transition-colors">Blog</Link>
                        <Link href="/journey" className="px-3 py-1.5 text-zinc-500 hover:text-zinc-900 rounded-md transition-colors">Journey</Link>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <a href="mailto:alfredo@tonina.me" className="hidden md:block text-sm font-medium text-zinc-500 hover:text-zinc-900 transition-colors">Book 1:1 Session</a>
                    <div className="w-px h-4 bg-zinc-200 hidden md:block"></div>
                    <button onClick={() => signOut()} className="hidden md:block text-sm font-medium text-zinc-500 hover:text-zinc-900 transition-colors">Sign Out</button>
                    
                    {/* Mobile Menu Toggle */}
                    <button className="md:hidden text-zinc-500 hover:text-zinc-900" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                        {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                    </button>
                </div>
            </nav>

            {/* Mobile Nav Dropdown */}
            {mobileMenuOpen && (
                <div className="md:hidden border-b border-zinc-200 bg-white px-6 py-4 space-y-4 shadow-sm absolute w-full z-20 flex flex-col">
                    <Link href="/concept-explorer" className="text-sm font-medium text-zinc-500 hover:text-zinc-900">Concept-Explorer</Link>
                    <Link href="/wealth" className="text-sm font-medium text-zinc-900">Tonina Wealth</Link>
                    <Link href="/sandbox" className="text-sm font-medium text-zinc-500 hover:text-zinc-900">Sandbox</Link>
                    <Link href="/blog" className="text-sm font-medium text-zinc-500 hover:text-zinc-900">Blog</Link>
                    <Link href="/journey" className="text-sm font-medium text-zinc-500 hover:text-zinc-900">Journey</Link>
                    <div className="h-px w-full bg-zinc-100 my-1"></div>
                    <a href="mailto:alfredo@tonina.me" className="text-sm font-medium text-zinc-500 hover:text-zinc-900">Book 1:1 Session</a>
                    <button onClick={() => signOut()} className="text-sm font-medium text-zinc-500 hover:text-zinc-900 text-left">Sign Out</button>
                </div>
            )}

            <main className="flex-1 w-full max-w-6xl mx-auto px-6 py-10 space-y-8">
                <InputModal show={showInputModal} onClose={()=>setShowInputModal(false)} loans={loans} setLoans={setLoans} />
                
                {/* Header & Controls */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-zinc-200 pb-6">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Scenario Planner</h1>
                        <p className="text-sm text-zinc-500 mt-1">Institutional-grade net worth projection.</p>
                    </div>
                    <Button onClick={handleSave} disabled={saveMutation.isPending} className="bg-zinc-900 text-white hover:bg-zinc-800 h-10 px-6 rounded-md shadow-sm">
                        {saveMutation.isPending ? "Saving..." : "Save Progress"}
                    </Button>
                </div>

                {/* Core Snapshot */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="border-zinc-200 shadow-sm rounded-lg">
                        <CardHeader className="pb-4 border-b border-zinc-100"><CardTitle className="text-sm font-semibold text-zinc-600 uppercase tracking-wider">Financial Health</CardTitle></CardHeader>
                        <CardContent className="pt-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-zinc-50 p-4 rounded-md border border-zinc-200">
                                    <span className="text-[10px] font-semibold text-zinc-500 uppercase block mb-1">Monthly Income</span>
                                    <span className="text-lg font-bold text-zinc-900">{formatMoney(inputs.salary)}</span>
                                </div>
                                <div className="bg-zinc-50 p-4 rounded-md border border-zinc-200">
                                    <span className="text-[10px] font-semibold text-zinc-500 uppercase block mb-1">Monthly Expenses</span>
                                    <span className="text-lg font-bold text-zinc-900">{formatMoney(totalMonthlyExpenses)}</span>
                                </div>
                                <div className="bg-white p-4 rounded-md border border-zinc-200 col-span-2 shadow-sm">
                                    <span className="text-[10px] font-semibold text-zinc-500 uppercase block mb-1">Net Monthly Cash Flow</span>
                                    <span className="text-2xl font-bold text-zinc-900">{formatMoney(inputs.salary - totalMonthlyExpenses)}</span>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4 pt-6 mt-4 border-t border-zinc-100">
                                <div className="text-center">
                                    <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block mb-1">Total Assets</span>
                                    <span className="text-xl font-bold text-emerald-900">{formatMoney(inputs.cash + inputs.investments)}</span>
                                </div>
                                <div className="text-center">
                                    <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider block mb-1">Total Debt</span>
                                    <span className="text-xl font-bold text-rose-900">{formatMoney(loans.reduce((a:any,b:any)=>a+b.balance,0))}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-zinc-200 shadow-sm rounded-lg">
                         <CardHeader className="pb-4 border-b border-zinc-100"><CardTitle className="text-sm font-semibold text-zinc-600 uppercase tracking-wider">Engine Parameters</CardTitle></CardHeader>
                         <CardContent className="pt-6 space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <FormattedInput label="Monthly Net Income" value={inputs.salary} onChange={(v:number) => setInputs({...inputs, salary: v})} />
                                <FormattedInput label="Investment Growth Rate" value={inputs.investmentRate} onChange={(v:number) => setInputs({...inputs, investmentRate: v})} prefix="" suffix="%" />
                                <FormattedInput label="Liquid Cash" value={inputs.cash} onChange={(v:number) => setInputs({...inputs, cash: v})} />
                                <FormattedInput label="Investments" value={inputs.investments} onChange={(v:number) => setInputs({...inputs, investments: v})} />
                            </div>
                            <div className="flex justify-between items-center bg-zinc-50 p-4 rounded-md border border-zinc-200">
                                <div>
                                    <Label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Credit Facilities</Label>
                                    <p className="text-sm font-medium text-zinc-800 mt-0.5">{loans.length} Active Accounts</p>
                                </div>
                                <Button variant="outline" size="sm" className="h-8 border-zinc-300 text-xs" onClick={() => setShowInputModal(true)}>
                                    <Settings2 className="w-3 h-3 mr-1.5"/> Manage
                                </Button>
                            </div>
                         </CardContent>
                    </Card>
                </div>

                {/* Expense Playground */}
                <Card className="border-zinc-200 shadow-sm rounded-lg">
                    <CardHeader className="pb-4 border-b border-zinc-100"><CardTitle className="text-sm font-semibold text-zinc-600 uppercase tracking-wider">Expense Matrix</CardTitle></CardHeader>
                    <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                        {Object.entries(categories).map(([cat, initialAmount]) => {
                            // Fix: Ensure undefined resolves properly to initialAmount and handles type correctly
                            const currentVal = allocations[cat as string] !== undefined ? allocations[cat as string] : (initialAmount as number);
                            return (
                                <div key={cat} className="space-y-3">
                                    <div className="flex justify-between items-end">
                                        <Label className="font-semibold text-sm text-zinc-800">{cat}</Label>
                                        <div className="w-24">
                                             <FormattedInput label="" value={currentVal ?? 0} onChange={(v:number) => setAllocations((prev: Record<string, number>) => ({...prev, [cat]: v || 0}))} />
                                        </div>
                                    </div>
                                    <Slider defaultValue={[initialAmount as number]} max={inputs.salary} step={10} value={[currentVal ?? 0]} onValueChange={(v: number[]) => setAllocations((prev: Record<string, number>) => ({...prev, [cat]: v[0] || 0}))} className="[&_[role=slider]]:bg-zinc-900 [&_[role=slider]]:border-zinc-900 [&_[role=track]]:bg-zinc-200" />
                                </div>
                            )
                        })}
                    </CardContent>
                </Card>

                {/* Milestones */}
                <Card className="border-zinc-200 shadow-sm rounded-lg overflow-visible">
                    <CardHeader className="pb-4 border-b border-zinc-100"><CardTitle className="text-sm font-semibold text-zinc-600 uppercase tracking-wider">Life Events & Capital Expenditures</CardTitle></CardHeader>
                    <CardContent className="pt-6">
                        <div className="flex flex-wrap gap-2 mb-8">
                            {['Buy House', 'New Car', 'Degree', 'Child', 'Pet', 'Wedding Event', 'Big Spend', 'Retire'].map(m => (
                                <button 
                                    key={m} 
                                    onClick={() => toggleMilestone(m)}
                                    className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${milestones.includes(m) ? 'bg-zinc-900 text-white border-zinc-900 shadow-sm' : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50'}`}
                                >
                                    {m}
                                </button>
                            ))}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {/* House */}
                            {milestones.includes('Buy House') && (
                                <div className="bg-white p-5 rounded-lg border border-zinc-200 shadow-sm space-y-4 relative">
                                    <button onClick={() => toggleMilestone('Buy House')} className="absolute top-3 right-3 text-zinc-400 hover:text-red-500 transition-colors"><X className="w-4 h-4"/></button>
                                    <h4 className="font-semibold text-zinc-900 text-sm flex items-center gap-2"><Home className="w-4 h-4 text-zinc-500"/> Real Estate</h4>
                                    <FormattedInput label="Target Value" value={houseGoal.cost} onChange={(v:number)=>setHouseGoal({...houseGoal, cost:v})} />
                                    <div className="grid grid-cols-2 gap-3">
                                        <FormattedInput label="Down %" value={houseGoal.downPercent} onChange={(v:number)=>setHouseGoal({...houseGoal, downPercent:v})} suffix="%" prefix="" />
                                        <FormattedInput label="Interest Rate" value={houseGoal.rate} onChange={(v:number)=>setHouseGoal({...houseGoal, rate:v})} suffix="%" prefix="" />
                                    </div>
                                    <div>
                                        <Label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2 block">Acquisition Year: {houseGoal.year}</Label>
                                        <Slider min={1} max={50} value={[houseGoal.year]} onValueChange={(v: number[]) => setHouseGoal({...houseGoal, year:v[0] || 0})} className="[&_[role=slider]]:bg-zinc-900 [&_[role=slider]]:border-zinc-900 [&_[role=track]]:bg-zinc-200" />
                                    </div>
                                </div>
                            )}
                            
                            {/* Car */}
                            {milestones.includes('New Car') && (
                                <div className="bg-white p-5 rounded-lg border border-zinc-200 shadow-sm space-y-4 relative">
                                    <button onClick={() => toggleMilestone('New Car')} className="absolute top-3 right-3 text-zinc-400 hover:text-red-500 transition-colors"><X className="w-4 h-4"/></button>
                                    <h4 className="font-semibold text-zinc-900 text-sm flex items-center gap-2"><Car className="w-4 h-4 text-zinc-500"/> Vehicles</h4>
                                    {carGoals.map((car:any, i:number) => (
                                        <div key={i} className="bg-zinc-50 p-3 rounded-md border border-zinc-200 relative pt-6">
                                            <button onClick={()=>setCarGoals(carGoals.filter((_:any,idx:number)=>idx!==i))} className="absolute top-1.5 right-1.5 text-zinc-400 hover:text-red-500"><X className="w-3 h-3"/></button>
                                            <div className="flex gap-1 mb-3 bg-zinc-200/50 p-1 rounded-md">
                                                {['cash','finance','lease'].map(t => (
                                                    <button key={t} onClick={()=>setCarGoals(carGoals.map((c:any,idx:number)=>idx===i?{...c, type:t}:c))} className={`flex-1 text-[10px] uppercase font-bold py-1 rounded-sm transition-colors ${car.type===t ? 'bg-white shadow-sm text-zinc-900' : 'text-zinc-500 hover:text-zinc-700'}`}>{t}</button>
                                                ))}
                                            </div>
                                            <FormattedInput label="Asset Value" value={car.cost} onChange={(v:number)=>setCarGoals(carGoals.map((c:any,idx:number)=>idx===i?{...c, cost:v}:c))} />
                                            <div className="grid grid-cols-2 gap-3 mt-3">
                                                <FormattedInput label="Year" value={car.year} onChange={(v:number)=>setCarGoals(carGoals.map((c:any,idx:number)=>idx===i?{...c, year:v}:c))} prefix="" />
                                                {car.type === 'finance' && <FormattedInput label="Down Pmt" value={car.down} onChange={(v:number)=>setCarGoals(carGoals.map((c:any,idx:number)=>idx===i?{...c, down:v}:c))} />}
                                            </div>
                                        </div>
                                    ))} 
                                    <Button size="sm" variant="ghost" className="w-full text-xs border border-dashed border-zinc-300 text-zinc-600 hover:bg-zinc-50" onClick={()=>setCarGoals([...carGoals, {id: Date.now(), type: 'finance', cost: 35000, year: 3, down: 5000, rate: 7, term: 60, leasePmt: 450, leaseTerm: 36, buyoutPercent: 50}])}>+ Add Vehicle</Button>
                                </div>
                            )}

                            {/* Degree */}
                            {milestones.includes('Degree') && (
                                <div className="bg-white p-5 rounded-lg border border-zinc-200 shadow-sm space-y-4 relative">
                                    <button onClick={() => toggleMilestone('Degree')} className="absolute top-3 right-3 text-zinc-400 hover:text-red-500 transition-colors"><X className="w-4 h-4"/></button>
                                    <h4 className="font-semibold text-zinc-900 text-sm flex items-center gap-2"><GraduationCap className="w-4 h-4 text-zinc-500"/> Education</h4>
                                    {degreeGoals.map((deg:any, i:number) => (
                                        <div key={i} className="bg-zinc-50 p-3 rounded-md border border-zinc-200 relative pt-6 space-y-3">
                                            <button onClick={()=>setDegreeGoals(degreeGoals.filter((_:any,idx:number)=>idx!==i))} className="absolute top-1.5 right-1.5 text-zinc-400 hover:text-red-500"><X className="w-3 h-3"/></button>
                                            <FormattedInput label="Total Cost" value={deg.cost} onChange={(v:number)=>setDegreeGoals(degreeGoals.map((d:any,idx:number)=>idx===i?{...d, cost:v}:d))} />
                                            <div className="grid grid-cols-2 gap-3">
                                                <FormattedInput label="Start Year" value={deg.year} onChange={(v:number)=>setDegreeGoals(degreeGoals.map((d:any,idx:number)=>idx===i?{...d, year:v}:d))} prefix="" />
                                                <FormattedInput label="Duration" value={deg.yearsDuration} onChange={(v:number)=>setDegreeGoals(degreeGoals.map((d:any,idx:number)=>idx===i?{...d, yearsDuration:v}:d))} prefix="" suffix="y" />
                                            </div>
                                            <div className="pt-2 border-t border-zinc-200">
                                                <Label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider mb-2 block">Funding Source</Label>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <FormattedInput label="Cash" value={deg.paidByCash} onChange={(v:number)=>setDegreeGoals(degreeGoals.map((d:any,idx:number)=>idx===i?{...d, paidByCash:v}:d))} />
                                                    <FormattedInput label="Loan" value={deg.paidByLoan} onChange={(v:number)=>setDegreeGoals(degreeGoals.map((d:any,idx:number)=>idx===i?{...d, paidByLoan:v}:d))} />
                                                </div>
                                            </div>
                                        </div>
                                    ))} 
                                    <Button size="sm" variant="ghost" className="w-full text-xs border border-dashed border-zinc-300 text-zinc-600 hover:bg-zinc-50" onClick={()=>setDegreeGoals([...degreeGoals, {id:Date.now(), type:'Masters', cost:40000, year:2, yearsDuration:2, paidByCash:0, paidByScholarship:0, paidByLoan:0}])}>+ Add Program</Button>
                                </div>
                            )}

                            {/* Child */}
                            {milestones.includes('Child') && (
                                <div className="bg-white p-5 rounded-lg border border-zinc-200 shadow-sm space-y-4 relative">
                                    <button onClick={() => toggleMilestone('Child')} className="absolute top-3 right-3 text-zinc-400 hover:text-red-500 transition-colors"><X className="w-4 h-4"/></button>
                                    <h4 className="font-semibold text-zinc-900 text-sm flex items-center gap-2"><Baby className="w-4 h-4 text-zinc-500"/> Dependents</h4>
                                    {childGoals.map((child:any, i:number) => (
                                        <div key={i} className="bg-zinc-50 p-3 rounded-md border border-zinc-200 relative pt-6 space-y-3">
                                            <button onClick={()=>setChildGoals(childGoals.filter((_:any,idx:number)=>idx!==i))} className="absolute top-1.5 right-1.5 text-zinc-400 hover:text-red-500"><X className="w-3 h-3"/></button>
                                            <FormattedInput label="Monthly Cost" value={child.cost} onChange={(v:number)=>setChildGoals(childGoals.map((c:any,idx:number)=>idx===i?{...c, cost:v}:c))} />
                                            <FormattedInput label="Start Year" value={child.startYear} onChange={(v:number)=>setChildGoals(childGoals.map((c:any,idx:number)=>idx===i?{...c, startYear:v}:c))} prefix="" />
                                        </div>
                                    ))} 
                                    <Button size="sm" variant="ghost" className="w-full text-xs border border-dashed border-zinc-300 text-zinc-600 hover:bg-zinc-50" onClick={()=>setChildGoals([...childGoals, {id:Date.now(), name:'Child', cost:1500, startYear:2}])}>+ Add Dependent</Button>
                                </div>
                            )}

                             {/* Pet */}
                             {milestones.includes('Pet') && (
                                <div className="bg-white p-5 rounded-lg border border-zinc-200 shadow-sm space-y-4 relative">
                                    <button onClick={() => toggleMilestone('Pet')} className="absolute top-3 right-3 text-zinc-400 hover:text-red-500 transition-colors"><X className="w-4 h-4"/></button>
                                    <h4 className="font-semibold text-zinc-900 text-sm flex items-center gap-2"><Dog className="w-4 h-4 text-zinc-500"/> Pets</h4>
                                    {petGoals.map((pet:any, i:number) => (
                                        <div key={i} className="bg-zinc-50 p-3 rounded-md border border-zinc-200 relative pt-6 space-y-3">
                                            <button onClick={()=>setPetGoals(petGoals.filter((_:any,idx:number)=>idx!==i))} className="absolute top-1.5 right-1.5 text-zinc-400 hover:text-red-500"><X className="w-3 h-3"/></button>
                                            <div>
                                                <Label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block mb-1.5">Species</Label>
                                                <select className="w-full h-10 px-3 text-sm border border-zinc-200 rounded-md bg-white focus:ring-1 focus:ring-zinc-400 outline-none" value={pet.type} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setPetGoals(petGoals.map((item:any,idx:number)=>idx===i?{...item, type:e.target.value}:item))}>
                                                    {Object.keys(PET_DATA).map(k=><option key={k} value={k}>{k}</option>)}
                                                </select>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <FormattedInput label="Start Year" value={pet.startYear} onChange={(v:number)=>setPetGoals(petGoals.map((p:any,idx:number)=>idx===i?{...p, startYear:v}:p))} prefix="" />
                                                <FormattedInput label="Monthly Cost" value={pet.food + pet.toys + pet.insurance} onChange={(v:number)=>setPetGoals(petGoals.map((p:any,idx:number)=>idx===i?{...p, food:v, toys:0, insurance:0}:p))} />
                                            </div>
                                        </div>
                                    ))}
                                    <Button size="sm" variant="ghost" className="w-full text-xs border border-dashed border-zinc-300 text-zinc-600 hover:bg-zinc-50" onClick={()=>setPetGoals([...petGoals, {id:Date.now(), type:"Dog", startYear:1, food:50, toys:20, insurance:40, litter:0}])}>+ Add Pet</Button>
                                </div>
                            )}

                            {/* Wedding */}
                            {milestones.includes('Wedding Event') && (
                                <div className="bg-white p-5 rounded-lg border border-zinc-200 shadow-sm space-y-4 relative">
                                    <button onClick={() => toggleMilestone('Wedding Event')} className="absolute top-3 right-3 text-zinc-400 hover:text-red-500 transition-colors"><X className="w-4 h-4"/></button>
                                    <h4 className="font-semibold text-zinc-900 text-sm flex items-center gap-2"><Heart className="w-4 h-4 text-zinc-500"/> Wedding Event</h4>
                                    {weddingGoals.map((w:any,i:number)=>(
                                        <div key={i} className="bg-zinc-50 p-3 rounded-md border border-zinc-200 relative pt-6 space-y-3">
                                            <button onClick={()=>setWeddingGoals(weddingGoals.filter((_:any,idx:number)=>idx!==i))} className="absolute top-1.5 right-1.5 text-zinc-400 hover:text-red-500"><X className="w-3 h-3"/></button>
                                            <FormattedInput label="Total Cost" value={w.cost} onChange={(v:number)=>setWeddingGoals(weddingGoals.map((item:any,idx:number)=>idx===i?{...item,cost:v}:item))} />
                                            <FormattedInput label="Year" value={w.year} onChange={(v:number)=>setWeddingGoals(weddingGoals.map((item:any,idx:number)=>idx===i?{...item,year:v}:item))} prefix="" />
                                        </div>
                                    ))}
                                    <Button size="sm" variant="ghost" className="w-full text-xs border border-dashed border-zinc-300 text-zinc-600 hover:bg-zinc-50" onClick={()=>setWeddingGoals([...weddingGoals,{id:Date.now(),cost:20000,year:2}])}>+ Add Event</Button>
                                </div>
                            )}
                            
                            {/* Big Spend */}
                            {milestones.includes('Big Spend') && (
                                <div className="bg-white p-5 rounded-lg border border-zinc-200 shadow-sm space-y-4 relative">
                                    <button onClick={() => toggleMilestone('Big Spend')} className="absolute top-3 right-3 text-zinc-400 hover:text-red-500 transition-colors"><X className="w-4 h-4"/></button>
                                    <h4 className="font-semibold text-zinc-900 text-sm flex items-center gap-2"><Banknote className="w-4 h-4 text-zinc-500"/> Capital Expenditure</h4>
                                    {bigSpendGoals.map((b:any,i:number)=>(
                                        <div key={i} className="bg-zinc-50 p-3 rounded-md border border-zinc-200 relative pt-6 space-y-3">
                                            <button onClick={()=>setBigSpendGoals(bigSpendGoals.filter((_:any,idx:number)=>idx!==i))} className="absolute top-1.5 right-1.5 text-zinc-400 hover:text-red-500"><X className="w-3 h-3"/></button>
                                            <FormattedInput label="Cost" value={b.cost} onChange={(v:number)=>setBigSpendGoals(bigSpendGoals.map((item:any,idx:number)=>idx===i?{...item,cost:v}:item))} />
                                            <FormattedInput label="Year" value={b.year} onChange={(v:number)=>setBigSpendGoals(bigSpendGoals.map((item:any,idx:number)=>idx===i?{...item,year:v}:item))} prefix="" />
                                        </div>
                                    ))}
                                    <Button size="sm" variant="ghost" className="w-full text-xs border border-dashed border-zinc-300 text-zinc-600 hover:bg-zinc-50" onClick={()=>setBigSpendGoals([...bigSpendGoals,{id:Date.now(),cost:10000,year:1}])}>+ Add CapEx</Button>
                                </div>
                            )}

                            {/* Retire */}
                            {milestones.includes('Retire') && (
                                <div className="bg-white p-5 rounded-lg border border-zinc-200 shadow-sm space-y-4 relative">
                                    <button onClick={() => toggleMilestone('Retire')} className="absolute top-3 right-3 text-zinc-400 hover:text-red-500 transition-colors"><X className="w-4 h-4"/></button>
                                    <h4 className="font-semibold text-zinc-900 text-sm flex items-center gap-2"><Palmtree className="w-4 h-4 text-zinc-500"/> Retirement</h4>
                                    <div className="flex gap-1 bg-zinc-100 p-1 rounded-md">
                                        <button onClick={()=>setRetireGoal({...retireGoal, mode:'target_amount'})} className={`flex-1 text-xs py-1.5 rounded-sm font-semibold transition-colors ${retireGoal.mode==='target_amount'?'bg-white text-zinc-900 shadow-sm':'text-zinc-500 hover:text-zinc-700'}`}>Target Capital</button>
                                        <button onClick={()=>setRetireGoal({...retireGoal, mode:'target_age'})} className={`flex-1 text-xs py-1.5 rounded-sm font-semibold transition-colors ${retireGoal.mode==='target_age'?'bg-white text-zinc-900 shadow-sm':'text-zinc-500 hover:text-zinc-700'}`}>Target Age</button>
                                    </div>
                                    {retireGoal.mode === 'target_amount' ? (
                                        <FormattedInput label="Target Net Worth" value={retireGoal.targetAmount} onChange={(v:number)=>setRetireGoal({...retireGoal, targetAmount:v})} />
                                    ) : (
                                        <div className="grid grid-cols-2 gap-3">
                                            <FormattedInput label="Current Age" value={retireGoal.currentAge} onChange={(v:number)=>setRetireGoal({...retireGoal, currentAge:v})} prefix="" />
                                            <FormattedInput label="Retire Age" value={retireGoal.targetAge} onChange={(v:number)=>setRetireGoal({...retireGoal, targetAge:v})} prefix="" />
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Main Visualization */}
                <Card className="border-zinc-200 shadow-sm rounded-lg">
                    <CardHeader className="pb-4 border-b border-zinc-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        <CardTitle className="text-sm font-semibold text-zinc-600 uppercase tracking-wider">Projection Output</CardTitle>
                        <div className="flex gap-2 items-center">
                            <div className="flex bg-zinc-100 p-1 rounded-md">
                                <button className={`px-3 py-1 text-xs font-semibold rounded-sm transition-colors ${chartMode==='growth'?'bg-white shadow-sm text-zinc-900':'text-zinc-500 hover:text-zinc-700'}`} onClick={()=>setChartMode('growth')}>Growth</button>
                                <button className={`px-3 py-1 text-xs font-semibold rounded-sm transition-colors ${chartMode==='breakdown'?'bg-white shadow-sm text-zinc-900':'text-zinc-500 hover:text-zinc-700'}`} onClick={()=>setChartMode('breakdown')}>Composition</button>
                            </div>
                            <div className="w-px h-6 bg-zinc-200 mx-2"></div>
                            <div className="flex bg-zinc-100 p-1 rounded-md">
                                {[10, 30, 50].map(y => (
                                    <button key={y} onClick={() => setProjectionYears(y)} className={`px-3 py-1 text-xs font-semibold rounded-sm transition-colors ${projectionYears===y ? 'bg-white shadow-sm text-zinc-900' : 'text-zinc-500 hover:text-zinc-700'}`}>{y}y</button>
                                ))}
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="h-[400px] w-full">
                            {chartMode === 'growth' ? (
                                <Line data={{
                                    labels: projectionData.map(d => d.yearLabel),
                                    datasets: [
                                        { label: 'Net Worth', data: projectionData.map(d => d.netWorth), borderColor: '#09090b', borderWidth: 3, tension: 0.4 },
                                        { label: 'Cash', data: projectionData.map(d => d.cash), borderColor: '#2563eb', backgroundColor: 'rgba(37, 99, 235, 0.1)', fill: true, tension: 0.4 },
                                        { label: 'Investments', data: projectionData.map(d => d.investments), borderColor: '#059669', backgroundColor: 'rgba(5, 150, 105, 0.1)', fill: true, tension: 0.4 },
                                        { label: 'Real Estate', data: projectionData.map(d => d.realEstate), borderColor: '#4f46e5', backgroundColor: 'rgba(79, 70, 229, 0.1)', fill: true, tension: 0.4 },
                                        { label: 'Liabilities', data: projectionData.map(d => d.liabilities), borderColor: '#e11d48', borderDash: [5, 5], tension: 0.2 },
                                        { label: 'Retirement Goal', data: projectionData.map(d => d.isRetirement ? d.netWorth : null), borderColor: '#09090b', backgroundColor: '#09090b', pointStyle: 'rectRot', pointRadius: 8, showLine: false }
                                    ]
                                }} options={{ responsive: true, maintainAspectRatio: false }} />
                            ) : (
                                <Bar data={{
                                    labels: projectionData.map(d => d.yearLabel),
                                    datasets: [
                                        { label: 'Cash', data: projectionData.map(d => d.cash), backgroundColor: '#2563eb' },
                                        { label: 'Investments', data: projectionData.map(d => d.investments), backgroundColor: '#059669' },
                                        { label: 'Real Estate', data: projectionData.map(d => d.realEstate), backgroundColor: '#4f46e5' },
                                        { label: 'Debt', data: projectionData.map(d => -d.liabilities), backgroundColor: '#e11d48' },
                                    ]
                                }} options={{ responsive: true, maintainAspectRatio: false, scales: { x: { stacked: true }, y: { stacked: true } } }} />
                            )}
                        </div>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}

// ============================================================================
// ARCHIVE: BEGINNER TOOL LOGIC (Saved for future /wealth/archetype/page.tsx)
// ============================================================================
/*
const BeginnerTool = (props: any) => { ... }
*/