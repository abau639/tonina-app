import "~/styles/globals.css";
import { Inter } from "next/font/google";
import { type Metadata } from "next";
import { TRPCReactProvider } from "~/trpc/react";
import { CSPostHogProvider } from "./providers"; // Import our new PostHog Provider
import { SITE_URL } from "~/lib/site";

// Use the standard Inter font
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

// Upgraded SEO Metadata for LinkedIn / Twitter sharing
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Tonina.me | Strategic Finance, Made Interactive",
    template: "%s | Tonina.me",
  },
  description: "Case studies, models and tools for operators, analysts and MBAs who want to think like a finance leader. Built by Alfredo Baudet.",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
  openGraph: {
    title: "Tonina.me | Strategic Finance, Made Interactive",
    description: "Interactive finance case studies, SaaS metrics and a 30-year net worth Scenario Planner.",
    siteName: "Tonina.me",
    type: "website",
  },
  twitter: {
    card: "summary",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable}`}>
      <body className="bg-slate-50 text-slate-900 antialiased selection:bg-pink-100">
        <CSPostHogProvider>
          <TRPCReactProvider>
              {children}
          </TRPCReactProvider>
        </CSPostHogProvider>
      </body>
    </html>
  );
}