"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";

// Order follows the learning path: personal basics first, then professional depth.
export const NAV_LINKS = [
  { href: "/wealth", label: "Plan Your Path" },
  { href: "/money", label: "How Money Works" },
  { href: "/concept-explorer", label: "Case Studies" },
  { href: "/blog", label: "Blog" },
  { href: "/about", label: "About" },
] as const;

export const Wordmark = ({ className = "text-2xl" }: { className?: string }) => (
  <span className={`font-display font-extrabold tracking-tight ${className}`}>
    Tonina<span className="text-pink-400">.</span>
  </span>
);

export function SiteNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isActive = (href: string) => pathname === href || pathname?.startsWith(`${href}/`);

  return (
    <nav className="sticky top-0 z-50 w-full bg-navy text-white border-b border-navy-700">
      <div className="max-w-6xl mx-auto px-6 h-[72px] flex items-center justify-between gap-8">
        <Link href="/" className="text-white hover:opacity-90 transition-opacity" aria-label="Tonina home">
          <Wordmark />
        </Link>
        <div className="hidden lg:flex items-center gap-7 text-base font-medium">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isActive(link.href) ? "page" : undefined}
              className={
                isActive(link.href)
                  ? "text-white underline decoration-pink-400 decoration-2 underline-offset-[10px]"
                  : "text-navy-soft hover:text-white transition-colors"
              }
            >
              {link.label}
            </Link>
          ))}
        </div>
        <button
          type="button"
          className="lg:hidden p-2 -mr-2 text-navy-soft hover:text-white"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>
      {open && (
        <div className="lg:hidden border-t border-navy-700 bg-navy px-6 py-4 flex flex-col gap-4 text-base font-medium">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className={isActive(link.href) ? "text-white" : "text-navy-soft hover:text-white"}
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}
