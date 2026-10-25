import { type Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Blog", template: "%s | Tonina.me" },
  description: "Why these tools exist, and notes on personal finance and strategic finance.",
};

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
    </>
  );
}
