import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SiteNav } from "~/app/_components/SiteNav";
import { SiteFooter } from "~/app/_components/SiteFooter";
import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "Your Debt Doesn't Have to Own You",
  description: "A practical look at paying down debt and the math behind getting free of it.",
};

export default function BlogPost() {
  return (
    <main className="min-h-screen bg-white text-slate-900 font-sans selection:bg-pink-100 flex flex-col">
      <SiteNav />

      <article className="max-w-3xl mx-auto px-6 pt-16 pb-24 w-full flex-1">
        <Link href="/blog" className="inline-flex items-center text-sm font-bold text-slate-400 hover:text-slate-900 transition-colors mb-10">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Notes
        </Link>

        <header className="mb-12 text-center">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-900 mb-6 leading-tight">
            Your Debt Doesn&apos;t Have to Own You
          </h1>
          <div className="flex items-center justify-center gap-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            <span>June 2026</span>
            <div className="w-1 h-1 bg-slate-300 rounded-full"></div>
            <span>2 min read</span>
          </div>
        </header>

        <div className="prose prose-slate prose-lg max-w-none text-slate-700 leading-loose">
          <p>
            The Scenario Planner was built to do one thing: help someone see their finances clearly enough to act. That goal has been met.
          </p>

          <p>
            Most college grads carry debt like background noise. They pay the minimum, life is manageable, and the balance just... sits there. What they miss is that inflation and interest are working against them every month, quietly.
          </p>

          <p>
            Yes, you can invest your cash and let returns outpace the interest rate. Sometimes that is the right call. But for most recent grads without a financial foundation, high-interest debt is not leverage. It is a slow drain, and the peace of mind you gain from paying it down is real and compounding in its own way.
          </p>

          <p>
            Pay big chunks early. Watch the ceiling rise. That feeling of financial freedom is the return that never shows up on a spreadsheet, and it is worth more than people give it credit for.
          </p>

          <hr className="my-10 border-slate-100" />

          <div className="bg-pink-50 p-6 rounded-2xl border border-pink-100 text-sm">
            <strong className="text-pink-900 block mb-2 font-bold">Interested in more?</strong>
            <span className="text-pink-800">
              Reach out via{" "}
              <a href="mailto:alfredo@tonina.me" className="underline underline-offset-2 hover:text-pink-600 transition-colors">
                email
              </a>{" "}
              or drop me a{" "}
              <a href="https://www.linkedin.com/in/abaudet/" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-pink-600 transition-colors">
                LinkedIn message
              </a>.
            </span>
          </div>
        </div>
      </article>

      <SiteFooter />
    </main>
  );
}
