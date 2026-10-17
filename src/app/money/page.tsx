import Link from "next/link";
import { SiteNav } from "~/app/_components/SiteNav";
import { SiteFooter } from "~/app/_components/SiteFooter";

const COMING_NEXT = [
  { concept: "Lesson 2 · How taxes work", question: "Why is your raise smaller than it looks?" },
  { concept: "Compound interest", question: "How long until your savings double?" },
  { concept: "Inflation", question: "What will $100 buy in 20 years?" },
  { concept: "Interest on debt", question: "Why does a credit card balance grow so fast?" },
];

export default function MoneyHub() {
  return (
    <main className="min-h-screen bg-white text-ink flex flex-col">
      <SiteNav />

      <div className="flex-1 w-full">
        <section className="bg-navy text-white">
          <div className="max-w-6xl mx-auto px-6 pt-14 pb-12">
            <p className="text-sm font-semibold uppercase tracking-[0.12em] text-navy-soft mb-3">How Money Works</p>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">Key money ideas, answered with real-life questions</h1>
            <p className="text-lg text-navy-soft max-w-2xl leading-relaxed">
              Each concept starts with an everyday question, lets you change the numbers, then explains the idea underneath.
            </p>
          </div>
        </section>

        <section className="bg-mist">
          <div className="max-w-6xl mx-auto px-6 py-12 flex flex-col gap-10">
            <Link href="/money/lottery" className="group grid md:grid-cols-[1fr_auto] gap-6 items-center rounded-xl bg-white border border-slate-200 p-8 hover:border-pink-300 transition-colors no-underline">
              <div>
                <span className="text-xs font-semibold uppercase tracking-[0.1em] text-pink-600">Lesson 1 · Time value of money</span>
                <h2 className="text-2xl md:text-3xl font-bold mt-2 mb-2">You win the lottery. How much do you actually take home?</h2>
                <p className="text-base text-slate-600 max-w-2xl">Take the cash now or 30 yearly payments? See why a dollar today is worth more than a dollar later.</p>
              </div>
              <span className="text-base font-semibold text-ink group-hover:text-pink-600 transition-colors whitespace-nowrap">Try it →</span>
            </Link>

            <div>
              <h2 className="text-xl font-bold mb-4">Coming next</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {COMING_NEXT.map((c) => (
                  <div key={c.concept} className="rounded-xl border border-dashed border-slate-300 p-5 flex flex-col gap-1">
                    <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">{c.concept}</span>
                    <p className="text-base font-semibold text-ink">{c.question}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>

      <SiteFooter />
    </main>
  );
}
