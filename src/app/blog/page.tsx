import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SiteNav } from "~/app/_components/SiteNav";
import { SiteFooter } from "~/app/_components/SiteFooter";

const BLOG_POSTS = [
  {
    slug: "debt-freedom",
    title: "Your Debt Doesn't Have to Own You",
    excerpt: "Most college grads carry debt like background noise. Here's why paying it down aggressively — not just investing around it — is the move that buys back your freedom.",
    date: "JUN 2026",
    readTime: "2 min read"
  },
  {
    slug: "why-i-built-this",
    title: "Why I Built This Platform",
    excerpt: "From securitized bonds to full-stack engineering: exploring the compounding value of building your own tools.",
    date: "MAR 2026",
    readTime: "3 min read"
  }
];

export default function BlogIndex() {
  return (
    <main className="min-h-screen bg-white text-slate-900 font-sans selection:bg-pink-100 flex flex-col">
      <SiteNav />

      <section className="max-w-3xl mx-auto px-6 pt-16 pb-12 w-full">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 mb-4">Writings & Memos</h1>
        <p className="text-lg text-slate-500 leading-relaxed">
          Explorations at the intersection of finance, technology, and building.
        </p>
      </section>

      <section className="max-w-3xl mx-auto px-6 pb-24 w-full flex-1">
        <div className="flex flex-col space-y-8">
          {BLOG_POSTS.map((post, idx) => (
            <Link 
              href={`/blog/${post.slug}`} 
              key={idx} 
              className="group block py-6 border-t border-slate-100 first:border-t-0 hover:bg-slate-50 -mx-6 px-6 rounded-2xl transition-colors"
            >
              <div className="flex items-center gap-4 mb-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{post.date}</span>
                <div className="w-1 h-1 bg-slate-300 rounded-full"></div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{post.readTime}</span>
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-3 group-hover:text-pink-600 transition-colors">
                {post.title}
              </h2>
              <p className="text-base text-slate-600 leading-relaxed mb-4">
                {post.excerpt}
              </p>
              <div className="flex items-center text-sm font-bold text-pink-600 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                Read Memo <ArrowRight className="w-4 h-4 ml-1.5" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}