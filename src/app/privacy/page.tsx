import { SiteNav } from "~/app/_components/SiteNav";
import { SiteFooter } from "~/app/_components/SiteFooter";
import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Tonina.me handles your data and analytics.",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col selection:bg-pink-100">
      <SiteNav />

      <div className="flex-1 max-w-3xl mx-auto px-6 py-16 w-full">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-900 mb-8">Privacy Policy</h1>
        
        <div className="prose prose-slate max-w-none prose-h2:text-2xl prose-h2:font-bold prose-h2:mt-8 prose-h2:mb-4 prose-p:text-base prose-p:leading-relaxed prose-p:text-slate-600">
          <p className="text-lg text-slate-700">
            <strong>TL;DR:</strong> I do not store your personal financial data, and I absolutely do not sell any information to third parties.
          </p>

          <h2>1. Data Collection & Usage</h2>
          <p>
            The majority of the interactive tools on Tonina.me (such as the Scenario Planner and the case studies) process calculations entirely <strong>client-side</strong>. This means the financial numbers you input stay in your internet browser and are not transmitted to or saved on my databases.
          </p>

          <h2>2. Email Communications</h2>
          <p>
            If you choose to voluntarily provide your email address (for instance, to download a template or request a 1:1 session), I will only use that email to send you the requested material and occasional updates related to Tonina.me. You will always have the option to unsubscribe. Your email will never be sold or rented to third-party marketers.
          </p>

          <h2>3. Cookies and Analytics</h2>
          <p>
            Tonina.me uses PostHog to understand general traffic patterns, such as which pages are visited and how people move between the Case Studies, Plan Your Path and Blog. PostHog sets a cookie to recognize returning browsers and records page views and basic device information. Visitors are not identified by name, and the numbers you type into the tools are not sent to PostHog.
          </p>

          <h2>4. Third-Party Links</h2>
          <p>
            This website may contain links to external sites (such as LinkedIn, GitHub, or public financial statements). I am not responsible for the privacy practices of those external websites.
          </p>

          <h2>5. Policy Changes</h2>
          <p>
            As this platform grows and features (like user accounts or cloud saving) are potentially added, this privacy policy may be updated. Any significant changes regarding data storage will be clearly communicated on this page.
          </p>

          <p className="text-xs text-slate-400 mt-12 italic">Last Updated: October 2026</p>
        </div>
      </div>
      <SiteFooter />
    </main>
  );
}