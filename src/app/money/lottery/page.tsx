"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { SiteNav } from "~/app/_components/SiteNav";
import { SiteFooter } from "~/app/_components/SiteFooter";

// Simplifying assumptions, stated on the page:
// - Federal: a jackpot-sized amount lands almost entirely in the top bracket, so we apply 37% flat.
// - Massachusetts: 5% on all income, plus the 4% surtax on income above the 2025 threshold.
// - Annuity: 30 payments, each 5% larger than the last, summing to the advertised jackpot (Powerball/Mega Millions style).
const FEDERAL_RATE = 0.37;
const MA_RATE = 0.05;
const MA_SURTAX_RATE = 0.04;
const MA_SURTAX_THRESHOLD = 1_083_150;
const YEARS = 30;
const GROWTH = 0.05;

const usd = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const millions = (n: number) => `$${(n / 1_000_000).toFixed(1)}M`;

function afterTax(amount: number, inMA: boolean) {
  const federal = amount * FEDERAL_RATE;
  const state = inMA ? amount * MA_RATE + Math.max(0, amount - MA_SURTAX_THRESHOLD) * MA_SURTAX_RATE : 0;
  return amount - federal - state;
}

function presentValue(payments: number[], rate: number) {
  return payments.reduce((sum, p, k) => sum + p / Math.pow(1 + rate, k), 0);
}

export default function LotteryPage() {
  const [jackpot, setJackpot] = useState(500_000_000);
  const [cash, setCash] = useState(230_000_000);
  const [ratePct, setRatePct] = useState(5);
  const [inMA, setInMA] = useState(true);

  const r = useMemo(() => {
    const rate = ratePct / 100;
    const firstPayment = (jackpot * GROWTH) / (Math.pow(1 + GROWTH, YEARS) - 1);
    const gross = Array.from({ length: YEARS }, (_, k) => firstPayment * Math.pow(1 + GROWTH, k));
    const net = gross.map((p) => afterTax(p, inMA));
    const lumpNet = afterTax(cash, inMA);
    const annuityTotal = net.reduce((a, b) => a + b, 0);
    const annuityPV = presentValue(net, rate);

    // Break-even rate: the return at which the annuity's value today equals the lump sum.
    let breakEven: number | null = null;
    if (presentValue(net, 0) > lumpNet) {
      let lo = 0;
      let hi = 1;
      for (let i = 0; i < 60; i++) {
        const mid = (lo + hi) / 2;
        if (presentValue(net, mid) > lumpNet) lo = mid;
        else hi = mid;
      }
      breakEven = lo;
    }
    return { net, lumpNet, annuityTotal, annuityPV, breakEven, maxNet: Math.max(...net, 1) };
  }, [jackpot, cash, ratePct, inMA]);

  const lumpWins = r.lumpNet >= r.annuityPV;

  return (
    <main className="min-h-screen bg-white text-ink flex flex-col">
      <SiteNav />

      <div className="flex-1 w-full">
        <section className="bg-navy text-white">
          <div className="max-w-6xl mx-auto px-6 pt-14 pb-12">
            <Link href="/money" className="text-sm font-semibold uppercase tracking-[0.12em] text-navy-soft hover:text-white">How Money Works · Time value of money</Link>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mt-3 mb-4 max-w-3xl">You win the lottery. How much do you actually take home?</h1>
            <p className="text-lg text-navy-soft max-w-2xl leading-relaxed">
              The ticket says one number. You get to choose between a smaller lump sum now or 30 yearly payments, and taxes come out of both. Change the numbers below.
            </p>
          </div>
        </section>

        <section className="bg-mist">
          <div className="max-w-6xl mx-auto px-6 py-12 grid lg:grid-cols-[340px_1fr] gap-8">
            <form className="rounded-xl bg-white border border-slate-200 p-6 flex flex-col gap-5 h-fit" onSubmit={(e) => e.preventDefault()}>
              <h2 className="text-lg font-bold">Your jackpot</h2>
              <label className="flex flex-col gap-1.5 text-sm font-semibold text-slate-700" htmlFor="jackpot">
                Advertised jackpot ($)
                <input id="jackpot" type="number" min={0} step={1_000_000} value={jackpot}
                  onChange={(e) => setJackpot(e.target.value === "" ? 0 : Number(e.target.value))}
                  className="rounded-lg border border-slate-300 px-3 py-2.5 text-base font-normal tabular-nums" />
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-semibold text-slate-700" htmlFor="cash">
                Cash option, before tax ($)
                <input id="cash" type="number" min={0} step={1_000_000} value={cash}
                  onChange={(e) => setCash(e.target.value === "" ? 0 : Number(e.target.value))}
                  className="rounded-lg border border-slate-300 px-3 py-2.5 text-base font-normal tabular-nums" />
                <span className="text-xs font-normal text-slate-500">Lotteries publish this next to the jackpot. It&apos;s usually about half.</span>
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-semibold text-slate-700" htmlFor="rate">
                What you could earn investing: {ratePct}% a year
                <input id="rate" type="range" min={0} max={12} step={0.5} value={ratePct}
                  onChange={(e) => setRatePct(e.target.value === "" ? 0 : Number(e.target.value))}
                  className="accent-pink-600" />
              </label>
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700" htmlFor="ma">
                <input id="ma" type="checkbox" checked={inMA} onChange={(e) => setInMA(e.target.checked)} className="w-4 h-4 accent-pink-600" />
                I live in Massachusetts
              </label>
              <p className="text-xs text-slate-500">Example numbers. Change them to match a real drawing.</p>
            </form>

            <div className="flex flex-col gap-6 min-w-0">
              <div className="grid sm:grid-cols-3 gap-4">
                <div className={`rounded-xl p-5 border ${lumpWins ? "bg-navy text-white border-navy" : "bg-white border-slate-200"}`}>
                  <p className={`text-xs font-semibold uppercase tracking-[0.1em] ${lumpWins ? "text-navy-soft" : "text-slate-500"}`}>Lump sum, after tax</p>
                  <p className="font-display text-3xl font-bold mt-2 tabular-nums">{millions(r.lumpNet)}</p>
                  <p className={`text-sm mt-1 ${lumpWins ? "text-navy-soft" : "text-slate-500"}`}>In your account now</p>
                </div>
                <div className="rounded-xl p-5 border bg-white border-slate-200">
                  <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">30 payments, after tax</p>
                  <p className="font-display text-3xl font-bold mt-2 tabular-nums">{millions(r.annuityTotal)}</p>
                  <p className="text-sm mt-1 text-slate-500">Added up over 30 years</p>
                </div>
                <div className={`rounded-xl p-5 border ${!lumpWins ? "bg-navy text-white border-navy" : "bg-white border-slate-200"}`}>
                  <p className={`text-xs font-semibold uppercase tracking-[0.1em] ${!lumpWins ? "text-navy-soft" : "text-slate-500"}`}>Those payments, valued today</p>
                  <p className="font-display text-3xl font-bold mt-2 tabular-nums">{millions(r.annuityPV)}</p>
                  <p className={`text-sm mt-1 ${!lumpWins ? "text-navy-soft" : "text-slate-500"}`}>At {ratePct}% a year</p>
                </div>
              </div>

              <div className="rounded-xl bg-white border border-slate-200 p-6">
                <p className="text-lg font-semibold">
                  {lumpWins
                    ? `If you can earn ${ratePct}% a year, the lump sum is worth more today.`
                    : `At ${ratePct}% a year, the 30 payments are worth more today.`}
                </p>
                <p className="text-base text-slate-600 mt-1">
                  {r.breakEven === null
                    ? "Even at 0%, the payments add up to less than the lump sum."
                    : `The tipping point is about ${(r.breakEven * 100).toFixed(1)}% a year: earn more than that and the lump sum wins.`}
                </p>

                <div className="mt-6">
                  <p className="text-sm font-semibold text-slate-700 mb-2">Each yearly payment after tax, years 1 to 30</p>
                  <div className="flex items-end gap-[3px] h-32" role="img" aria-label={`Yearly after-tax payments grow from ${usd(r.net[0] ?? 0)} to ${usd(r.net[YEARS - 1] ?? 0)}`}>
                    {r.net.map((p, k) => (
                      <div key={k} className="flex-1 bg-navy/80 rounded-t-sm" style={{ height: `${(p / r.maxNet) * 100}%` }} title={`Year ${k + 1}: ${usd(p)}`} />
                    ))}
                  </div>
                  <div className="flex justify-between text-xs text-slate-500 mt-1 tabular-nums">
                    <span>Year 1: {usd(r.net[0] ?? 0)}</span>
                    <span>Year 30: {usd(r.net[YEARS - 1] ?? 0)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white">
          <div className="max-w-3xl mx-auto px-6 py-14 flex flex-col gap-5 text-lg leading-relaxed text-slate-700">
            <h2 className="text-3xl font-bold text-ink">The idea underneath: a dollar today beats a dollar later</h2>
            <p>
              The payments add up to more than the lump sum, so why would anyone take the lump sum? Because money you have today can be invested and grow. A payment you receive in year 20 has had no chance to grow for you yet.
            </p>
            <p>
              To compare them fairly, finance converts every future payment into what it&apos;s worth today. That&apos;s called its present value. A payment received <em>n</em> years from now, at a yearly return of <em>r</em>, is worth:
            </p>
            <p className="font-display text-2xl text-ink text-center py-2">Present value = Payment ÷ (1 + r)<sup>n</sup></p>
            <p>
              At 5%, $1 million arriving in 20 years is worth about $377,000 today. Add that up for all 30 payments and you get the &ldquo;valued today&rdquo; number above. The same math prices bonds, pensions, mortgages and company valuations.
            </p>
            <h3 className="text-2xl font-bold text-ink mt-4">How the taxes work here</h3>
            <ul className="list-disc pl-6 flex flex-col gap-2 text-base">
              <li>Federal tax is shown as a flat 37%. An amount this large falls almost entirely in the top bracket. The lottery withholds only 24% when you claim, so the rest comes due when you file.</li>
              <li>Massachusetts taxes lottery winnings at 5%, plus a 4% surtax on income above $1,083,150 (the 2025 threshold, adjusted each year).</li>
              <li>With yearly payments, each year&apos;s payment is taxed in that year, at that year&apos;s rates.</li>
            </ul>
            <p className="text-sm text-slate-500">
              A simplified example for learning. It ignores other income, deductions, tax law changes and how the lump sum would be invested. It isn&apos;t tax or investment advice.
            </p>
          </div>
        </section>
      </div>

      <SiteFooter />
    </main>
  );
}
