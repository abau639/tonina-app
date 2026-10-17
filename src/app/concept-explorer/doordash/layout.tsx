import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "Deconstructing DoorDash: GAAP vs. Free Cash Flow",
  description: "A step-by-step teardown of how DoorDash reports GAAP losses while generating cash.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
