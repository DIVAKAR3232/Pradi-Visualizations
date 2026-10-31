"use client";

import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { BOUND_NAMES, heapObj } from "@/lib/format";
import type { Frame } from "@/lib/types";
import { type Ctx, type Pointer, ValueView } from "./Values";

/** Integer variables that point into the array called `arrName`. */
function pointersFor(arrName: string, frame: Frame, indexMap: Map<string, Set<string>>): Pointer[] {
  const labels = new Set([...(indexMap.get(arrName) ?? []), ...BOUND_NAMES]);
  const out: Pointer[] = [];
  for (const label of labels) {
    const m = label.match(/^(\w+?)(?:([+-])(\d+))?$/);
    if (!m || m[1] === arrName) continue;
    const v = frame.vars.find(([n]) => n === m[1])?.[1];
    if (v?.k !== "p" || v.t !== "int") continue;
    const off = m[2] ? (m[2] === "+" ? 1 : -1) * Number(m[3]) : 0;
    out.push({ name: label, index: Number(v.v) + off });
  }
  return out;
}

export function MemoryView({ ctx, indexMap }: { ctx: Ctx; indexMap: Map<string, Set<string>> }) {
  const { step, hl } = ctx;
  const frames = [...step.stack].reverse();

  return (
    <LayoutGroup>
      <div className="flex flex-col gap-3">
        <AnimatePresence initial={false} mode="popLayout">
          {frames.map((f, idx) => {
            const active = idx === 0;
            const defs = f.vars.filter(([, v]) => {
              const o = heapObj(v, step.heap);
              return o?.kind === "function" || o?.kind === "class";
            });
            const data = f.vars.filter((x) => !defs.includes(x));
            const depth = step.stack.filter((s) => s.name === f.name).length;
            return (
              <motion.div
                key={f.id}
                layout
                initial={{ opacity: 0, y: -24, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: 60, scale: 0.95, transition: { duration: 0.25 } }}
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
                className={`rounded-2xl p-3 ring-1 ${
                  active
                    ? "bg-gradient-to-br from-violet-500/[0.12] to-indigo-500/[0.04] ring-violet-400/40 shadow-[0_0_30px_-8px_rgba(139,92,246,0.5)]"
                    : "bg-white/[0.02] ring-white/[0.07] opacity-75"
                }`}
              >
                <div className="mb-2 flex items-center gap-2">
                  <span className={`size-2 rounded-full ${active ? "bg-violet-400 shadow-[0_0_8px_#a78bfa]" : "bg-slate-600"}`} />
                  <span className="font-mono text-sm font-semibold text-white">{f.name === "Global" ? "Global frame" : `${f.name}()`}</span>
                  {f.name !== "Global" && depth > 1 && (
                    <span className="rounded-full bg-violet-400/15 px-2 py-0.5 text-[10px] font-medium text-violet-200">recursion</span>
                  )}
                  <span className="ml-auto font-mono text-[11px] text-slate-500">line {f.line}</span>
                </div>

                {defs.length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-1.5">
                    {defs.map(([n, v]) => (
                      <span key={n} className="rounded-md bg-violet-400/10 px-2 py-0.5 ring-1 ring-violet-400/20">
                        <ValueView v={v} ctx={ctx} />
                      </span>
                    ))}
                  </div>
                )}

                {data.length === 0 && defs.length === 0 && <div className="text-xs text-slate-500">No variables yet</div>}

                <div className="flex flex-col gap-1">
                  {data.map(([n, v]) => {
                    const hot = hl.vars.has(`${f.id}:${n}`);
                    return (
                      <motion.div
                        key={n}
                        layout="position"
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`grid grid-cols-[minmax(56px,auto)_1fr] items-start gap-3 rounded-xl px-2 py-1.5 transition-colors duration-500 ${
                          hot ? "bg-amber-400/10 ring-1 ring-amber-400/40" : ""
                        }`}
                      >
                        <span className="pt-0.5 font-mono text-sm text-slate-300">{n}</span>
                        <div className="min-w-0">
                          <ValueView v={v} ctx={ctx} name={n} pointers={pointersFor(n, f, indexMap)} ptrScope={`${f.id}-${n}`} />
                        </div>
                      </motion.div>
                    );
                  })}
                  {active && step.event === "return" && step.ret && f.name !== "Global" && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="mt-1 flex items-center gap-3 rounded-xl bg-emerald-400/10 px-2 py-1.5 ring-1 ring-emerald-400/40"
                    >
                      <span className="font-mono text-sm text-emerald-300">↩ return</span>
                      <ValueView v={step.ret} ctx={ctx} />
                    </motion.div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </LayoutGroup>
  );
}
