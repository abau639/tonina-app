import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "Wealth Archetype",
  description: "A choose-your-path simulation of the financial decisions that shape a life.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
