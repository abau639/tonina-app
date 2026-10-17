import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "You Won the Lottery. What Do You Take Home?",
  description: "Lump sum or 30 yearly payments? See your take-home after federal and Massachusetts taxes, and learn the time value of money.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
