import Link from "next/link";
import { Terminal, Hammer, ArrowRight } from "lucide-react";

const DolphinLogo = ({ className = "text-2xl" }: { className?: string }) => (
  <span className={`inline-block grayscale opacity-80 select-none ${className}`} style={{ lineHeight: 1 }}>
    🐋
  </span>
);

export default function TheLab() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col selection:bg-pink-100">
      <nav className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="font-bold tracking-tight text-slate-900 text-lg flex items-center gap-2 hover:opacity-80 transition-opacity">
              <DolphinLogo /> Tonina.me
            </Link>
            <div className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
              <Link href="/concept-explorer" className="hover:text-slate-900 transition-colors">Concept Explorer</Link>
              <Link href="/wealth" className="hover:text-slate-900 transition-colors">Tonina Wealth</Link>
              <span className="text-pink-600 font-bold transition-colors">The Lab</span>
              <Link href="/blog" className="hover:text-slate-900 transition-colors">Tonina Blog</Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-2xl mx-auto">
        <div className="w-16 h-16 bg-slate-200 rounded-2xl flex items-center justify-center mb-8 border border-slate-300">
            <Hammer className="w-8 h-8 text-slate-500" />
        </div>
        
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 mb-4">Under Construction</h1>
        
        <p className="text-lg text-slate-500 leading-relaxed mb-10">
            <strong>The Lab</strong> is currently being built. This space will house ideas that don't fit into the main platform.
        </p>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm w-full mb-10">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest flex items-center justify-center gap-2 mb-4">
                <Terminal className="w-4 h-4 text-slate-400" /> Upcoming Pipeline
            </h3>
            <ul className="text-left space-y-3 text-sm text-slate-600 font-mono">
                <li className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse"></div>
                    [DEV] 13F Fund Tracker
                </li>
                <li className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-slate-300"></div>
                    [IDLE] Interactive SQL Playground
                </li>
                <li className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-slate-300"></div>
                    [IDLE] TBD Web Game Engine
                </li>
            </ul>
        </div>

        <Link href="/" className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-slate-900 text-white font-bold hover:bg-slate-800 transition-all shadow-sm">
            Return to Hub <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      <footer className="border-t border-slate-200 bg-white py-8 mt-auto w-full">
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