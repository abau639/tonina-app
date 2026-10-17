import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "The Language of SaaS",
  description: "A primer on the metrics that drive software valuation: ARR, NDR, CAC, LTV and payback.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
