import Link from "next/link";
import { ArrowRight, Home, GraduationCap, ShieldCheck, Palmtree, Gamepad2, LineChart } from "lucide-react";
import { SiteNav } from "~/app/_components/SiteNav";
import { SiteFooter } from "~/app/_components/SiteFooter";

export default function WealthLandingPage() {
  return (
    <main className="min-h-screen bg-white text-ink flex flex-col">
      <SiteNav />

      <div className="flex-1">
        <section className="bg-navy text-white mb-12">
          <div className="max-w-6xl mx-auto px-6 pt-14 pb-12">
            <p className="text-sm font-semibold uppercase tracking-[0.12em] text-navy-soft mb-3">Plan Your Path</p>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">Master the 4 investments of life</h1>
            <p className="text-lg text-navy-soft max-w-2xl leading-relaxed">
              See how owning a home, educating your kids, covering health costs and retiring on your terms fit together over a lifetime.
            </p>
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-6 pb-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: <Home className="w-5 h-5" />, title: "The Fortress", desc: "Fully owning a home to secure your physical place in the world." },
              { icon: <GraduationCap className="w-5 h-5" />, title: "The Legacy", desc: "Providing education for your children so they start ahead." },
              { icon: <ShieldCheck className="w-5 h-5" />, title: "The Shield", desc: "Covering medical expenses so health never drains wealth." },
              { icon: <Palmtree className="w-5 h-5" />, title: "The Freedom", desc: "Having enough to live life on your terms in retirement." }
            ].map((item, i) => (
              <div key={i} className="p-8 rounded-2xl border border-slate-200 bg-slate-50">
                <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-pink-600 mb-6">{item.icon}</div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">{item.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>
        
        <section className="max-w-6xl mx-auto px-6 py-12 border-t border-slate-50">
          <h2 className="text-2xl md:text-[28px] font-bold text-slate-900 mb-2">Choose your path to understand wealth creation.</h2>
          <p className="text-base text-slate-500 mb-8">Learn more by playing with the game or the planner.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Link href="/wealth/archetype" className="group block p-8 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-white hover:border-pink-200 hover:shadow-sm transition-all duration-300 no-underline">
              <div className="w-12 h-12 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-pink-600 mb-6 group-hover:bg-pink-50 transition-colors">
                <Gamepad2 className="w-6 h-6" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2 flex items-center gap-2">
                The Archetype Game
                <ArrowRight className="w-5 h-5 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 text-pink-600" />
              </h3>
              <p className="text-base text-slate-500 leading-relaxed">
                A frictionless visual quiz. Pick your lifestyle and instantly play out your choices.
              </p>
            </Link>

            <Link href="/wealth/planner" className="group block p-8 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-white hover:border-pink-200 hover:shadow-sm transition-all duration-300 no-underline">
              <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-white mb-6 group-hover:bg-slate-800 transition-colors">
                <LineChart className="w-6 h-6" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2 flex items-center gap-2">
                The Scenario Planner
                <ArrowRight className="w-5 h-5 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 text-pink-600" />
              </h3>
              <p className="text-base text-slate-500 leading-relaxed">
                A detailed modeling tool. Adjust micro-expenses, simulate purchases, and project net worth 30 years out.
              </p>
            </Link>
          </div>
        </section>

        <section className="bg-mist">
          <div className="max-w-6xl mx-auto px-6 py-14 flex flex-wrap items-center justify-between gap-6">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-ink">Want to understand the ideas behind the plan?</h2>
              <p className="text-slate-600 mt-2 text-base">How Money Works explains concepts like the time value of money with real-life questions.</p>
            </div>
            <Link href="/money" className="inline-flex items-center rounded-lg bg-navy px-5 py-3 text-base font-semibold text-white hover:bg-navy-800 transition-colors">
              Explore How Money Works
            </Link>
          </div>
        </section>
      </div>

      <SiteFooter />
    </main>
  );
}
