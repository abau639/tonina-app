"use client";

import Link from "next/link";
import { useState } from "react";
import { CASES, INDUSTRIES, type Industry } from "./cases";

export function CaseLibrary() {
  const [industry, setIndustry] = useState<Industry | "All">("All");
  const shown = industry === "All" ? CASES : CASES.filter((c) => c.industry === industry);
  const count = (i: Industry) => CASES.filter((c) => c.industry === i).length;

  return (
    <>
      <div className="flex flex-wrap gap-2 mb-8" role="group" aria-label="Filter by industry">
        {(["All", ...INDUSTRIES] as const).map((i) => {
          const active = industry === i;
          return (
            <button
              key={i}
              type="button"
              aria-pressed={active}
              onClick={() => setIndustry(i)}
              className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                active ? "bg-navy border-navy text-white" : "border-slate-300 text-slate-700 hover:border-navy"
              }`}
            >
              {i}
              <span className={`ml-1.5 font-medium ${active ? "text-navy-soft" : "text-slate-400"}`}>
                {i === "All" ? CASES.length : count(i)}
              </span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {shown.map((c) => (
          <Link key={c.href} href={c.href} className="group flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-6 hover:border-pink-300 transition-colors no-underline">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-semibold uppercase tracking-[0.1em] text-pink-600">{c.industry}</span>
              <span className="text-xs font-medium text-slate-400">{c.format}</span>
            </div>
            <h3 className="text-xl font-bold leading-snug">{c.title}</h3>
            <p className="text-sm text-slate-600 leading-relaxed">{c.summary}</p>
            <span className="mt-auto pt-2 text-sm font-semibold text-ink group-hover:text-pink-600 transition-colors">Open case →</span>
          </Link>
        ))}
        <div className="flex flex-col gap-2 rounded-xl border border-dashed border-slate-300 p-6">
          <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
            {shown.length === 0 ? "No cases here yet" : "Your idea here"}
          </span>
          <h3 className="text-xl font-bold leading-snug">Request a case study</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Is there a company or industry you&apos;d like me to break down? Requests open soon. I&apos;ll pick one a month and share an early preview with whoever asked.
          </p>
        </div>
      </div>
    </>
  );
}
