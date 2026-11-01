export type Difficulty = "Easy" | "Medium" | "Hard";

export type Problem = { id: number; title: string; slug: string; diff: Difficulty };

export type TemplateLang = "python" | "java" | "cpp" | "c";
export type Templates = { python: string; java: string; cpp: string; c?: string };

export type Method = {
  id: string;
  name: string;
  /** One-line idea. */
  idea: string;
  /** Signals in a problem statement that hint at this method. */
  when: string[];
  brute: string;
  optimal: string;
  steps: string[];
  code: Templates;
  /** LeetCode problem numbers solved with this method. */
  problems: number[];
};

export type Topic = {
  id: string;
  name: string;
  blurb: string;
  icon: string; // lucide icon name, mapped in the UI
  color: string; // tailwind gradient stops, e.g. "from-violet-500 to-indigo-500"
  methods: Method[];
};

export type ImportantGroup = { topic: string; problems: { id: number; top?: boolean }[] };

export const leetUrl = (slug: string) => `https://leetcode.com/problems/${slug}/`;
