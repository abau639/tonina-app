import "~/styles/globals.css";
import { Inter } from "next/font/google";
import { type Metadata } from "next";
import { TRPCReactProvider } from "~/trpc/react";
import { Analytics } from "@vercel/analytics/react";

// Use the standard Inter font
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

// Upgraded SEO Metadata for LinkedIn / Twitter sharing
export const metadata: Metadata = {
  title: "Tonina.me | Personal Portfolio & Financial Architecture",
  description: "A digital portfolio exploring financial systems, unit economics, and software architecture. Built by Alfredo Baudet.",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
  openGraph: {
    title: "Tonina.me | Financial Architecture",
    description: "Explore interactive financial teardowns, SaaS metrics, and wealth projection tools.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable}`}>
      <body className="bg-slate-50 text-slate-900 antialiased selection:bg-pink-100">
        <TRPCReactProvider>
            {children}
            {/* Injects Vercel Analytics seamlessly into every page */}
            <Analytics />
        </TRPCReactProvider>
      </body>
    </html>
  );
}