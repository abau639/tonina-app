import { type Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Plan Your Path", template: "%s | Tonina.me" },
  description: "Play through the financial choices that shape a life, then plan your own path with a 30-year Scenario Planner.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
