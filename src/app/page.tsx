import Link from "next/link";
import { ArrowRight, LineChart, BookOpen, FileText } from "lucide-react";
import { SiteNav } from "~/app/_components/SiteNav";
import { SiteFooter } from "~/app/_components/SiteFooter";

export default function Home() {
  const projects = [
    {
      title: "Case Studies",
      description: "CFO-style case studies and teardowns: channel-level CAC, DoorDash's GAAP vs. cash story, the SaaS metrics that drive valuation, and a crisis simulation.",
      href: "/concept-explorer",
      icon: <BookOpen className="w-5 h-5 text-slate-600 group-hover:text-pink-600 transition-colors" />,
      tag: "Learn"
    },
    {
      title: "Tools",
      description: "The Scenario Planner: a 30-year model of how income, housing, kids and investing choices shape net worth.",
      href: "/wealth",
      icon: <LineChart className="w-5 h-5 text-slate-600 group-hover:text-pink-600 transition-colors" />,
      tag: "Model"
    },
    {
      title: "Blog",
      description: "Why these tools exist, and notes on personal finance and strategic finance.",
      href: "/blog",
      icon: <FileText className="w-5 h-5 text-slate-600 group-hover:text-pink-600 transition-colors" />,
      tag: "Writing"
    }
  ];

  return (
    <main className="min-h-screen bg-white text-slate-900 font-sans selection:bg-pink-100 flex flex-col">
      <SiteNav />

      <div className="flex-1">
        <section className="max-w-6xl mx-auto px-6 pt-16 pb-12">
          <div className="max-w-3xl">
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-slate-900 mb-5 leading-[1.1]">
              Strategic finance, <br />
              <span className="text-slate-400">made interactive.</span>
            </h1>
            <p className="text-xl text-slate-500 leading-relaxed font-normal">
              Case studies, models and tools for operators, analysts and MBAs who want to think like a finance leader. Built by Alfredo Baudet.
            </p>
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-6 pb-20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {projects.map((project, idx) => (
              <Link 
                href={project.href} 
                key={idx} 
                className="group block p-8 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-white hover:border-pink-200 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-300 no-underline"
              >
                <div className="flex justify-between items-start mb-10">
                  <div className="p-3 rounded-xl bg-white border border-slate-100 group-hover:bg-pink-50 transition-colors">
                    {project.icon}
                  </div>
                  <span className="text-[10px] uppercase tracking-widest font-bold text-slate-400 group-hover:text-pink-600 transition-colors">
                    {project.tag}
                  </span>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-2 flex items-center gap-2">
                    {project.title}
                    <ArrowRight className="w-5 h-5 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 text-pink-600" />
                  </h3>
                  <p className="text-base text-slate-500 leading-relaxed">
                    {project.description}
                  </p>
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