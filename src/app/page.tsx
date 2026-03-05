import Link from "next/link";
import { ArrowRight, LineChart, BookOpen, Terminal, FileText } from "lucide-react";

const DolphinLogo = ({ className = "text-2xl" }: { className?: string }) => (
  <span className={`inline-block grayscale opacity-80 select-none ${className}`} style={{ lineHeight: 1 }}>
    🐋
  </span>
);

export default function Home() {
  const projects = [
    {
      title: "Concept Explorer",
      description: "Exploration and application of financial topics—some to scale, others to strategically measure performance.",
      href: "/concept-explorer",
      icon: <BookOpen className="w-5 h-5 text-slate-600 group-hover:text-pink-600 transition-colors" />,
      tag: "Concepts"
    },
    {
      title: "Tonina Wealth",
      description: "A scenario playground to understand what wealth creation may look like for you.",
      href: "/wealth", 
      icon: <LineChart className="w-5 h-5 text-slate-600 group-hover:text-pink-600 transition-colors" />,
      tag: "Application"
    },
    {
      title: "The Lab",
      description: "An open exploration area for interesting topics, quantitative trackers, and technical experiments.",
      href: "/lab",
      icon: <Terminal className="w-5 h-5 text-slate-600 group-hover:text-pink-600 transition-colors" />,
      tag: "Experiments"
    },
    {
      title: "Tonina Blog",
      description: "Descriptions of the different projects, personal musings, and ongoing interests.",
      href: "/blog",
      icon: <FileText className="w-5 h-5 text-slate-600 group-hover:text-pink-600 transition-colors" />,
      tag: "Writing"
    }
  ];

  return (
    <main className="min-h-screen bg-white text-slate-900 font-sans selection:bg-pink-100 flex flex-col">
      <nav className="sticky top-0 z-50 w-full border-b border-slate-100 bg-white/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="font-bold tracking-tight text-slate-900 text-lg flex items-center gap-2 hover:opacity-80 transition-opacity">
              <DolphinLogo />
              Tonina.me
            </Link>
            <div className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
              <Link href="/concept-explorer" className="hover:text-slate-900 transition-colors">Concept Explorer</Link>
              <Link href="/wealth" className="hover:text-slate-900 transition-colors">Tonina Wealth</Link>
              <Link href="/lab" className="hover:text-slate-900 transition-colors">The Lab</Link>
              <Link href="/blog" className="hover:text-slate-900 transition-colors">Tonina Blog</Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex-1">
        <section className="max-w-6xl mx-auto px-6 pt-16 pb-12">
          <div className="max-w-3xl">
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-slate-900 mb-5 leading-[1.1]">
              I build to learn. <br />
              <span className="text-slate-400">I learn to build.</span>
            </h1>
            <p className="text-xl text-slate-500 leading-relaxed font-normal">
              This is my digital portfolio and creative outlet. A space where I get to explore financial systems, share topics that interest me, and express my ideas through code.
            </p>
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-6 pb-20">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

      <footer className="border-t border-slate-100 bg-white py-10 mt-auto w-full">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex flex-wrap items-center gap-6 text-sm text-slate-500 font-medium">
            <Link href="/terms" className="hover:text-slate-900 transition-colors">Terms</Link>
            <Link href="/privacy" className="hover:text-slate-900 transition-colors">Privacy</Link>
          </div>
          <div className="md:text-right">
            <p className="text-xs text-slate-400 max-w-sm leading-tight">
              © {new Date().getFullYear()} Tonina.me
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}