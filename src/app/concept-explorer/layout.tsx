import { type Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Case Studies", template: "%s | Tonina.me" },
  description: "Interactive strategic finance case studies: channel-level CAC, DoorDash's GAAP vs. cash flow, SaaS metrics and a crisis simulation.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
