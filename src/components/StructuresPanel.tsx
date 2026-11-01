"use client";

import { Network } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { fmtPrim } from "@/lib/format";
import type { GraphStructure, ListStructure, NaryStructure, Structures, TreeStructure } from "@/lib/structures";
import type { HeapObj, Step } from "@/lib/types";
import type { Ctx } from "./Values";

const spring = { type: "spring", stiffness: 380, damping: 30 } as const;
type Obj = HeapObj & { kind: "object" };

export function hasStructures(s: Structures) {
  return s.lists.some((l) => l.chains.length) || s.trees.some((t) => t.roots.length) || s.narys.some((t) => t.roots.length) || s.graphs.length > 0;
}

export function StructuresPanel({ structs, ctx }: { structs: Structures; ctx: Ctx }) {
  return (
    <div className="panel min-w-0 p-4">
      <div className="panel-title mb-3">
        <Network className="size-3.5" /> Data structures
      </div>
      <motion.div layoutRoot className="flex flex-col gap-5">
        {structs.lists.map((l) => (
          <ListView key={l.cls} list={l} structs={structs} ctx={ctx} />
        ))}
        {structs.trees.map((t) => (
          <TreeView key={t.cls} tree={t} structs={structs} ctx={ctx} />
        ))}
        {structs.narys.map((t) => (
          <NaryView key={t.cls} tree={t} structs={structs} ctx={ctx} />
        ))}
        {structs.graphs.map((g) => (
          <GraphView key={g.name} g={g} />
        ))}
      </motion.div>
    </div>
  );
}

function Badges({ names, below }: { names: string[]; below?: boolean }) {
  if (!names.length) return null;
  return (
    <div className={`pointer-events-none absolute left-1/2 flex -translate-x-1/2 gap-1 ${below ? "top-full mt-1.5" : "bottom-full mb-1.5"}`}>
      {names.map((n) => (
        <motion.span
          key={n}
          layoutId={`badge-${n}`}
          transition={spring}
          className="whitespace-nowrap rounded-md bg-cyan-400/15 px-1.5 py-0.5 font-mono text-[11px] text-cyan-200 ring-1 ring-cyan-400/40"
        >
          {n}
        </motion.span>
      ))}
    </div>
  );
}

function nullText(step: Step) {
  for (const o of Object.values(step.heap)) {
    if (o.kind !== "object") continue;
    for (const [, v] of o.fields) if (v.k === "p" && (v.t === "null" || v.t === "NoneType")) return fmtPrim(v);
  }
  for (const f of step.stack) for (const [, v] of f.vars) if (v.k === "p" && (v.t === "null" || v.t === "NoneType")) return fmtPrim(v);
  return "null";
}

// ---------------------------------------------------------------- linked list

function ListView({ list, structs, ctx }: { list: ListStructure; structs: Structures; ctx: Ctx }) {
  const nul = nullText(ctx.step);
  const top = ctx.step.stack[ctx.step.stack.length - 1];
  const nullVars = (top?.vars ?? []).filter(([, v]) => v.k === "p" && (v.t === "null" || v.t === "NoneType")).map(([n]) => n);
  return (
    <div>
      <div className="mb-2 flex items-center gap-2 text-xs text-slate-400">
        <span className="rounded-md bg-sky-400/10 px-2 py-0.5 font-mono text-sky-300 ring-1 ring-sky-400/20">{list.cls}</span>
        {list.doubly ? "Doubly linked list" : "Linked list"}
        {list.chains.length > 1 && <span className="text-slate-500">· {list.chains.length} separate chains</span>}
      </div>
      <div className="flex flex-col gap-10 overflow-x-auto pb-1 pt-8">
        {list.chains.map((chain, ci) => (
          <div key={chain[0] ?? ci} className="flex items-center">
            <AnimatePresence initial={false} mode="popLayout">
              {chain.map((id) => {
                const o = ctx.step.heap[id] as Obj;
                const names = structs.badges.get(id) ?? [];
                const hot = ctx.hl.keys.get(id);
                const active = names.length > 0;
                return (
                  <motion.div key={id} layout transition={spring} initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.7 }} className="flex items-center">
                    <div className="relative">
                      <Badges names={names} />
                      <div
                        className={`flex h-11 items-stretch overflow-hidden rounded-xl ring-1 transition-all duration-300 ${
                          hot?.size
                            ? "ring-amber-400/70 shadow-[0_0_18px_rgba(251,191,36,0.35)]"
                            : active
                              ? "ring-cyan-300/60 shadow-[0_0_16px_rgba(34,211,238,0.25)]"
                              : "ring-white/15"
                        }`}
                      >
                        <div className="grid min-w-11 place-items-center bg-sky-400/10 px-2.5 font-mono text-sm font-semibold text-white">{structs.nodes.get(id)?.label}</div>
                        <div className={`grid w-7 place-items-center border-l border-white/10 ${hot?.has(list.nextField) ? "bg-amber-400/20" : "bg-white/[0.03]"}`}>
                          <span className="size-1.5 rounded-full bg-sky-300" />
                        </div>
                      </div>
                    </div>
                    <Arrow doubly={list.doubly} hot={!!hot?.has(list.nextField)} />
                    {/* tail: show null after the last node */}
                    {id === chain[chain.length - 1] && (
                      <div className="relative">
                        <Badges names={nullVars} />
                        <span className="rounded-md bg-white/[0.04] px-2 py-1 font-mono text-xs text-slate-500 ring-1 ring-white/10">
                          {nextTarget(o, list) ? `→ ${structs.nodes.get(nextTarget(o, list)!)?.label ?? "…"}` : nul}
                        </span>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </div>
  );
}

/** When a chain stops at a node that is already drawn (a cycle or a join), where it points. */
function nextTarget(o: Obj, list: ListStructure): string | undefined {
  const v = o.fields.find(([n]) => n === list.nextField)?.[1];
  return v?.k === "r" ? v.id : undefined;
}

function Arrow({ doubly, hot }: { doubly: boolean; hot: boolean }) {
  return (
    <svg width="34" height="16" viewBox="0 0 34 16" className="mx-0.5 shrink-0">
      <motion.path
        d="M2 8 H28"
        stroke={hot ? "#fbbf24" : "#7dd3fc"}
        strokeWidth="2"
        fill="none"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.35 }}
      />
      <path d="M24 3 L31 8 L24 13" stroke={hot ? "#fbbf24" : "#7dd3fc"} strokeWidth="2" fill="none" />
      {doubly && <path d="M10 3 L3 8 L10 13" stroke="#7dd3fc" strokeWidth="2" fill="none" opacity="0.6" />}
    </svg>
  );
}

// ---------------------------------------------------------------- binary tree

type Placed = { id: string; x: number; y: number; parent?: string; side?: "L" | "R" };

function layoutTree(root: string, tree: TreeStructure, step: Step): Placed[] {
  const out: Placed[] = [];
  let col = 0;
  const seen = new Set<string>();
  const walk = (id: string | undefined, depth: number, parent?: string, side?: "L" | "R") => {
    if (!id || seen.has(id) || depth > 12) return;
    const o = step.heap[id];
    if (o?.kind !== "object") return;
    seen.add(id);
    const ref = (f: string) => {
      const v = o.fields.find(([n]) => n === f)?.[1];
      return v?.k === "r" ? v.id : undefined;
    };
    walk(ref(tree.leftField), depth + 1, id, "L");
    out.push({ id, x: col++, y: depth, parent, side });
    walk(ref(tree.rightField), depth + 1, id, "R");
  };
  walk(root, 0);
  return out;
}

function TreeView({ tree, structs, ctx }: { tree: TreeStructure; structs: Structures; ctx: Ctx }) {
  const DX = 50;
  const DY = 66;
  const R = 20;
  return (
    <div>
      <div className="mb-2 flex items-center gap-2 text-xs text-slate-400">
        <span className="rounded-md bg-emerald-400/10 px-2 py-0.5 font-mono text-emerald-300 ring-1 ring-emerald-400/20">{tree.cls}</span>
        Binary tree
        {tree.roots.length > 1 && <span className="text-slate-500">· {tree.roots.length} parts (some nodes not linked yet)</span>}
      </div>
      <div className="flex flex-wrap [justify-content:safe_center] gap-6 overflow-x-auto pb-2 pt-7">
        {tree.roots.map((root) => {
          const placed = layoutTree(root, tree, ctx.step);
          const cols = Math.max(1, ...placed.map((p) => p.x + 1));
          const rows = Math.max(1, ...placed.map((p) => p.y + 1));
          const W = cols * DX + 20;
          const H = rows * DY + 30;
          const at = new Map(placed.map((p) => [p.id, p]));
          const cx = (p: Placed) => p.x * DX + DX / 2 + 10;
          const cy = (p: Placed) => p.y * DY + 34;
          return (
            <div key={root} className="relative shrink-0" style={{ width: W, height: H }}>
              <svg width={W} height={H} className="absolute inset-0 overflow-visible">
                <AnimatePresence>
                  {placed.map((p) => {
                    const par = p.parent ? at.get(p.parent) : undefined;
                    if (!par) return null;
                    const hot = ctx.hl.keys.get(par.id)?.has(p.side === "L" ? tree.leftField : tree.rightField);
                    return (
                      <motion.line
                        key={`${par.id}-${p.id}`}
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: 1, x1: cx(par), y1: cy(par), x2: cx(p), y2: cy(p) }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.4 }}
                        stroke={hot ? "#fbbf24" : "rgba(148,163,184,0.45)"}
                        strokeWidth={hot ? 2.5 : 1.75}
                      />
                    );
                  })}
                </AnimatePresence>
              </svg>
              <AnimatePresence>
                {placed.map((p) => {
                  const names = structs.badges.get(p.id) ?? [];
                  const hot = ctx.hl.keys.get(p.id)?.size;
                  return (
                    <motion.div
                      key={p.id}
                      initial={{ opacity: 0, scale: 0.3, left: cx(p) - R, top: cy(p) - R }}
                      animate={{ opacity: 1, scale: 1, left: cx(p) - R, top: cy(p) - R }}
                      exit={{ opacity: 0, scale: 0.3 }}
                      transition={spring}
                      className="absolute"
                      style={{ width: R * 2, height: R * 2 }}
                    >
                      <Badges names={names} />
                      <div
                        className={`grid size-full place-items-center rounded-full font-mono text-sm font-semibold text-white ring-2 transition-all duration-300 ${
                          hot
                            ? "bg-amber-400/25 ring-amber-300 shadow-[0_0_18px_rgba(251,191,36,0.45)]"
                            : names.length
                              ? "bg-cyan-400/20 ring-cyan-300 shadow-[0_0_18px_rgba(34,211,238,0.4)]"
                              : "bg-emerald-500/15 ring-emerald-400/50"
                        }`}
                      >
                        {structs.nodes.get(p.id)?.label}
                      </div>
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

// ---------------------------------------------------------------- trie / n-ary tree

type NPlaced = { id: string; x: number; y: number; parent?: string };

function layoutNary(root: string, tree: NaryStructure): NPlaced[] {
  const out: NPlaced[] = [];
  const seen = new Set<string>();
  const place = (id: string, depth: number, left: number, parent?: string): number => {
    seen.add(id);
    const kids = (tree.children.get(id) ?? []).filter((k) => !seen.has(k));
    if (!kids.length || depth > 14) {
      out.push({ id, x: left, y: depth, parent });
      return left + 1;
    }
    let cur = left;
    const start = out.length;
    for (const k of kids) cur = place(k, depth + 1, cur, id);
    const xs = out.slice(start).filter((p) => p.y === depth + 1).map((p) => p.x);
    out.push({ id, x: (Math.min(...xs) + Math.max(...xs)) / 2, y: depth, parent });
    return cur;
  };
  place(root, 0, 0);
  return out;
}

function NaryView({ tree, structs, ctx }: { tree: NaryStructure; structs: Structures; ctx: Ctx }) {
  const DX = 46;
  const DY = 62;
  const R = 17;
  const isEnd = (id: string) => {
    if (!tree.endField) return false;
    const o = ctx.step.heap[id];
    const v = o?.kind === "object" ? o.fields.find(([n]) => n === tree.endField)?.[1] : undefined;
    return !!v && v.k === "p" && (v.v === true || v.v === 1);
  };
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-slate-400">
        <span className="rounded-md bg-fuchsia-400/10 px-2 py-0.5 font-mono text-fuchsia-300 ring-1 ring-fuchsia-400/20">{tree.cls}</span>
        {tree.trie ? "Trie (prefix tree)" : "Tree"} · {structs.nodes.size ? [...structs.nodes.values()].filter((n) => n.cls === tree.cls).length : 0} nodes
        {tree.trie && tree.endField && (
          <span className="flex items-center gap-1 text-slate-500">
            · <span className="size-2.5 rounded-full ring-2 ring-emerald-300" /> end of a word
          </span>
        )}
      </div>
      <div className="flex flex-wrap [justify-content:safe_center] gap-6 overflow-x-auto pb-2 pt-7">
        {tree.roots.map((root) => {
          const placed = layoutNary(root, tree);
          const cols = Math.max(1, ...placed.map((p) => p.x + 1));
          const rows = Math.max(1, ...placed.map((p) => p.y + 1));
          const W = cols * DX + 16;
          const H = rows * DY + 10;
          const at = new Map(placed.map((p) => [p.id, p]));
          const cx = (p: NPlaced) => p.x * DX + DX / 2 + 8;
          const cy = (p: NPlaced) => p.y * DY + R + 4;
          return (
            <div key={root} className="relative shrink-0" style={{ width: W, height: H }}>
              <svg width={W} height={H} className="absolute inset-0 overflow-visible">
                {placed.map((p) => {
                  const par = p.parent ? at.get(p.parent) : undefined;
                  if (!par) return null;
                  return (
                    <motion.line
                      key={`${par.id}-${p.id}`}
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={{ pathLength: 1, opacity: 1, x1: cx(par), y1: cy(par), x2: cx(p), y2: cy(p) }}
                      transition={{ duration: 0.35 }}
                      stroke="rgba(148,163,184,0.45)"
                      strokeWidth={1.75}
                    />
                  );
                })}
              </svg>
              <AnimatePresence>
                {placed.map((p) => {
                  const names = structs.badges.get(p.id) ?? [];
                  const hot = ctx.hl.keys.get(p.id)?.size;
                  const end = isEnd(p.id);
                  const label = p.parent ? (structs.nodes.get(p.id)?.label ?? "") : tree.trie ? "•" : (structs.nodes.get(p.id)?.label ?? "");
                  return (
                    <motion.div
                      key={p.id}
                      initial={{ opacity: 0, scale: 0.3, left: cx(p) - R, top: cy(p) - R }}
                      animate={{ opacity: 1, scale: 1, left: cx(p) - R, top: cy(p) - R }}
                      exit={{ opacity: 0, scale: 0.3 }}
                      transition={spring}
                      className="absolute"
                      style={{ width: R * 2, height: R * 2 }}
                    >
                      <Badges names={names} />
                      <div
                        className={`grid size-full place-items-center rounded-full font-mono text-sm font-semibold text-white ring-2 transition-all duration-300 ${
                          hot
                            ? "bg-amber-400/25 ring-amber-300 shadow-[0_0_18px_rgba(251,191,36,0.45)]"
                            : names.length
                              ? "bg-cyan-400/20 ring-cyan-300 shadow-[0_0_18px_rgba(34,211,238,0.4)]"
                              : end
                                ? "bg-emerald-500/30 ring-emerald-300 shadow-[0_0_0_3px_rgba(16,185,129,0.25)]"
                                : "bg-fuchsia-500/10 ring-fuchsia-400/40"
                        }`}
                        title={end ? "End of a word" : undefined}
                      >
                        {label}
                      </div>
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

// ---------------------------------------------------------------- graph

const NODE_STYLE = {
  current: { fill: "rgba(139,92,246,0.45)", stroke: "#c4b5fd", glow: "drop-shadow(0 0 8px rgba(167,139,250,0.9))" },
  neighbor: { fill: "rgba(34,211,238,0.3)", stroke: "#67e8f9", glow: "drop-shadow(0 0 6px rgba(34,211,238,0.8))" },
  frontier: { fill: "rgba(251,191,36,0.28)", stroke: "#fcd34d", glow: "none" },
  visited: { fill: "rgba(16,185,129,0.3)", stroke: "#6ee7b7", glow: "none" },
  idle: { fill: "rgba(30,41,59,0.9)", stroke: "rgba(148,163,184,0.5)", glow: "none" },
} as const;

function GraphView({ g }: { g: GraphStructure }) {
  const n = g.nodes.length;
  const R = Math.max(70, n * 15);
  const size = R * 2 + 60;
  const c = size / 2;
  const pos = new Map(g.nodes.map((id, i) => {
    const a = -Math.PI / 2 + (2 * Math.PI * i) / n;
    return [id, { x: c + R * Math.cos(a), y: c + R * Math.sin(a) }];
  }));
  const status = (id: string): keyof typeof NODE_STYLE =>
    id === g.current ? "current" : id === g.neighbor ? "neighbor" : g.frontier.has(id) ? "frontier" : g.visited.has(id) ? "visited" : "idle";
  const nr = 17;
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-slate-400">
        <span className="rounded-md bg-violet-400/10 px-2 py-0.5 font-mono text-violet-300 ring-1 ring-violet-400/20">{g.name}</span>
        {g.directed ? "Directed graph" : "Graph"} · {n} nodes · {g.edges.length} edges
      </div>
      <div className="flex flex-wrap items-start gap-4">
        <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-[340px] shrink-0">
          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="rgba(148,163,184,0.7)" />
            </marker>
          </defs>
          {g.edges.map(([a, b]) => {
            const p = pos.get(a)!;
            const q = pos.get(b)!;
            if (!p || !q || a === b) return null;
            const dx = q.x - p.x;
            const dy = q.y - p.y;
            const d = Math.hypot(dx, dy) || 1;
            const x2 = q.x - (dx / d) * (nr + 3);
            const y2 = q.y - (dy / d) * (nr + 3);
            const active = (a === g.current && b === g.neighbor) || (!g.directed && b === g.current && a === g.neighbor);
            return (
              <motion.line
                key={`${a}-${b}`}
                x1={p.x}
                y1={p.y}
                x2={g.directed ? x2 : q.x}
                y2={g.directed ? y2 : q.y}
                animate={{ stroke: active ? "#67e8f9" : "rgba(148,163,184,0.35)", strokeWidth: active ? 3.5 : 1.75 }}
                markerEnd={g.directed ? "url(#arrow)" : undefined}
              />
            );
          })}
          {g.nodes.map((id) => {
            const p = pos.get(id)!;
            const st = NODE_STYLE[status(id)];
            return (
              <g key={id} style={{ filter: st.glow }}>
                <motion.circle cx={p.x} cy={p.y} r={nr} animate={{ fill: st.fill, stroke: st.stroke, scale: id === g.current ? 1.15 : 1 }} strokeWidth={2} transition={{ duration: 0.3 }} style={{ transformOrigin: `${p.x}px ${p.y}px` }} />
                <text x={p.x} y={p.y + 4.5} textAnchor="middle" className="fill-white font-mono text-[13px] font-semibold">
                  {id}
                </text>
              </g>
            );
          })}
        </svg>
        <div className="flex flex-col gap-1.5 text-xs text-slate-300">
          {(
            [
              ["current", "Current node"],
              ["neighbor", "Neighbor being checked"],
              ["frontier", "Waiting in queue / stack"],
              ["visited", "Visited"],
              ["idle", "Not visited yet"],
            ] as const
          ).map(([k, label]) => (
            <div key={k} className="flex items-center gap-2">
              <span className="size-3 rounded-full ring-2" style={{ background: NODE_STYLE[k].fill, boxShadow: `0 0 0 2px ${NODE_STYLE[k].stroke}` }} />
              {label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
