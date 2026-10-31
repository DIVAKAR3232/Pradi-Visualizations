// Step-by-step interpreter for Java / C / C++. Produces the same TraceResult format as the Python tracer.
import type { CondInfo, Frame as DFrame, Heap as DHeap, HeapObj as DObj, Step, TraceResult, Val as DVal } from "../types";
import type { ClassDecl, Expr, FuncDecl, Program, Stmt, TypeRef } from "./ast";
import { callFree, callMemberExpr, callScope, memberValue, natCompare } from "./builtins";
import { CodeError } from "./lexer";
import { type Dialect, simpleType } from "./parser";
import {
  CHR, charStr, DBL, type H, type HMap, type HObj, type HSeq, INT, isNum, LONG, type Loc, NULL, numOf, type SeqCtype, STR, tname, UNINIT, type V, VOID,
} from "./values";

export const MAX_STEPS = 3000;
const MAX_DEPTH = 250;
const MAX_OPS = 4_000_000;

export class BreakSig {}
export class ContinueSig {}
export class ReturnSig {
  constructor(public v: V) {}
}
export class ThrowSig {
  constructor(
    public v: V,
    public name: string,
    public msg: string,
  ) {}
}
class StepLimit {}
export class ExitSig {}

export type Binding = { loc: Loc; type: TypeRef | null; hidden?: boolean };
export type RFrame = {
  id: number;
  name: string;
  line: number;
  scopes: Map<string, Binding>[];
  thisRef: V | null;
  cls: string | null;
  display: boolean;
};
export type Arg = { v: V; loc: Loc | null };

const PRIMS = new Set(["int", "long", "short", "byte", "double", "float", "char", "bool", "boolean", "void"]);
const WRAPPERS: Record<string, string> = { Integer: "int", Long: "long", Double: "double", Float: "double", Character: "char", Boolean: "bool", Short: "int", Byte: "int" };
const JAVA_EXC: Record<string, string> = {
  index: "ArrayIndexOutOfBoundsException",
  null: "NullPointerException",
  arith: "ArithmeticException",
  stack: "StackOverflowError",
};

class Input {
  pos = 0;
  constructor(private s: string) {}
  token(): string | null {
    while (this.pos < this.s.length && /\s/.test(this.s[this.pos])) this.pos++;
    if (this.pos >= this.s.length) return null;
    const st = this.pos;
    while (this.pos < this.s.length && !/\s/.test(this.s[this.pos])) this.pos++;
    return this.s.slice(st, this.pos);
  }
  line(): string | null {
    if (this.pos >= this.s.length) return null;
    let e = this.s.indexOf("\n", this.pos);
    if (e < 0) e = this.s.length;
    const l = this.s.slice(this.pos, e).replace(/\r$/, "");
    this.pos = e + 1;
    return l;
  }
  char(skipWs: boolean): string | null {
    if (skipWs) while (this.pos < this.s.length && /\s/.test(this.s[this.pos])) this.pos++;
    if (this.pos >= this.s.length) return null;
    return this.s[this.pos++];
  }
  hasToken(): boolean {
    return /\S/.test(this.s.slice(this.pos));
  }
}

export class Interp {
  heap = new Map<number, H>();
  private nextId = 1;
  private nextFrameId = 1;
  steps: Step[] = [];
  out = "";
  frames: RFrame[] = [];
  globals: RFrame = { id: 0, name: "Global", line: 0, scopes: [new Map()], thisRef: null, cls: null, display: true };
  pendingCond: CondInfo | null = null;
  mute = 0;
  ops = 0;
  curLine = 1;
  input: Input;
  cinOk = true;
  cout = { fixed: false, prec: 6, boolalpha: false };
  rand = 42;

  constructor(
    public prog: Program,
    public lang: Dialect,
    public src: string,
    stdin: string,
  ) {
    this.input = new Input(stdin);
  }

  // ---------- helpers ----------
  get java() {
    return this.lang === "java";
  }
  get frame(): RFrame {
    return this.frames[this.frames.length - 1] ?? this.globals;
  }
  alloc(h: H): number {
    const id = this.nextId++;
    this.heap.set(id, h);
    return id;
  }
  obj(id: number): H {
    const h = this.heap.get(id);
    if (!h) this.err("Internal error: missing object");
    return h;
  }
  seqOf(v: V | undefined): HSeq | null {
    if (!v || v.t !== "ref") return null;
    const h = this.heap.get(v.id);
    return h && h.kind === "seq" ? h : null;
  }
  text(e: Expr): string {
    return this.src.slice(e.start, e.end).replace(/\s+/g, " ").trim();
  }
  err(msg: string, kind?: keyof typeof JAVA_EXC): never {
    let m = msg;
    if (this.java && kind) m = `${JAVA_EXC[kind]}: ${msg}`;
    else if (!this.java && kind === "null") m = `Segmentation fault: ${msg}`;
    else if (!this.java && kind === "arith") m = `Floating point exception: ${msg}`;
    const e = new CodeError(m, this.curLine, "runtime");
    (e as CodeError & { excName?: string }).excName = kind ? JAVA_EXC[kind] : "RuntimeException";
    throw e;
  }
  nullText(): string {
    return this.lang === "java" ? "null" : this.lang === "cpp" ? "nullptr" : "NULL";
  }
  boolV(b: boolean): V {
    return this.lang === "c" ? INT(b ? 1 : 0) : { t: "bool", v: b };
  }
  tick() {
    if (++this.ops > MAX_OPS) this.err("The program is taking too long (possible infinite loop).");
  }

  // ---------- snapshots ----------
  snap(line: number, event: Step["event"] = "line", extra: Partial<Step> = {}) {
    this.curLine = line;
    if (this.mute > 0) return;
    if (this.steps.length >= MAX_STEPS) throw new StepLimit();
    const step = this.snapshot(line, event, extra);
    if (this.pendingCond && event !== "call") {
      step.cond = this.pendingCond;
      this.pendingCond = null;
    }
    this.steps.push(step);
  }

  private snapshot(line: number, event: Step["event"], extra: Partial<Step>): Step {
    const heap: DHeap = {};
    const queue: number[] = [];
    const nameOfId = new Map<number, string>();
    const frames = [this.globals, ...this.frames.filter((f) => f.display)];
    for (const f of frames)
      for (const s of f.scopes)
        for (const [n, b] of s) {
          if (b.hidden) continue;
          const v = this.safeRead(b.loc);
          if (v.t === "ref" && !nameOfId.has(v.id)) nameOfId.set(v.id, n);
        }
    const dv = (v: V): DVal => {
      switch (v.t) {
        case "int":
          return { k: "p", t: "int", v: v.v };
        case "long":
          return { k: "p", t: "long", v: v.v };
        case "double":
          return { k: "p", t: "double", v: v.v };
        case "char":
          return { k: "p", t: "char", v: charStr(v.v) };
        case "bool":
          return { k: "p", t: "boolean", v: v.v };
        case "str":
          return { k: "p", t: this.java ? "String" : "string", v: v.v.length > 200 ? v.v.slice(0, 200) + "…" : v.v };
        case "null":
          return { k: "p", t: "null", v: this.nullText() };
        case "ref":
          if (!(String(v.id) in heap) && this.heap.has(v.id)) {
            heap[String(v.id)] = null as unknown as DObj;
            queue.push(v.id);
          }
          return { k: "r", id: String(v.id) };
        case "ptr":
          return { k: "p", t: "ptr", v: this.ptrText(v.loc, nameOfId) };
        case "func":
          return { k: "p", t: "func", v: v.name };
        case "uninit":
          return { k: "p", t: "uninit", v: "?" };
        case "void":
          return { k: "p", t: "void", v: "void" };
        default:
          return { k: "p", t: "other", v: "name" in v ? String(v.name) : v.t };
      }
    };
    const dframes: DFrame[] = [];
    for (const f of frames) {
      const vars: [string, DVal][] = [];
      const idx = new Map<string, number>();
      if (f.thisRef && f.thisRef.t === "ref") {
        idx.set("this", 0);
        vars.push(["this", dv(f.thisRef)]);
      }
      for (const s of f.scopes)
        for (const [n, b] of s) {
          if (b.hidden) continue;
          const val = dv(this.safeRead(b.loc));
          if (idx.has(n)) vars[idx.get(n)!] = [n, val];
          else {
            idx.set(n, vars.length);
            vars.push([n, val]);
          }
        }
      if (f === this.globals && vars.length === 0) continue;
      dframes.push({ id: f.id, name: f.name, line: f === this.frame ? line : f.line, vars });
    }
    const ret = extra.ret ? (extra.ret as unknown as V) : undefined;
    const dret = ret ? dv(ret) : undefined;
    while (queue.length) {
      const id = queue.shift()!;
      const h = this.heap.get(id)!;
      heap[String(id)] = this.dispObj(h, dv);
    }
    const step: Step = { line, event, func: this.frame.name, stack: dframes, heap, out: this.out };
    if (dret) step.ret = dret;
    if (extra.exc) step.exc = extra.exc;
    return step;
  }

  private dispObj(h: H, dv: (v: V) => DVal): DObj {
    switch (h.kind) {
      case "seq": {
        if (h.ctype === "sb") return { kind: "other", type: "StringBuilder", repr: `"${h.items.map((c) => String.fromCharCode(numOf(c))).join("")}"` };
        const kind =
          h.disp ??
          ({ array: "list", vector: "list", list: "list", stack: "stack", queue: "queue", deque: "deque", pq: "pq", set: "set" } as const)[h.ctype];
        let items = h.items;
        if (h.frontTop && kind === "stack") items = [...items].reverse();
        return { kind, items: items.slice(0, 120).map(dv), len: h.items.length, type: h.label };
      }
      case "map":
        return { kind: "dict", entries: h.keys.slice(0, 80).map((k, i) => [dv(k), dv(h.vals[i])]), len: h.keys.length, type: h.label };
      case "obj":
        return { kind: "object", cls: h.cls, fields: [...h.fields].map(([n, v]) => [n, dv(v)]) };
      default:
        return { kind: "other", type: h.kind, repr: h.kind === "scanner" ? "Scanner(System.in)" : h.kind };
    }
  }

  private ptrText(loc: Loc, names: Map<number, string>): string {
    switch (loc.k) {
      case "cell":
        return `&${loc.name}`;
      case "elem": {
        const h = this.heap.get(loc.id);
        const n = names.get(loc.id) ?? "";
        if (h && h.kind === "seq" && loc.idx === h.items.length && this.lang === "cpp") return `${n}.end()`;
        if (h && h.kind === "map") return `→ ${n} entry ${loc.idx}`;
        return `&${n}[${loc.idx}]`;
      }
      case "field":
        return `&${names.get(loc.id) ?? "obj"}.${loc.name}`;
      case "strchar":
        return `&${loc.base.k === "cell" ? loc.base.name : "s"}[${loc.idx}]`;
      default:
        return "&…";
    }
  }

  // ---------- variables ----------
  declare(name: string, v: V, type: TypeRef | null, hidden = false): Binding {
    const b: Binding = { loc: { k: "cell", cell: { v: UNINIT, type }, name }, type, hidden };
    this.frame.scopes[this.frame.scopes.length - 1].set(name, b);
    this.write(b.loc, v, true);
    return b;
  }
  alias(name: string, loc: Loc, type: TypeRef | null) {
    this.frame.scopes[this.frame.scopes.length - 1].set(name, { loc, type });
  }
  lookup(name: string): Binding | null {
    const f = this.frame;
    for (let i = f.scopes.length - 1; i >= 0; i--) {
      const b = f.scopes[i].get(name);
      if (b) return b;
    }
    if (f.thisRef && f.thisRef.t === "ref") {
      const o = this.heap.get(f.thisRef.id);
      if (o && o.kind === "obj" && o.fields.has(name)) return { loc: { k: "field", id: f.thisRef.id, name }, type: o.fieldTypes.get(name) ?? null };
    }
    if (f !== this.globals) {
      for (let i = this.globals.scopes.length - 1; i >= 0; i--) {
        const b = this.globals.scopes[i].get(name);
        if (b) return b;
      }
    }
    return null;
  }

  safeRead(loc: Loc): V {
    try {
      return this.read(loc);
    } catch {
      return UNINIT;
    }
  }

  read(loc: Loc): V {
    switch (loc.k) {
      case "cell":
        return loc.cell.v;
      case "elem": {
        const h = this.obj(loc.id);
        if (h.kind === "seq") {
          if (loc.idx < 0 || loc.idx >= h.items.length) this.err(`Index ${loc.idx} out of bounds for length ${h.items.length}`, "index");
          return h.items[loc.idx];
        }
        if (h.kind === "map") return this.entryPair(h, loc.idx);
        return UNINIT;
      }
      case "field": {
        const h = this.obj(loc.id);
        if (h.kind !== "obj") this.err(`'${loc.name}' is not a field`);
        if (!h.fields.has(loc.name)) this.err(`'${h.cls}' has no field '${loc.name}'`);
        return h.fields.get(loc.name)!;
      }
      case "mapval": {
        const h = this.obj(loc.id) as HMap;
        const i = this.mapFind(h, loc.key);
        return i >= 0 ? h.vals[i] : NULL;
      }
      case "strchar": {
        const s = this.read(loc.base);
        if (s.t !== "str") this.err("Not a string");
        if (loc.idx < 0 || loc.idx > s.v.length) this.err(`String index ${loc.idx} out of range (length ${s.v.length})`, "index");
        return CHR(loc.idx === s.v.length ? 0 : s.v.charCodeAt(loc.idx));
      }
    }
  }

  typeOfLoc(loc: Loc): TypeRef | null {
    switch (loc.k) {
      case "cell":
        return loc.cell.type;
      case "elem": {
        const h = this.heap.get(loc.id);
        return h && h.kind === "seq" ? h.elem : null;
      }
      case "field": {
        const h = this.heap.get(loc.id);
        return h && h.kind === "obj" ? (h.fieldTypes.get(loc.name) ?? null) : null;
      }
      case "mapval": {
        const h = this.heap.get(loc.id);
        return h && h.kind === "map" ? h.valT : null;
      }
      case "strchar":
        return simpleType("char");
    }
  }

  write(loc: Loc, v: V, init = false) {
    const type = this.typeOfLoc(loc);
    let val = this.coerce(v, type);
    val = this.copyIfValue(val);
    switch (loc.k) {
      case "cell":
        if (!init && loc.cell.type?.name === "auto" && loc.cell.v.t !== "uninit") {
          /* keep auto */
        }
        loc.cell.v = val;
        return;
      case "elem": {
        const h = this.obj(loc.id);
        if (h.kind !== "seq") this.err("Cannot assign through this iterator");
        if (loc.idx < 0 || loc.idx >= h.items.length) this.err(`Index ${loc.idx} out of bounds for length ${h.items.length}`, "index");
        h.items[loc.idx] = val;
        return;
      }
      case "field": {
        const h = this.obj(loc.id);
        if (h.kind !== "obj") this.err("Not an object");
        h.fields.set(loc.name, val);
        return;
      }
      case "mapval": {
        const h = this.obj(loc.id) as HMap;
        this.mapPut(h, loc.key, val);
        return;
      }
      case "strchar": {
        const s = this.read(loc.base);
        if (s.t !== "str") this.err("Not a string");
        if (loc.idx < 0 || loc.idx >= s.v.length) this.err(`String index ${loc.idx} out of range (length ${s.v.length})`, "index");
        const ch = String.fromCharCode(numOf(val));
        this.write(loc.base, STR(s.v.slice(0, loc.idx) + ch + s.v.slice(loc.idx + 1)));
        return;
      }
    }
  }

  /** C/C++ value semantics: copying a vector / string / struct makes a new copy. */
  copyIfValue(v: V): V {
    if (this.java || v.t !== "ref") return v;
    const h = this.heap.get(v.id);
    if (!h || !("valueSem" in h) || !h.valueSem) return v;
    return { t: "ref", id: this.clone(v.id) };
  }

  clone(id: number): number {
    const h = this.obj(id);
    const cp = (x: V): V => (x.t === "ref" && this.isValueObj(x.id) ? { t: "ref", id: this.clone(x.id) } : x);
    switch (h.kind) {
      case "seq":
        return this.alloc({ ...h, items: h.items.map(cp) });
      case "map":
        return this.alloc({ ...h, keys: h.keys.map(cp), vals: h.vals.map(cp) });
      case "obj":
        return this.alloc({ ...h, fields: new Map([...h.fields].map(([k, x]) => [k, cp(x)])), fieldTypes: new Map(h.fieldTypes) });
      default:
        return this.alloc({ ...h });
    }
  }
  isValueObj(id: number): boolean {
    const h = this.heap.get(id);
    return !!h && "valueSem" in h && h.valueSem;
  }

  // ---------- conversions ----------
  coerce(v: V, type: TypeRef | null): V {
    if (!type || v.t === "uninit") return v;
    if (type.ptr > 0 || type.dims > 0) {
      if (v.t === "int" && v.v === 0 && type.ptr > 0) return NULL;
      return v;
    }
    let name = type.name;
    if (WRAPPERS[name]) {
      if (v.t === "null") return v;
      name = WRAPPERS[name];
    }
    switch (name) {
      case "int":
      case "short":
      case "byte":
        if (isNum(v) || v.t === "bool") return v.t === "int" ? v : INT(Math.trunc(numOf(v)));
        return v;
      case "long":
        if (isNum(v) || v.t === "bool") return LONG(numOf(v));
        return v;
      case "double":
      case "float":
        if (isNum(v) || v.t === "bool") return DBL(numOf(v));
        return v;
      case "char":
        if (isNum(v)) return CHR(Math.trunc(numOf(v)));
        if (v.t === "str" && v.v.length === 1) return CHR(v.v.charCodeAt(0));
        return v;
      case "bool":
      case "boolean":
        if (v.t === "bool") return v;
        return { t: "bool", v: this.truthy(v) };
      case "string":
      case "String":
        if (v.t === "char") return STR(String.fromCharCode(v.v));
        if (v.t === "ref" && !this.java) {
          const s = this.seqOf(v);
          if (s && s.ctype === "array") return STR(this.cString(s));
        }
        return v;
      default:
        return v;
    }
  }

  cString(s: HSeq): string {
    let out = "";
    for (const c of s.items) {
      const n = numOf(c);
      if (n === 0) break;
      out += String.fromCharCode(n);
    }
    return out;
  }

  truthy(v: V): boolean {
    switch (v.t) {
      case "bool":
        return v.v;
      case "int":
      case "long":
      case "double":
      case "char":
        return v.v !== 0;
      case "null":
      case "uninit":
      case "void":
        return false;
      case "stream":
        return v.name === "cin" ? this.cinOk : true;
      default:
        return true;
    }
  }

  num(v: V, what = "a number"): number {
    const n = numOf(v);
    if (Number.isNaN(n)) {
      if (v.t === "null") this.err(`Cannot use ${this.nullText()} as ${what}`, "null");
      this.err(`Expected ${what} but got ${this.describe(v)}`);
    }
    return n;
  }

  describe(v: V): string {
    switch (v.t) {
      case "ref": {
        const h = this.heap.get(v.id);
        return h ? (h.kind === "seq" || h.kind === "map" ? h.label : h.kind === "obj" ? h.cls : h.kind) : "object";
      }
      case "str":
        return "a string";
      default:
        return v.t;
    }
  }

  defaultVal(type: TypeRef, mode: "zero" | "uninit"): V {
    if (type.ptr > 0) return mode === "zero" ? NULL : UNINIT;
    if (type.dims > 0) return NULL;
    const n = type.name;
    if (WRAPPERS[n] || n === "String" || n === "Object") return this.java ? NULL : STR("");
    if (PRIMS.has(n) || n === "auto") {
      if (mode === "uninit") return UNINIT;
      if (n === "double" || n === "float") return DBL(0);
      if (n === "long") return LONG(0);
      if (n === "char") return CHR(0);
      if (n === "bool" || n === "boolean") return this.java ? { t: "bool", v: false } : this.boolV(false);
      return INT(0);
    }
    if (n === "string") return STR("");
    if (this.java) return NULL;
    // C++ / C: class and container types are constructed in place
    return this.constructType(type, [], true);
  }

  // ---------- objects ----------
  findClass(name: string): ClassDecl | undefined {
    return this.prog.classes.get(name) ?? this.prog.classes.get(this.prog.typedefs.get(name)?.name ?? "");
  }

  mkSeq(ctype: SeqCtype, label: string, elem: TypeRef | null, valueSem: boolean, items: V[] = [], cmp: HSeq["cmp"] = null): V {
    return { t: "ref", id: this.alloc({ kind: "seq", ctype, items, label, elem, valueSem, cmp }) };
  }
  mkMap(label: string, keyT: TypeRef | null, valT: TypeRef | null, valueSem: boolean, cmp: HMap["cmp"] = null): V {
    return { t: "ref", id: this.alloc({ kind: "map", keys: [], vals: [], label, keyT, valT, valueSem, cmp }) };
  }
  mkPair(a: V, b: V, ta: TypeRef | null = null, tb: TypeRef | null = null): V {
    return {
      t: "ref",
      id: this.alloc({ kind: "obj", cls: "pair", fields: new Map([["first", a], ["second", b]]), fieldTypes: new Map([["first", ta], ["second", tb]]), valueSem: true }),
    };
  }
  private entryPair(h: HMap, i: number): V {
    if (i < 0 || i >= h.keys.length) this.err("Iterator is past the end of the map", "index");
    return this.mkPair(h.keys[i], h.vals[i], h.keyT, h.valT);
  }

  mapFind(h: HMap, key: V): number {
    for (let i = 0; i < h.keys.length; i++) if (this.valEq(h.keys[i], key)) return i;
    return -1;
  }
  mapPut(h: HMap, key: V, val: V) {
    const i = this.mapFind(h, key);
    if (i >= 0) {
      h.vals[i] = val;
      return;
    }
    const k = this.copyIfValue(this.coerce(key, h.keyT));
    let pos = h.keys.length;
    const cmp = h.cmp ?? (h.hashInt && this.smallInt(k) && h.keys.every((x) => this.smallInt(x)) ? natCompare(this) : null);
    if (cmp) {
      pos = h.keys.findIndex((x) => cmp(k, x) < 0);
      if (pos < 0) pos = h.keys.length;
    }
    h.keys.splice(pos, 0, k);
    h.vals.splice(pos, 0, val);
  }
  smallInt(v: V): boolean {
    return (v.t === "int" || v.t === "char") && v.v >= 0 && v.v < 65536;
  }

  setAdd(h: HSeq, v: V): boolean {
    const val = this.copyIfValue(this.coerce(v, h.elem));
    if (!h.multi && h.items.some((x) => this.valEq(x, val))) return false;
    const cmp = h.cmp ?? (h.hashInt && this.smallInt(val) && h.items.every((x) => this.smallInt(x)) ? natCompare(this) : null);
    let pos = h.items.length;
    if (cmp) {
      pos = h.items.findIndex((x) => cmp(val, x) < 0);
      if (pos < 0) pos = h.items.length;
    }
    h.items.splice(pos, 0, val);
    return true;
  }

  pqPush(h: HSeq, v: V) {
    const a = h.items;
    a.push(this.copyIfValue(this.coerce(v, h.elem)));
    const before = (x: V, y: V) => h.cmp!(x, y) < 0;
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (before(a[i], a[p])) {
        [a[i], a[p]] = [a[p], a[i]];
        i = p;
      } else break;
    }
  }
  pqPop(h: HSeq): V {
    const a = h.items;
    if (!a.length) return this.java ? NULL : this.err("pop() on an empty priority_queue");
    const top = a[0];
    const last = a.pop()!;
    if (a.length) {
      a[0] = last;
      const before = (x: V, y: V) => h.cmp!(x, y) < 0;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        if (l < a.length && before(a[l], a[m])) m = l;
        if (r < a.length && before(a[r], a[m])) m = r;
        if (m === i) break;
        [a[i], a[m]] = [a[m], a[i]];
        i = m;
      }
    }
    return top;
  }

  valEq(a: V, b: V): boolean {
    if (isNum(a) || a.t === "bool") return (isNum(b) || b.t === "bool") && numOf(a) === numOf(b);
    if (a.t === "str") return b.t === "str" && a.v === b.v;
    if (a.t === "null") return b.t === "null";
    if (a.t === "ref") {
      if (b.t !== "ref") return false;
      if (a.id === b.id) return true;
      if (this.java) return false;
      return this.isValueObj(a.id) && this.isValueObj(b.id) && natCompare(this)(a, b) === 0;
    }
    if (a.t === "ptr" && b.t === "ptr") {
      const x = a.loc;
      const y = b.loc;
      if (x.k === "elem" && y.k === "elem") return x.id === y.id && x.idx === y.idx;
      if (x.k === "cell" && y.k === "cell") return x.cell === y.cell;
      if (x.k === "field" && y.k === "field") return x.id === y.id && x.name === y.name;
      if (x.k === "strchar" && y.k === "strchar") return x.idx === y.idx;
      return false;
    }
    return a.t === b.t;
  }

  // ---------- construction ----------
  /** Builds a value of `type` from constructor arguments (C++ `vector<int> v(n, 0)`, `Node(5)`, Java `new X(...)`). */
  constructType(type: TypeRef, args: V[], valueSem: boolean, expect?: TypeRef | null): V {
    const cls = this.findClass(type.name);
    if (cls) return this.construct(cls, args, valueSem);
    return this.newLib(type, args, valueSem, expect ?? null);
  }

  construct(cls: ClassDecl, args: V[], valueSem: boolean): V {
    const h: HObj = { kind: "obj", cls: cls.name, fields: new Map(), fieldTypes: new Map(), valueSem: valueSem && !this.java };
    const id = this.alloc(h);
    const ref: V = { t: "ref", id };
    this.initFields(cls, id, ref);
    const ctor = this.pickFn(cls.ctors, args.length);
    if (!ctor) {
      if (args.length === 0) return ref;
      if (!cls.ctors.length && !this.java) {
        const names = [...h.fields.keys()];
        args.forEach((a, i) => names[i] !== undefined && this.write({ k: "field", id, name: names[i] }, a));
        return ref;
      }
      this.err(`No constructor ${cls.name}(${args.length} argument${args.length === 1 ? "" : "s"}) found`);
    }
    this.callUser(ctor, args.map((v) => ({ v, loc: null })), ref);
    return ref;
  }

  private initFields(cls: ClassDecl, id: number, ref: V) {
    if (cls.superName) {
      const sup = this.findClass(cls.superName);
      if (sup) this.initFields(sup, id, ref);
    }
    const h = this.obj(id) as HObj;
    const tmp: RFrame = { id: -1, name: cls.name, line: cls.line, scopes: [new Map()], thisRef: ref, cls: cls.name, display: false };
    this.frames.push(tmp);
    this.mute++;
    try {
      for (const f of cls.fields) {
        if (f.isStatic) continue;
        const d = f.decl;
        const type: TypeRef = { ...f.type, ptr: f.type.ptr + d.ptr, dims: f.type.dims };
        h.fieldTypes.set(d.name, d.dims.length ? { ...type, dims: type.dims + d.dims.length } : type);
        let v: V;
        if (d.dims.length) v = this.makeCArray(type, d.dims.map((x) => (x ? this.num(this.ev(x)) : 0)), d.init, "zero");
        else if (d.init) v = this.ev(d.init, type);
        else if (d.ctorArgs) v = this.constructType(type, d.ctorArgs.map((a) => this.ev(a)), true);
        else v = this.java ? this.defaultVal(type, "zero") : this.defaultVal(type, "zero");
        h.fields.set(d.name, this.coerce(v, type));
      }
    } finally {
      this.mute--;
      this.frames.pop();
    }
  }

  pickFn(cands: FuncDecl[], n: number, args?: V[]): FuncDecl | undefined {
    const fit = cands.filter((f) => f.params.length === n || (f.params.length > n && f.params.slice(n).every((p) => p.def)) || f.params.some((p) => p.type && p.type.dims > 0 && p.name === "" ));
    if (fit.length <= 1 || !args) return fit[0];
    // overloads with the same count: prefer matching primitive vs string/object kinds
    const score = (f: FuncDecl) =>
      f.params.reduce((s, p, i) => {
        const a = args[i];
        if (!p.type || !a) return s;
        const isStr = p.type.name === "String" || p.type.name === "string";
        const isPrim = PRIMS.has(p.type.name) && p.type.ptr === 0 && p.type.dims === 0;
        if (isStr && a.t === "str") return s + 2;
        if (isPrim && isNum(a)) return s + (p.type.name === "double" && a.t === "double" ? 3 : 2);
        if (!isStr && !isPrim && (a.t === "ref" || a.t === "null")) return s + 2;
        return s;
      }, 0);
    return [...fit].sort((x, y) => score(y) - score(x))[0];
  }

  findMethod(clsName: string, name: string, n: number): FuncDecl | undefined {
    let cls = this.findClass(clsName);
    while (cls) {
      const m = this.pickFn(cls.methods.filter((f) => f.name === name), n);
      if (m) return m;
      cls = cls.superName ? this.findClass(cls.superName) : undefined;
    }
    return undefined;
  }

  // ---------- library construction ----------
  newLib(type: TypeRef, args: V[], valueSem: boolean, expect: TypeRef | null): V {
    const targs = type.args.length ? type.args : (expect?.args ?? []);
    const name = type.name;
    const label = tname({ ...type, args: targs, ptr: 0, ref: false, dims: 0 });
    const a0 = args[0];
    const vs = valueSem && !this.java;
    const fromColl = (v: V | undefined): V[] | null => {
      if (!v || v.t !== "ref") return null;
      const h = this.heap.get(v.id);
      if (!h) return null;
      if (h.kind === "seq") return [...h.items];
      if (h.kind === "map") return [...h.keys];
      return null;
    };
    const cmpFrom = (v: V | undefined, javaStyle: boolean): HSeq["cmp"] => {
      if (!v || v.t !== "func") return null;
      if (v.cmp === "greater") return (x, y) => natCompare(this)(y, x);
      if (v.cmp === "less") return natCompare(this);
      return javaStyle ? (x, y) => numOf(v.call([x, y])) : (x, y) => (this.truthy(v.call([x, y])) ? -1 : this.truthy(v.call([y, x])) ? 1 : 0);
    };
    switch (name) {
      // ----- Java -----
      case "ArrayList":
      case "LinkedList":
      case "Vector":
      case "List": {
        const r = this.mkSeq("list", label, targs[0] ?? null, false, fromColl(a0) ?? []);
        const h = this.seqOf(r)!;
        if (expect?.name === "Queue") h.disp = "queue";
        if (expect?.name === "Deque") h.disp = "deque";
        return r;
      }
      case "Stack":
        return this.mkSeq("stack", label, targs[0] ?? null, false, fromColl(a0) ?? []);
      case "ArrayDeque": {
        const r = this.mkSeq("deque", label, targs[0] ?? null, false, fromColl(a0) ?? []);
        if (expect?.name === "Queue") this.seqOf(r)!.disp = "queue";
        return r;
      }
      case "PriorityQueue": {
        const fn = args.find((x) => x.t === "func");
        const cmp = cmpFrom(fn, true) ?? natCompare(this);
        const r = this.mkSeq("pq", label, targs[0] ?? null, false, [], cmp);
        for (const x of fromColl(a0) ?? []) this.pqPush(this.seqOf(r)!, x);
        return r;
      }
      case "HashMap":
      case "LinkedHashMap":
      case "Hashtable":
      case "TreeMap":
      case "Map": {
        const cmp = name === "TreeMap" ? (cmpFrom(args.find((x) => x.t === "func"), true) ?? natCompare(this)) : null;
        const r = this.mkMap(label, targs[0] ?? null, targs[1] ?? null, false, cmp);
        const h = this.obj(r.t === "ref" ? r.id : 0) as HMap;
        h.hashInt = name === "HashMap" || name === "Hashtable";
        if (a0 && a0.t === "ref") {
          const src = this.heap.get(a0.id);
          if (src && src.kind === "map") src.keys.forEach((k, i) => this.mapPut(h, k, src.vals[i]));
        }
        return r;
      }
      case "HashSet":
      case "LinkedHashSet":
      case "TreeSet":
      case "Set": {
        const cmp = name === "TreeSet" ? (cmpFrom(args.find((x) => x.t === "func"), true) ?? natCompare(this)) : null;
        const r = this.mkSeq("set", label, targs[0] ?? null, false, [], cmp);
        const h = this.seqOf(r)!;
        h.hashInt = name === "HashSet";
        for (const x of fromColl(a0) ?? []) this.setAdd(h, x);
        return r;
      }
      case "StringBuilder":
      case "StringBuffer": {
        const s = a0 && a0.t === "str" ? a0.v : "";
        return this.mkSeq("sb", "StringBuilder", simpleType("char"), false, [...s].map((c) => CHR(c.charCodeAt(0))));
      }
      case "Scanner":
        return { t: "ref", id: this.alloc({ kind: "scanner" }) };
      case "BufferedReader":
      case "InputStreamReader":
        return { t: "ref", id: this.alloc({ kind: "reader" }) };
      case "Random":
        return { t: "ref", id: this.alloc({ kind: "random", seed: a0 ? numOf(a0) : 42 }) };
      case "StringTokenizer": {
        const s = a0 && a0.t === "str" ? a0.v : "";
        const delims = args[1] && args[1].t === "str" ? args[1].v : " \t\n\r";
        const toks = s.split(new RegExp(`[${delims.replace(/[\]\\^-]/g, "\\$&")}]+`)).filter(Boolean);
        return { t: "ref", id: this.alloc({ kind: "tokenizer", toks, i: 0 }) };
      }
      case "String":
      case "string": {
        if (!a0) return STR("");
        if (a0.t === "str") return STR(a0.v);
        if (isNum(a0) && args[1]) return STR(String.fromCharCode(numOf(args[1])).repeat(numOf(a0)));
        const s = this.seqOf(a0);
        if (s) return STR(s.items.map((c) => String.fromCharCode(numOf(c))).join(""));
        return STR("");
      }
      case "Integer":
      case "Long":
      case "Double":
        return this.coerce(a0 ?? INT(0), simpleType(name));
      case "Object":
        return { t: "ref", id: this.alloc({ kind: "obj", cls: "Object", fields: new Map(), fieldTypes: new Map(), valueSem: false }) };
      // ----- C++ -----
      case "vector":
      case "array":
      case "list":
      case "deque": {
        const ctype: SeqCtype = name === "deque" ? "deque" : name === "list" ? "list" : "vector";
        const elem = targs[0] ?? null;
        let items: V[] = [];
        if (a0 && a0.t === "ptr" && args[1]?.t === "ptr") items = this.iterRange(a0, args[1]);
        else if (a0 && a0.t === "ref") items = (fromColl(a0) ?? []).map((x) => this.copyIfValue(x));
        else if (a0 && isNum(a0)) {
          const n = numOf(a0);
          if (n < 0 || n > 100000) this.err(`Cannot make a ${name} of size ${n}`);
          items = Array.from({ length: n }, () => (args[1] ? this.copyIfValue(this.coerce(args[1], elem)) : elem ? this.defaultVal(elem, "zero") : INT(0)));
        } else if (name === "array" && targs[1]?.num) {
          items = Array.from({ length: targs[1].num }, () => (elem ? this.defaultVal(elem, "zero") : INT(0)));
        }
        return this.mkSeq(ctype, label, elem, vs, items);
      }
      case "stack":
      case "queue":
        return this.mkSeq(name, label, targs[0] ?? null, vs, (fromColl(a0) ?? []).map((x) => this.copyIfValue(x)));
      case "priority_queue": {
        let cmp: HSeq["cmp"] = (x, y) => natCompare(this)(y, x); // max-heap by default
        const ct = targs[2]?.name;
        if (ct === "greater" || ct === "greater_equal") cmp = natCompare(this);
        const fn = args.find((x) => x.t === "func");
        if (fn && fn.t === "func") {
          if (fn.cmp === "greater") cmp = natCompare(this);
          else if (fn.cmp !== "less") cmp = (x, y) => (this.truthy(fn.call([y, x])) ? -1 : this.truthy(fn.call([x, y])) ? 1 : 0);
        }
        const r = this.mkSeq("pq", label, targs[0] ?? null, vs, [], cmp);
        if (a0 && a0.t === "ptr" && args[1]?.t === "ptr") for (const x of this.iterRange(a0, args[1])) this.pqPush(this.seqOf(r)!, x);
        return r;
      }
      case "map":
      case "unordered_map":
      case "multimap":
        return this.mkMap(label, targs[0] ?? null, targs[1] ?? null, vs, name === "unordered_map" ? null : natCompare(this));
      case "set":
      case "unordered_set":
      case "multiset": {
        const r = this.mkSeq("set", label, targs[0] ?? null, vs, [], name === "unordered_set" ? null : natCompare(this));
        const h = this.seqOf(r)!;
        h.multi = name === "multiset";
        if (a0 && a0.t === "ptr" && args[1]?.t === "ptr") for (const x of this.iterRange(a0, args[1])) this.setAdd(h, x);
        else for (const x of fromColl(a0) ?? []) this.setAdd(h, x);
        return r;
      }
      case "pair":
        return this.mkPair(this.coerce(a0 ?? INT(0), targs[0] ?? null), this.coerce(args[1] ?? INT(0), targs[1] ?? null), targs[0] ?? null, targs[1] ?? null);
      case "greater":
      case "greater_equal":
        return { t: "func", name: "greater", cmp: "greater", call: ([x, y]) => this.boolV(natCompare(this)(x, y) > 0) };
      case "less":
      case "less_equal":
        return { t: "func", name: "less", cmp: "less", call: ([x, y]) => this.boolV(natCompare(this)(x, y) < 0) };
      case "function":
        return a0 ?? NULL;
      default:
        if (PRIMS.has(name) || name === "auto") return a0 ? this.coerce(a0, type) : this.defaultVal(type, "zero");
        return this.err(`Unknown type '${name}'`);
    }
  }

  iterRange(a: V, b: V): V[] {
    if (a.t !== "ptr" || b.t !== "ptr") this.err("Expected two iterators");
    const la = a.loc;
    const lb = b.loc;
    if (la.k === "elem" && lb.k === "elem") {
      const h = this.obj(la.id);
      if (h.kind === "seq") return h.items.slice(la.idx, lb.idx);
      if (h.kind === "map") return h.keys.slice(la.idx, lb.idx).map((_, i) => this.entryPair(h, la.idx + i));
    }
    if (la.k === "strchar" && lb.k === "strchar") {
      const s = this.read(la.base);
      if (s.t === "str") return [...s.v.slice(la.idx, lb.idx)].map((c) => CHR(c.charCodeAt(0)));
    }
    return this.err("Unsupported iterator range");
  }

  /** C-style arrays: int a[3][4] = {...}. */
  makeCArray(elem: TypeRef, dims: number[], init: Expr | null, fill: "zero" | "uninit"): V {
    const base: TypeRef = { ...elem, dims: 0, ref: false };
    // any { } initializer zero-fills the parts it does not mention: int a[5][5] = {0};
    if (init) fill = "zero";
    const build = (level: number, list: Expr | null, strInit: string | null): V => {
      let n = dims[level];
      const isLast = level === dims.length - 1;
      if (strInit !== null && isLast) {
        if (!n) n = strInit.length + 1;
        const items = Array.from({ length: n }, (_, i) => CHR(i < strInit.length ? strInit.charCodeAt(i) : 0));
        return this.mkSeq("array", `${tname(base)}[${n}]`, base, false, items);
      }
      const listItems = list && list.k === "list" ? list.items : null;
      if (!n) n = listItems ? listItems.length : 0;
      const items: V[] = [];
      for (let i = 0; i < n; i++) {
        const it = listItems?.[i] ?? null;
        if (!isLast) items.push(build(level + 1, it, it && it.k === "str" ? it.v : null));
        else if (it) items.push(this.coerce(this.ev(it, base), base));
        else items.push(list ? this.defaultVal(base, "zero") : this.defaultVal(base, fill));
      }
      const label = `${tname(base)}${dims.slice(level).map((d, i) => `[${i === 0 ? n : d || ""}]`).join("")}`;
      return this.mkSeq("array", label, isLast ? base : { ...base, ptr: base.ptr + 1 }, false, items);
    };
    return build(0, init, init && init.k === "str" ? init.v : null);
  }

  /** Java arrays: new int[n][m] and {1, 2, 3} initializers. */
  makeJavaArray(elem: TypeRef, totalDims: number, sizes: (number | null)[], init: Expr | null): V {
    const inner: TypeRef = { ...elem, dims: totalDims - 1 };
    const label = tname({ ...elem, dims: totalDims, args: [] });
    if (init && init.k === "list") {
      const items = init.items.map((x) => (totalDims > 1 && x.k === "list" ? this.makeJavaArray(elem, totalDims - 1, [], x) : this.coerce(this.ev(x, inner), inner)));
      return this.mkSeq("array", label, inner, false, items);
    }
    const n = sizes[0];
    if (n === null || n === undefined) return NULL;
    if (n < 0) this.err(`Negative array size: ${n}`, "index");
    if (n > 100000) this.err(`Array of size ${n} is too big to visualize`);
    const items = Array.from({ length: n }, () =>
      totalDims > 1 ? (sizes.length > 1 && sizes[1] !== null ? this.makeJavaArray(elem, totalDims - 1, sizes.slice(1), null) : NULL) : this.defaultVal(inner, "zero"),
    );
    return this.mkSeq("array", label, inner, false, items);
  }

  /** Builds a value from a { ... } list for the given type. */
  buildList(e: Expr & { k: "list" }, type: TypeRef | null): V {
    if (!type || type.name === "auto") {
      if (e.items.length === 2 && !this.java && e.items.every((x) => x.k !== "list")) {
        // {a, b} with unknown type: most often a pair
      }
      const items = e.items.map((x) => this.ev(x));
      return this.mkSeq("vector", "initializer_list", null, true, items);
    }
    if (type.dims > 0) return this.makeJavaArray({ ...type, dims: 0 }, type.dims, [], e);
    const n = type.name;
    const elem = type.args[0] ?? null;
    if (PRIMS.has(n) || n === "string" || n === "String") return e.items[0] ? this.coerce(this.ev(e.items[0], type), type) : this.defaultVal(type, "zero");
    if (n === "pair") return this.mkPair(this.coerce(this.ev(e.items[0], type.args[0]), type.args[0] ?? null), this.coerce(this.ev(e.items[1], type.args[1]), type.args[1] ?? null), type.args[0] ?? null, type.args[1] ?? null);
    if (n === "map" || n === "unordered_map" || n === "multimap") {
      const r = this.newLib(type, [], true, null);
      const h = this.obj((r as { id: number }).id) as HMap;
      for (const it of e.items) {
        if (it.k !== "list" || it.items.length !== 2) this.err("Map entries must look like {key, value}");
        this.mapPut(h, this.ev(it.items[0], type.args[0]), this.coerce(this.ev(it.items[1], type.args[1]), type.args[1] ?? null));
      }
      return r;
    }
    const cls = this.findClass(n);
    if (cls) {
      const args = e.items.map((x) => this.ev(x));
      return this.construct(cls, args, true);
    }
    const r = this.newLib(type, [], true, null);
    const h = r.t === "ref" ? this.heap.get(r.id) : undefined;
    if (h && h.kind === "seq") {
      for (const it of e.items) {
        const v = this.coerce(this.ev(it, elem), elem);
        if (h.ctype === "set") this.setAdd(h, v);
        else if (h.ctype === "pq") this.pqPush(h, v);
        else h.items.push(this.copyIfValue(v));
      }
    }
    return r;
  }

  // ---------- expressions ----------
  ev(e: Expr, expect?: TypeRef | null): V {
    this.tick();
    switch (e.k) {
      case "num":
        if (e.isFloat) return DBL(e.v);
        if (e.isLong || Math.abs(e.v) > 2147483647) return LONG(e.v);
        return INT(e.v);
      case "str":
        return STR(e.v);
      case "char":
        return CHR(e.v.charCodeAt(0));
      case "bool":
        return this.boolV(e.v);
      case "null":
        return NULL;
      case "this":
        if (!this.frame.thisRef) this.err("'this' can only be used inside a method");
        return this.frame.thisRef;
      case "name":
        return this.evName(e.name);
      case "bin":
        return this.evBin(e);
      case "logic": {
        const l = this.truthy(this.ev(e.l));
        if (e.op === "&&" ? !l : l) return this.boolV(l);
        return this.boolV(this.truthy(this.ev(e.r)));
      }
      case "un": {
        const v = this.ev(e.e);
        if (e.op === "!") return this.boolV(!this.truthy(v));
        const n = this.num(v);
        if (e.op === "-") return v.t === "double" ? DBL(-n) : v.t === "long" ? LONG(-n) : INT(-n);
        if (e.op === "~") return v.t === "long" ? LONG(-n - 1) : INT(~n);
        return v.t === "char" || v.t === "bool" ? INT(n) : v;
      }
      case "incdec": {
        const loc = this.lv(e.e);
        const old = this.read(loc);
        if (old.t === "uninit") this.err(`Variable '${this.text(e.e)}' is used before it has a value`);
        let nv: V;
        if (old.t === "ptr" || (old.t === "ref" && !this.java && this.seqOf(old)?.ctype === "array")) nv = this.ptrAdd(old, e.op === "++" ? 1 : -1);
        else {
          const n = this.num(old) + (e.op === "++" ? 1 : -1);
          nv = old.t === "double" ? DBL(n) : old.t === "long" ? LONG(n) : old.t === "char" ? CHR(n) : INT(n);
        }
        this.write(loc, nv);
        return e.prefix ? this.read(loc) : old;
      }
      case "assign":
        return this.evAssign(e);
      case "cond": {
        const c = this.truthy(this.ev(e.c));
        return c ? this.ev(e.a, expect) : this.ev(e.b, expect);
      }
      case "call":
        return this.evCall(e);
      case "index": {
        const base = this.ev(e.obj);
        if (base.t === "str") {
          const i = this.num(this.ev(e.idx));
          if (i < 0 || i > base.v.length) this.err(`String index ${i} out of range (length ${base.v.length})`, "index");
          return CHR(i === base.v.length ? 0 : base.v.charCodeAt(i));
        }
        return this.read(this.lv(e));
      }
      case "member":
        return memberValue(this, e);
      case "scope":
        return callScope(this, e, null);
      case "new":
        return this.evNew(e, expect ?? null);
      case "cast":
        return this.cast(this.ev(e.e, e.type), e.type);
      case "deref": {
        const p = this.ev(e.e);
        return this.read(this.locFromPtr(p));
      }
      case "addr": {
        if (e.e.k === "name") {
          const v = this.evName(e.e.name);
          if (v.t === "func") return v;
        }
        return { t: "ptr", loc: this.lv(e.e) };
      }
      case "sizeof":
        return this.evSizeof(e);
      case "list":
        return this.buildList(e, expect ?? null);
      case "lambda":
        return this.makeLambda(e);
      case "construct":
        if (e.brace && e.args.length !== 1) return this.buildList({ ...e, k: "list", items: e.args }, e.type);
        return this.constructType(e.type, e.args.map((a, i) => this.ev(a, e.type.args[i])), true, expect);
      case "instanceof": {
        const v = this.ev(e.e);
        if (v.t !== "ref") return this.boolV(false);
        const h = this.heap.get(v.id);
        let cls = h && h.kind === "obj" ? this.findClass(h.cls) : undefined;
        while (cls) {
          if (cls.name === e.type.name) return this.boolV(true);
          cls = cls.superName ? this.findClass(cls.superName) : undefined;
        }
        return this.boolV(false);
      }
    }
  }

  evName(name: string): V {
    const b = this.lookup(name);
    if (b) {
      const v = this.read(b.loc);
      return v;
    }
    const en = this.prog.enums.get(name);
    if (en !== undefined) return INT(en);
    const consts: Record<string, V> = {
      INT_MAX: INT(2147483647), INT_MIN: INT(-2147483648), LLONG_MAX: LONG(Number.MAX_SAFE_INTEGER), LLONG_MIN: LONG(Number.MIN_SAFE_INTEGER),
      LONG_MAX: LONG(Number.MAX_SAFE_INTEGER), LONG_MIN: LONG(Number.MIN_SAFE_INTEGER), UINT_MAX: LONG(4294967295), INT64_MAX: LONG(Number.MAX_SAFE_INTEGER),
      INFINITY: DBL(Infinity), EOF: INT(-1), RAND_MAX: INT(2147483647), M_PI: DBL(Math.PI), FLT_MAX: DBL(3.4028235e38), DBL_MAX: DBL(Number.MAX_VALUE),
    };
    if (!this.java && consts[name]) return consts[name];
    if (["cout", "cin", "cerr", "endl"].includes(name) && !this.java) return { t: "stream", name: name as "cout" };
    if (name === "fixed" && !this.java) return { t: "manip", kind: "fixed" };
    if (name === "boolalpha" && !this.java) return { t: "manip", kind: "boolalpha" };
    if (name === "stdin" || name === "stdout") return { t: "static", name };
    const fns = this.prog.funcs.filter((f) => f.name === name);
    if (fns.length) {
      const fn = fns[0];
      return { t: "func", name, call: (args) => this.callUser(fn, args.map((v) => ({ v, loc: null })), null) };
    }
    if (this.java || this.findClass(name)) return { t: "static", name };
    return this.err(this.java ? `cannot find symbol: ${name}` : `'${name}' was not declared in this scope`);
  }

  private evBin(e: Expr & { k: "bin" }): V {
    // C++ streams: cout << x, cin >> x
    if (e.op === "<<" || e.op === ">>") {
      const l = this.ev(e.l);
      if (l.t === "stream") {
        if (e.op === "<<") {
          const r = this.ev(e.r);
          if (l.name !== "cerr") this.out += this.coutStr(r);
          return l;
        }
        const loc = this.lv(e.r);
        this.cinRead(loc);
        return l;
      }
      return this.binop(e.op, l, this.ev(e.r));
    }
    const l = this.ev(e.l);
    const r = this.ev(e.r);
    return this.binop(e.op, l, r);
  }

  cinRead(loc: Loc) {
    const t = this.typeOfLoc(loc);
    const cur = this.read(loc);
    const tn = t?.name ?? (cur.t === "str" ? "string" : cur.t);
    if (tn === "char") {
      const c = this.input.char(true);
      if (c === null) {
        this.cinOk = false;
        return;
      }
      this.write(loc, CHR(c.charCodeAt(0)));
      return;
    }
    const tok = this.input.token();
    if (tok === null) {
      this.cinOk = false;
      return;
    }
    if (tn === "string" || tn === "str") this.write(loc, STR(tok));
    else if (tn === "double" || tn === "float") this.write(loc, DBL(Number(tok)));
    else {
      const n = Number(tok);
      if (Number.isNaN(n)) {
        this.cinOk = false;
        return;
      }
      this.write(loc, tn === "long" ? LONG(n) : INT(n));
    }
  }

  binop(op: string, a: V, b: V): V {
    // pointer arithmetic
    if ((op === "+" || op === "-") && (a.t === "ptr" || (a.t === "ref" && !this.java && this.seqOf(a)?.ctype === "array")) && isNum(b)) {
      return this.ptrAdd(a, op === "+" ? numOf(b) : -numOf(b));
    }
    if (op === "+" && isNum(a) && (b.t === "ptr" || (b.t === "ref" && !this.java && this.seqOf(b)?.ctype === "array"))) return this.ptrAdd(b, numOf(a));
    if (op === "-" && (a.t === "ptr" || a.t === "ref") && (b.t === "ptr" || b.t === "ref") && !this.java) {
      const la = this.locFromPtr(a);
      const lb = this.locFromPtr(b);
      if ((la.k === "elem" && lb.k === "elem") || (la.k === "strchar" && lb.k === "strchar")) return INT(la.idx - lb.idx);
    }
    // strings
    if (op === "+" && (a.t === "str" || b.t === "str")) {
      if (this.java) return STR(this.jstr(a) + this.jstr(b));
      const s = (v: V) => (v.t === "str" ? v.v : v.t === "char" ? String.fromCharCode(v.v) : this.err(`Cannot add ${this.describe(v)} to a string`));
      return STR(s(a) + s(b));
    }
    if (op === "+" && this.java && (a.t === "null" || b.t === "null" || a.t === "ref" || b.t === "ref")) {
      if (a.t === "str" || b.t === "str") return STR(this.jstr(a) + this.jstr(b));
    }
    if (a.t === "str" && b.t === "str") {
      const c = a.v < b.v ? -1 : a.v > b.v ? 1 : 0;
      switch (op) {
        case "==": return this.boolV(c === 0);
        case "!=": return this.boolV(c !== 0);
        case "<": return this.boolV(c < 0);
        case ">": return this.boolV(c > 0);
        case "<=": return this.boolV(c <= 0);
        case ">=": return this.boolV(c >= 0);
      }
    }
    if (op === "==" || op === "!=") {
      if (!isNum(a) && a.t !== "bool" || !isNum(b) && b.t !== "bool") {
        let eq: boolean;
        if (a.t === "ref" && b.t === "ref" && !this.java && this.isValueObj(a.id)) eq = natCompare(this)(a, b) === 0;
        else if ((a.t === "ref" || a.t === "ptr") && (b.t === "ref" || b.t === "ptr") && a.t !== b.t) {
          const la = this.locFromPtr(a);
          const lb = this.locFromPtr(b);
          eq = la.k === "elem" && lb.k === "elem" && la.id === lb.id && la.idx === lb.idx;
        } else eq = this.valEq(a, b);
        return this.boolV(op === "==" ? eq : !eq);
      }
    }
    if ((a.t === "ref" || b.t === "ref") && ["<", ">", "<=", ">="].includes(op) && !this.java) {
      const c = natCompare(this)(a, b);
      return this.boolV(op === "<" ? c < 0 : op === ">" ? c > 0 : op === "<=" ? c <= 0 : c >= 0);
    }
    if (a.t === "uninit" || b.t === "uninit") this.err(`A variable is used before it has a value (it holds garbage). Initialize it first.`);
    const x = this.num(a);
    const y = this.num(b);
    const isD = a.t === "double" || b.t === "double";
    const isL = !isD && (a.t === "long" || b.t === "long");
    const wrap = (n: number): V => (isD ? DBL(n) : isL ? LONG(n) : INT(n));
    switch (op) {
      case "+": return wrap(x + y);
      case "-": return wrap(x - y);
      case "*": {
        if (!isD && !isL) {
          const r = INT(Math.imul(x, y)) as V & { size?: unknown };
          const sz = (a.t === "int" && a.size) || (b.t === "int" && b.size);
          if (sz) return { t: "int", v: x * y, size: { type: sz.type, count: sz.count * (a.t === "int" && a.size ? y : x) } };
          return r;
        }
        return wrap(x * y);
      }
      case "/":
        if (!isD && y === 0) this.err("/ by zero", "arith");
        return isD ? DBL(x / y) : wrap(Math.trunc(x / y));
      case "%":
        if (!isD && y === 0) this.err("/ by zero", "arith");
        return wrap(x % y);
      case "<": return this.boolV(x < y);
      case ">": return this.boolV(x > y);
      case "<=": return this.boolV(x <= y);
      case ">=": return this.boolV(x >= y);
      case "==": return this.boolV(x === y);
      case "!=": return this.boolV(x !== y);
      case "&": return a.t === "bool" && b.t === "bool" ? this.boolV(!!(x & y)) : isL ? LONG(Number(BigInt.asIntN(64, BigInt(x) & BigInt(y)))) : INT(x & y);
      case "|": return a.t === "bool" && b.t === "bool" ? this.boolV(!!(x | y)) : isL ? LONG(Number(BigInt.asIntN(64, BigInt(x) | BigInt(y)))) : INT(x | y);
      case "^": return a.t === "bool" && b.t === "bool" ? this.boolV(!!(x ^ y)) : isL ? LONG(Number(BigInt.asIntN(64, BigInt(x) ^ BigInt(y)))) : INT(x ^ y);
      case "<<": return isL || a.t === "long" ? LONG(x * 2 ** y) : INT(x << y);
      case ">>": return a.t === "long" ? LONG(Math.floor(x / 2 ** y)) : INT(x >> y);
      case ">>>": return INT(x >>> y);
    }
    return this.err(`Unsupported operator ${op}`);
  }

  ptrAdd(p: V, n: number): V {
    const loc = this.locFromPtr(p);
    if (loc.k === "elem") return { t: "ptr", loc: { k: "elem", id: loc.id, idx: loc.idx + n } };
    if (loc.k === "strchar") return { t: "ptr", loc: { ...loc, idx: loc.idx + n } };
    return this.err("Pointer arithmetic only works on arrays");
  }

  locFromPtr(p: V): Loc {
    if (p.t === "ptr") return p.loc;
    if (p.t === "ref") {
      const h = this.heap.get(p.id);
      if (h && h.kind === "seq") return { k: "elem", id: p.id, idx: 0 };
      this.err("Cannot dereference an object directly; use -> or .");
    }
    if (p.t === "null" || p.t === "uninit") this.err(`Dereferenced a ${p.t === "null" ? "NULL" : "garbage"} pointer`, "null");
    return this.err(`Cannot dereference ${this.describe(p)}`);
  }

  private evAssign(e: Expr & { k: "assign" }): V {
    // C++ map: mp[key] = value
    const loc = this.lv(e.target);
    const type = this.typeOfLoc(loc);
    if (e.op === "=") {
      const v = this.ev(e.value, type);
      if (loc.k === "cell" && loc.cell.type && loc.cell.type.ref === false && !this.java) {
        /* value copy handled in write */
      }
      this.write(loc, v);
      return this.read(loc);
    }
    const old = this.read(loc);
    if (old.t === "uninit") this.err(`Variable '${this.text(e.target)}' is used before it has a value`);
    const r = this.ev(e.value);
    let nv = this.binop(e.op.slice(0, -1), old, r);
    // compound assignment keeps the variable's type (Java implicit cast, C conversion)
    if (old.t === "char" && isNum(nv)) nv = CHR(numOf(nv));
    else if (old.t === "int" && nv.t === "double") nv = INT(Math.trunc(nv.v));
    else if (old.t === "int" && nv.t === "long") nv = INT(nv.v);
    this.write(loc, nv);
    return this.read(loc);
  }

  /** Evaluates an expression to a storage location (for assignment, ++, &x, references). */
  lv(e: Expr): Loc {
    switch (e.k) {
      case "name": {
        const b = this.lookup(e.name);
        if (!b) this.err(this.java ? `cannot find symbol: ${e.name}` : `'${e.name}' was not declared in this scope`);
        return b.loc;
      }
      case "index": {
        const base = this.ev(e.obj);
        if (base.t === "str") {
          const bl = this.lv(e.obj);
          return { k: "strchar", base: bl, idx: this.num(this.ev(e.idx)) };
        }
        if (base.t === "ref") {
          const h = this.obj(base.id);
          if (h.kind === "map") {
            const key = this.coerce(this.ev(e.idx, h.keyT), h.keyT);
            if (this.mapFind(h, key) < 0) this.mapPut(h, key, h.valT ? this.defaultVal(h.valT, "zero") : INT(0));
            return { k: "mapval", id: base.id, key };
          }
          if (h.kind === "seq") {
            const i = this.num(this.ev(e.idx), "an index");
            if (i < 0 || i >= h.items.length) {
              const what = this.java ? "" : h.ctype === "array" ? " (in C/C++ this reads memory outside the array: undefined behavior)" : " (out of range for this vector)";
              this.err(`Index ${i} out of bounds for length ${h.items.length}${what}`, "index");
            }
            return { k: "elem", id: base.id, idx: i };
          }
        }
        if (base.t === "ptr") {
          const p = this.ptrAdd(base, this.num(this.ev(e.idx)));
          return (p as { loc: Loc }).loc;
        }
        if (base.t === "null") this.err(`Cannot index into ${this.nullText()} ('${this.text(e.obj)}' is ${this.nullText()})`, "null");
        if (base.t === "uninit") this.err(`'${this.text(e.obj)}' is used before it has a value`);
        return this.err(`'${this.text(e.obj)}' cannot be indexed with [ ]`);
      }
      case "member": {
        const ov = this.ev(e.obj);
        const id = this.objId(ov, e);
        const h = this.obj(id);
        if (h.kind === "map" && ov.t === "ptr" && ov.loc.k === "elem") {
          // it->second = x
          if (e.name === "second") return { k: "mapval", id, key: h.keys[ov.loc.idx] };
          this.err("Map keys cannot be changed");
        }
        if (h.kind !== "obj") this.err(`'${this.text(e.obj)}' has no field '${e.name}'`);
        if (!h.fields.has(e.name)) this.err(`'${h.cls}' has no field '${e.name}'`);
        return { k: "field", id, name: e.name };
      }
      case "deref":
        return this.locFromPtr(this.ev(e.e));
      case "scope":
      case "call": {
        // functions returning references: v.back() = x, mp.at(k) = x
        if (e.k === "call" && e.callee.k === "member") {
          const r = callMemberExpr(this, e.callee, e, true);
          if (r && "__loc" in (r as object)) return (r as unknown as { __loc: Loc }).__loc;
        }
        return this.err(`Cannot assign to '${this.text(e)}'`);
      }
      case "this":
        return this.err("Cannot assign to this");
      default: {
        // temporary value
        const v = this.ev(e);
        return { k: "cell", cell: { v, type: null }, name: "temp" };
      }
    }
  }

  objId(v: V, e: Expr & { k: "member" }): number {
    if (v.t === "ref") return v.id;
    if (v.t === "ptr") {
      if (v.loc.k === "elem") {
        const h = this.obj(v.loc.id);
        if (h.kind === "map") return v.loc.id;
      }
      const inner = this.read(v.loc);
      if (inner.t === "ref") return inner.id;
    }
    if (v.t === "null")
      this.err(
        this.java
          ? `Cannot read field "${e.name}" because "${this.text(e.obj)}" is null`
          : `'${this.text(e.obj)}' is ${this.nullText()}, so '${this.text(e)}' does not exist`,
        "null",
      );
    if (v.t === "uninit") this.err(`'${this.text(e.obj)}' is used before it has a value`, "null");
    return this.err(`'${this.text(e.obj)}' is not an object`);
  }

  private evNew(e: Expr & { k: "new" }, expect: TypeRef | null): V {
    const t = e.type;
    if (e.dims.length || t.dims > 0 || e.init) {
      const totalDims = t.dims + e.dims.length;
      const sizes = e.dims.map((d) => (d ? this.num(this.ev(d), "an array size") : null));
      if (!this.java) {
        // C++ new int[n]
        const n = sizes[0] ?? 0;
        return this.mkSeq("array", `${tname(t)}[${n}]`, t, false, Array.from({ length: n }, () => this.defaultVal(t, e.args.length || e.init ? "zero" : "zero")));
      }
      return this.makeJavaArray({ ...t, dims: 0 }, totalDims, sizes, e.init);
    }
    const args = e.args.map((a) => this.ev(a));
    return this.constructType(t, args, false, expect);
  }

  cast(v: V, t: TypeRef): V {
    if (t.ptr > 0 || t.dims > 0) return v;
    const n = WRAPPERS[t.name] ?? t.name;
    if (v.t === "null" || v.t === "ref" || v.t === "str") {
      if (n === "string" || n === "String" || !PRIMS.has(n)) return v;
    }
    switch (n) {
      case "int":
      case "short":
      case "byte":
        return INT(Math.trunc(this.num(v)));
      case "long":
        return LONG(this.num(v));
      case "double":
      case "float":
        return DBL(this.num(v));
      case "char":
        return CHR(Math.trunc(this.num(v)));
      case "bool":
      case "boolean":
        return { t: "bool", v: this.truthy(v) };
      default:
        return v;
    }
  }

  sizeOfType(t: TypeRef): number {
    if (t.ptr > 0) return 8;
    switch (t.name) {
      case "char":
      case "bool":
        return 1;
      case "short":
        return 2;
      case "int":
      case "float":
        return 4;
      case "long":
      case "double":
        return 8;
    }
    const cls = this.findClass(t.name);
    if (cls) return cls.fields.reduce((s, f) => s + this.sizeOfType({ ...f.type, ptr: f.type.ptr + f.decl.ptr }), 0) || 1;
    return 8;
  }

  private evSizeof(e: Expr & { k: "sizeof" }): V {
    if (e.type) return { t: "int", v: this.sizeOfType(e.type), size: { type: e.type, count: 1 } };
    const v = this.mute++ >= 0 ? this.ev(e.e!) : UNINIT;
    this.mute--;
    const s = this.seqOf(v);
    if (s && s.ctype === "array" && s.elem) {
      const es = this.sizeOfType(s.elem.ptr > 0 && s.items[0]?.t === "ref" ? { ...s.elem, ptr: 0 } : s.elem);
      const inner = s.items[0] && s.items[0].t === "ref" ? numOf(this.evSizeofValue(s.items[0])) : es;
      return INT(inner * s.items.length);
    }
    return this.evSizeofValue(v);
  }
  private evSizeofValue(v: V): V {
    const s = this.seqOf(v);
    if (s && s.ctype === "array" && s.elem) {
      const inner = s.items[0] && s.items[0].t === "ref" ? numOf(this.evSizeofValue(s.items[0])) : this.sizeOfType(s.elem);
      return INT(inner * s.items.length);
    }
    switch (v.t) {
      case "char":
      case "bool":
        return INT(1);
      case "int":
        return INT(4);
      case "double":
      case "long":
        return INT(8);
      default:
        return INT(8);
    }
  }

  makeLambda(e: Expr & { k: "lambda" }): V {
    const captured = this.frame;
    const scopes = [...captured.scopes];
    return {
      t: "func",
      name: "lambda",
      call: (args: V[]) => {
        const f: RFrame = { id: -2, name: "lambda", line: e.line, scopes: [...scopes, new Map()], thisRef: captured.thisRef, cls: captured.cls, display: false };
        this.frames.push(f);
        this.mute++;
        try {
          e.params.forEach((p, i) => this.declare(p.name, args[i] ?? UNINIT, p.type));
          if ("k" in e.body && (e.body as Stmt).k === "block" && "body" in e.body) {
            try {
              this.exec(e.body as Stmt);
            } catch (r) {
              if (r instanceof ReturnSig) return r.v;
              throw r;
            }
            return VOID;
          }
          return this.ev(e.body as Expr);
        } finally {
          this.mute--;
          this.frames.pop();
        }
      },
    };
  }

  // ---------- calls ----------
  evArgs(fn: FuncDecl, args: Expr[]): Arg[] {
    return args.map((a, i) => {
      const p = fn.params[Math.min(i, fn.params.length - 1)];
      if (p?.type?.ref && !this.java) {
        const loc = this.lv(a);
        return { v: this.read(loc), loc };
      }
      return { v: this.ev(a, p?.type ?? null), loc: null };
    });
  }

  invoke(fn: FuncDecl, args: Expr[], thisRef: V | null): V {
    return this.callUser(fn, this.evArgs(fn, args), thisRef);
  }

  callUser(fn: FuncDecl, args: Arg[], thisRef: V | null): V {
    if (this.frames.filter((f) => f.display).length >= MAX_DEPTH)
      this.err(this.java ? "Too many nested calls (infinite recursion?)" : "Stack overflow: too many nested calls (infinite recursion? check the base case)", "stack");
    const callerLine = this.curLine;
    const frame: RFrame = { id: this.nextFrameId++, name: fn.name, line: fn.line, scopes: [new Map()], thisRef, cls: fn.cls, display: true };
    // evaluate default params in caller context first
    const finalArgs = fn.params.map((p, i) => args[i] ?? (p.def ? { v: this.ev(p.def, p.type), loc: null } : null));
    this.frames.push(frame);
    try {
      fn.params.forEach((p, i) => {
        const a = finalArgs[i];
        if (!a) this.err(`${fn.name}() expects ${fn.params.length} argument(s)`);
        const hidden = this.java && fn.name === "main" && p.name === "args";
        if (p.type?.ref && a.loc && !this.java) this.alias(p.name, a.loc, p.type);
        else this.declare(p.name, a.v, p.type, hidden);
      });
      this.snap(fn.line, "call");
      if (fn.isCtor) {
        for (const ini of fn.inits) {
          this.curLine = ini.line;
          const ft = ((this.obj((thisRef as { id: number }).id) as HObj).fieldTypes.get(ini.name)) ?? null;
          const vals = ini.args.map((x) => this.ev(x, ft));
          const isClassT = ft && ft.ptr === 0 && ft.dims === 0 && !PRIMS.has(ft.name) && ft.name !== "string";
          const v = isClassT && (vals.length !== 1 || vals[0].t !== "ref") ? this.constructType(ft, vals, true) : vals[0] ?? (ft ? this.defaultVal(ft, "zero") : INT(0));
          this.write({ k: "field", id: (thisRef as { id: number }).id, name: ini.name }, v);
        }
      }
      let ret: V = VOID;
      try {
        if (fn.body) this.exec(fn.body);
        if (fn.ret && fn.ret.name !== "void" && fn.name !== "main" && !fn.isCtor && fn.ret.ptr === 0 && !this.java) {
          /* falling off the end of a non-void function: undefined in C/C++ */
        }
        this.snap(fn.endLine, "return", { ret: (fn.name === "main" && !this.java ? INT(0) : VOID) as unknown as DVal });
        if (fn.name === "main" && !this.java) ret = INT(0);
      } catch (r) {
        if (r instanceof ReturnSig) ret = r.v;
        else throw r;
      }
      return ret;
    } finally {
      this.frames.pop();
      this.curLine = callerLine;
    }
  }

  evCall(e: Expr & { k: "call" }): V {
    const c = e.callee;
    if (c.k === "name") {
      const name = c.name;
      if ((name === "super" || name === "this") && this.java) {
        const fr = this.frame;
        const h = fr.thisRef && fr.thisRef.t === "ref" ? (this.obj(fr.thisRef.id) as HObj) : null;
        const cls = h ? this.findClass(fr.cls ?? h.cls) : undefined;
        const target = name === "super" ? (cls?.superName ? this.findClass(cls.superName) : undefined) : cls;
        if (!target) return VOID;
        const ctor = this.pickFn(target.ctors, e.args.length);
        if (ctor) this.invoke(ctor, e.args, fr.thisRef);
        return VOID;
      }
      const b = this.lookup(name);
      if (b) {
        const fv = this.read(b.loc);
        if (fv.t === "func") return fv.call(e.args.map((a) => this.ev(a)));
      }
      const fr = this.frame;
      if (fr.cls) {
        const m = this.findMethod(fr.cls, name, e.args.length);
        if (m) return this.invoke(m, e.args, m.isStatic && this.java ? null : fr.thisRef);
      }
      const cands = this.prog.funcs.filter((f) => f.name === name);
      if (cands.length) {
        const fn = cands.length === 1 ? cands[0] : this.pickFn(cands, e.args.length, e.args.map((a) => { this.mute++; try { return this.ev(a); } catch { return UNINIT; } finally { this.mute--; } }));
        if (fn) return this.invoke(fn, e.args, null);
      }
      const cls = this.findClass(name);
      if (cls && !this.java) return this.construct(cls, e.args.map((a) => this.ev(a)), true);
      const r = callFree(this, name, e);
      if (r !== undefined) return r;
      return this.err(this.java ? `cannot find symbol: method ${name}()` : `'${name}' was not declared in this scope`);
    }
    if (c.k === "member") return callMemberExpr(this, c, e, false) as V;
    if (c.k === "scope") return callScope(this, c, e);
    const fv = this.ev(c);
    if (fv.t === "func") return fv.call(e.args.map((a) => this.ev(a)));
    return this.err(`'${this.text(c)}' is not a function`);
  }

  // ---------- statements ----------
  pushScope() {
    this.frame.scopes.push(new Map());
  }
  popScope() {
    this.frame.scopes.pop();
  }

  exec(s: Stmt) {
    this.tick();
    switch (s.k) {
      case "block":
        this.pushScope();
        try {
          for (const st of s.body) this.exec(st);
        } finally {
          this.popScope();
        }
        return;
      case "empty":
        return;
      case "decl":
        this.snap(s.line);
        this.execDecl(s);
        return;
      case "expr":
        this.snap(s.line);
        this.ev(s.e);
        return;
      case "if": {
        this.snap(s.line);
        const v = this.truthy(this.ev(s.c));
        this.pendingCond = { kw: "if", expr: this.text(s.c), value: v };
        if (v) this.exec(s.then);
        else if (s.else) this.exec(s.else);
        return;
      }
      case "while":
        for (;;) {
          this.snap(s.line);
          const v = this.truthy(this.ev(s.c));
          this.pendingCond = { kw: "while", expr: this.text(s.c), value: v };
          if (!v) break;
          try {
            this.exec(s.body);
          } catch (x) {
            if (x instanceof BreakSig) break;
            if (!(x instanceof ContinueSig)) throw x;
          }
        }
        return;
      case "dowhile":
        for (;;) {
          try {
            this.exec(s.body);
          } catch (x) {
            if (x instanceof BreakSig) break;
            if (!(x instanceof ContinueSig)) throw x;
          }
          this.snap(s.condLine);
          const v = this.truthy(this.ev(s.c));
          this.pendingCond = { kw: "do-while", expr: this.text(s.c), value: v };
          if (!v) break;
        }
        return;
      case "for": {
        this.pushScope();
        try {
          this.snap(s.line);
          if (s.init) {
            if (s.init.k === "decl") this.execDecl(s.init);
            else if (s.init.k === "expr") this.ev(s.init.e);
            else if (s.init.k === "block") for (const x of s.init.body) if (x.k === "expr") this.ev(x.e);
          }
          for (let first = true; ; first = false) {
            if (!first) {
              this.snap(s.line);
              for (const u of s.update) this.ev(u);
            }
            if (s.c) {
              const v = this.truthy(this.ev(s.c));
              this.pendingCond = { kw: "for", expr: this.text(s.c), value: v };
              if (!v) break;
            }
            try {
              this.exec(s.body);
            } catch (x) {
              if (x instanceof BreakSig) break;
              if (!(x instanceof ContinueSig)) throw x;
            }
          }
        } finally {
          this.popScope();
        }
        return;
      }
      case "foreach":
        return this.execForeach(s);
      case "return": {
        this.snap(s.line);
        const fnRet = this.currentFnRet();
        const v = s.e ? this.coerce(this.ev(s.e, fnRet), fnRet) : VOID;
        this.snap(s.line, "return", { ret: v as unknown as DVal });
        throw new ReturnSig(v);
      }
      case "break":
        this.snap(s.line);
        throw new BreakSig();
      case "continue":
        this.snap(s.line);
        throw new ContinueSig();
      case "switch":
        return this.execSwitch(s);
      case "try":
        return this.execTry(s);
      case "throw": {
        this.snap(s.line);
        const v = s.e ? this.ev(s.e) : NULL;
        let name = "Exception";
        let msg = "";
        if (v.t === "ref") {
          const h = this.heap.get(v.id);
          if (h && h.kind === "obj") {
            name = h.cls;
            const m = h.fields.get("message");
            msg = m && m.t === "str" ? m.v : "";
          }
        } else if (v.t === "str") msg = v.v;
        else msg = this.jstr(v);
        throw new ThrowSig(v, name, msg);
      }
      case "delete":
        this.snap(s.line);
        this.ev(s.e);
        return;
    }
  }

  private fnRetStack: (TypeRef | null)[] = [];
  currentFnRet(): TypeRef | null {
    const f = this.frame;
    const fn = this.prog.funcs.find((x) => x.name === f.name) ?? (f.cls ? this.findMethod(f.cls, f.name, -1) : undefined);
    if (fn) return fn.ret;
    if (f.cls) {
      const cls = this.findClass(f.cls);
      const m = cls?.methods.find((x) => x.name === f.name);
      if (m) return m.ret;
    }
    return null;
  }

  execDecl(s: Stmt & { k: "decl" }, global = false) {
    for (const d of s.decls) {
      this.curLine = d.line;
      const type: TypeRef = { ...s.type, ptr: s.type.ptr + d.ptr, ref: s.type.ref || d.ref };
      if (d.bindings) {
        const v = d.init ? this.ev(d.init) : UNINIT;
        this.bindStructured(d.bindings, v, type.ref);
        continue;
      }
      if (d.dims.length && !this.java) {
        const dims = d.dims.map((x) => (x ? this.num(this.ev(x), "an array size") : 0));
        const arr = this.makeCArray(type, dims, d.init, global ? "zero" : "uninit");
        this.declare(d.name, arr, { ...type, ptr: type.ptr + 1 });
        continue;
      }
      if (d.dims.length && this.java) type.dims += d.dims.length;
      if (type.ref && d.init && !this.java) {
        const loc = this.lv(d.init);
        this.alias(d.name, loc, type);
        continue;
      }
      let v: V;
      if (d.ctorArgs) v = this.constructType(type, d.ctorArgs.map((a, i) => this.ev(a, type.args[i])), true, type);
      else if (d.init) v = this.ev(d.init, type);
      else if (this.java) v = global ? this.defaultVal(type, "zero") : UNINIT;
      else v = this.defaultVal(type, global ? "zero" : "uninit");
      let declType: TypeRef | null = type;
      if (type.name === "auto") declType = null;
      if (type.name === "auto" && v.t === "ref" && d.init && d.init.k !== "new") {
        /* auto copies values in C++ */
      }
      this.declare(d.name, v, declType);
    }
  }

  private bindStructured(names: string[], v: V, byRef: boolean) {
    if (v.t === "ref") {
      const h = this.obj(v.id);
      if (h.kind === "obj") {
        const fields = [...h.fields.keys()];
        names.forEach((n, i) => (byRef ? this.alias(n, { k: "field", id: v.id, name: fields[i] }, null) : this.declare(n, h.fields.get(fields[i]) ?? UNINIT, null)));
        return;
      }
      if (h.kind === "seq") {
        names.forEach((n, i) => (byRef ? this.alias(n, { k: "elem", id: v.id, idx: i }, null) : this.declare(n, h.items[i] ?? UNINIT, null)));
        return;
      }
    }
    this.err("Structured binding needs a pair, struct or array");
  }

  private execForeach(s: Stmt & { k: "foreach" }) {
    this.snap(s.line);
    const coll = this.ev(s.iter);
    type Item = { v: V; loc: Loc | null; key?: V; mapId?: number };
    let items: Item[] = [];
    if (coll.t === "str") items = [...coll.v].map((c) => ({ v: CHR(c.charCodeAt(0)), loc: null }));
    else if (coll.t === "ref") {
      const h = this.obj(coll.id);
      if (h.kind === "seq") {
        items = h.items.map((v, i) => ({ v, loc: { k: "elem", id: coll.id, idx: i } as Loc }));
        if (h.ctype === "sb") items = h.items.map((v) => ({ v, loc: null }));
      } else if (h.kind === "map") {
        items = h.keys.map((k, i) => ({ v: this.mkPair(k, h.vals[i], h.keyT, h.valT), loc: null, key: k, mapId: coll.id }));
      } else this.err(`Cannot loop over ${this.describe(coll)}`);
    } else if (coll.t === "null") this.err(`Cannot loop over ${this.nullText()}`, "null");
    else this.err(`Cannot loop over ${this.describe(coll)}`);
    const exprText = this.text(s.iter);
    for (let i = 0; i <= items.length; i++) {
      if (i > 0) this.snap(s.line);
      if (i === items.length) {
        this.pendingCond = { kw: "foreach", expr: exprText, value: false };
        break;
      }
      const it = items[i];
      this.pushScope();
      try {
        if (s.bindings) {
          if (it.mapId !== undefined && s.bindings.length === 2) {
            if (s.ref) {
              this.declare(s.bindings[0], it.key!, null);
              this.alias(s.bindings[1], { k: "mapval", id: it.mapId, key: it.key! }, null);
            } else {
              const h = this.obj(it.mapId) as HMap;
              this.declare(s.bindings[0], it.key!, h.keyT);
              this.declare(s.bindings[1], h.vals[i], h.valT);
            }
          } else this.bindStructured(s.bindings, it.v, s.ref);
        } else if (s.ref && it.loc && !this.java) this.alias(s.name, it.loc, s.type);
        else this.declare(s.name, it.v, s.type.name === "auto" ? null : s.type);
        this.pendingCond = { kw: "foreach", expr: exprText, value: true };
        try {
          this.exec(s.body);
        } catch (x) {
          if (x instanceof BreakSig) {
            this.pendingCond = null;
            break;
          }
          if (!(x instanceof ContinueSig)) throw x;
        }
      } finally {
        this.popScope();
      }
    }
  }

  private execSwitch(s: Stmt & { k: "switch" }) {
    this.snap(s.line);
    const v = this.ev(s.e);
    let start = s.cases.findIndex((c) => c.tests?.some((t) => this.valEq(v, this.ev(t))));
    if (start >= 0) {
      const c = s.cases[start];
      this.pendingCond = { kw: "switch", expr: `${this.text(s.e)} == ${c.tests!.map((t) => this.text(t)).join(" or ")}`, value: true };
    } else start = s.cases.findIndex((c) => c.tests === null);
    if (start < 0) return;
    this.pushScope();
    try {
      for (let i = start; i < s.cases.length; i++) for (const st of s.cases[i].body) this.exec(st);
    } catch (x) {
      if (!(x instanceof BreakSig)) throw x;
    } finally {
      this.popScope();
    }
  }

  private execTry(s: Stmt & { k: "try" }) {
    const depth = this.frames.length;
    try {
      this.exec(s.block);
    } catch (x) {
      let name: string | null = null;
      let val: V = NULL;
      let msg = "";
      if (x instanceof ThrowSig) {
        name = x.name;
        val = x.v;
        msg = x.msg;
      } else if (x instanceof CodeError && x.kind === "runtime") {
        name = (x as CodeError & { excName?: string }).excName ?? "RuntimeException";
        msg = x.message.replace(/^\w+(Exception|Error): /, "");
      }
      if (name === null) throw x;
      while (this.frames.length > depth) this.frames.pop();
      const handler = s.catches.find((c) => {
        if (!c.type) return true;
        const n = c.type.name;
        return ["Exception", "Throwable", "RuntimeException", "exception", "Error"].includes(n) || n === name || (val.t === "str" && (n === "char" || n === "string"));
      });
      if (!handler) throw x;
      if (val.t === "null") {
        val = { t: "ref", id: this.alloc({ kind: "obj", cls: name, fields: new Map([["message", STR(msg)]]), fieldTypes: new Map(), valueSem: false }) };
      }
      this.pushScope();
      try {
        if (handler.name) this.declare(handler.name, val, handler.type);
        this.exec(handler.body);
      } finally {
        this.popScope();
      }
    } finally {
      if (s.fin) this.exec(s.fin);
    }
  }

  // ---------- printing ----------
  jdouble(x: number): string {
    if (Number.isNaN(x)) return "NaN";
    if (!Number.isFinite(x)) return x > 0 ? "Infinity" : "-Infinity";
    const a = Math.abs(x);
    if (a !== 0 && (a >= 1e7 || a < 1e-3)) {
      const [m, ex] = x.toExponential().split("e");
      return `${m.includes(".") ? m : m + ".0"}E${Number(ex)}`;
    }
    return Number.isInteger(x) ? x.toFixed(1) : String(x);
  }

  jstr(v: V, depth = 0): string {
    switch (v.t) {
      case "int":
      case "long":
        return String(v.v);
      case "double":
        return this.jdouble(v.v);
      case "char":
        return String.fromCharCode(v.v);
      case "bool":
        return v.v ? "true" : "false";
      case "str":
        return v.v;
      case "null":
        return "null";
      case "ref": {
        const h = this.heap.get(v.id);
        if (!h || depth > 3) return "…";
        if (h.kind === "seq") {
          if (h.ctype === "sb") return h.items.map((c) => String.fromCharCode(numOf(c))).join("");
          if (h.ctype === "array") {
            const code = { int: "I", long: "J", double: "D", char: "C", bool: "Z", boolean: "Z" }[h.elem?.name ?? ""] ?? `L${h.elem?.name ?? "Object"};`;
            return `[${code}@${(0x1b6d3586 + v.id * 7919).toString(16)}`;
          }
          const items = h.frontTop ? h.items : h.items;
          return `[${items.map((x) => this.jstr(x, depth + 1)).join(", ")}]`;
        }
        if (h.kind === "map") return `{${h.keys.map((k, i) => `${this.jstr(k, depth + 1)}=${this.jstr(h.vals[i], depth + 1)}`).join(", ")}}`;
        if (h.kind === "obj") {
          const m = this.findMethod(h.cls, "toString", 0);
          if (m) {
            this.mute++;
            try {
              const r = this.callUser(m, [], v);
              return r.t === "str" ? r.v : this.jstr(r);
            } finally {
              this.mute--;
            }
          }
          if (h.cls === "Entry") return `${this.jstr(h.fields.get("key")!)}=${this.jstr(h.fields.get("value")!)}`;
          if (h.fields.has("message") && /Exception|Error/.test(h.cls)) return `java.lang.${h.cls}: ${this.jstr(h.fields.get("message")!)}`;
          return `${h.cls}@${(0x4e25154f + v.id * 7919).toString(16)}`;
        }
        return h.kind;
      }
      case "func":
        return "lambda";
      default:
        return "";
    }
  }

  coutStr(v: V): string {
    switch (v.t) {
      case "stream":
        return v.name === "endl" ? "\n" : "";
      case "manip":
        if (v.kind === "fixed") this.cout.fixed = true;
        if (v.kind === "prec") this.cout.prec = v.n ?? 6;
        if (v.kind === "boolalpha") this.cout.boolalpha = true;
        return "";
      case "int":
      case "long":
        return String(v.v);
      case "double": {
        if (this.cout.fixed) return v.v.toFixed(this.cout.prec);
        if (!Number.isFinite(v.v)) return Number.isNaN(v.v) ? "nan" : v.v > 0 ? "inf" : "-inf";
        const s = Number(v.v.toPrecision(this.cout.prec));
        const a = Math.abs(s);
        if (a !== 0 && (a >= 10 ** this.cout.prec || a < 1e-4)) {
          const [m, ex] = s.toExponential().split("e");
          const n = Number(ex);
          return `${m}e${n < 0 ? "-" : "+"}${String(Math.abs(n)).padStart(2, "0")}`;
        }
        return String(s);
      }
      case "char":
        return String.fromCharCode(v.v);
      case "bool":
        return this.cout.boolalpha ? (v.v ? "true" : "false") : v.v ? "1" : "0";
      case "str":
        return v.v;
      case "null":
        return "0";
      case "ref": {
        const s = this.seqOf(v);
        if (s && s.ctype === "array" && s.elem?.name === "char") return this.cString(s);
        return `0x${(0x7ffd5000 + v.id * 16).toString(16)}`;
      }
      case "ptr":
        return `0x${(0x7ffd6000 + (v.loc.k === "elem" ? v.loc.id * 64 + v.loc.idx * 4 : 8)).toString(16)}`;
      case "uninit":
        return "32767";
      default:
        return "";
    }
  }

  // ---------- run ----------
  run(): TraceResult {
    const result: TraceResult = { steps: this.steps, lang: this.lang === "c" ? "c" : this.lang === "cpp" ? "cpp" : "java", maxSteps: MAX_STEPS };
    try {
      // globals and static fields
      for (const g of this.prog.globals) {
        if (g.k !== "decl") continue;
        this.snap(g.line);
        this.execDecl(g, true);
      }
      for (const cls of this.prog.classes.values()) {
        for (const b of cls.initBlocks) {
          if (this.java) {
            this.frames.push({ id: this.nextFrameId++, name: `${cls.name} (static)`, line: b.line, scopes: [new Map()], thisRef: null, cls: cls.name, display: true });
            try {
              this.exec(b);
            } finally {
              this.frames.pop();
            }
          }
        }
      }
      const main = this.prog.funcs.find((f) => f.name === "main");
      if (!main) {
        result.error = this.java ? "No 'public static void main(String[] args)' method found" : "No main() function found";
        result.syntax = true;
        return result;
      }
      const args: Arg[] = main.params.length ? [{ v: this.mkSeq("array", "String[]", simpleType("String"), false, []), loc: null }] : [];
      this.callUser(main, args, null);
      this.finish();
    } catch (x) {
      if (x instanceof StepLimit) {
        result.limit = true;
      } else if (x instanceof ExitSig) {
        this.finish();
      } else if (x instanceof CodeError) {
        this.fail(result, x.message, x.line);
      } else if (x instanceof ThrowSig) {
        const msg = this.java ? `${x.name}${x.msg ? `: ${x.msg}` : ""}` : `terminate called after throwing an instance of '${x.name}'${x.msg ? `\n  what(): ${x.msg}` : ""}`;
        this.fail(result, msg, this.curLine);
      } else if (x instanceof ReturnSig || x instanceof BreakSig || x instanceof ContinueSig) {
        this.finish();
      } else {
        const m = x instanceof Error ? x.message : String(x);
        this.fail(result, x instanceof RangeError ? "Stack overflow: too many nested calls" : `Internal error: ${m}`, this.curLine);
      }
    }
    result.out = this.out;
    return result;
  }

  private finish() {
    this.frames = [];
    try {
      this.snap(this.curLine, "return", { ret: VOID as unknown as DVal });
      const last = this.steps[this.steps.length - 1];
      if (last) last.func = "Global";
    } catch {
      /* step limit */
    }
  }

  private fail(result: TraceResult, msg: string, line: number) {
    result.error = msg;
    result.errorLine = line;
    this.mute = 0;
    this.pendingCond = null;
    try {
      if (this.steps.length < MAX_STEPS + 1) this.steps.push(this.snapshot(line, "exception", { exc: msg }));
    } catch {
      /* ignore */
    }
  }
}
