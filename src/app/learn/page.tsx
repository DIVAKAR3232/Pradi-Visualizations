import type { Metadata } from "next";
import { LearnApp } from "@/components/learn/LearnApp";

export const metadata: Metadata = {
  title: "Learn DSA · Pradi Visualizer",
  description: "DSA concepts and the methods that solve them, with templates you can visualize and LeetCode problems grouped by difficulty.",
};

export default function LearnPage() {
  return <LearnApp />;
}
