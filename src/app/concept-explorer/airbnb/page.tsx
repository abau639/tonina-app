"use client";

import Link from "next/link";
import { Hammer, ArrowLeft } from "lucide-react";

// Desaturated, grayscale emoji logo
const DolphinLogo = ({ className = "text-2xl" }: { className?: string }) => (
  <span className={`inline-block grayscale opacity-80 select-none ${className}`} style={{ lineHeight: 1 }}>
    🐋
  </span>
);

const GlobalNav = () => (
  <nav className="sticky top-0 z-50 w-full border-b border-slate-100 bg-white/80 backdrop-blur-md">
    <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
      <div className="flex items-center gap-8">
        <Link href="/" className="font-bold tracking-tight text-slate-900 text-lg flex items-center gap-2 hover:opacity-80 transition-opacity">
          <DolphinLogo /> Tonina.me
        </Link>
        <div className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
          <Link href="/concept-explorer" className="text-pink-600 font-bold transition-colors">Concept Explorer</Link>
          <Link href="/wealth" className="hover:text-slate-900 transition-colors">Tonina Wealth</Link>
          <Link href="/lab" className="hover:text-slate-900 transition-colors">The Lab</Link>
          <Link href="/blog" className="hover:text-slate-900 transition-colors">Tonina Blog</Link>
        </div>
      </div>
    </div>
  </nav>
);

export default function AirbnbWIP() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col selection:bg-pink-100">
      <GlobalNav />

      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-2xl mx-auto">
        <div className="w-16 h-16 bg-slate-200 rounded-2xl flex items-center justify-center mb-8 border border-slate-300">
            <Hammer className="w-8 h-8 text-slate-500" />
        </div>
        
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 mb-4">Deal Desk Simulator</h1>
        
        <p className="text-lg text-slate-500 leading-relaxed mb-10">
            This interactive marketplace ledger is currently being built and refined in <strong>The Lab</strong>. Check back soon for the full two-sided marketplace simulation.
        </p>

        <Link href="/concept-explorer" className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-slate-900 text-white font-bold hover:bg-slate-800 transition-all shadow-sm">
            <ArrowLeft className="w-4 h-4" /> Return to Concepts
        </Link>
      </div>
    </main>
  );
}
