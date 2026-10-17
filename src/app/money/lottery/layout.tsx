import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "You Won the Lottery. What Do You Take Home?",
  description: "Cash now or 30 yearly payments? Lesson 1 of How Money Works: the time value of money.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
