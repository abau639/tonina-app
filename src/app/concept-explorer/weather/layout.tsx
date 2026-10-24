import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "True Sensation Weather",
  description: "A weather view built around how the day will actually feel.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
