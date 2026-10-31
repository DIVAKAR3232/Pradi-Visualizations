"use client";

import { GitFork } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef } from "react";
import type { CallNode, CallTree } from "@/lib/structures";

const GAP_X = 10;
const ROW_H = 74;

type Placed = { node: CallNode; x: number; y: number };

/** The outermost call of the most recent recursive run (e.g. the latest fib(4) started from main). */
function rootsOf(tree: CallTree, idx: number): CallNode[] {
  const roots = tree.nodes.filter((n) => {
    if (n.start > idx || !tree.recursive.has(n.name)) return false;
    const p = n.parent === null ? null : tree.nodes[n.parent];
    return !p || p.name !== n.name;
  });
  return roots.length ? [roots[roots.length - 1]] : [];
}

const label = (n: CallNode) => `${n.name}(${n.args})`;

function layout(tree: CallTree, root: CallNode, idx: number, NODE_W: number): { placed: Placed[]; width: number; height: number } {
  const placed: Placed[] = [];
  let maxDepth = 0;
  const place = (n: CallNode, depth: number, left: number): number => {
    maxDepth = Math.max(maxDepth, depth);
    // only calls of the same function belong in the recursion tree
    const kids = n.children.map((c) => tree.nodes[c]).filter((c) => c.start <= idx && c.name === root.name);
    if (kids.length === 0) {
      placed.push({ node: n, x: left, y: depth });
      return left + NODE_W + GAP_X;
    }
    let cur = left;
    const start = placed.length;
    for (const k of kids) cur = place(k, depth + 1, cur);
    const childXs = placed.slice(start).filter((p) => p.y === depth + 1).map((p) => p.x);
    const x = (Math.min(...childXs) + Math.max(...childXs)) / 2;
    placed.push({ node: n, x, y: depth });
    return cur;
  };
  const width = place(root, 0, 0);
  return { placed, width, height: (maxDepth + 1) * ROW_H };
}

export function RecursionTree({ tree, idx }: { tree: CallTree; idx: number }) {
  const roots = useMemo(() => rootsOf(tree, idx), [tree, idx]);
  const scroller = useRef<HTMLDivElement>(null);
  const active = useMemo(() => {
    // deepest call still running at idx
    let best: CallNode | undefined;
    for (const n of tree.nodes)
      if (n.start <= idx && (n.end === undefined || n.end > idx) && roots.some((r) => r.name === n.name) && (!best || n.start > best.start)) best = n;
    return best?.id;
  }, [tree, idx, roots]);

  const NODE_W = useMemo(() => {
    const visible = tree.nodes.filter((n) => n.start <= idx && roots.some((r) => r.name === n.name));
    const longest = Math.max(6, ...visible.map((n) => label(n).length));
    return Math.min(170, Math.max(70, longest * 7.4 + 18));
  }, [tree, idx, roots]);
  const layouts = useMemo(() => roots.map((r) => layout(tree, r, idx, NODE_W)), [roots, tree, idx, NODE_W]);
  const runs = useMemo(
    () =>
      tree.nodes.filter((n) => {
        if (n.start > idx || !tree.recursive.has(n.name)) return false;
        const p = n.parent === null ? null : tree.nodes[n.parent];
        return !p || p.name !== n.name;
      }).length,
    [tree, idx],
  );

  // keep the running call in view
  useEffect(() => {
    const el = scroller.current?.querySelector<HTMLElement>("[data-active='true']");
    el?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [active]);

  if (roots.length === 0) return null;

  return (
    <div className="panel min-w-0 p-4">
      <div className="panel-title mb-3">
        <GitFork className="size-3.5" /> Recursion tree
        {runs > 1 && <span className="font-sans text-[10px] font-normal normal-case tracking-normal text-slate-500">· call #{runs}</span>}
        <span className="ml-auto flex items-center gap-3 font-sans text-[10px] font-normal normal-case tracking-normal text-slate-500">
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-full bg-violet-400" /> running
          </span>
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-full bg-indigo-300/50" /> waiting
          </span>
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-full bg-emerald-400" /> returned
          </span>
        </span>
      </div>
      <div ref={scroller} className="flex max-h-[420px] flex-col gap-6 overflow-auto pb-1">
        {layouts.map(({ placed, width, height }, ri) => {
          const at = new Map(placed.map((p) => [p.node.id, p]));
          return (
            <div key={roots[ri].id} className="relative shrink-0" style={{ width, height }}>
              <svg width={width} height={height} className="absolute inset-0">
                {placed.map((p) => {
                  const par = p.node.parent !== null ? at.get(p.node.parent) : undefined;
                  if (!par) return null;
                  return (
                    <motion.line
                      key={p.node.id}
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1, x1: par.x + NODE_W / 2, y1: par.y * ROW_H + 44, x2: p.x + NODE_W / 2, y2: p.y * ROW_H + 6 }}
                      transition={{ duration: 0.35 }}
                      stroke={p.node.end !== undefined && p.node.end <= idx ? "rgba(52,211,153,0.4)" : "rgba(167,139,250,0.5)"}
                      strokeWidth={1.5}
                    />
                  );
                })}
              </svg>
              <AnimatePresence initial={false}>
                {placed.map((p) => {
                  const done = p.node.end !== undefined && p.node.end <= idx;
                  const isActive = p.node.id === active;
                  return (
                    <motion.div
                      key={p.node.id}
                      data-active={isActive}
                      initial={{ opacity: 0, scale: 0.6, left: p.x, top: p.y * ROW_H }}
                      animate={{ opacity: 1, scale: 1, left: p.x, top: p.y * ROW_H }}
                      exit={{ opacity: 0, scale: 0.6 }}
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      className={`absolute flex flex-col items-center justify-center rounded-xl px-1.5 py-1 text-center ring-1 ${
                        isActive
                          ? "bg-violet-500/25 ring-violet-300 shadow-[0_0_20px_rgba(139,92,246,0.55)]"
                          : done
                            ? "bg-emerald-500/[0.08] ring-emerald-400/30"
                            : "bg-indigo-400/[0.08] ring-indigo-300/30"
                      }`}
                      style={{ width: NODE_W, height: 46 }}
                    >
                      <span className={`w-full truncate font-mono text-[12px] ${done ? "text-slate-400" : "text-white"}`}>
                        {label(p.node)}
                      </span>
                      {done && p.node.ret !== undefined && (
                        <motion.span initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="font-mono text-[11px] text-emerald-300">
                          ↩ {p.node.ret}
                        </motion.span>
                      )}
                      {!done && !isActive && <span className="text-[10px] text-indigo-200/60">waiting</span>}
                      {isActive && <span className="text-[10px] text-violet-200">running</span>}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
