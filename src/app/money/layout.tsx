import { type Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "How Money Works", template: "%s | Tonina.me" },
  description: "Key money concepts like the time value of money, explained with real-life questions you can play with.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
