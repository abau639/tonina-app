import Link from "next/link";
import { ArrowLeft, ArrowDown } from "lucide-react";

const DolphinLogo = ({ className = "text-2xl" }: { className?: string }) => (
  <span className={`inline-block grayscale opacity-80 select-none ${className}`} style={{ lineHeight: 1 }}>🐋</span>
);

const TIMELINE = [
    { company: "PwC", role: "Financial Consulting (first) & Project Management (later)", type: "start" },
    { company: "Mobius Materials", role: "Operations & Product (3rd Employee)", type: "mid" },
    { company: "Microsoft", role: "Product Marketing Intern", type: "mid" },
    { company: "Dilmun", role: "Strategic Finance & Fundraising", type: "mid" },
    { company: "P&G • Gillette", role: "Brand Finance & Strategy (now) & Supply Chain FP&A (previously)", type: "current" },
];

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
            Why I Built This Platform
          </h1>
          <div className="flex items-center justify-center gap-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            <span>March 2026</span>
          </div>
        </header>

        {/* MBB Style Visual Timeline */}
        <div className="mb-16 bg-slate-50 p-8 rounded-3xl border border-slate-200">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-8 text-center border-b border-slate-200 pb-4">The Professional Journey</h3>
            <div className="flex flex-col relative max-w-sm mx-auto">
                {/* Connecting Line */}
                <div className="absolute left-[15px] top-4 bottom-4 w-0.5 bg-slate-200"></div>
                
                {TIMELINE.map((node, idx) => (
                    <div key={idx} className="flex items-start gap-6 mb-6 last:mb-0 relative z-10">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center border-[3px] border-slate-50 ${node.type === 'current' ? 'bg-pink-600' : node.type === 'start' ? 'bg-slate-900' : 'bg-slate-400'}`}>
                            <div className="w-2 h-2 rounded-full bg-white"></div>
                        </div>
                        <div className="pt-1">
                            <h4 className={`text-sm font-bold ${node.type === 'current' ? 'text-pink-600' : 'text-slate-900'}`}>{node.company}</h4>
                            <p className="text-sm text-slate-500">{node.role}</p>
                        </div>
                    </div>
                ))}
            </div>
            <div className="mt-8 pt-6 border-t border-slate-200 text-center">
                <a href="https://www.linkedin.com/in/abaudet/" target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-pink-600 hover:text-pink-700 transition-colors">
                    View Full Experience on LinkedIn &rarr;
                </a>
            </div>
        </div>

        <div className="prose prose-slate prose-lg max-w-none text-slate-700 leading-loose">
          <p>
            Throughout this journey, there have been significant learnings at every step. From facilitating securitized bond issuances at PwC, to experiencing the chaotic zero-to-one phase as the 3rd employee at a startup, to driving massive-scale strategic finance at global brands like Gillette.
          </p>
           <p>
            I built this platform to explore the topics that interest me, play with complex financial systems, and create open-source tooling that might help others on their own paths. This is just the beginning, and I can't wait to find more things to explore.
          </p>
          
          <hr className="my-10 border-slate-100" />
          
          <div className="bg-pink-50 p-6 rounded-2xl border border-pink-100 text-sm">
            <strong className="text-pink-900 block mb-2 font-bold">P.S. What is a Tonina?</strong>
            <span className="text-pink-800">For the uninitiated: a <em>Tonina</em> is a pink freshwater dolphin found in the Amazon River (the only one of its kind in the Americas). Besides, who doesn't love dolphins?</span>
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