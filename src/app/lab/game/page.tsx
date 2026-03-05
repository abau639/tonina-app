import Link from "next/link";
import { ArrowLeft, Terminal } from "lucide-react";

export default function Page() {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-50 font-sans flex flex-col items-center justify-center p-6 text-center selection:bg-zinc-800">
      <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800 mb-8 shadow-sm">
        <Terminal className="w-8 h-8 text-zinc-400" />
      </div>
      <h1 className="text-3xl md:text-5xl font-semibold tracking-tight text-white mb-4">
        The Sandbox
      </h1>
      <p className="text-zinc-400 max-w-md mb-10 leading-relaxed text-lg">
        This page is currently under construction. Please check back later.
      </p>
      <Link href="/" className="inline-flex items-center gap-2 px-6 py-3 rounded-md bg-white text-zinc-950 font-medium hover:bg-zinc-200 transition-colors shadow-sm">
        <ArrowLeft className="w-4 h-4" /> Return Home
      </Link>
    </main>
  );
}