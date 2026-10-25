import { SiteNav } from "~/app/_components/SiteNav";
import { SiteFooter } from "~/app/_components/SiteFooter";
import { CONTACT_EMAIL } from "~/lib/legal";
import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "Refund Policy",
  description: "Refund policy for Tonina.me templates and sessions.",
};

export default function RefundsPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col selection:bg-pink-100">
      <SiteNav />

      <div className="flex-1 max-w-3xl mx-auto px-6 py-16 w-full">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 mb-8">Refund Policy</h1>

        <div className="prose prose-slate max-w-none prose-h2:text-2xl prose-h2:font-bold prose-h2:mt-8 prose-h2:mb-4 prose-p:text-base prose-p:leading-relaxed prose-p:text-slate-600">
          <p className="text-lg text-slate-700">
            <strong>TL;DR:</strong> If a template doesn&apos;t work or isn&apos;t what was described, you get a fixed file or your money back.
          </p>

          <h2>1. Digital templates and downloads</h2>
          <p>
            Because digital files can&apos;t be returned, purchases are generally final. If a file is broken, won&apos;t open, or doesn&apos;t match its description, contact me within 14 days of purchase by replying to your receipt email or writing to the address below. I&apos;ll send a working file or a full refund, whichever you prefer. Other refund requests are considered case by case.
          </p>

          <h2>2. Paid sessions</h2>
          <p>
            You can cancel or reschedule a paid session for a full refund up to 24 hours before it starts. Within 24 hours, I&apos;ll reschedule once at no charge. If I need to cancel, you get a full refund. Sessions are educational discussions about methods and models, not personalized investment, tax or legal advice.
          </p>

          <h2>3. How refunds are paid</h2>
          <p>
            Refunds go back to the original payment method through the payment processor used at checkout. They usually appear within 5 to 10 business days, depending on your bank.
          </p>

          <h2>4. Contact</h2>
          <p>
            To ask for a refund or report a broken file, email me at <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
          </p>

          <p className="text-xs text-slate-400 mt-12 italic">Last Updated: October 2026</p>
        </div>
      </div>
      <SiteFooter />
    </main>
  );
}
