import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-slate-100 bg-white py-10 mt-auto w-full">
      <div className="max-w-6xl mx-auto px-6 flex flex-col gap-4 text-sm font-medium text-slate-500">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex flex-wrap gap-6">
            <Link href="/terms" className="hover:text-slate-900 transition-colors">Terms</Link>
            <Link href="/privacy" className="hover:text-slate-900 transition-colors">Privacy</Link>
          </div>
          <p className="text-xs text-slate-400">© {new Date().getFullYear()} Tonina.me</p>
        </div>
        <p className="text-xs font-normal text-slate-400 max-w-3xl leading-relaxed">
          Tonina.me is for education only. Nothing here is investment, tax or legal advice.
        </p>
      </div>
    </footer>
  );
}
