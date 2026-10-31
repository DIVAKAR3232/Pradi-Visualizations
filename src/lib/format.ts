import { type Heap, type HeapObj, SEQ_KINDS, type Step, type Val } from "./types";

export function fmtPrim(v: Val & { k: "p" }): string {
  if (v.t === "str" || v.t === "char") return `'${v.v}'`;
  if (v.t === "String" || v.t === "string") return `"${v.v}"`;
  if (v.t === "NoneType") return "None";
  if (v.t === "bool") return v.v ? "True" : "False";
  if (v.t === "boolean") return v.v ? "true" : "false";
  if (v.t === "double" || v.t === "float") {
    const n = Number(v.v);
    return Number.isInteger(n) ? n.toFixed(1) : String(+n.toPrecision(10));
  }
  return String(v.v);
}

export function fmtVal(v: Val | undefined, heap: Heap, depth = 0): string {
  if (!v) return "?";
  if (v.k === "p") return fmtPrim(v);
  const o = heap[v.id];
  if (!o) return "…";
  if (depth > 2) return "…";
  switch (o.kind) {
    case "list":
    case "tuple":
    case "set":
    case "deque":
    case "queue":
    case "stack":
    case "pq": {
      const [l, r] = o.kind === "tuple" ? ["(", ")"] : o.kind === "set" ? ["{", "}"] : ["[", "]"];
      const items = o.items.slice(0, 8).map((x) => fmtVal(x, heap, depth + 1));
      if (o.len > 8) items.push("…");
      return `${l}${items.join(", ")}${r}`;
    }
    case "dict": {
      const items = o.entries.slice(0, 6).map(([a, b]) => `${fmtVal(a, heap, depth + 1)}: ${fmtVal(b, heap, depth + 1)}`);
      if (o.len > 6) items.push("…");
      return `{${items.join(", ")}}`;
    }
    case "object":
      return depth > 0 ? `${o.cls}(…)` : `${o.cls}(${o.fields.map(([k, x]) => `${k}=${fmtVal(x, heap, depth + 1)}`).join(", ")})`;
    case "function":
      return `function ${o.name}(${o.params.join(", ")})`;
    case "class":
      return `class ${o.name}`;
    default:
      return o.repr;
  }
}

/** A stable key for comparing values between steps. */
export function valKey(v: Val | undefined): string {
  if (!v) return "";
  return v.k === "p" ? `${v.t}:${v.v}` : `ref:${v.id}`;
}

export function heapObj(v: Val | undefined, heap: Heap): HeapObj | undefined {
  return v && v.k === "r" ? heap[v.id] : undefined;
}

/** Find a readable name for a heap object, like `arr`, `grid[2]` or `head.next`. */
export function nameOf(id: string, step: Step): string | undefined {
  const frames = [...step.stack].reverse();
  for (const f of frames) for (const [n, v] of f.vars) if (v.k === "r" && v.id === id) return n;
  for (const f of frames) {
    for (const [n, v] of f.vars) {
      const o = heapObj(v, step.heap);
      if (!o) continue;
      if (SEQ_KINDS.has(o.kind) && "items" in o) {
        const i = o.items.findIndex((x) => x.k === "r" && x.id === id);
        if (i >= 0) return `${n}[${i}]`;
      } else if (o.kind === "object") {
        const fld = o.fields.find(([, x]) => x.k === "r" && x.id === id);
        if (fld) return `${n}.${fld[0]}`;
      } else if (o.kind === "dict") {
        const e = o.entries.find(([, x]) => x.k === "r" && x.id === id);
        if (e) return `${n}[${fmtVal(e[0], step.heap)}]`;
      }
    }
  }
  return undefined;
}

const KEYWORDS = new Set(
  "and or not in is if elif else while for def return True False None lambda class pass break continue import from as with try except finally raise yield global nonlocal assert del len range print int str float list dict set tuple min max abs sum sorted true false null nullptr NULL new this length size".split(" "),
);

/** Replace simple variables in an expression with their current values: `i < n` → `2 < 5`. */
export function substitute(expr: string, step: Step): string {
  const frame = step.stack[step.stack.length - 1];
  const globals = step.stack[0];
  const lookup = (name: string) =>
    frame?.vars.find(([n]) => n === name)?.[1] ?? globals?.vars.find(([n]) => n === name)?.[1];
  const indexValue = (raw: string): Val | undefined => {
    const m = raw.trim().match(/^(-?\d+)$|^([A-Za-z_]\w*)\s*(?:([+-])\s*(\d+))?$/);
    if (!m) return undefined;
    if (m[1]) return { k: "p", t: "int", v: Number(m[1]) };
    const base = lookup(m[2]);
    if (!base || base.k !== "p") return undefined;
    if (!m[3]) return base;
    if (base.t !== "int") return undefined;
    return { k: "p", t: "int", v: Number(base.v) + (m[3] === "+" ? 1 : -1) * Number(m[4]) };
  };
  const subscript = (cont: Val | undefined, key: Val | undefined): Val | undefined => {
    const o = heapObj(cont, step.heap);
    if (!o || !key) return undefined;
    if (SEQ_KINDS.has(o.kind) && "items" in o && key.k === "p" && key.t === "int") {
      let i = Number(key.v);
      if (i < 0) i += o.len;
      return o.items[i];
    }
    if (o.kind === "dict") return o.entries.find(([k]) => valKey(k) === valKey(key))?.[1];
    return undefined;
  };
  const show = (v: Val) => (v.k === "p" ? fmtPrim(v) : fmtVal(v, step.heap, 1));

  // arr[j + 1] → 6, grid[i][j] → 5, seen[x] → 2
  let s = expr.replace(/\b([A-Za-z_]\w*)((?:\s*\[[^\[\]]+\])+)/g, (m, name: string, subs: string) => {
    let cur = lookup(name);
    for (const part of subs.match(/\[[^\[\]]+\]/g) ?? []) cur = subscript(cur, indexValue(part.slice(1, -1)));
    return cur ? show(cur) : m;
  });
  // len(arr) → 5
  s = s.replace(/\blen\(\s*([A-Za-z_]\w*)\s*\)/g, (m, name: string) => {
    const o = heapObj(lookup(name), step.heap);
    return o && "len" in o ? String(o.len) : m;
  });
  // simple variables → their values
  return s.replace(/(?<![\w.'"])([A-Za-z_]\w*)(?![\w(])/g, (m, name: string, offset: number, all: string) => {
    if (KEYWORDS.has(name)) return m;
    const before = all.slice(0, offset);
    if ((before.match(/'/g)?.length ?? 0) % 2 === 1 || (before.match(/"/g)?.length ?? 0) % 2 === 1) return m;
    const v = lookup(name);
    return v && v.k === "p" ? fmtPrim(v) : m;
  });
}

/** Which index expressions are used on which arrays, e.g. arr[j + 1] → arr: {"j+1"}. */
export function indexVars(code: string): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  const re = /([A-Za-z_]\w*)\s*\[\s*([A-Za-z_]\w*)\s*(?:([+-])\s*(\d+)\s*)?\]/g;
  for (const m of code.matchAll(re)) {
    if (!map.has(m[1])) map.set(m[1], new Set());
    map.get(m[1])!.add(m[3] ? `${m[2]}${m[3]}${m[4]}` : m[2]);
  }
  return map;
}

export const BOUND_NAMES = new Set(["left", "right", "lo", "hi", "low", "high", "mid", "start", "end", "l", "r", "slow", "fast", "top", "front", "rear"]);
