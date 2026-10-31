"use client";

import { AnimatePresence, motion } from "motion/react";
import type { Highlights } from "@/lib/explain";
import { fmtPrim, fmtVal, valKey } from "@/lib/format";
import { nodeLabel, type Reads, seqViewFor, type Structures } from "@/lib/structures";
import type { HeapObj, Step, Val } from "@/lib/types";

export type Ctx = { step: Step; hl: Highlights; direction: number; reads?: Reads; structs?: Structures };
export type Pointer = { name: string; index: number };

const spring = { type: "spring", stiffness: 420, damping: 32 } as const;

const PRIM_COLOR: Record<string, string> = {
  int: "text-amber-300",
  long: "text-amber-300",
  float: "text-amber-300",
  double: "text-amber-300",
  bigint: "text-amber-300",
  str: "text-emerald-300",
  String: "text-emerald-300",
  string: "text-emerald-300",
  char: "text-lime-300",
  bool: "text-fuchsia-300",
  boolean: "text-fuchsia-300",
  NoneType: "text-slate-400",
  null: "text-slate-400",
  ptr: "text-sky-300",
  iter: "text-sky-300",
  uninit: "text-slate-500",
};

/** Short label for a value inside a cell. */
export function cellText(v: Val, step: Step): string {
  if (v.k === "p") return fmtPrim(v);
  const o = step.heap[v.id];
  if (o?.kind === "object") {
    const first = o.fields.find(([, x]) => x.k === "p" && x.t !== "null" && x.t !== "NoneType");
    return first ? `${o.cls}(${fmtVal(first[1], step.heap)})` : o.cls;
  }
  return fmtVal(v, step.heap, 1);
}

export function cellColor(v: Val) {
  return v.k === "p" ? PRIM_COLOR[v.t] ?? "text-slate-200" : "text-sky-300";
}

export function PrimView({ v }: { v: Val & { k: "p" } }) {
  return <span className={`font-mono text-sm ${PRIM_COLOR[v.t] ?? "text-slate-200"}`}>{fmtPrim(v)}</span>;
}

/** Stable keys for animating sequences: value + how many times it appeared before. */
function occurrenceKeys(items: Val[]): string[] {
  const seen = new Map<string, number>();
  return items.map((x) => {
    const k = valKey(x);
    const n = seen.get(k) ?? 0;
    seen.set(k, n + 1);
    return `${k}#${n}`;
  });
}

function cellTone(opts: { swap?: boolean; changed?: boolean; read?: boolean; write?: boolean; pointed?: boolean }) {
  const { swap, changed, read, write, pointed } = opts;
  const base = swap
    ? "bg-fuchsia-500/15 ring-fuchsia-400/70 shadow-[0_0_18px_rgba(217,70,239,0.35)]"
    : changed
      ? "bg-amber-400/15 ring-amber-400/70 shadow-[0_0_18px_rgba(251,191,36,0.3)]"
      : write
        ? "bg-violet-500/15 ring-violet-300/80 shadow-[0_0_16px_rgba(167,139,250,0.45)]"
      : read
        ? "bg-cyan-400/10 ring-cyan-300/70 shadow-[0_0_16px_rgba(34,211,238,0.3)]"
        : pointed
          ? "bg-cyan-400/[0.06] ring-cyan-400/30"
          : "bg-white/[0.04] ring-white/10";
  const outline = read && (swap || changed) ? " outline outline-2 outline-offset-2 outline-cyan-300/60" : "";
  return base + outline;
}

export function ValueView({
  v,
  ctx,
  pointers = [],
  ptrScope = "",
  name,
}: {
  v: Val;
  ctx: Ctx;
  pointers?: Pointer[];
  ptrScope?: string;
  name?: string;
}) {
  if (v.k === "p") return <PrimView v={v} />;
  const o = ctx.step.heap[v.id];
  if (!o) return <span className="text-slate-500">…</span>;
  return <HeapView id={v.id} o={o} ctx={ctx} pointers={pointers} ptrScope={ptrScope} name={name} />;
}

function TypeCaption({ type }: { type?: string }) {
  if (!type) return null;
  return <div className="mt-1 font-mono text-[10px] text-slate-500">{type}</div>;
}

/** Compact chip for a variable that points at a node drawn in the Structures panel. */
export function NodeChip({ id, ctx }: { id: string; ctx: Ctx }) {
  const o = ctx.step.heap[id] as HeapObj & { kind: "object" };
  return (
    <motion.span
      key={id}
      initial={{ scale: 0.85, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="inline-flex items-center gap-1.5 rounded-lg bg-sky-400/10 px-2 py-1 font-mono text-sm text-sky-200 ring-1 ring-sky-400/30"
      title="Drawn in the Structures panel"
    >
      <span className="text-sky-400">→</span>
      <span className="text-slate-400">{o.cls}</span>
      <span className="rounded bg-sky-400/20 px-1.5 text-white">{nodeLabel(o)}</span>
    </motion.span>
  );
}

function HeapView({
  id,
  o,
  ctx,
  pointers,
  ptrScope,
  name,
}: {
  id: string;
  o: HeapObj;
  ctx: Ctx;
  pointers: Pointer[];
  ptrScope: string;
  name?: string;
}) {
  switch (o.kind) {
    case "list":
    case "tuple":
    case "deque":
    case "queue":
    case "stack":
    case "pq": {
      const view = seqViewFor(name, o);
      if (view === "stack") return <StackView id={id} items={o.items} ctx={ctx} type={o.type} />;
      if (view === "queue") return <QueueView id={id} items={o.items} ctx={ctx} type={o.type} />;
      if (view === "pq") return <PQView id={id} items={o.items} ctx={ctx} type={o.type} />;
      const rows = o.items.map((x) => (x.k === "r" ? ctx.step.heap[x.id] : undefined));
      const is2D = o.items.length > 0 && rows.every((r) => r && "items" in r && r.kind !== "set");
      if (is2D) return <GridView rowIds={o.items.map((x) => (x as { id: string }).id)} ctx={ctx} type={o.type} />;
      return <ArrayView id={id} items={o.items} len={o.len} kind={o.kind} ctx={ctx} pointers={pointers} ptrScope={ptrScope} type={o.type} />;
    }
    case "set":
      return (
        <div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-[10px] font-medium uppercase tracking-wider text-slate-500">set</span>
            {o.items.length === 0 && <span className="font-mono text-sm text-slate-500">empty</span>}
            <AnimatePresence initial={false}>
              {o.items.map((x, i) => (
                <motion.span
                  key={valKey(x)}
                  layout
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.6, opacity: 0 }}
                  className={`rounded-full px-2.5 py-0.5 font-mono text-sm ring-1 ${
                    ctx.hl.cells.get(id)?.has(i) ? "bg-amber-400/15 ring-amber-400/60" : "bg-white/[0.04] ring-white/10"
                  } ${cellColor(x)}`}
                >
                  {cellText(x, ctx.step)}
                </motion.span>
              ))}
            </AnimatePresence>
          </div>
          <TypeCaption type={o.type} />
        </div>
      );
    case "dict":
      return <DictView id={id} o={o} ctx={ctx} />;
    case "object":
      if (ctx.structs?.nodeClasses.has(o.cls)) return <NodeChip id={id} ctx={ctx} />;
      return <ObjectView id={id} o={o} ctx={ctx} />;
    case "function":
      return (
        <span className="font-mono text-sm text-violet-300">
          ƒ {o.name}({o.params.join(", ")})
        </span>
      );
    case "class":
      return <span className="font-mono text-sm text-violet-300">class {o.name}</span>;
    default:
      return <span className="font-mono text-sm text-slate-300">{o.repr}</span>;
  }
}

function ArrayView({
  id,
  items,
  len,
  kind,
  ctx,
  pointers,
  ptrScope,
  type,
}: {
  id: string;
  items: Val[];
  len: number;
  kind: string;
  ctx: Ctx;
  pointers: Pointer[];
  ptrScope: string;
  type?: string;
}) {
  const texts = items.map((x) => cellText(x, ctx.step));
  const cellW = Math.min(Math.max(44, ...texts.map((t) => t.length * 8.5 + 18)), 140);
  const gap = 6;
  const changed = ctx.hl.cells.get(id);
  const reads = ctx.reads?.cells.get(id);
  const swap = ctx.hl.swapped.get(id);
  const ptrAt = new Map<number, string[]>();
  for (const p of pointers) {
    if (p.index < 0 || p.index > items.length) continue;
    ptrAt.set(p.index, [...(ptrAt.get(p.index) ?? []), p.name]);
  }
  const slots = items.length + (ptrAt.has(items.length) ? 1 : 0);

  if (items.length === 0)
    return (
      <span className="font-mono text-sm text-slate-500">
        {kind === "tuple" ? "()" : "[ ]"} <span className="text-xs">empty{type ? ` ${type}` : ` ${kind}`}</span>
      </span>
    );

  return (
    <div className="max-w-full overflow-x-auto pb-1">
      <div className="inline-flex flex-col">
        <div className="flex" style={{ gap }}>
          {items.map((_, i) => (
            <div key={i} className={`text-center font-mono text-[10px] ${reads?.has(i) ? "text-cyan-300" : "text-slate-500"}`} style={{ width: cellW }}>
              {i}
            </div>
          ))}
        </div>
        <div className="flex" style={{ gap }}>
          {items.map((x, i) => {
            const isSwap = !!swap && (swap[0] === i || swap[1] === i);
            let fromX = 0;
            if (swap && ctx.direction > 0) {
              if (i === swap[0]) fromX = (swap[1] - swap[0]) * (cellW + gap);
              if (i === swap[1]) fromX = (swap[0] - swap[1]) * (cellW + gap);
            }
            return (
              <div
                key={i}
                style={{ width: cellW }}
                className={`relative grid h-11 place-items-center rounded-lg ring-1 transition-all duration-300 ${cellTone({
                  swap: isSwap,
                  changed: changed?.has(i),
                  read: reads?.has(i),
                  write: ctx.reads?.writes.get(id)?.has(i),
                  pointed: ptrAt.has(i),
                })}`}
              >
                <motion.span
                  key={valKey(x)}
                  initial={fromX ? { x: fromX, y: -14 } : { y: -8, opacity: 0 }}
                  animate={{ x: 0, y: 0, opacity: 1 }}
                  transition={spring}
                  className={`relative z-10 truncate px-1 font-mono text-sm font-medium ${cellColor(x)}`}
                  title={texts[i]}
                >
                  {texts[i]}
                </motion.span>
              </div>
            );
          })}
        </div>
        {kind === "deque" || len > items.length ? (
          <div className="mt-1 text-[10px] text-slate-500">
            {kind === "deque" ? "deque " : ""}
            {len > items.length ? `showing ${items.length} of ${len}` : ""}
          </div>
        ) : null}
        {pointers.length > 0 && (
          <div className="flex" style={{ gap, minHeight: 30 }}>
            {Array.from({ length: slots }, (_, i) => (
              <div key={i} className="flex flex-col items-center gap-0.5 pt-1" style={{ width: cellW }}>
                {(ptrAt.get(i) ?? []).map((n) => (
                  <motion.div key={n} layoutId={`ptr-${ptrScope}-${n}`} transition={spring} className="flex flex-col items-center">
                    <span className="text-[10px] leading-none text-cyan-300">▲</span>
                    <span className="rounded-md bg-cyan-400/15 px-1.5 font-mono text-[11px] text-cyan-200 ring-1 ring-cyan-400/30">{n}</span>
                  </motion.div>
                ))}
              </div>
            ))}
          </div>
        )}
        <TypeCaption type={type} />
      </div>
    </div>
  );
}

function GridView({ rowIds, ctx, type }: { rowIds: string[]; ctx: Ctx; type?: string }) {
  const rows = rowIds.map((rid) => ctx.step.heap[rid] as { items: Val[] });
  const cols = Math.max(...rows.map((r) => r.items.length));
  const texts = rows.flatMap((r) => r.items.map((x) => cellText(x, ctx.step)));
  const cellW = Math.min(Math.max(38, ...texts.map((t) => t.length * 8.5 + 16)), 110);
  // which row / column is being read (for header glow)
  const readRows = new Set<number>();
  const readCols = new Set<number>();
  rowIds.forEach((rid, i) => {
    const r = ctx.reads?.cells.get(rid);
    if (r?.size) {
      readRows.add(i);
      r.forEach((j) => readCols.add(j));
    }
  });
  return (
    <div className="max-w-full overflow-x-auto pb-1">
      <table className="border-separate" style={{ borderSpacing: 4 }}>
        <thead>
          <tr>
            <th />
            {Array.from({ length: cols }, (_, j) => (
              <th key={j} className={`font-mono text-[10px] font-normal ${readCols.has(j) ? "text-cyan-300" : "text-slate-500"}`}>
                {j}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={rowIds[i] + i}>
              <td className={`pr-1 text-right font-mono text-[10px] ${readRows.has(i) ? "text-cyan-300" : "text-slate-500"}`}>{i}</td>
              {r.items.map((x, j) => (
                <td key={j} style={{ width: cellW, minWidth: cellW }}>
                  <div
                    className={`grid h-10 place-items-center rounded-lg ring-1 transition-all duration-300 ${cellTone({
                      changed: ctx.hl.cells.get(rowIds[i])?.has(j),
                      read: ctx.reads?.cells.get(rowIds[i])?.has(j),
                      write: ctx.reads?.writes.get(rowIds[i])?.has(j),
                    })}`}
                  >
                    <motion.span
                      key={valKey(x)}
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={spring}
                      className={`font-mono text-sm ${cellColor(x)}`}
                    >
                      {cellText(x, ctx.step)}
                    </motion.span>
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {(readRows.size > 0 || rowIds.some((rid) => ctx.reads?.writes.get(rid)?.size)) && (
        <div className="mt-1.5 flex flex-wrap gap-3 text-[10px] text-slate-400">
          <span className="flex items-center gap-1">
            <span className="size-2.5 rounded-sm bg-cyan-400/30 ring-1 ring-cyan-300" /> being read
          </span>
          <span className="flex items-center gap-1">
            <span className="size-2.5 rounded-sm bg-violet-500/30 ring-1 ring-violet-300" /> being written
          </span>
          <span className="flex items-center gap-1">
            <span className="size-2.5 rounded-sm bg-amber-400/30 ring-1 ring-amber-400" /> just changed
          </span>
        </div>
      )}
      <TypeCaption type={type} />
    </div>
  );
}

function StackView({ id, items, ctx, type }: { id: string; items: Val[]; ctx: Ctx; type?: string }) {
  const keys = occurrenceKeys(items);
  const changed = ctx.hl.cells.get(id);
  const shown = items.length > 12 ? items.length - 12 : 0;
  return (
    <div className="inline-flex flex-col items-start">
      <div className="relative flex min-w-24 flex-col-reverse gap-1 rounded-b-xl border-x-2 border-b-2 border-violet-400/40 bg-violet-500/[0.04] p-1.5 pt-6">
        {items.length === 0 && <div className="px-3 py-2 text-center text-xs text-slate-500">empty stack</div>}
        <AnimatePresence initial={false} mode="popLayout">
          {items.map((x, i) =>
            i < shown ? null : (
              <motion.div
                key={keys[i]}
                layout
                initial={{ opacity: 0, y: -28, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -36, scale: 0.9, transition: { duration: 0.25 } }}
                transition={spring}
                className={`relative flex h-9 items-center justify-center rounded-md px-3 ring-1 ${
                  i === items.length - 1 ? "bg-violet-400/20 ring-violet-300/60 shadow-[0_0_14px_rgba(167,139,250,0.4)]" : changed?.has(i) ? "bg-amber-400/15 ring-amber-400/60" : "bg-white/[0.05] ring-white/10"
                }`}
              >
                <span className={`font-mono text-sm ${cellColor(x)}`}>{cellText(x, ctx.step)}</span>
                {i === items.length - 1 && (
                  <span className="absolute -right-12 rounded bg-violet-400/20 px-1.5 text-[10px] font-semibold uppercase tracking-wider text-violet-200">top</span>
                )}
              </motion.div>
            ),
          )}
        </AnimatePresence>
        {shown > 0 && <div className="text-center text-[10px] text-slate-500">+{shown} below</div>}
      </div>
      <TypeCaption type={type ?? "stack"} />
    </div>
  );
}

function QueueView({ id, items, ctx, type }: { id: string; items: Val[]; ctx: Ctx; type?: string }) {
  const keys = occurrenceKeys(items);
  const changed = ctx.hl.cells.get(id);
  const visible = items.slice(0, 16);
  return (
    <div className="max-w-full overflow-x-auto pb-1">
      <div className="inline-flex flex-col">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-300">front</span>
          <div className="flex min-h-11 items-center gap-1.5 rounded-xl border-y-2 border-emerald-400/30 bg-emerald-500/[0.04] px-2 py-1">
            {items.length === 0 && <span className="px-2 text-xs text-slate-500">empty queue</span>}
            <AnimatePresence initial={false} mode="popLayout">
              {visible.map((x, i) => (
                <motion.div
                  key={keys[i]}
                  layout
                  initial={{ opacity: 0, x: 30, scale: 0.9 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -30, scale: 0.9, transition: { duration: 0.25 } }}
                  transition={spring}
                  className={`grid h-9 min-w-10 place-items-center rounded-md px-2 ring-1 ${
                    i === 0
                      ? "bg-emerald-400/20 ring-emerald-300/60 shadow-[0_0_14px_rgba(52,211,153,0.35)]"
                      : changed?.has(i)
                        ? "bg-amber-400/15 ring-amber-400/60"
                        : "bg-white/[0.05] ring-white/10"
                  }`}
                >
                  <span className={`font-mono text-sm ${cellColor(x)}`}>{cellText(x, ctx.step)}</span>
                </motion.div>
              ))}
            </AnimatePresence>
            {items.length > visible.length && <span className="text-xs text-slate-500">+{items.length - visible.length}</span>}
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">rear</span>
        </div>
        <TypeCaption type={type ?? "queue"} />
      </div>
    </div>
  );
}

function PQView({ id, items, ctx, type }: { id: string; items: Val[]; ctx: Ctx; type?: string }) {
  const n = Math.min(items.length, 31);
  const levels = n ? Math.floor(Math.log2(n)) + 1 : 0;
  const W = Math.max(1, 2 ** (levels - 1)) * 46;
  const H = levels * 52;
  const pos = (i: number) => {
    const lvl = Math.floor(Math.log2(i + 1));
    const idx = i + 1 - 2 ** lvl;
    return { x: ((idx + 0.5) * W) / 2 ** lvl, y: lvl * 52 + 20 };
  };
  const changed = ctx.hl.cells.get(id);
  if (items.length === 0) return <span className="font-mono text-sm text-slate-500">empty heap {type && <span className="text-xs">({type})</span>}</span>;
  return (
    <div className="max-w-full overflow-x-auto pb-1">
      <div className="relative" style={{ width: W, height: H }}>
        <svg width={W} height={H} className="absolute inset-0">
          {Array.from({ length: n }, (_, i) => {
            if (i === 0) return null;
            const a = pos(i);
            const b = pos(Math.floor((i - 1) / 2));
            return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="rgba(148,163,184,0.35)" strokeWidth={1.5} />;
          })}
        </svg>
        {Array.from({ length: n }, (_, i) => {
          const p = pos(i);
          const x = items[i];
          return (
            <motion.div
              key={i}
              initial={false}
              animate={{ left: p.x - 17, top: p.y - 17 }}
              className={`absolute grid size-[34px] place-items-center rounded-full ring-1 ${
                i === 0 ? "bg-violet-400/25 ring-violet-300/70 shadow-[0_0_14px_rgba(167,139,250,0.5)]" : changed?.has(i) ? "bg-amber-400/20 ring-amber-400/60" : "bg-slate-800/80 ring-white/15"
              }`}
            >
              <motion.span key={valKey(x)} initial={{ scale: 0.4 }} animate={{ scale: 1 }} className={`font-mono text-xs ${cellColor(x)}`}>
                {cellText(x, ctx.step)}
              </motion.span>
            </motion.div>
          );
        })}
      </div>
      <div className="mt-1 flex gap-1">
        {items.slice(0, 31).map((x, i) => (
          <span key={i} className={`rounded px-1.5 py-0.5 font-mono text-[11px] ring-1 ${i === 0 ? "bg-violet-400/15 text-violet-100 ring-violet-400/40" : "bg-white/[0.03] text-slate-300 ring-white/10"}`}>
            {cellText(x, ctx.step)}
          </span>
        ))}
      </div>
      <TypeCaption type={`${type ?? "heap"} · top = index 0`} />
    </div>
  );
}

function DictView({ id, o, ctx }: { id: string; o: HeapObj & { kind: "dict" }; ctx: Ctx }) {
  const hot = ctx.hl.keys.get(id);
  const reads = ctx.reads?.keys.get(id);
  if (o.entries.length === 0)
    return (
      <span className="font-mono text-sm text-slate-500">
        {"{ }"} <span className="text-xs">empty {o.type ?? "dict"}</span>
      </span>
    );
  return (
    <div>
      <div className="inline-flex flex-col gap-1 rounded-xl bg-white/[0.02] p-1.5 ring-1 ring-white/[0.08]">
        <AnimatePresence initial={false}>
          {o.entries.map(([k, v]) => {
            const kk = valKey(k);
            return (
              <motion.div
                key={kk}
                layout
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className={`flex items-center gap-2 rounded-lg px-2 py-1 transition-colors duration-300 ${
                  hot?.has(kk) ? "bg-amber-400/15 ring-1 ring-amber-400/60" : reads?.has(kk) ? "bg-cyan-400/10 ring-1 ring-cyan-300/60" : ""
                }`}
              >
                <span className={`font-mono text-sm ${cellColor(k)}`}>{cellText(k, ctx.step)}</span>
                <span className="text-slate-500">→</span>
                <span className={`font-mono text-sm ${cellColor(v)}`}>{cellText(v, ctx.step)}</span>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
      <TypeCaption type={o.type} />
    </div>
  );
}

function ObjectView({ id, o, ctx }: { id: string; o: HeapObj & { kind: "object" }; ctx: Ctx }) {
  const hot = ctx.hl.keys.get(id);
  return (
    <div className="inline-flex min-w-36 flex-col rounded-xl bg-sky-400/[0.05] ring-1 ring-sky-400/25">
      <div className="border-b border-sky-400/20 px-2.5 py-1 font-mono text-xs text-sky-300">{o.cls}</div>
      <div className="flex flex-col gap-0.5 p-1.5">
        {o.fields.length === 0 && <span className="px-1 text-xs text-slate-500">no fields yet</span>}
        {o.fields.map(([name, v]) => (
          <div
            key={name}
            className={`flex items-start gap-2 rounded-md px-1.5 py-0.5 transition-colors duration-300 ${
              hot?.has(name) ? "bg-amber-400/15 ring-1 ring-amber-400/60" : ""
            }`}
          >
            <span className="pt-0.5 font-mono text-xs text-slate-400">{name}</span>
            {v.k === "r" && ctx.step.heap[v.id]?.kind !== "object" ? (
              <ValueView v={v} ctx={ctx} name={name} />
            ) : (
              <span className={`font-mono text-sm ${cellColor(v)}`}>{v.k === "r" ? `→ ${cellText(v, ctx.step)}` : cellText(v, ctx.step)}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
