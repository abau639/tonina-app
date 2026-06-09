import Link from "next/link";
import { ArrowLeft } from "lucide-react";

const DolphinLogo = ({ className = "text-2xl" }: { className?: string }) => (
  <span className={`inline-block grayscale opacity-80 select-none ${className}`} style={{ lineHeight: 1 }}>🐋</span>
);

export default function BlogPost() {
  return (
    <main className="min-h-screen bg-white text-slate-900 font-sans selection:bg-pink-100 flex flex-col">
      <nav className="sticky top-0 z-50 w-full border-b border-slate-100 bg-white/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="font-bold tracking-tight text-slate-900 text-lg flex items-center gap-2 hover:opacity-80 transition-opacity">
              <DolphinLogo /> Tonina.me
            </Link>
            <div className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
              <Link href="/concept-explorer" className="hover:text-slate-900 transition-colors">Concept Explorer</Link>
              <Link href="/wealth" className="hover:text-slate-900 transition-colors">Tonina Wealth</Link>
              <Link href="/lab" className="hover:text-slate-900 transition-colors">The Lab</Link>
              <Link href="/blog" className="text-pink-600 font-bold transition-colors">Tonina Blog</Link>
            </div>
          </div>
        </div>
      </nav>

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
            The Scenario Planner on Tonina Wealth was built with one goal in mind: help someone see their finances clearly, and feel empowered to act. That goal has been fulfilled.
          </p>

          <p>
            Here&apos;s what I kept seeing: college graduates carrying student debt as if it were just part of the scenery. Background noise. They pay the minimum — not out of laziness, but because it works. Life is manageable, and the debt feels distant. What they don&apos;t see is the quiet tax inflation and compounding interest levy on them every single month.
          </p>

          <p>
            The financially savvy path sounds counterintuitive: invest your cash, use debt as leverage, let your portfolio outpace the interest rate. And sometimes that&apos;s exactly right. But for most recent grads — without a financial foundation yet — high-interest debt isn&apos;t leverage. It&apos;s a slow drain. The opportunity cost of not investing compounds too, but so does the weight of carrying that balance.
          </p>

          <p>
            The real unlock? Paying down big chunks early. Not because it&apos;s always the mathematically optimal move, but because financial freedom creates mental freedom. When the debt shrinks, the ceiling rises. Choices open up. That peace of mind — that&apos;s the return that never shows up in a spreadsheet.
          </p>

          <p>
            That&apos;s what the Scenario Planner is for. Run the numbers. See the crossover point. Feel the difference between minimum payments and aggressive paydown over 30 years. Knowledge is the first step to action.
          </p>

          <hr className="my-10 border-slate-100" />

          <div className="bg-pink-50 p-6 rounded-2xl border border-pink-100 text-sm">
            <strong className="text-pink-900 block mb-2 font-bold">Want to dig deeper?</strong>
            <span className="text-pink-800">
              Reach out — I&apos;m always happy to talk through a real scenario.{" "}
              <a href="mailto:alfredo@tonina.me" className="underline underline-offset-2 hover:text-pink-600 transition-colors">
                alfredo@tonina.me
              </a>{" "}
              or drop me a message on{" "}
              <a href="https://www.linkedin.com/in/abaudet/" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-pink-600 transition-colors">
                LinkedIn
              </a>.
            </span>
          </div>
        </div>
      </article>

      <footer className="border-t border-slate-100 bg-white py-8 mt-auto w-full">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6 text-sm font-medium text-slate-500">
          <div className="flex gap-6">
            <Link href="/terms" className="hover:text-slate-900 transition-colors">Terms</Link>
            <Link href="/privacy" className="hover:text-slate-900 transition-colors">Privacy</Link>
          </div>
          <p className="text-xs text-slate-400">© {new Date().getFullYear()} Tonina.me</p>
        </div>
      </footer>
    </main>
  );
}
