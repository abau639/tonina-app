import Link from "next/link";
import { User, ArrowLeft } from "lucide-react";

const DolphinLogo = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={`${className} text-pink-600`}>
    <path d="M21.41 11.58c-1.28-.94-2.92-1.09-4.32-.42-1.12-2-3.23-3.26-5.57-3.26-3.25 0-6.19 2.22-7.44 5.34-1.33.25-2.56.04-3.5-.66 0 0 .39 2.29 2.45 3.65 1.63 1.07 3.56 1.15 4.96.6 1.83 1.25 4.04 1.83 6.36 1.53 3.51-.45 6.44-2.8 7.74-6.11.83-.49 1.48-1.24 1.76-2.18.23-.74.07-1.52-.44-2.19z" />
    <path d="M12.5 8c1.33 0 2.54.67 3.25 1.75-1.2.66-2.19 1.65-2.82 2.84C12.42 11.16 12 9.64 12.5 8z" opacity="0.8" />
  </svg>
);

export default function Page() {
  return (
    <main className="min-h-screen bg-white text-slate-900 font-sans flex flex-col items-center justify-center p-6 text-center">
      <div className="p-3 rounded-xl bg-pink-50 border border-pink-100 mb-6">
        <User className="w-6 h-6 text-pink-600" />
      </div>
      <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-2">The Journey</h1>
      <p className="text-slate-500 max-w-sm mb-8 text-sm">This page is currently under construction. Please check back later.</p>
      <Link href="/" className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-all">
        <ArrowLeft className="w-3 h-3" /> Return Home
      </Link>
    </main>
  );
}