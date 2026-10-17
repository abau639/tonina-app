"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";

export const NAV_LINKS = [
  { href: "/concept-explorer", label: "Case Studies" },
  { href: "/wealth", label: "Plan Your Path" },
  { href: "/blog", label: "Blog" },
] as const;

export const Logo = ({ className = "text-2xl" }: { className?: string }) => (
  <span className={`inline-block grayscale opacity-80 select-none ${className}`} style={{ lineHeight: 1 }}>
    🐋
  </span>
);

export function SiteNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isActive = (href: string) => pathname === href || pathname?.startsWith(`${href}/`);

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-slate-100 bg-white/80 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-6 h-[72px] flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="font-bold tracking-tight text-slate-900 text-[22px] flex items-center gap-2.5 hover:opacity-80 transition-opacity">
            <Logo className="text-[26px]" /> Tonina.me
          </Link>
          <div className="hidden md:flex items-center gap-8 text-base font-medium text-slate-600">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive(link.href) ? "page" : undefined}
                className={isActive(link.href) ? "text-pink-600 font-bold transition-colors" : "hover:text-slate-900 transition-colors"}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
        <button
          type="button"
          className="md:hidden p-2 -mr-2 text-slate-500 hover:text-slate-900"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>
      {open && (
        <div className="md:hidden border-t border-slate-100 bg-white px-6 py-4 flex flex-col gap-4 text-base font-medium text-slate-600">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className={isActive(link.href) ? "text-pink-600 font-bold" : "hover:text-slate-900"}
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}
