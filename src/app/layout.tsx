import "~/styles/globals.css";
import { Sora, Source_Sans_3 } from "next/font/google";
import { type Metadata } from "next";
import { TRPCReactProvider } from "~/trpc/react";
import { CSPostHogProvider } from "./providers"; // Import our new PostHog Provider
import { SITE_URL } from "~/lib/site";

// Theme A type: Source Sans 3 for reading, Sora for headings (applied to h1-h3 in globals.css)
const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-sans",
});

const sora = Sora({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-display",
});

// Upgraded SEO Metadata for LinkedIn / Twitter sharing
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Tonina.me | Learn Finance the Way It's Actually Used",
    template: "%s | Tonina.me",
  },
  description: "Plan your financial path, build professional finance skills, and learn alongside Alfredo as he shares what he learns.",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
  openGraph: {
    title: "Tonina.me | Learn Finance the Way It's Actually Used",
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
    <html lang="en" className={`${sourceSans.variable} ${sora.variable}`}>
      <body className="bg-white text-ink antialiased selection:bg-pink-100">
        <CSPostHogProvider>
          <TRPCReactProvider>
              {children}
          </TRPCReactProvider>
        </CSPostHogProvider>
      </body>
    </html>
  );
}