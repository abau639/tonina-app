import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SiteNav } from "~/app/_components/SiteNav";
import { SiteFooter } from "~/app/_components/SiteFooter";
import { CASES } from "~/app/concept-explorer/cases";

const PATH_STEPS = [
  {
    step: "Step 1",
    title: "Play the path game",
    description: "Make life choices from your first job to retirement and see where they leave you.",
    href: "/wealth/archetype",
    note: "Free",
  },
  {
    step: "Step 2",
    title: "Plan with real numbers",
    description: "The Scenario Planner models 30 years of income, housing, kids and investing.",
    href: "/wealth/advisor",
    note: "Free, no sign-up",
  },
  {
    step: "Step 3",
    title: "Take your plan home",
    description: "A spreadsheet version of your plan to keep and update every year.",
    href: "/wealth",
    note: "Coming soon",
  },
];

const POSTS = [
  { href: "/blog/why-i-built-this", date: "March 2026", title: "Why I Built This Platform" },
  { href: "/blog/debt-freedom", date: "June 2026", title: "Your Debt Doesn't Have to Own You" },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-white text-ink flex flex-col">
      <SiteNav />

      <div className="flex-1">
        <section className="bg-navy text-white">
          <div className="max-w-6xl mx-auto px-6 pt-20 pb-20">
            <h1 className="text-[40px] leading-[1.05] md:text-[64px] font-extrabold tracking-[-0.03em] max-w-[20ch] mb-6">
              Learn finance the way it&apos;s actually used.
            </h1>
            <p className="text-xl leading-relaxed text-navy-soft max-w-2xl">
              Plan your financial path, build professional finance skills, and learn alongside me as I go. I&apos;m Alfredo, and this is where I share what I learn. Would you like to join me as I learn?
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/wealth" className="inline-flex items-center gap-2 rounded-lg bg-pink-600 px-5 py-3 text-base font-semibold text-white hover:bg-pink-500 transition-colors">
                Start with the basics <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/about" className="inline-flex items-center rounded-lg border border-navy-soft/50 px-5 py-3 text-base font-semibold text-white hover:bg-navy-800 transition-colors">
                Read my story
              </Link>
            </div>
          </div>
        </section>

        <section className="bg-white">
          <div className="max-w-6xl mx-auto px-6 py-16">
            <p className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500 mb-3">Plan Your Path</p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-10">See where your choices lead, then plan your own</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {PATH_STEPS.map((s) => (
                <Link key={s.title} href={s.href} className="group border-t-[3px] border-navy pt-5 flex flex-col gap-2 no-underline">
                  <span className="text-sm font-semibold text-slate-500">{s.step}</span>
                  <h3 className="text-2xl font-bold group-hover:text-pink-600 transition-colors">{s.title}</h3>
                  <p className="text-base text-slate-600 leading-relaxed">{s.description}</p>
                  <span className="text-sm font-semibold text-slate-500">{s.note}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-mist">
          <div className="max-w-6xl mx-auto px-6 py-16">
            <p className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500 mb-3">How Money Works</p>
            <div className="flex flex-wrap items-end justify-between gap-4 mb-10">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight max-w-2xl">Key money ideas, answered with real-life questions</h2>
              <Link href="/money" className="text-base font-semibold text-ink hover:text-pink-600 transition-colors">All concepts →</Link>
            </div>
            <Link href="/money/lottery" className="group grid md:grid-cols-[1fr_auto] gap-6 items-center rounded-xl bg-white border border-slate-200 p-8 hover:border-pink-300 transition-colors no-underline">
              <div>
                <span className="text-xs font-semibold uppercase tracking-[0.1em] text-pink-600">Time value of money</span>
                <h3 className="text-2xl md:text-3xl font-bold mt-2 mb-2">You win the lottery. How much do you actually take home?</h3>
                <p className="text-base text-slate-600 max-w-2xl">Compare the lump sum with 30 yearly payments, after federal and Massachusetts taxes, and see why a dollar today is worth more than a dollar later.</p>
              </div>
              <span className="text-base font-semibold text-ink group-hover:text-pink-600 transition-colors whitespace-nowrap">Try it →</span>
            </Link>
          </div>
        </section>

        <section className="bg-white">
          <div className="max-w-6xl mx-auto px-6 py-16">
            <p className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500 mb-3">Case Studies</p>
            <div className="flex flex-wrap items-end justify-between gap-4 mb-10">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight max-w-2xl">Build professional skills on real companies</h2>
              <Link href="/concept-explorer" className="text-base font-semibold text-ink hover:text-pink-600 transition-colors">Browse by industry →</Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {CASES.map((c) => (
                <Link key={c.href} href={c.href} className="group flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-6 hover:border-pink-300 transition-colors no-underline">
                  <span className="text-xs font-semibold uppercase tracking-[0.1em] text-pink-600">{c.industry}</span>
                  <h3 className="text-xl font-bold leading-snug">{c.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{c.summary}</p>
                  <span className="mt-auto pt-2 text-sm font-semibold text-ink group-hover:text-pink-600 transition-colors">Open case →</span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-mist">
          <div className="max-w-6xl mx-auto px-6 py-16">
            <p className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500 mb-3">Blog</p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-8">Learning out loud</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {POSTS.map((p) => (
                <Link key={p.href} href={p.href} className="group border-b border-slate-300 pb-5 flex flex-col gap-1 no-underline">
                  <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500 tabular-nums">{p.date}</span>
                  <h3 className="text-2xl font-bold group-hover:text-pink-600 transition-colors">{p.title}</h3>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-navy text-white">
          <div className="max-w-6xl mx-auto px-6 py-14 flex flex-wrap items-center justify-between gap-6">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Would you like to join me as I learn?</h2>
              <p className="text-navy-soft mt-2 text-lg">There&apos;s no straight path in finance. Here&apos;s mine so far.</p>
            </div>
            <Link href="/about" className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-3 text-base font-semibold text-navy hover:bg-mist transition-colors">
              Read my story <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>
      </div>

      <SiteFooter />
    </main>
  );
}
