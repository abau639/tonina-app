import Link from "next/link";

const DolphinLogo = ({ className = "text-2xl" }: { className?: string }) => (
  <span className={`inline-block grayscale opacity-80 select-none ${className}`} style={{ lineHeight: 1 }}>🐋</span>
);

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col selection:bg-pink-100">
      <nav className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="font-bold tracking-tight text-slate-900 text-lg flex items-center gap-2 hover:opacity-80 transition-opacity">
              <DolphinLogo /> Tonina.me
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

      <div className="flex-1 max-w-3xl mx-auto px-6 py-16 w-full">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 mb-8">Privacy Policy</h1>
        
        <div className="prose prose-slate max-w-none prose-h2:text-xl prose-h2:font-bold prose-h2:mt-8 prose-h2:mb-4 prose-p:text-sm prose-p:leading-relaxed prose-p:text-slate-600">
          <p className="text-lg text-slate-700">
            <strong>TL;DR:</strong> I do not store your personal financial data, and I absolutely do not sell any information to third parties.
          </p>

          <h2>1. Data Collection & Usage</h2>
          <p>
            The majority of the interactive tools on Tonina.me (such as The Scenario Planner and the Deal Desk Simulator) process calculations entirely <strong>client-side</strong>. This means the financial numbers you input stay in your internet browser and are not transmitted to or saved on my databases.
          </p>

          <h2>2. Email Communications</h2>
          <p>
            If you choose to voluntarily provide your email address (for instance, to download a template or request a 1:1 session), I will only use that email to send you the requested material and occasional updates related to Tonina.me. You will always have the option to unsubscribe. Your email will never be sold or rented to third-party marketers.
          </p>

          <h2>3. Cookies and Analytics</h2>
          <p>
            Tonina.me may use standard, lightweight analytics tools (like Vercel Analytics or Google Analytics) to understand general website traffic patterns (e.g., how many people visit the Concept Explorer vs. the Blog). These tools use basic cookies but do not track personally identifiable financial information.
          </p>

          <h2>4. Third-Party Links</h2>
          <p>
            This website may contain links to external sites (such as LinkedIn, GitHub, or public financial statements). I am not responsible for the privacy practices of those external websites.
          </p>

          <h2>5. Policy Changes</h2>
          <p>
            As this platform grows and features (like user accounts or cloud saving) are potentially added, this privacy policy may be updated. Any significant changes regarding data storage will be clearly communicated on this page.
          </p>

          <p className="text-xs text-slate-400 mt-12 italic">Last Updated: March 2026</p>
        </div>
      </div>
    </main>
  );
}