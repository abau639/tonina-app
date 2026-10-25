"use client";

import { useState } from "react";
import { KIT_PUBLIC_FORM_ID } from "~/lib/newsletter";

type Status = { state: "idle" | "sending" | "done" | "error"; message?: string; link?: string };

const DONE = "Almost done. Check your inbox and confirm your email.";
const FAILED = "We couldn't sign you up just now. Please try again later.";

// Kit's bot filter quarantines signups sent from a server, so the form posts from the visitor's
// browser, the same way Kit's own embed does. If Kit still wants a check, it returns a page to verify on.
async function joinKitForm(email: string): Promise<Status> {
  const res = await fetch(`https://app.kit.com/forms/${KIT_PUBLIC_FORM_ID}/subscriptions`, {
    method: "POST",
    headers: { Accept: "application/json" },
    body: new URLSearchParams({ email_address: email }),
  });
  const data = (await res.json().catch(() => ({}))) as { status?: string; url?: string };
  if (res.ok && data.status === "success") return { state: "done", message: DONE };
  if (data.status === "quarantined" && data.url) {
    return { state: "done", message: "One quick check to show you're not a bot, then confirm your email.", link: data.url };
  }
  return { state: "error", message: FAILED };
}

// The site's primary call to action: join the email list.
// `tone` matches the band it sits on (navy bands use "dark").
export function EmailSignup({ source, tone = "dark", id }: { source: string; tone?: "dark" | "light"; id: string }) {
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [status, setStatus] = useState<Status>({ state: "idle" });
  const dark = tone === "dark";

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus({ state: "sending" });
    if (KIT_PUBLIC_FORM_ID) {
      if (website) return setStatus({ state: "done", message: DONE });
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        return setStatus({ state: "error", message: "That email doesn't look right. Check it and try again." });
      }
      try {
        const next = await joinKitForm(email.trim());
        setStatus(next);
        if (next.state === "done") setEmail("");
      } catch {
        setStatus({ state: "error", message: "We couldn't reach the signup service. Check your connection and try again." });
      }
      return;
    }
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, website, source }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; detail?: string };
      if (res.ok && data.ok) {
        setStatus({ state: "done", message: DONE });
        setEmail("");
      } else {
        const message = data.error ?? FAILED;
        // On preview deployments, show the technical reason so setup problems are visible without logs.
        const preview = window.location.hostname.endsWith(".vercel.app");
        setStatus({ state: "error", message: preview && data.detail ? `${message} (${data.detail})` : message });
      }
    } catch {
      setStatus({ state: "error", message: "We couldn't reach the server. Check your connection and try again." });
    }
  }

  return (
    <form onSubmit={onSubmit} className="w-full max-w-xl" noValidate>
      <div className="flex flex-col sm:flex-row gap-3">
        <label htmlFor={`${id}-email`} className="sr-only">Email address</label>
        <input
          id={`${id}-email`}
          type="email"
          required
          autoComplete="email"
          placeholder="you@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={`flex-1 min-w-0 rounded-lg px-4 py-3 text-base text-ink bg-white border ${dark ? "border-transparent" : "border-slate-300"} focus:outline-none focus:ring-2 focus:ring-pink-400`}
        />
        {/* Honeypot for bots; hidden from people and screen readers */}
        <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" value={website} onChange={(e) => setWebsite(e.target.value)} />
        <button
          type="submit"
          disabled={status.state === "sending"}
          className="rounded-lg bg-pink-600 px-6 py-3 text-base font-semibold text-white hover:bg-pink-500 disabled:opacity-60 transition-colors whitespace-nowrap"
        >
          {status.state === "sending" ? "Joining…" : "Join me"}
        </button>
      </div>
      <p
        role="status"
        className={`mt-3 text-sm ${
          status.state === "error" ? (dark ? "text-pink-300" : "text-pink-700") : dark ? "text-navy-soft" : "text-slate-500"
        }`}
      >
        {status.message ?? "One email a month: the newest lesson or case study, and what I learned. Unsubscribe anytime."}
        {status.link && (
          <>
            {" "}
            <a href={status.link} target="_blank" rel="noopener noreferrer" className={`font-semibold underline underline-offset-4 ${dark ? "text-white" : "text-ink"}`}>
              Verify here
            </a>
          </>
        )}
      </p>
    </form>
  );
}
