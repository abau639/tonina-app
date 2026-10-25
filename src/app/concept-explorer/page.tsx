import { SiteNav } from "~/app/_components/SiteNav";
import { SiteFooter } from "~/app/_components/SiteFooter";
import { CaseLibrary } from "./CaseLibrary";

export default function ConceptExplorerHub() {
  return (
    <main className="min-h-screen bg-white text-ink flex flex-col">
      <SiteNav />

      <div className="flex-1 w-full">
        <section className="bg-navy text-white">
          <div className="max-w-6xl mx-auto px-6 pt-14 pb-12">
            <p className="text-sm font-semibold uppercase tracking-[0.12em] text-navy-soft mb-3">Case Studies · Industry library</p>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">Learn finance on real companies</h1>
            <p className="text-lg text-navy-soft max-w-2xl leading-relaxed">
              Pick an industry. Each case is interactive: change the numbers and see what a finance team would see.
            </p>
          </div>
        </section>

        <section className="bg-mist">
          <div className="max-w-6xl mx-auto px-6 py-12">
            <CaseLibrary />
          </div>
        </section>
      </div>

      <SiteFooter />
    </main>
  );
}
