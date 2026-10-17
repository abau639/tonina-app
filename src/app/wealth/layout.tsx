import { type Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Tools", template: "%s | Tonina.me" },
  description: "Interactive personal finance tools, including a 30-year net worth Scenario Planner.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
