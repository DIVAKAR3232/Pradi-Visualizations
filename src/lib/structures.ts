import { fmtVal, heapObj, valKey } from "./format";
import { type Frame, type Heap, type HeapObj, SEQ_KINDS, type Step, type Val } from "./types";

/**
 * Finds linked lists, trees and graphs in a step's memory so they can be drawn once,
 * with variable names pinned to the nodes they point at. Works for every language
 * because it only reads the shared display format.
 */

type Obj = HeapObj & { kind: "object" };

const POINTER_NAMES = /^(next|prev|previous|left|right|link|nxt|child|parent)$/i;

export type NodeInfo = { id: string; label: string; cls: string };

export type ListStructure = { kind: "list"; cls: string; chains: string[][]; doubly: boolean; nextField: string; prevField?: string };
export type TreeStructure = { kind: "tree"; cls: string; roots: string[]; leftField: string; rightField: string };
/** Trie / n-ary tree: children kept in a map or array field. */
export type NaryStructure = {
  kind: "nary";
  cls: string;
  roots: string[];
  childField: string;
  trie: boolean;
  endField?: string;
  /** child id → edge label (the character for tries) */
  edgeLabel: Map<string, string>;
  children: Map<string, string[]>;
};
export type GraphStructure = {
  kind: "graph";
  name: string;
  nodes: string[];
  edges: [string, string][];
  directed: boolean;
  visited: Set<string>;
  frontier: Set<string>;
  current?: string;
  neighbor?: string;
};

export type Structures = {
  lists: ListStructure[];
  trees: TreeStructure[];
  narys: NaryStructure[];
  graphs: GraphStructure[];
  /** Node classes (linked-list / tree) — variables pointing at them show as compact chips. */
  nodeClasses: Set<string>;
  /** Heap id → variable names pointing at it (current frame first, then globals). */
  badges: Map<string, string[]>;
  nodes: Map<string, NodeInfo>;
};

const isObj = (o: HeapObj | undefined): o is Obj => o?.kind === "object";

/** Short label for a node: its first plain field (val / data / key). */
export function nodeLabel(o: Obj): string {
  const f = o.fields.find(([, v]) => v.k === "p" && v.t !== "null" && v.t !== "NoneType");
  if (!f) return o.cls;
  const v = f[1] as Val & { k: "p" };
  return v.t === "str" || v.t === "char" || v.t === "String" || v.t === "string" ? String(v.v) : String(v.v);
}

/** Variables visible "right now": the running frame, then globals. */
export function visibleVars(step: Step): [string, Val][] {
  const top = step.stack[step.stack.length - 1];
  const glob = step.stack[0];
  const out: [string, Val][] = [...(top?.vars ?? [])];
  if (glob && glob !== top) for (const [n, v] of glob.vars) if (!out.some(([m]) => m === n)) out.push([n, v]);
  return out;
}

export function lookupVar(step: Step, names: RegExp): [string, Val] | undefined {
  const frames: Frame[] = [step.stack[step.stack.length - 1], step.stack[0], ...[...step.stack].reverse()].filter(Boolean);
  for (const f of frames) for (const [n, v] of f.vars) if (names.test(n)) return [n, v];
  return undefined;
}

function selfFields(heap: Heap, cls: string): string[] {
  const fields = new Set<string>();
  for (const o of Object.values(heap)) {
    if (!isObj(o) || o.cls !== cls) continue;
    for (const [name, v] of o.fields) {
      const target = heapObj(v, heap);
      if (isObj(target) && target.cls === cls) fields.add(name);
      else if (v.k === "p" && (v.t === "null" || v.t === "NoneType") && POINTER_NAMES.test(name)) fields.add(name);
    }
  }
  return [...fields];
}

const fieldRef = (o: Obj, f: string): string | undefined => {
  const v = o.fields.find(([n]) => n === f)?.[1];
  return v?.k === "r" ? v.id : undefined;
};

export function detectStructures(step: Step): Structures {
  const heap = step.heap;
  const classes = new Set<string>();
  for (const o of Object.values(heap)) if (isObj(o)) classes.add(o.cls);

  const lists: ListStructure[] = [];
  const trees: TreeStructure[] = [];
  const nodeClasses = new Set<string>();
  const nodes = new Map<string, NodeInfo>();

  const narys: NaryStructure[] = [];
  for (const cls of classes) {
    const sf = selfFields(heap, cls);
    if (sf.length === 0) {
      const nary = detectNary(heap, cls);
      if (nary) {
        narys.push(nary);
        nodeClasses.add(cls);
        for (const id of Object.keys(heap)) {
          const o = heap[id];
          if (isObj(o) && o.cls === cls) nodes.set(id, { id, cls, label: nary.trie ? (nary.edgeLabel.get(id) ?? "•") : nodeLabel(o) });
        }
      }
      continue;
    }
    const ids = Object.keys(heap).filter((id) => {
      const o = heap[id];
      return isObj(o) && o.cls === cls;
    });
    const lower = sf.map((f) => f.toLowerCase());
    const left = sf[lower.indexOf("left")];
    const right = sf[lower.indexOf("right")];
    const isTree = (left && right) || (sf.length === 2 && !lower.includes("next") && !lower.includes("prev"));
    nodeClasses.add(cls);
    for (const id of ids) nodes.set(id, { id, cls, label: nodeLabel(heap[id] as Obj) });

    if (isTree) {
      const lf = left ?? sf[0];
      const rf = right ?? sf[1];
      const incoming = new Set<string>();
      for (const id of ids) {
        const o = heap[id] as Obj;
        for (const f of [lf, rf]) {
          const t = fieldRef(o, f);
          if (t) incoming.add(t);
        }
      }
      trees.push({ kind: "tree", cls, roots: ids.filter((id) => !incoming.has(id)), leftField: lf, rightField: rf });
    } else {
      const nextField = sf.find((f) => /next|nxt|link/i.test(f)) ?? sf.find((f) => !/prev/i.test(f)) ?? sf[0];
      const prevField = sf.find((f) => f !== nextField && /prev/i.test(f));
      const incoming = new Set<string>();
      for (const id of ids) {
        const t = fieldRef(heap[id] as Obj, nextField);
        if (t) incoming.add(t);
      }
      const roots = ids.filter((id) => !incoming.has(id));
      if (roots.length === 0 && ids.length) roots.push(ids[0]); // fully circular list
      const seen = new Set<string>();
      const chains: string[][] = [];
      for (const r of roots) {
        const chain: string[] = [];
        let cur: string | undefined = r;
        while (cur && !seen.has(cur) && chain.length < 60) {
          seen.add(cur);
          chain.push(cur);
          const o: HeapObj | undefined = heap[cur];
          cur = isObj(o) ? fieldRef(o, nextField) : undefined;
        }
        chains.push(chain);
      }
      // Order: chains pointed to by variables first, longest first.
      chains.sort((a, b) => b.length - a.length);
      lists.push({ kind: "list", cls, chains, doubly: !!prevField, nextField, prevField });
    }
  }

  // Variable badges
  const badges = new Map<string, string[]>();
  for (const [n, v] of visibleVars(step)) {
    if (v.k !== "r") continue;
    badges.set(v.id, [...(badges.get(v.id) ?? []), n]);
  }

  return { lists, trees, narys, graphs: detectGraphs(step), nodeClasses, badges, nodes };
}

const END_FIELDS = /^(is_?end(_?of_?word)?|end(_?of_?word)?|is_?word|word_?end|eow|is_?leaf|terminal|is_?terminal|flag)$/i;

/** Children of a node kept in a dict / list / array field: [label, childId][] */
function containerChildren(c: HeapObj | undefined, heap: Heap, cls: string): { kids: [string, string][]; slots: number; charKeys: boolean } | null {
  if (!c) return null;
  if (c.kind === "dict") {
    const kids: [string, string][] = [];
    let charKeys = true;
    for (const [k, v] of c.entries) {
      const t = v.k === "r" ? heap[v.id] : undefined;
      if (!isObj(t) || t.cls !== cls) continue;
      const label = k.k === "p" ? String(k.v) : "?";
      if (label.length !== 1) charKeys = false;
      kids.push([label, (v as { id: string }).id]);
    }
    return { kids, slots: c.entries.length, charKeys: charKeys && kids.length > 0 };
  }
  const items = seq(c);
  if (!items) return null;
  const kids: [string, string][] = [];
  let ok = true;
  items.forEach((v, i) => {
    if (v.k === "r") {
      const t = heap[v.id];
      if (isObj(t) && t.cls === cls) kids.push([items.length === 26 ? String.fromCharCode(97 + i) : items.length === 128 || items.length === 256 ? String.fromCharCode(i) : String(i), v.id]);
      else ok = false;
    } else if (!(v.t === "null" || v.t === "NoneType")) ok = false;
  });
  return ok ? { kids, slots: items.length, charKeys: items.length === 26 || items.length >= 128 } : null;
}

function detectNary(heap: Heap, cls: string): NaryStructure | null {
  const ids = Object.keys(heap).filter((id) => isObj(heap[id]) && (heap[id] as Obj).cls === cls);
  if (!ids.length) return null;
  const first = heap[ids[0]] as Obj;
  for (const [field] of first.fields) {
    let found = false;
    let charKeys = false;
    let valid = true;
    for (const id of ids) {
      const o = heap[id] as Obj;
      const v = o.fields.find(([n]) => n === field)?.[1];
      const c = v && v.k === "r" ? heap[v.id] : undefined;
      const r = containerChildren(c, heap, cls);
      if (!r) {
        valid = false;
        break;
      }
      if (r.kids.length || r.slots === 26) found = true;
      if (r.charKeys) charKeys = true;
    }
    if (!valid || !found) continue;
    const children = new Map<string, string[]>();
    const edgeLabel = new Map<string, string>();
    const incoming = new Set<string>();
    for (const id of ids) {
      const o = heap[id] as Obj;
      const v = o.fields.find(([n]) => n === field)![1];
      const r = containerChildren(v.k === "r" ? heap[v.id] : undefined, heap, cls)!;
      children.set(id, r.kids.map(([, k]) => k));
      for (const [label, kid] of r.kids) {
        edgeLabel.set(kid, label);
        incoming.add(kid);
      }
    }
    const endField = first.fields.find(([n, v]) => END_FIELDS.test(n) && v.k === "p" && (v.t === "bool" || v.t === "boolean" || v.t === "int"))?.[0];
    const trie = charKeys || /trie/i.test(cls);
    return { kind: "nary", cls, roots: ids.filter((id) => !incoming.has(id)), childField: field, trie, endField, edgeLabel, children };
  }
  return null;
}

// ---------------------------------------------------------------- graphs

const GRAPH_NAMES = /^(adj\w*|graph|g|adjacency\w*|neighbors|edges_map)$/i;
const VISITED_NAMES = /^(visited|vis|seen|visit|discovered)$/i;
const FRONTIER_NAMES = /^(queue|q|stack|st|stk|frontier|pq|dq)$/i;
const CURRENT_NAMES = /^(node|u|cur|curr|current|vertex|src)$/i;
const NEIGHBOR_NAMES = /^(nei|v|next|neighbor|neighbour|nb|w|adjnode|child)$/i;

function primKey(v: Val): string | undefined {
  if (v.k !== "p") return undefined;
  if (v.t === "int" || v.t === "long" || v.t === "str" || v.t === "char" || v.t === "String" || v.t === "string") return String(v.v);
  return undefined;
}

function seq(o: HeapObj | undefined): Val[] | null {
  return o && SEQ_KINDS.has(o.kind) && "items" in o ? o.items : null;
}

function truthy(v: Val): boolean {
  if (v.k !== "p") return true;
  return !!v.v && v.v !== "0";
}

function detectGraphs(step: Step): GraphStructure[] {
  const out: GraphStructure[] = [];
  const done = new Set<string>();
  for (const [name, v] of visibleVars(step)) {
    if (!GRAPH_NAMES.test(name) || v.k !== "r" || done.has(v.id)) continue;
    const g = graphFrom(name, heapObj(v, step.heap), step.heap);
    if (!g) continue;
    done.add(v.id);
    decorate(g, step);
    out.push(g);
  }
  return out;
}

function graphFrom(name: string, o: HeapObj | undefined, heap: Heap): GraphStructure | null {
  if (!o) return null;
  let nodes: string[] = [];
  const edges: [string, string][] = [];
  const rows = seq(o);
  if (rows) {
    const inner = rows.map((r) => seq(heapObj(r, heap)));
    if (inner.length === 0 || inner.some((r) => !r)) return null;
    const n = inner.length;
    nodes = Array.from({ length: n }, (_, i) => String(i));
    const isMatrix =
      inner.every((r) => r!.length === n) &&
      inner.every((r) => r!.every((x) => x.k === "p" && (x.v === 0 || x.v === 1 || x.v === true || x.v === false)));
    if (isMatrix && n > 0) {
      inner.forEach((r, i) => r!.forEach((x, j) => truthy(x) && edges.push([String(i), String(j)])));
    } else {
      for (let i = 0; i < n; i++) {
        for (const x of inner[i]!) {
          const k = primKey(x);
          if (k === undefined) return null;
          edges.push([String(i), k]);
        }
      }
    }
  } else if (o.kind === "dict") {
    for (const [k, val] of o.entries) {
      const key = primKey(k);
      const list = seq(heapObj(val, heap));
      if (key === undefined || !list) return null;
      nodes.push(key);
      for (const x of list) {
        const t = primKey(x);
        if (t === undefined) return null;
        edges.push([key, t]);
      }
    }
  } else return null;

  for (const [, b] of edges) if (!nodes.includes(b)) nodes.push(b);
  if (nodes.length < 2) return null;

  // Undirected when every edge has its reverse
  const set = new Set(edges.map(([a, b]) => `${a}→${b}`));
  const directed = !edges.every(([a, b]) => set.has(`${b}→${a}`));
  const unique: [string, string][] = [];
  const seen = new Set<string>();
  for (const [a, b] of edges) {
    const key = directed ? `${a}→${b}` : [a, b].sort().join("—");
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push([a, b]);
  }
  return { kind: "graph", name, nodes, edges: unique, directed, visited: new Set(), frontier: new Set() };
}

function decorate(g: GraphStructure, step: Step) {
  const vis = lookupVar(step, VISITED_NAMES);
  if (vis) {
    const o = heapObj(vis[1], step.heap);
    const items = seq(o);
    if (items && o?.kind === "set") items.forEach((x) => primKey(x) !== undefined && g.visited.add(primKey(x)!));
    else if (items) items.forEach((x, i) => truthy(x) && g.visited.add(String(i)));
    else if (o?.kind === "dict") o.entries.forEach(([k, x]) => truthy(x) && primKey(k) !== undefined && g.visited.add(primKey(k)!));
  }
  const fr = lookupVar(step, FRONTIER_NAMES);
  if (fr) seq(heapObj(fr[1], step.heap))?.forEach((x) => primKey(x) !== undefined && g.frontier.add(primKey(x)!));
  const cur = lookupVar(step, CURRENT_NAMES);
  if (cur && primKey(cur[1]) !== undefined && g.nodes.includes(primKey(cur[1])!)) g.current = primKey(cur[1]);
  const nb = lookupVar(step, NEIGHBOR_NAMES);
  if (nb && primKey(nb[1]) !== undefined && g.nodes.includes(primKey(nb[1])!)) g.neighbor = primKey(nb[1]);
}

// ---------------------------------------------------------------- "reading" cells

export type Reads = { cells: Map<string, Set<number>>; keys: Map<string, Set<string>>; writes: Map<string, Set<number>> };

/** Cells the line about to run will read or write, e.g. dp[i-1][j] → {dpRow(i-1): {j}}. */
export function computeReads(line: string | undefined, step: Step): Reads {
  const reads: Reads = { cells: new Map(), keys: new Map(), writes: new Map() };
  if (!line) return reads;
  const code = line.replace(/(\/\/|#).*$/, "");
  // position of the assignment operator (=, +=, ...) but not ==, <=, >=, !=
  const eq = code.search(/(?<![=<>!+\-*/%&|^])(?:[+\-*/%&|^]|<<|>>)?=(?!=)/);
  const lookup = (name: string): Val | undefined => {
    const top = step.stack[step.stack.length - 1];
    return top?.vars.find(([n]) => n === name)?.[1] ?? step.stack[0]?.vars.find(([n]) => n === name)?.[1];
  };
  const evalIndex = (expr: string): Val | undefined => {
    const e = expr.trim();
    if (/^-?\d+$/.test(e)) return { k: "p", t: "int", v: Number(e) };
    const m = e.match(/^([A-Za-z_]\w*)\s*(?:([+-])\s*([A-Za-z_]\w*|\d+))?$/);
    if (!m) return undefined;
    const base = lookup(m[1]);
    if (!base || base.k !== "p") return undefined;
    if (!m[2]) return base;
    const rhs = /^\d+$/.test(m[3]) ? Number(m[3]) : (() => {
      const r = lookup(m[3]);
      return r?.k === "p" && typeof r.v === "number" ? r.v : NaN;
    })();
    if (typeof base.v !== "number" || Number.isNaN(rhs)) return undefined;
    return { k: "p", t: "int", v: base.v + (m[2] === "+" ? rhs : -rhs) };
  };
  const add = (m: Map<string, Set<number>>, id: string, i: number) => {
    if (!m.has(id)) m.set(id, new Set());
    m.get(id)!.add(i);
  };
  for (const m of code.matchAll(/\b([A-Za-z_]\w*)((?:\s*\[[^\[\]]+\])+)/g)) {
    const target = eq >= 0 && (m.index ?? 0) < eq ? reads.writes : reads.cells;
    let cur = lookup(m[1]);
    const parts = m[2].match(/\[[^\[\]]+\]/g) ?? [];
    for (const [pi, part] of parts.entries()) {
      const o = heapObj(cur, step.heap);
      const key = evalIndex(part.slice(1, -1));
      if (!o || !key || cur?.k !== "r") break;
      const items = seq(o);
      if (items && key.k === "p" && typeof key.v === "number") {
        const i = key.v < 0 ? key.v + items.length : key.v;
        if (i < 0 || i >= items.length) break;
        // only the last subscript is written; the row lookups before it are reads
        add(pi === parts.length - 1 ? target : reads.cells, cur.id, i);
        cur = items[i];
      } else if (o.kind === "dict") {
        const kk = valKey(key);
        const hit = o.entries.find(([k]) => valKey(k) === kk || (k.k === "p" && key.k === "p" && String(k.v) === String(key.v)));
        if (!reads.keys.has(cur.id)) reads.keys.set(cur.id, new Set());
        reads.keys.get(cur.id)!.add(hit ? valKey(hit[0]) : kk);
        cur = hit?.[1];
      } else break;
    }
  }
  // Java-style list.get(i)
  for (const m of code.matchAll(/\b([A-Za-z_]\w*)\.get\(\s*([^()]+?)\s*\)/g)) {
    const cont = lookup(m[1]);
    const o = heapObj(cont, step.heap);
    const key = evalIndex(m[2]);
    const items = seq(o);
    if (cont?.k === "r" && items && key?.k === "p" && typeof key.v === "number") add(reads.cells, cont.id, key.v);
  }
  return reads;
}

// ---------------------------------------------------------------- recursion tree

export type CallNode = {
  id: number;
  name: string;
  args: string;
  parent: number | null;
  children: number[];
  start: number;
  end?: number;
  ret?: string;
  frameId: number;
};

export type CallTree = { nodes: CallNode[]; recursive: Set<string> };

/** All calls in the whole trace (built once per trace). */
export function buildCallTree(steps: Step[]): CallTree {
  const nodes: CallNode[] = [];
  const open: CallNode[] = [];
  for (let i = 0; i < steps.length; i++) {
    const s = steps[i];
    if (s.event === "call") {
      const top = s.stack[s.stack.length - 1];
      if (!top) continue;
      const parent = open[open.length - 1] ?? null;
      const args = top.vars
        .filter(([n]) => n !== "self" && n !== "this")
        .map(([n, v]) => {
          if (v.k === "p") return fmtVal(v, s.heap);
          const o = s.heap[v.id];
          if (o?.kind === "object") return nodeLabel(o);
          if (o && "items" in o && o.items.length <= 4) return fmtVal(v, s.heap, 1);
          return n;
        })
        .join(", ");
      const node: CallNode = { id: nodes.length, name: s.func, args, parent: parent?.id ?? null, children: [], start: i, frameId: top.id };
      nodes.push(node);
      parent?.children.push(node.id);
      open.push(node);
    } else if (s.event === "return") {
      const top = s.stack[s.stack.length - 1];
      let k = open.length - 1;
      while (k >= 0 && top && open[k].frameId !== top.id) k--;
      if (k < 0) continue;
      const node = open[k];
      node.end = i;
      node.ret = s.ret ? fmtVal(s.ret, s.heap, 1) : undefined;
      open.length = k;
    }
  }
  const recursive = new Set<string>();
  for (const n of nodes) {
    let p = n.parent;
    while (p !== null) {
      if (nodes[p].name === n.name) {
        recursive.add(n.name);
        break;
      }
      p = nodes[p].parent;
    }
  }
  return { nodes, recursive };
}

// ---------------------------------------------------------------- name-based kinds (Python lists)

export function seqViewFor(name: string | undefined, o: HeapObj): "stack" | "queue" | "pq" | null {
  if (o.kind === "stack") return "stack";
  if (o.kind === "queue" || o.kind === "deque") return "queue";
  if (o.kind === "pq") return "pq";
  if (o.kind !== "list" || !name) return null;
  if (/^(stack|st|stk|call_stack)$/i.test(name)) return "stack";
  if (/^(queue|q)$/i.test(name)) return "queue";
  if (/^(heap|min_?heap|max_?heap|pq|h)$/i.test(name)) return "pq";
  return null;
}
