"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { SiteNav } from "~/app/_components/SiteNav";
import { SiteFooter } from "~/app/_components/SiteFooter";

import { EmailSignup } from "~/app/_components/EmailSignup";

// Lesson 1 keeps taxes out on purpose; lesson 2 covers them.
// Annuity: 30 payments, each 5% larger than the last, adding up to the advertised jackpot (Powerball/Mega Millions style).
const YEARS = 30;
const GROWTH = 0.05;
const M = 1_000_000;

const usd = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const millions = (n: number) => `$${(n / M).toFixed(1)}M`;

function presentValue(payments: number[], rate: number) {
  return payments.reduce((sum, p, k) => sum + p / Math.pow(1 + rate, k), 0);
}

export default function LotteryPage() {
  const [jackpotM, setJackpotM] = useState(500);
  const [cashM, setCashM] = useState(230);
  const [ratePct, setRatePct] = useState(5);

  const r = useMemo(() => {
    const rate = ratePct / 100;
    const jackpot = jackpotM * M;
    const firstPayment = (jackpot * GROWTH) / (Math.pow(1 + GROWTH, YEARS) - 1);
    const payments = Array.from({ length: YEARS }, (_, k) => firstPayment * Math.pow(1 + GROWTH, k));
    const lump = cashM * M;
    const annuityPV = presentValue(payments, rate);

    // Tipping point: the yearly return at which the payments' value today equals the lump sum.
    let breakEven: number | null = null;
    if (presentValue(payments, 0) > lump) {
      let lo = 0;
      let hi = 1;
      for (let i = 0; i < 60; i++) {
        const mid = (lo + hi) / 2;
        if (presentValue(payments, mid) > lump) lo = mid;
        else hi = mid;
      }
      breakEven = lo;
    }
    return { payments, lump, jackpot, annuityPV, breakEven, maxPayment: Math.max(...payments, 1) };
  }, [jackpotM, cashM, ratePct]);

  const lumpWins = r.lump >= r.annuityPV;
  return (
    <main className="min-h-screen bg-white text-ink flex flex-col">
      <SiteNav />

      <div className="flex-1 w-full">
        <section className="bg-navy text-white">
          <div className="max-w-6xl mx-auto px-6 pt-14 pb-12">
            <Link href="/money" className="text-sm font-semibold uppercase tracking-[0.12em] text-navy-soft hover:text-white">How Money Works · Lesson 1</Link>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mt-3 mb-4 max-w-3xl">You win the lottery. How much do you actually take home?</h1>
            <p className="text-lg text-navy-soft max-w-2xl leading-relaxed">
              Lesson 1: the time value of money. The ticket shows one big number, but you choose between a smaller amount of cash now or 30 yearly payments. Which is worth more?
            </p>
          </div>
        </section>

        <section className="bg-mist">
          <div className="max-w-6xl mx-auto px-6 py-12 grid lg:grid-cols-[340px_1fr] gap-8">
            <form className="rounded-xl bg-white border border-slate-200 p-6 flex flex-col gap-5 h-fit" onSubmit={(e) => e.preventDefault()}>
              <h2 className="text-lg font-bold">Your jackpot</h2>
              <label className="flex flex-col gap-1.5 text-sm font-semibold text-slate-700" htmlFor="jackpot">
                Advertised jackpot ($ millions)
                <input id="jackpot" type="number" min={0} step={10} value={jackpotM}
                  onChange={(e) => setJackpotM(e.target.value === "" ? 0 : Number(e.target.value))}
                  className="rounded-lg border border-slate-300 px-3 py-2.5 text-base font-normal tabular-nums" />
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-semibold text-slate-700" htmlFor="cash">
                Cash option ($ millions)
                <input id="cash" type="number" min={0} step={10} value={cashM}
                  onChange={(e) => setCashM(e.target.value === "" ? 0 : Number(e.target.value))}
                  className="rounded-lg border border-slate-300 px-3 py-2.5 text-base font-normal tabular-nums" />
                <span className="text-xs font-normal text-slate-500">Lotteries publish this next to the jackpot. It&apos;s usually about half.</span>
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-semibold text-slate-700" htmlFor="rate">
                What you could earn investing: {ratePct}% a year
                <input id="rate" type="range" min={0} max={12} step={0.5} value={ratePct}
                  onChange={(e) => setRatePct(e.target.value === "" ? 0 : Number(e.target.value))}
                  className="accent-pink-600" />
              </label>
              <p className="text-xs text-slate-500">Example numbers. Change them to match a real drawing.</p>
            </form>

            <div className="flex flex-col gap-6 min-w-0">
              <div className="grid sm:grid-cols-3 gap-4">
                <div className={`rounded-xl p-5 border ${lumpWins ? "bg-navy text-white border-navy" : "bg-white border-slate-200"}`}>
                  <p className={`text-xs font-semibold uppercase tracking-[0.1em] ${lumpWins ? "text-navy-soft" : "text-slate-500"}`}>Cash now</p>
                  <p className="font-display text-3xl font-bold mt-2 tabular-nums">{millions(r.lump)}</p>
                  <p className={`text-sm mt-1 ${lumpWins ? "text-navy-soft" : "text-slate-500"}`}>In your account today</p>
                </div>
                <div className="rounded-xl p-5 border bg-white border-slate-200">
                  <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">30 yearly payments</p>
                  <p className="font-display text-3xl font-bold mt-2 tabular-nums">{millions(r.jackpot)}</p>
                  <p className="text-sm mt-1 text-slate-500">Added up: the advertised number</p>
                </div>
                <div className={`rounded-xl p-5 border ${!lumpWins ? "bg-navy text-white border-navy" : "bg-white border-slate-200"}`}>
                  <p className={`text-xs font-semibold uppercase tracking-[0.1em] ${!lumpWins ? "text-navy-soft" : "text-slate-500"}`}>Those payments, worth today</p>
                  <p className="font-display text-3xl font-bold mt-2 tabular-nums">{millions(r.annuityPV)}</p>
                  <p className={`text-sm mt-1 ${!lumpWins ? "text-navy-soft" : "text-slate-500"}`}>At {ratePct}% a year</p>
                </div>
              </div>

              <div className="rounded-xl bg-white border border-slate-200 p-6">
                <p className="text-lg font-semibold">
                  {lumpWins
                    ? `If you can earn ${ratePct}% a year, the cash now is worth more.`
                    : `At ${ratePct}% a year, the 30 payments are worth more.`}
                </p>
                <p className="text-base text-slate-600 mt-1">
                  {r.breakEven === null
                    ? "Even at 0%, the payments add up to less than the cash."
                    : `The tipping point is about ${(r.breakEven * 100).toFixed(1)}% a year: earn more than that and the cash wins.`}
                </p>

                <div className="mt-6">
                  <p className="text-sm font-semibold text-slate-700 mb-2">Each yearly payment, years 1 to 30</p>
                  <div className="flex items-end gap-[3px] h-32" role="img" aria-label={`Yearly payments grow from ${usd(r.payments[0] ?? 0)} to ${usd(r.payments[YEARS - 1] ?? 0)}`}>
                    {r.payments.map((p, k) => (
                      <div key={k} className="flex-1 bg-navy/80 rounded-t-sm" style={{ height: `${(p / r.maxPayment) * 100}%` }} title={`Year ${k + 1}: ${usd(p)}`} />
                    ))}
                  </div>
                  <div className="flex justify-between text-xs text-slate-500 mt-1 tabular-nums">
                    <span>Year 1: {usd(r.payments[0] ?? 0)}</span>
                    <span>Year 30: {usd(r.payments[YEARS - 1] ?? 0)}</span>
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
              The payments add up to more than the cash, so why would anyone take the cash? Because money you have today can be invested and grow. A payment you receive in year 20 has had no chance to grow for you yet.
            </p>
            <p>
              To compare them fairly, finance converts every future payment into what it&apos;s worth today. That&apos;s called its present value. A payment received <em>n</em> years from now, at a yearly return of <em>r</em>, is worth:
            </p>
            <p className="font-display text-2xl text-ink text-center py-2">Present value = Payment ÷ (1 + r)<sup>n</sup></p>
            <p>
              At 5%, $1 million arriving in 20 years is worth about $377,000 today. Add that up for all 30 payments and you get the &ldquo;worth today&rdquo; number above. The same math prices bonds, pensions, mortgages and company valuations.
            </p>
          </div>
        </section>

        <section className="bg-navy text-white">
          <div className="max-w-3xl mx-auto px-6 py-14 flex flex-col gap-4">
            <p className="text-sm font-semibold uppercase tracking-[0.12em] text-navy-soft">Up next · Lesson 2</p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">It&apos;s not that simple: taxes come out first</h2>
            <p className="text-lg text-navy-soft leading-relaxed">
              Taxes take a big bite out of both choices, and not the same bite. The cash is taxed all at once, while each yearly payment is taxed in its own year. That can change which option wins. Ready for lesson 2: how do taxes work?
            </p>
            <p className="text-base text-white font-semibold">Lesson 2 is coming soon. Join to get it when it&apos;s out.</p>
            <EmailSignup id="lottery" source="lesson-1" />
          </div>
        </section>
      </div>

      <SiteFooter />
    </main>
  );
}
