import Link from "next/link";
import { ArrowRight, Home, GraduationCap, ShieldCheck, Palmtree, Gamepad2, LineChart } from "lucide-react";

const DolphinLogo = ({ className = "text-2xl" }: { className?: string }) => (
  <span className={`inline-block grayscale opacity-80 select-none ${className}`} style={{ lineHeight: 1 }}>
    🐋
  </span>
);

export default function WealthLandingPage() {
  const mailtoSubject = encodeURIComponent("1:1 Wealth Conversation");
  const mailtoBody = encodeURIComponent("Hi Alfredo,\n\nI’d love to schedule some time with you to discuss my financial situation and learn more about how I can optimize my potential.");
  
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
              <span className="text-pink-600 font-bold">Tonina Wealth</span>
              <Link href="/lab" className="hover:text-slate-900 transition-colors">The Lab</Link>
              <Link href="/blog" className="hover:text-slate-900 transition-colors">Tonina Blog</Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex-1">
        <section className="max-w-6xl mx-auto px-6 pt-16 pb-12">
          <div className="inline-flex items-center gap-2 bg-pink-50 text-pink-700 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border border-pink-100 mb-6">
            Wealth OS
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-900 mb-4">Master the 4 Investments of Life</h1>
          <p className="text-lg text-slate-500 max-w-2xl leading-relaxed">
            Tonina helps you visualize your journey from owning a home to securing a worry-free retirement, all in one friendly interface.
          </p>
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
          <h2 className="text-xl font-bold text-slate-900 mb-2">Choose your path to understand wealth creation.</h2>
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
                A frictionless visual quiz. Pick your lifestyle and instantly project your 10-year financial path.
              </p>
            </Link>

            <Link href="/wealth/advisor" className="group block p-8 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-white hover:border-pink-200 hover:shadow-sm transition-all duration-300 no-underline">
              <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-white mb-6 group-hover:bg-slate-800 transition-colors">
                <LineChart className="w-6 h-6" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2 flex items-center gap-2">
                The Scenario Planner
                <ArrowRight className="w-5 h-5 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 text-pink-600" />
              </h3>
              <p className="text-base text-slate-500 leading-relaxed">
                A detailed modeling tool. Adjust micro-expenses, simulate purchases, and project net worth 50 years out.
              </p>
            </Link>
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-6 py-16 text-center border-t border-slate-50">
            <h2 className="text-2xl font-bold text-slate-900 mb-3">Want to go deeper?</h2>
            <p className="text-slate-500 max-w-md mx-auto mb-8 text-base">
                For a personalized breakdown of your financial situation, let's analyze the numbers together.
            </p>
            <a href={`mailto:alfredo@tonina.me?subject=${mailtoSubject}&body=${mailtoBody}`} className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 transition-colors shadow-sm">
                Book a 1:1 Session
            </a>
        </section>
      </div>

      <footer className="border-t border-slate-100 bg-white py-10 mt-auto w-full">
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