import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "Project: Family Center Simulation",
  description: "A role-playing crisis simulation: gather data under pressure and present a recommendation to a split leadership team.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
