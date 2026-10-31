// Runtime values used by the Java / C / C++ interpreter.
import type { TypeRef } from "./ast";

export type SizeMeta = { type: TypeRef; count: number };

export type Loc =
  | { k: "cell"; cell: Cell; name: string }
  | { k: "elem"; id: number; idx: number }
  | { k: "field"; id: number; name: string }
  | { k: "mapval"; id: number; key: V }
  | { k: "strchar"; base: Loc; idx: number };

export type Cell = { v: V; type: TypeRef | null };

export type V =
  | { t: "int"; v: number; size?: SizeMeta }
  | { t: "long"; v: number }
  | { t: "double"; v: number }
  | { t: "char"; v: number }
  | { t: "bool"; v: boolean }
  | { t: "str"; v: string }
  | { t: "null" }
  | { t: "ref"; id: number }
  | { t: "ptr"; loc: Loc }
  | { t: "func"; name: string; call: (args: V[]) => V; cmp?: "less" | "greater" }
  | { t: "static"; name: string }
  | { t: "stream"; name: "cout" | "cin" | "cerr" | "endl" | "sysout" | "syserr" | "sysin" }
  | { t: "manip"; kind: "fixed" | "prec" | "boolalpha" | "noop"; n?: number }
  | { t: "void" }
  | { t: "uninit" };

export type SeqCtype = "array" | "vector" | "list" | "stack" | "queue" | "deque" | "pq" | "set" | "sb";

export type HSeq = {
  kind: "seq";
  ctype: SeqCtype;
  items: V[];
  label: string;
  elem: TypeRef | null;
  valueSem: boolean;
  /** Sorted containers (TreeSet, std::set, priority queues): returns < 0 when a goes first. */
  cmp: ((a: V, b: V) => number) | null;
  multi?: boolean; // multiset
  hashInt?: boolean; // Java HashSet: keep small int keys ascending like real Java
  frontTop?: boolean; // Java ArrayDeque used as a stack (push adds to the front)
  disp?: "stack" | "queue" | "deque" | "list";
};

export type HMap = {
  kind: "map";
  keys: V[];
  vals: V[];
  label: string;
  keyT: TypeRef | null;
  valT: TypeRef | null;
  valueSem: boolean;
  cmp: ((a: V, b: V) => number) | null; // sorted maps
  hashInt?: boolean;
};

export type HObj = {
  kind: "obj";
  cls: string;
  fields: Map<string, V>;
  fieldTypes: Map<string, TypeRef | null>;
  valueSem: boolean;
};

export type HSpecial =
  | { kind: "scanner" }
  | { kind: "reader" }
  | { kind: "random"; seed: number }
  | { kind: "tokenizer"; toks: string[]; i: number };

export type H = HSeq | HMap | HObj | HSpecial;

export const INT = (v: number): V => ({ t: "int", v: v | 0 });
export const LONG = (v: number): V => ({ t: "long", v: Math.trunc(v) });
export const DBL = (v: number): V => ({ t: "double", v });
export const CHR = (v: number): V => ({ t: "char", v: v & 0xffff });
export const STR = (v: string): V => ({ t: "str", v });
export const NULL: V = { t: "null" };
export const VOID: V = { t: "void" };
export const UNINIT: V = { t: "uninit" };

export const isNum = (v: V): v is Extract<V, { t: "int" | "long" | "double" | "char" }> =>
  v.t === "int" || v.t === "long" || v.t === "double" || v.t === "char";

export function numOf(v: V): number {
  switch (v.t) {
    case "int":
    case "long":
    case "double":
    case "char":
      return v.v;
    case "bool":
      return v.v ? 1 : 0;
    case "uninit":
      return 0;
    case "null":
      return 0;
    default:
      return NaN;
  }
}

export const tname = (t: TypeRef | null | undefined): string => {
  if (!t) return "auto";
  let s = t.name === "bool" ? "bool" : t.name;
  if (t.args.length) s += `<${t.args.map((a) => (a.name === "#" ? String(a.num) : tname(a))).join(", ")}>`;
  s += "*".repeat(t.ptr) + "[]".repeat(t.dims);
  return s;
};

export function charStr(code: number): string {
  if (code === 0) return "\\0";
  if (code === 10) return "\\n";
  if (code === 9) return "\\t";
  if (code === 13) return "\\r";
  return String.fromCharCode(code);
}
