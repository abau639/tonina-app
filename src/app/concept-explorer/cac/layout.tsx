import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "CAC Case Study: The Channel That Looked Fine",
  description: "A CFO case study on why blended LTV:CAC can hide a failing channel, and how to find the threshold and make the call.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
