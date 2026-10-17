import Link from "next/link";
import { type Metadata } from "next";
import { SiteNav } from "~/app/_components/SiteNav";
import { SiteFooter } from "~/app/_components/SiteFooter";
import { EmailSignup } from "~/app/_components/EmailSignup";

export const metadata: Metadata = {
  title: "About",
  description: "Alfredo's path through finance, from a terrible first budget to corporate finance, and why there is no straight road.",
};

// The real sequence of Alfredo's path, so the numbered markers carry meaning.
const CHAPTERS: { stage: string; title: string; body: string; wins?: string[] }[] = [
  {
    stage: "Middle school",
    title: "A first paycheck and the worst budget possible",
    body: "I got my first paycheck in middle school and made my first budget to go with it. It was terrible: categories that made no sense, numbers that never matched what I actually spent. But it was the first time I tried to see where my money went.",
  },
  {
    stage: "University",
    title: "Thinking 12 months ahead",
    body: "In university I kept fixing it. I started planning a full year ahead instead of a month, and I started taking debt seriously: what it really costs, and how fast it grows when you ignore it.",
  },
  {
    stage: "With friends",
    title: "Helping friends build their own",
    body: "Friends started asking how I did it, so I helped them build budgets of their own. Then I helped them with their first jobs: reading an offer, understanding a paycheck, deciding what to do with what's left.",
    wins: [
      "Several of them have paid down their university debt.",
      "Many still use my budget templates to plan each year.",
    ],
  },
  {
    stage: "Early career",
    title: "Structured finance and transaction services",
    body: "My first professional years were in structured finance consulting and transaction services. That's where I learned how deals are put together, and how much hides behind a single number.",
  },
  {
    stage: "Today",
    title: "Corporate finance",
    body: "Now I work in corporate finance, using that thinking to help a business decide where its money should go. Tonina is where I take what I learn and make it usable for everyone else.",
  },
];

// Moved here from the old "Why I Built This Platform" post.
const EXPERIENCE = [
  { company: "P&G · Gillette", role: "Brand Finance & Strategy (now), Supply Chain FP&A (before)" },
  { company: "Dilmun", role: "Strategic Finance & Fundraising" },
  { company: "Microsoft", role: "Product Marketing Intern" },
  { company: "Mobius Materials", role: "Business Operations (3rd employee)" },
  { company: "PwC", role: "Financial Consulting, then Project Management" },
];

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-white text-ink flex flex-col">
      <SiteNav />

      <div className="flex-1 w-full">
        <section className="bg-navy text-white">
          <div className="max-w-3xl mx-auto px-6 pt-16 pb-14">
            <p className="text-sm font-semibold uppercase tracking-[0.12em] text-navy-soft mb-3">About</p>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-5">There&apos;s no straight path in finance</h1>
            <p className="text-xl text-navy-soft leading-relaxed">
              I&apos;m Alfredo. My path started with a bad budget and wandered through a lot of side quests. Here&apos;s how it went so far.
            </p>
          </div>
        </section>

        <section className="bg-white">
          <ol className="max-w-3xl mx-auto px-6 py-14 flex flex-col">
            {CHAPTERS.map((c, i) => (
              <li key={c.title} className="grid grid-cols-[48px_1fr] gap-5">
                <div className="flex flex-col items-center">
                  <span className="w-10 h-10 rounded-full bg-navy text-white font-display font-bold flex items-center justify-center tabular-nums">{i + 1}</span>
                  {i < CHAPTERS.length - 1 && <span className="w-px flex-1 bg-slate-200 my-2" aria-hidden="true" />}
                </div>
                <div className="pb-10">
                  <p className="text-sm font-semibold uppercase tracking-[0.1em] text-pink-600">{c.stage}</p>
                  <h2 className="text-2xl md:text-3xl font-bold mt-1 mb-2">{c.title}</h2>
                  <p className="text-lg text-slate-600 leading-relaxed">{c.body}</p>
                  {c.wins && (
                    <div className="mt-5 rounded-xl bg-mist border-l-4 border-navy p-5">
                      <p className="text-sm font-semibold uppercase tracking-[0.1em] text-slate-500 mb-2">Where they are now</p>
                      <ul className="flex flex-col gap-2 text-lg text-ink">
                        {c.wins.map((w) => (
                          <li key={w} className="flex gap-3"><span className="text-pink-600 font-bold" aria-hidden="true">✓</span>{w}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="bg-mist">
          <div className="max-w-3xl mx-auto px-6 py-14">
            <h2 className="text-3xl font-bold text-ink mb-6">Where I&apos;ve worked</h2>
            <ul className="flex flex-col divide-y divide-slate-300 border-y border-slate-300">
              {EXPERIENCE.map((e) => (
                <li key={e.company} className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1 py-4">
                  <span className="font-display text-lg font-bold text-ink">{e.company}</span>
                  <span className="text-base text-slate-600 sm:text-right">{e.role}</span>
                </li>
              ))}
            </ul>
            <a href="https://www.linkedin.com/in/abaudet/" target="_blank" rel="noopener noreferrer" className="inline-block mt-5 text-base font-semibold text-ink underline decoration-pink-500 underline-offset-4 hover:decoration-2">
              See my full experience on LinkedIn →
            </a>
          </div>
        </section>

        <section className="bg-white">
          <div className="max-w-3xl mx-auto px-6 py-14 flex flex-col gap-4 text-lg leading-relaxed text-slate-700">
            <h2 className="text-3xl font-bold text-ink">Why Tonina</h2>
            <p>
              Finance is a vast world. There are many side quests along the way, and becoming a master of it means something different for each person. For some it&apos;s a plan that gets them debt-free. For others it&apos;s the skills to run a company&apos;s numbers.
            </p>
            <p>
              Tonina is where I share what I&apos;ve learned and keep learning in public. It has tools to plan your own path, plain-language explanations of how money works, and case studies on real companies.
            </p>
            <p className="text-base text-slate-500">
              And the name? A <em>tonina</em> is a pink freshwater dolphin from the Amazon River. Who doesn&apos;t love dolphins?
            </p>
          </div>
        </section>

        <section className="bg-navy text-white">
          <div className="max-w-3xl mx-auto px-6 py-14 flex flex-col gap-5">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Would you like to join me as I learn?</h2>
            <EmailSignup id="about" source="about" />
            <Link href="/wealth" className="text-base font-semibold text-white underline decoration-pink-400 underline-offset-4 hover:decoration-2 w-fit">
              Or start with the basics →
            </Link>
          </div>
        </section>
      </div>

      <SiteFooter />
    </main>
  );
}
