"use client";

import { Check, ExternalLink, Flame } from "lucide-react";
import { motion } from "motion/react";
import { leetUrl, type Difficulty, type Method, type Problem } from "@/lib/learn/types";

export const DIFF_STYLE: Record<Difficulty, { text: string; bg: string; ring: string; dot: string }> = {
  Easy: { text: "text-emerald-300", bg: "bg-emerald-400/10", ring: "ring-emerald-400/30", dot: "bg-emerald-400" },
  Medium: { text: "text-amber-300", bg: "bg-amber-400/10", ring: "ring-amber-400/30", dot: "bg-amber-400" },
  Hard: { text: "text-rose-300", bg: "bg-rose-400/10", ring: "ring-rose-400/30", dot: "bg-rose-400" },
};

export function DiffPill({ diff }: { diff: Difficulty }) {
  const s = DIFF_STYLE[diff];
  return <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${s.text} ${s.bg} ${s.ring}`}>{diff}</span>;
}

type Props = {
  problem: Problem;
  methods: Method[];
  /** The method being viewed: shown first and highlighted. */
  focus?: string;
  solved: boolean;
  onToggle: () => void;
  top?: boolean;
  onMethod?: (m: Method) => void;
};

/** A LeetCode problem. Clicking it opens LeetCode in a new tab. */
export function ProblemCard({ problem, methods, focus, solved, onToggle, top, onMethod }: Props) {
  const ordered = focus ? [...methods].sort((a, b) => (a.id === focus ? -1 : b.id === focus ? 1 : 0)) : methods;
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`group relative rounded-xl ring-1 transition-colors ${
        solved ? "bg-emerald-400/[0.05] ring-emerald-400/25" : "bg-white/[0.03] ring-white/[0.08] hover:bg-white/[0.06] hover:ring-violet-400/40"
      }`}
    >
      <a
        href={leetUrl(problem.slug)}
        target="_blank"
        rel="noopener noreferrer"
        className="flex min-w-0 flex-col gap-2 p-3 pr-12"
        title={`Open "${problem.title}" on LeetCode`}
      >
        <div className="flex min-w-0 items-start gap-2">
          <span className="mt-px shrink-0 font-mono text-xs text-slate-500">{problem.id}.</span>
          <span className={`min-w-0 text-sm font-medium leading-snug ${solved ? "text-slate-400 line-through decoration-emerald-400/60" : "text-slate-100"}`}>
            {problem.title}
          </span>
          <ExternalLink className="mt-0.5 size-3.5 shrink-0 text-slate-600 transition group-hover:text-violet-300" />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <DiffPill diff={problem.diff} />
          {top && (
            <span className="flex items-center gap-1 rounded-full bg-orange-400/10 px-2 py-0.5 text-[11px] font-medium text-orange-300 ring-1 ring-orange-400/30">
              <Flame className="size-3" /> Frequently asked
            </span>
          )}
          {ordered.slice(0, 2).map((m) => (
            <span
              key={m.id}
              onClick={
                onMethod
                  ? (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onMethod(m);
                    }
                  : undefined
              }
              className={`rounded-full px-2 py-0.5 text-[11px] ring-1 ${
                m.id === focus ? "bg-violet-400/15 text-violet-200 ring-violet-400/40" : "bg-white/[0.04] text-slate-300 ring-white/10"
              } ${onMethod ? "cursor-pointer hover:ring-violet-300/60" : ""}`}
              title={onMethod ? `Learn the ${m.name} method` : m.name}
            >
              {m.name}
            </span>
          ))}
          {ordered.length > 2 && <span className="text-[11px] text-slate-500">+{ordered.length - 2} more</span>}
        </div>
      </a>
      <button
        onClick={onToggle}
        aria-pressed={solved}
        title={solved ? "Mark as not solved" : "Mark as solved"}
        className={`absolute right-2.5 top-2.5 grid size-7 place-items-center rounded-lg ring-1 transition active:scale-90 ${
          solved ? "bg-emerald-500/80 text-white ring-emerald-300/60" : "bg-white/[0.03] text-transparent ring-white/15 hover:text-slate-400 hover:ring-white/30"
        }`}
      >
        <Check className="size-4" />
      </button>
    </motion.div>
  );
}
