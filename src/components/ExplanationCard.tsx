"use client";

import { AlertTriangle, ArrowRight, CheckCircle2, CornerDownLeft, GitBranch, Lightbulb, PhoneCall, Play, Repeat, XCircle, Zap } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type { Explanation, Tone } from "@/lib/explain";
import { RichText } from "./RichText";

const TONES: Record<Tone, { label: string; icon: typeof Zap; color: string; glow: string }> = {
  start: { label: "Start", icon: Play, color: "text-sky-300 bg-sky-400/15 ring-sky-400/30", glow: "from-sky-500/20" },
  info: { label: "Step", icon: Zap, color: "text-indigo-300 bg-indigo-400/15 ring-indigo-400/30", glow: "from-indigo-500/20" },
  call: { label: "Function call", icon: PhoneCall, color: "text-violet-300 bg-violet-400/15 ring-violet-400/30", glow: "from-violet-500/25" },
  return: { label: "Return", icon: CornerDownLeft, color: "text-emerald-300 bg-emerald-400/15 ring-emerald-400/30", glow: "from-emerald-500/20" },
  true: { label: "Condition: True", icon: GitBranch, color: "text-emerald-300 bg-emerald-400/15 ring-emerald-400/30", glow: "from-emerald-500/20" },
  false: { label: "Condition: False", icon: XCircle, color: "text-rose-300 bg-rose-400/15 ring-rose-400/30", glow: "from-rose-500/20" },
  loop: { label: "Loop", icon: Repeat, color: "text-amber-300 bg-amber-400/15 ring-amber-400/30", glow: "from-amber-500/20" },
  error: { label: "Error", icon: AlertTriangle, color: "text-red-300 bg-red-400/15 ring-red-400/30", glow: "from-red-500/25" },
  done: { label: "Finished", icon: CheckCircle2, color: "text-emerald-300 bg-emerald-400/15 ring-emerald-400/30", glow: "from-emerald-500/25" },
};

export function ExplanationCard({ ex, stepKey, nextLine, nextCode }: { ex: Explanation; stepKey: number; nextLine?: number; nextCode?: string }) {
  const t = TONES[ex.tone];
  const Icon = t.icon;
  return (
    <div className="panel relative overflow-hidden p-4 sm:p-5">
      <div className={`pointer-events-none absolute -left-10 -top-16 size-56 rounded-full bg-gradient-to-br ${t.glow} to-transparent blur-2xl transition-colors duration-500`} />
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={stepKey}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.18 }}
          className="relative"
        >
          <div className={`mb-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${t.color}`}>
            <Icon className="size-3.5" />
            {t.label}
          </div>
          <p className="text-[15px] leading-relaxed text-slate-100 sm:text-base">
            <RichText text={ex.title} />
          </p>
          {ex.details.length > 0 && (
            <ul className="mt-3 flex flex-col gap-1.5">
              {ex.details.map((d, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 * i }}
                  className="flex gap-2 text-sm text-slate-300"
                >
                  <span className="mt-2 size-1 shrink-0 rounded-full bg-slate-400" />
                  <RichText text={d} />
                </motion.li>
              ))}
            </ul>
          )}
          {ex.why && (
            <div className="mt-3 flex gap-2 rounded-xl bg-white/[0.03] p-3 text-sm text-slate-300 ring-1 ring-white/[0.06]">
              <Lightbulb className="mt-0.5 size-4 shrink-0 text-amber-300" />
              <RichText text={ex.why} />
            </div>
          )}
          {nextLine && nextCode !== undefined && ex.tone !== "done" && ex.tone !== "error" && (
            <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
              <ArrowRight className="size-3.5 text-emerald-400" />
              Next: line {nextLine}
              <code className="truncate rounded bg-emerald-400/10 px-1.5 py-0.5 font-mono text-emerald-200">{nextCode || "…"}</code>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
