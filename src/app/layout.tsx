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
    default: "Tonina.me | Financial Know-How, Made Easy",
    template: "%s | Tonina.me",
  },
  description: "Plan your financial path, build professional finance skills, and learn alongside Alfredo Baudet as he shares what he learns.",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
  openGraph: {
    title: "Tonina.me | Financial Know-How, Made Easy",
    description: "Interactive finance case studies and a 30-year Scenario Planner to plan your financial path.",
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