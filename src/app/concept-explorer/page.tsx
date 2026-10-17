import Link from "next/link";
import { ArrowRight, Layers, BookOpen, AlertTriangle, TrendingDown } from "lucide-react";
import { SiteNav } from "~/app/_components/SiteNav";
import { SiteFooter } from "~/app/_components/SiteFooter";

export default function ConceptExplorerHub() {
  const concepts = [
    {
      title: "The Channel That Looked Fine Until It Wasn't",
      description: "A CFO case study. Blended LTV:CAC holds at 3.2x for six straight quarters. Channel-level data tells a different story. Find the threshold, make the call.",
      href: "/concept-explorer/cac",
      icon: <TrendingDown className="w-5 h-5 text-slate-600 group-hover:text-pink-600 transition-colors" />,
      tag: "CFO Case Study"
    },
    {
      title: "Deconstructing DoorDash",
      description: "A guided, step-by-step financial teardown highlighting the flow of capital and the reality of GAAP net losses.",
      href: "/concept-explorer/doordash", 
      icon: <Layers className="w-5 h-5 text-slate-600 group-hover:text-pink-600 transition-colors" />,
      tag: "Scrollytelling Analysis"
    },
    {
      title: "The Language of SaaS",
      description: "A definitive primer on the metrics that drive software valuation (CAC, LTV, NDR, Payback).",
      href: "/concept-explorer/saas", 
      icon: <BookOpen className="w-5 h-5 text-slate-600 group-hover:text-pink-600 transition-colors" />,
      tag: "Interactive Dictionary"
    },
    {
      title: "Project: Family Center",
      description: "A crisis simulation. Select a role, gather data under pressure, and present a strategic recommendation to a polarized leadership team.",
      href: "/concept-explorer/snapchat", 
      icon: <AlertTriangle className="w-5 h-5 text-slate-600 group-hover:text-pink-600 transition-colors" />,
      tag: "Role-Playing Case Study"
    }
  ];

  return (
    <main className="min-h-screen bg-white text-slate-900 font-sans selection:bg-pink-100 flex flex-col">
      <SiteNav />

      <div className="flex-1 w-full">
        <section className="max-w-6xl mx-auto px-6 pt-12 pb-8">
          <div className="inline-flex items-center gap-2 bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border border-slate-200 mb-4">
            Educational Library
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-900 mb-3">Case Studies</h1>
          <p className="text-base text-slate-500 max-w-2xl leading-relaxed">
            Interactive case studies and teardowns that show how finance leaders read the numbers and make the call.
          </p>
        </section>

        <section className="max-w-6xl mx-auto px-6 pb-16">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {concepts.map((project, idx) => (
              <Link href={project.href} key={idx} className="group flex flex-col p-6 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-white hover:border-pink-200 hover:shadow-sm transition-all duration-300 no-underline">
                <div className="flex justify-between items-center mb-6">
                  <div className="p-2.5 rounded-xl bg-white border border-slate-100 group-hover:bg-pink-50 transition-colors">
                    {project.icon}
                  </div>
                  <span className="text-[10px] uppercase tracking-widest font-bold text-slate-400 group-hover:text-pink-600 transition-colors">
                    {project.tag}
                  </span>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2 no-underline">
                    {project.title}
                  </h3>
                  <p className="text-sm text-slate-500 leading-relaxed no-underline">{project.description}</p>
                </div>
                <div className="mt-6 flex items-center text-sm font-bold text-slate-400 group-hover:text-pink-600 transition-colors">
                  Explore <ArrowRight className="w-4 h-4 ml-1.5 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>

      <SiteFooter />
    </main>
  );
}