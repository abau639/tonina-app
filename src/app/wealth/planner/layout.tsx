import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "The Scenario Planner",
  description: "Model how income, housing, children and investing choices shape your net worth over 30 years.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
