// Standard library for the Java / C / C++ interpreter: I/O, strings, containers, Math, algorithms.
import type { Expr } from "./ast";
import type { Interp } from "./interpreter";
import { ExitSig } from "./interpreter";
import { simpleType } from "./parser";
import { CHR, DBL, type H, type HMap, type HObj, type HSeq, INT, isNum, LONG, type Loc, NULL, numOf, STR, type V, VOID } from "./values";

type Call = Expr & { k: "call" };
type Member = Expr & { k: "member" };
type Scope = Expr & { k: "scope" };
export type LocResult = { __loc: Loc };

// ---------- comparison ----------
export function natCompare(it: Interp) {
  const cmp = (a: V, b: V): number => {
    if ((isNum(a) || a.t === "bool") && (isNum(b) || b.t === "bool")) {
      const d = numOf(a) - numOf(b);
      return d < 0 ? -1 : d > 0 ? 1 : 0;
    }
    if (a.t === "str" && b.t === "str") return a.v < b.v ? -1 : a.v > b.v ? 1 : 0;
    if (a.t === "null" || b.t === "null") return a.t === b.t ? 0 : a.t === "null" ? -1 : 1;
    if (a.t === "ref" && b.t === "ref") {
      const ha = it.heap.get(a.id);
      const hb = it.heap.get(b.id);
      if (ha?.kind === "obj" && hb?.kind === "obj") {
        const m = it.findMethod(ha.cls, "compareTo", 1);
        if (m) {
          it.mute++;
          try {
            return numOf(it.callUser(m, [{ v: b, loc: null }], a));
          } finally {
            it.mute--;
          }
        }
        for (const [k, x] of ha.fields) {
          const c = cmp(x, hb.fields.get(k) ?? NULL);
          if (c) return c;
        }
        return 0;
      }
      if (ha?.kind === "seq" && hb?.kind === "seq") {
        for (let i = 0; i < Math.min(ha.items.length, hb.items.length); i++) {
          const c = cmp(ha.items[i], hb.items[i]);
          if (c) return c;
        }
        return ha.items.length - hb.items.length;
      }
    }
    return 0;
  };
  return cmp;
}

/** Turns a comparator value into a JS compare function. Java comparators return ints; C++ ones return "a goes first". */
function cmpFn(it: Interp, f: V | undefined, javaStyle: boolean): (a: V, b: V) => number {
  const nat = natCompare(it);
  if (!f || f.t !== "func") return nat;
  if (f.cmp === "greater") return (a, b) => nat(b, a);
  if (f.cmp === "less") return nat;
  if (javaStyle) return (a, b) => numOf(f.call([a, b]));
  return (a, b) => (it.truthy(f.call([a, b])) ? -1 : it.truthy(f.call([b, a])) ? 1 : 0);
}

// ---------- formatting ----------
export function cformat(it: Interp, fmt: string, args: V[], java: boolean): string {
  let ai = 0;
  return fmt.replace(/%([-+ 0#,]*)(\d+|\*)?(?:\.(\d+))?(hh|h|ll|l|L|z|j|t)?([diouxXfFeEgGcspnbB%])/g, (_m, flags: string, w: string, p: string, _len, spec: string) => {
    if (spec === "%") return "%";
    if (spec === "n") return "\n";
    let width = w === "*" ? numOf(args[ai++]) : w ? Number(w) : 0;
    const prec = p !== undefined ? Number(p) : undefined;
    const v = args[ai++] ?? INT(0);
    let s: string;
    switch (spec) {
      case "d":
      case "i":
      case "u": {
        const n = Math.trunc(numOf(v));
        s = String(Math.abs(n));
        if (flags.includes(",")) s = s.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        s = (n < 0 ? "-" : flags.includes("+") ? "+" : flags.includes(" ") ? " " : "") + s;
        break;
      }
      case "f":
      case "F": {
        const n = numOf(v);
        s = n.toFixed(prec ?? 6);
        if (flags.includes(",")) {
          const [a, b] = s.split(".");
          s = a.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + (b ? "." + b : "");
        }
        if (flags.includes("+") && n >= 0) s = "+" + s;
        break;
      }
      case "e":
      case "E": {
        const [m, ex] = numOf(v).toExponential(prec ?? 6).split("e");
        const n = Number(ex);
        s = `${m}e${n < 0 ? "-" : "+"}${String(Math.abs(n)).padStart(2, "0")}`;
        if (spec === "E") s = s.toUpperCase();
        break;
      }
      case "g":
      case "G":
        s = String(Number(numOf(v).toPrecision(prec || 6)));
        break;
      case "c":
        s = v.t === "str" ? v.v[0] ?? "" : String.fromCharCode(numOf(v));
        break;
      case "s": {
        if (v.t === "str") s = v.v;
        else if (v.t === "null") s = java ? "null" : "(null)";
        else if (v.t === "ref" && !java) {
          const sq = it.seqOf(v);
          s = sq ? it.cString(sq) : it.jstr(v);
        } else s = java ? it.jstr(v) : it.coutStr(v);
        if (prec !== undefined) s = s.slice(0, prec);
        break;
      }
      case "b":
      case "B":
        s = v.t === "null" ? "false" : v.t === "bool" ? String(v.v) : "true";
        break;
      case "x":
      case "X":
        s = (numOf(v) >>> 0).toString(16);
        if (spec === "X") s = s.toUpperCase();
        break;
      case "o":
        s = (numOf(v) >>> 0).toString(8);
        break;
      case "p":
        s = it.coutStr(v);
        break;
      default:
        s = "";
    }
    if (width && s.length < width) {
      if (flags.includes("-")) s = s.padEnd(width);
      else if (flags.includes("0") && /[diufFeEgGxXo]/.test(spec)) {
        const neg = s.startsWith("-") || s.startsWith("+");
        s = (neg ? s[0] : "") + s.slice(neg ? 1 : 0).padStart(width - (neg ? 1 : 0), "0");
      } else s = s.padStart(width);
    }
    width = 0;
    return s;
  });
}

function scanf(it: Interp, fmt: string, ptrs: V[]): V {
  let count = 0;
  let pi = 0;
  const specs = fmt.match(/\s*%[*]?\d*(hh|h|ll|l|L)?[diufFeEgGcsxX]|[^%\s]+/g) ?? [];
  for (const sp of specs) {
    const m = sp.match(/(\s*)%(\*?)\d*(hh|h|ll|l|L)?([diufFeEgGcsxX])/);
    if (!m) continue;
    const kind = m[4];
    const skip = !!m[2];
    let val: V | null = null;
    if (kind === "c") {
      const c = it.input.char(m[1].length > 0);
      if (c === null) return INT(count || -1);
      val = CHR(c.charCodeAt(0));
    } else {
      const tok = it.input.token();
      if (tok === null) return INT(count || -1);
      if (kind === "s") val = STR(tok);
      else if ("fFeEgG".includes(kind)) val = DBL(Number(tok));
      else if (kind === "x" || kind === "X") val = INT(parseInt(tok, 16));
      else {
        const n = parseInt(tok, 10);
        if (Number.isNaN(n)) return INT(count);
        val = m[3] === "l" || m[3] === "ll" ? LONG(n) : INT(n);
      }
    }
    if (skip) continue;
    const p = ptrs[pi++];
    if (!p) it.err("scanf has more % specifiers than variables");
    if (kind === "s" && val.t === "str") {
      const arr = p.t === "ref" ? it.seqOf(p) : null;
      if (arr) {
        const s = val.v;
        for (let i = 0; i <= s.length && i < arr.items.length; i++) arr.items[i] = CHR(i < s.length ? s.charCodeAt(i) : 0);
      } else if (p.t === "ptr") it.write(p.loc, val);
    } else {
      if (p.t !== "ptr") it.err("scanf needs the address of a variable: use &x");
      it.write(p.loc, val);
    }
    count++;
  }
  return INT(count);
}

// ---------- helpers ----------
const evAll = (it: Interp, args: Expr[]) => args.map((a) => it.ev(a));
const elemRange = (it: Interp, a: V, b: V) => {
  const la = it.locFromPtr(a);
  const lb = it.locFromPtr(b);
  if (la.k === "elem" && lb.k === "elem" && la.id === lb.id) {
    const h = it.obj(la.id);
    if (h.kind === "seq") return { h, from: la.idx, to: lb.idx, id: la.id };
  }
  return null;
};
const strRange = (it: Interp, a: V, b: V) => {
  if (a.t === "ptr" && b.t === "ptr" && a.loc.k === "strchar" && b.loc.k === "strchar") {
    const s = it.read(a.loc.base);
    if (s.t === "str") return { base: a.loc.base, s: s.v, from: a.loc.idx, to: b.loc.idx };
  }
  return null;
};
const ptrTo = (id: number, idx: number): V => ({ t: "ptr", loc: { k: "elem", id, idx } });
const numResult = (a: V, b: V, n: number): V => (a.t === "double" || b.t === "double" ? DBL(n) : a.t === "long" || b.t === "long" ? LONG(n) : a.t === "char" && b.t === "char" ? CHR(n) : INT(n));

function mathFn(it: Interp, name: string, a: V[]): V | undefined {
  const x = a[0] ? numOf(a[0]) : 0;
  switch (name) {
    case "abs":
    case "labs":
    case "llabs":
      return a[0].t === "double" ? DBL(Math.abs(x)) : a[0].t === "long" ? LONG(Math.abs(x)) : INT(Math.abs(x));
    case "fabs":
      return DBL(Math.abs(x));
    case "sqrt":
      return DBL(Math.sqrt(x));
    case "cbrt":
      return DBL(Math.cbrt(x));
    case "pow":
      return DBL(x ** numOf(a[1]));
    case "floor":
      return DBL(Math.floor(x));
    case "ceil":
      return DBL(Math.ceil(x));
    case "round":
      return it.java ? (a[0].t === "double" ? LONG(Math.round(x)) : INT(Math.round(x))) : DBL(Math.round(x));
    case "trunc":
      return DBL(Math.trunc(x));
    case "log":
      return DBL(Math.log(x));
    case "log2":
      return DBL(Math.log2(x));
    case "log10":
      return DBL(Math.log10(x));
    case "exp":
      return DBL(Math.exp(x));
    case "sin":
      return DBL(Math.sin(x));
    case "cos":
      return DBL(Math.cos(x));
    case "tan":
      return DBL(Math.tan(x));
    case "atan":
      return DBL(Math.atan(x));
    case "atan2":
      return DBL(Math.atan2(x, numOf(a[1])));
    case "hypot":
      return DBL(Math.hypot(x, numOf(a[1])));
    case "fmax":
      return DBL(Math.max(x, numOf(a[1])));
    case "fmin":
      return DBL(Math.min(x, numOf(a[1])));
    case "signum":
      return DBL(Math.sign(x));
    case "toRadians":
      return DBL((x * Math.PI) / 180);
    case "floorDiv":
      return INT(Math.floor(x / numOf(a[1])));
    case "floorMod": {
      const y = numOf(a[1]);
      return INT(((x % y) + y) % y);
    }
    case "random":
      it.rand = (it.rand * 1103515245 + 12345) % 2147483648;
      return DBL(it.rand / 2147483648);
    case "max":
    case "min": {
      if (a.length < 2) return undefined;
      const [p, q] = a;
      if (p.t === "str" && q.t === "str") return (name === "max" ? p.v >= q.v : p.v <= q.v) ? p : q;
      const pick = name === "max" ? Math.max(numOf(p), numOf(q)) : Math.min(numOf(p), numOf(q));
      return numResult(p, q, pick);
    }
  }
  return undefined;
}

function charFn(name: string, c: number): V | undefined {
  const ch = String.fromCharCode(c);
  switch (name) {
    case "isDigit":
    case "isdigit":
      return { t: "bool", v: /[0-9]/.test(ch) };
    case "isLetter":
    case "isalpha":
    case "isAlphabetic":
      return { t: "bool", v: /[A-Za-z]/.test(ch) };
    case "isLetterOrDigit":
    case "isalnum":
      return { t: "bool", v: /[A-Za-z0-9]/.test(ch) };
    case "isUpperCase":
    case "isupper":
      return { t: "bool", v: /[A-Z]/.test(ch) };
    case "isLowerCase":
    case "islower":
      return { t: "bool", v: /[a-z]/.test(ch) };
    case "isWhitespace":
    case "isspace":
      return { t: "bool", v: /\s/.test(ch) };
    case "ispunct":
      return { t: "bool", v: /[!-/:-@[-`{-~]/.test(ch) };
    case "toUpperCase":
    case "toupper":
      return CHR(ch.toUpperCase().charCodeAt(0));
    case "toLowerCase":
    case "tolower":
      return CHR(ch.toLowerCase().charCodeAt(0));
    case "getNumericValue":
      return INT(/[0-9]/.test(ch) ? c - 48 : /[a-z]/i.test(ch) ? ch.toLowerCase().charCodeAt(0) - 87 : -1);
  }
  return undefined;
}

function seqToStr(it: Interp, h: HSeq): string {
  return h.items.map((c) => (c.t === "str" ? c.v : String.fromCharCode(numOf(c)))).join("");
}

// ---------- free functions (C / C++) ----------
export function callFree(it: Interp, name: string, e: Call): V | undefined {
  const A = () => evAll(it, e.args);
  if (it.java) return undefined;
  switch (name) {
    case "printf": {
      const [f, ...rest] = A();
      it.out += cformat(it, f.t === "str" ? f.v : "", rest, false);
      return INT(0);
    }
    case "sprintf": {
      const [buf, f, ...rest] = A();
      const s = cformat(it, f.t === "str" ? f.v : "", rest, false);
      const arr = it.seqOf(buf);
      if (arr) for (let i = 0; i <= s.length && i < arr.items.length; i++) arr.items[i] = CHR(i < s.length ? s.charCodeAt(i) : 0);
      return INT(s.length);
    }
    case "puts": {
      const [s] = A();
      it.out += (s.t === "str" ? s.v : it.coutStr(s)) + "\n";
      return INT(0);
    }
    case "putchar": {
      it.out += String.fromCharCode(numOf(A()[0]));
      return INT(0);
    }
    case "scanf": {
      const [f, ...ptrs] = A();
      return scanf(it, f.t === "str" ? f.v : "", ptrs);
    }
    case "getchar": {
      const c = it.input.char(false);
      return INT(c === null ? -1 : c.charCodeAt(0));
    }
    case "gets":
    case "fgets": {
      const [buf] = A();
      const line = it.input.line();
      const arr = it.seqOf(buf);
      if (line === null) return NULL;
      const s = name === "fgets" ? line + "\n" : line;
      if (arr) for (let i = 0; i <= s.length && i < arr.items.length; i++) arr.items[i] = CHR(i < s.length ? s.charCodeAt(i) : 0);
      return buf;
    }
    case "fflush":
      return INT(0);
    case "malloc":
    case "calloc": {
      const a = A();
      const sz = name === "calloc" ? { n: numOf(a[0]), meta: a[1] } : { n: 1, meta: a[0] };
      const meta = sz.meta && sz.meta.t === "int" ? sz.meta.size : undefined;
      if (!meta) it.err(`${name} needs sizeof(...) so the visualizer knows what you are allocating, e.g. malloc(n * sizeof(int))`);
      const count = meta.count * sz.n;
      const fill = name === "calloc" ? "zero" : "uninit";
      const cls = it.findClass(meta.type.name);
      if (cls && meta.type.ptr === 0) {
        const mk = () => {
          const r = it.construct(cls, [], false);
          const h = it.obj((r as { id: number }).id) as HObj;
          if (fill === "uninit") for (const k of h.fields.keys()) h.fields.set(k, { t: "uninit" });
          return r;
        };
        if (count === 1) return mk();
        return it.mkSeq("array", `${meta.type.name}[${count}]`, meta.type, false, Array.from({ length: count }, mk));
      }
      return it.mkSeq("array", `${meta.type.name}${"*".repeat(meta.type.ptr)}[${count}]`, meta.type, false, Array.from({ length: count }, () => it.defaultVal(meta.type, fill)));
    }
    case "realloc": {
      const [p, size] = A();
      const h = it.seqOf(p);
      const meta = size.t === "int" ? size.size : undefined;
      if (!h || !meta) return it.err("realloc needs an array and n * sizeof(type)");
      while (h.items.length < meta.count) h.items.push({ t: "uninit" });
      h.items.length = meta.count;
      return p;
    }
    case "free":
      A();
      return VOID;
    case "memset": {
      const [p, val] = A();
      const h = it.seqOf(p);
      if (h) {
        const fill = (s: HSeq) => s.items.forEach((x, i) => (x.t === "ref" && it.seqOf(x) ? fill(it.seqOf(x)!) : (s.items[i] = it.coerce(INT(numOf(val) === 255 ? -1 : numOf(val)), s.elem))));
        fill(h);
      }
      return p;
    }
    case "memcpy": {
      const [d, s, n] = A();
      const hd = it.seqOf(d);
      const hs = it.seqOf(s);
      if (hd && hs) {
        const cnt = Math.min(hs.items.length, Math.round(numOf(n) / Math.max(1, it.sizeOfType(hs.elem ?? simpleType("int")))));
        for (let i = 0; i < cnt; i++) hd.items[i] = hs.items[i];
      }
      return d;
    }
    case "strlen": {
      const [s] = A();
      if (s.t === "str") return INT(s.v.length);
      const h = it.seqOf(s);
      return INT(h ? it.cString(h).length : 0);
    }
    case "strcpy":
    case "strncpy":
    case "strcat": {
      const [d, s, n] = A();
      const src = s.t === "str" ? s.v : it.seqOf(s) ? it.cString(it.seqOf(s)!) : "";
      const h = it.seqOf(d);
      if (!h) return d;
      const start = name === "strcat" ? it.cString(h).length : 0;
      const text = name === "strncpy" ? src.slice(0, numOf(n)) : src;
      for (let i = 0; i <= text.length && start + i < h.items.length; i++) h.items[start + i] = CHR(i < text.length ? text.charCodeAt(i) : 0);
      return d;
    }
    case "strcmp":
    case "strncmp": {
      const [a, b, n] = A();
      const s = (v: V) => (v.t === "str" ? v.v : it.seqOf(v) ? it.cString(it.seqOf(v)!) : "");
      let x = s(a);
      let y = s(b);
      if (name === "strncmp") {
        x = x.slice(0, numOf(n));
        y = y.slice(0, numOf(n));
      }
      return INT(x < y ? -1 : x > y ? 1 : 0);
    }
    case "atoi":
    case "stoi":
    case "stol":
    case "stoll":
    case "atol": {
      const [s] = A();
      const str = s.t === "str" ? s.v : it.seqOf(s) ? it.cString(it.seqOf(s)!) : "";
      const n = parseInt(str, 10);
      if (Number.isNaN(n) && name.startsWith("sto")) it.err(`invalid_argument: ${name}("${str}")`);
      return name.endsWith("l") || name.endsWith("ll") ? LONG(n || 0) : INT(n || 0);
    }
    case "stod":
    case "stof":
    case "atof": {
      const [s] = A();
      return DBL(parseFloat(s.t === "str" ? s.v : "0") || 0);
    }
    case "to_string": {
      const [v] = A();
      return STR(v.t === "double" ? v.v.toFixed(6) : v.t === "char" ? String(v.v) : String(numOf(v)));
    }
    case "isdigit":
    case "isalpha":
    case "isalnum":
    case "isupper":
    case "islower":
    case "isspace":
    case "ispunct": {
      const r = charFn(name, numOf(A()[0]));
      return r && r.t === "bool" ? (it.lang === "c" ? INT(r.v ? 1 : 0) : r) : r;
    }
    case "toupper":
    case "tolower": {
      const r = charFn(name, numOf(A()[0]))!;
      return it.lang === "c" ? INT(numOf(r)) : r;
    }
    case "max":
    case "min": {
      if (e.args.length === 1 && e.args[0].k === "list") {
        const items = evAll(it, e.args[0].items);
        return items.reduce((m, x) => mathFn(it, name, [m, x])!);
      }
      const a = A();
      if (a.length === 3) {
        const c = cmpFn(it, a[2], false);
        return name === "max" ? (c(a[0], a[1]) < 0 ? a[1] : a[0]) : c(a[1], a[0]) < 0 ? a[1] : a[0];
      }
      return mathFn(it, name, a);
    }
    case "swap": {
      const la = it.lv(e.args[0]);
      const lb = it.lv(e.args[1]);
      const x = it.read(la);
      const y = it.read(lb);
      it.write(la, y);
      it.write(lb, x);
      return VOID;
    }
    case "make_pair": {
      const [a, b] = A();
      return it.mkPair(a, b);
    }
    case "getline": {
      const loc = it.lv(e.args[1]);
      const line = it.input.line();
      if (line === null) it.cinOk = false;
      else it.write(loc, STR(line));
      return { t: "stream", name: "cin" };
    }
    case "setprecision":
      return { t: "manip", kind: "prec", n: numOf(A()[0]) };
    case "setw":
      return { t: "manip", kind: "noop" };
    case "exit":
      throw new ExitSig();
    case "rand":
      it.rand = (it.rand * 1103515245 + 12345) % 2147483648;
      return INT(it.rand);
    case "srand":
      it.rand = numOf(A()[0]) || 1;
      return VOID;
    case "time":
      return LONG(0);
    case "assert": {
      const [c] = A();
      if (!it.truthy(c)) it.err(`Assertion failed: ${it.text(e.args[0])}`);
      return VOID;
    }
    case "gcd":
    case "__gcd":
    case "lcm": {
      const [a, b] = A().map(numOf);
      const g = (x: number, y: number): number => (y === 0 ? Math.abs(x) : g(y, x % y));
      return name === "lcm" ? INT(Math.abs(a * b) / g(a, b)) : INT(g(a, b));
    }
    case "begin":
    case "end": {
      const [c] = A();
      const h = it.seqOf(c);
      if (!h || c.t !== "ref") return it.err(`${name}() needs a container`);
      return ptrTo(c.id, name === "begin" ? 0 : h.items.length);
    }
    case "distance": {
      const [a, b] = A();
      return INT((it.locFromPtr(b) as { idx: number }).idx - (it.locFromPtr(a) as { idx: number }).idx);
    }
    case "sort":
    case "stable_sort":
    case "reverse":
    case "max_element":
    case "min_element":
    case "accumulate":
    case "count":
    case "find":
    case "fill":
    case "lower_bound":
    case "upper_bound":
    case "binary_search":
    case "iota":
    case "unique":
    case "next_permutation":
    case "prev_permutation":
    case "count_if":
      return algorithm(it, name, A());
  }
  const m = mathFn(it, name, e.args.length ? A() : []);
  if (m) return m;
  return undefined;
}

function algorithm(it: Interp, name: string, a: V[]): V {
  const sr = a.length >= 2 ? strRange(it, a[0], a[1]) : null;
  if (sr) {
    const chars = [...sr.s.slice(sr.from, sr.to)];
    let res: V = VOID;
    if (name === "sort" || name === "stable_sort") {
      const c = cmpFn(it, a[2], false);
      chars.sort((x, y) => c(CHR(x.charCodeAt(0)), CHR(y.charCodeAt(0))));
    } else if (name === "reverse") chars.reverse();
    else if (name === "count") return INT(chars.filter((c) => c.charCodeAt(0) === numOf(a[2])).length);
    else if (name === "next_permutation" || name === "prev_permutation") {
      const arr = chars.map((c) => CHR(c.charCodeAt(0)));
      const ok = permute(it, arr, name === "next_permutation");
      chars.splice(0, chars.length, ...arr.map((c) => String.fromCharCode(numOf(c))));
      res = it.boolV(ok);
    } else return it.err(`${name} on strings is not supported yet`);
    it.write(sr.base, STR(sr.s.slice(0, sr.from) + chars.join("") + sr.s.slice(sr.to)));
    return res;
  }
  const r = elemRange(it, a[0], a[1]);
  if (!r) return it.err(`${name}() needs two iterators of the same container, like v.begin(), v.end()`);
  const slice = r.h.items.slice(r.from, r.to);
  const put = (items: V[]) => r.h.items.splice(r.from, items.length, ...items);
  const nat = natCompare(it);
  switch (name) {
    case "sort":
    case "stable_sort": {
      const c = cmpFn(it, a[2], false);
      put(slice.sort(c));
      return VOID;
    }
    case "reverse":
      put(slice.reverse());
      return VOID;
    case "max_element":
    case "min_element": {
      if (!slice.length) return ptrTo(r.id, r.to);
      const c = cmpFn(it, a[2], false);
      let best = 0;
      slice.forEach((x, i) => {
        if (name === "max_element" ? c(slice[best], x) < 0 : c(x, slice[best]) < 0) best = i;
      });
      return ptrTo(r.id, r.from + best);
    }
    case "accumulate":
      return slice.reduce((s, x) => (a[3] && a[3].t === "func" ? a[3].call([s, x]) : it.binop("+", s, x)), a[2] ?? INT(0));
    case "count":
      return INT(slice.filter((x) => it.valEq(x, a[2])).length);
    case "count_if":
      return INT(slice.filter((x) => a[2].t === "func" && it.truthy(a[2].call([x]))).length);
    case "find": {
      const i = slice.findIndex((x) => it.valEq(x, a[2]));
      return ptrTo(r.id, i < 0 ? r.to : r.from + i);
    }
    case "fill":
      put(slice.map(() => it.coerce(a[2], r.h.elem)));
      return VOID;
    case "iota":
      put(slice.map((_, i) => INT(numOf(a[2]) + i)));
      return VOID;
    case "lower_bound":
    case "upper_bound": {
      let i = 0;
      while (i < slice.length && (name === "lower_bound" ? nat(slice[i], a[2]) < 0 : nat(slice[i], a[2]) <= 0)) i++;
      return ptrTo(r.id, r.from + i);
    }
    case "binary_search":
      return it.boolV(slice.some((x) => it.valEq(x, a[2])));
    case "unique": {
      const out: V[] = [];
      for (const x of slice) if (!out.length || !it.valEq(out[out.length - 1], x)) out.push(x);
      put(out);
      return ptrTo(r.id, r.from + out.length);
    }
    case "next_permutation":
    case "prev_permutation": {
      const ok = permute(it, slice, name === "next_permutation");
      put(slice);
      return it.boolV(ok);
    }
  }
  return VOID;
}

function permute(it: Interp, arr: V[], next: boolean): boolean {
  const c = natCompare(it);
  const lt = (x: V, y: V) => (next ? c(x, y) < 0 : c(x, y) > 0);
  let i = arr.length - 2;
  while (i >= 0 && !lt(arr[i], arr[i + 1])) i--;
  if (i < 0) {
    arr.reverse();
    return false;
  }
  let j = arr.length - 1;
  while (!lt(arr[i], arr[j])) j--;
  [arr[i], arr[j]] = [arr[j], arr[i]];
  const rest = arr.splice(i + 1).reverse();
  arr.push(...rest);
  return true;
}

// ---------- static classes (Java) ----------
function callStatic(it: Interp, cls: string, name: string, e: Call | null, vals?: V[]): V | undefined {
  const A = () => vals ?? (e ? evAll(it, e.args) : []);
  switch (cls) {
    case "Math": {
      const r = mathFn(it, name, A());
      if (r) return r;
      break;
    }
    case "Integer":
    case "Long":
    case "Short":
    case "Byte": {
      const a = A();
      const mk = (n: number) => (cls === "Long" ? LONG(n) : INT(n));
      switch (name) {
        case "parseInt":
        case "parseLong":
        case "valueOf": {
          if (a[0].t !== "str") return mk(numOf(a[0]));
          const s = a[0].v.trim();
          const n = parseInt(s, a[1] ? numOf(a[1]) : 10);
          if (Number.isNaN(n) || !/^[-+]?[0-9a-zA-Z]+$/.test(s)) it.err(`NumberFormatException: For input string: "${a[0].v}"`);
          return mk(n);
        }
        case "toString":
          return STR(a[1] ? numOf(a[0]).toString(numOf(a[1])) : String(numOf(a[0])));
        case "toBinaryString":
          return STR((numOf(a[0]) >>> 0).toString(2));
        case "toHexString":
          return STR((numOf(a[0]) >>> 0).toString(16));
        case "bitCount":
          return INT([...(numOf(a[0]) >>> 0).toString(2)].filter((c) => c === "1").length);
        case "compare": {
          const d = numOf(a[0]) - numOf(a[1]);
          return INT(d < 0 ? -1 : d > 0 ? 1 : 0);
        }
        case "sum":
          return mk(numOf(a[0]) + numOf(a[1]));
        case "max":
        case "min":
          return mathFn(it, name, a);
        case "signum":
          return INT(Math.sign(numOf(a[0])));
      }
      break;
    }
    case "Double":
    case "Float": {
      const a = A();
      switch (name) {
        case "parseDouble":
        case "parseFloat":
        case "valueOf": {
          const n = a[0].t === "str" ? Number(a[0].v.trim()) : numOf(a[0]);
          if (Number.isNaN(n)) it.err(`NumberFormatException: For input string: "${a[0].t === "str" ? a[0].v : ""}"`);
          return DBL(n);
        }
        case "compare": {
          const d = numOf(a[0]) - numOf(a[1]);
          return INT(d < 0 ? -1 : d > 0 ? 1 : 0);
        }
        case "toString":
          return STR(it.jdouble(numOf(a[0])));
        case "isNaN":
          return { t: "bool", v: Number.isNaN(numOf(a[0])) };
        case "max":
        case "min":
          return DBL(name === "max" ? Math.max(numOf(a[0]), numOf(a[1])) : Math.min(numOf(a[0]), numOf(a[1])));
      }
      break;
    }
    case "Character": {
      const a = A();
      if (name === "toString" || name === "valueOf") return name === "toString" ? STR(String.fromCharCode(numOf(a[0]))) : CHR(numOf(a[0]));
      const r = charFn(name, numOf(a[0]));
      if (r) return r;
      break;
    }
    case "Boolean": {
      const a = A();
      if (name === "parseBoolean") return { t: "bool", v: a[0].t === "str" && a[0].v.toLowerCase() === "true" };
      if (name === "toString") return STR(it.jstr(a[0]));
      break;
    }
    case "String": {
      const a = A();
      switch (name) {
        case "valueOf":
        case "copyValueOf": {
          const h = it.seqOf(a[0]);
          if (h && h.elem?.name === "char") return STR(seqToStr(it, h));
          return STR(it.jstr(a[0]));
        }
        case "join": {
          const d = a[0].t === "str" ? a[0].v : "";
          const rest = a.slice(1);
          const one = rest.length === 1 ? it.seqOf(rest[0]) : null;
          const parts = one ? one.items : rest;
          return STR(parts.map((x) => it.jstr(x)).join(d));
        }
        case "format":
          return STR(cformat(it, a[0].t === "str" ? a[0].v : "", a.slice(1), true));
      }
      break;
    }
    case "Arrays":
      return arraysFn(it, name, A());
    case "Collections":
      return collectionsFn(it, name, A());
    case "List":
    case "Set":
    case "Map": {
      const a = A();
      if (name === "of" || name === "copyOf") {
        if (cls === "List") return it.mkSeq("list", "List", null, false, name === "copyOf" ? [...(it.seqOf(a[0])?.items ?? [])] : a);
        if (cls === "Set") {
          const r = it.mkSeq("set", "Set", null, false, []);
          a.forEach((x) => it.setAdd(it.seqOf(r)!, x));
          return r;
        }
        const r = it.mkMap("Map", null, null, false);
        const h = it.obj((r as { id: number }).id) as HMap;
        for (let i = 0; i + 1 < a.length; i += 2) it.mapPut(h, a[i], a[i + 1]);
        return r;
      }
      break;
    }
    case "System": {
      const a = A();
      switch (name) {
        case "currentTimeMillis":
          return LONG(1700000000000 + it.steps.length);
        case "nanoTime":
          return LONG(1e12 + it.steps.length * 1000);
        case "exit":
          throw new ExitSig();
        case "arraycopy": {
          const s = it.seqOf(a[0]);
          const d = it.seqOf(a[2]);
          if (!s || !d) it.err("arraycopy needs arrays", "null");
          const n = numOf(a[4]);
          const part = s.items.slice(numOf(a[1]), numOf(a[1]) + n);
          d.items.splice(numOf(a[3]), n, ...part);
          return VOID;
        }
        case "lineSeparator":
          return STR("\n");
      }
      break;
    }
    case "Objects": {
      const a = A();
      if (name === "equals") return { t: "bool", v: it.valEq(a[0], a[1]) };
      if (name === "isNull") return { t: "bool", v: a[0].t === "null" };
      if (name === "hash") return INT(a.reduce((h, x) => (h * 31 + (isNum(x) ? numOf(x) : 7)) | 0, 1));
      if (name === "requireNonNull") return a[0];
      break;
    }
    case "Comparator": {
      const a = A();
      const nat = natCompare(it);
      if (name === "reverseOrder") return { t: "func", name: "reverseOrder", cmp: "greater", call: ([x, y]) => INT(nat(y, x)) };
      if (name === "naturalOrder") return { t: "func", name: "naturalOrder", cmp: "less", call: ([x, y]) => INT(nat(x, y)) };
      if (name === "comparingInt" || name === "comparing" || name === "comparingDouble") {
        const key = a[0];
        if (key.t !== "func") break;
        return { t: "func", name: "comparing", call: ([x, y]) => INT(nat(key.call([x]), key.call([y]))) };
      }
      break;
    }
  }
  // user classes: static methods and fields
  const ucls = it.findClass(cls);
  if (ucls && e) {
    const m = it.findMethod(cls, name, e.args.length);
    if (m) return it.invoke(m, e.args, null);
  }
  return undefined;
}

function arraysFn(it: Interp, name: string, a: V[]): V | undefined {
  const h = it.seqOf(a[0]);
  const nat = natCompare(it);
  switch (name) {
    case "toString":
      if (a[0].t === "null") return STR("null");
      return STR(`[${h!.items.map((x) => it.jstr(x)).join(", ")}]`);
    case "deepToString": {
      const deep = (v: V): string => {
        const s = it.seqOf(v);
        return s && s.ctype === "array" ? `[${s.items.map(deep).join(", ")}]` : it.jstr(v);
      };
      return STR(deep(a[0]));
    }
    case "sort": {
      if (!h) return it.err("Arrays.sort needs an array", "null");
      if (a.length >= 3 && isNum(a[1])) {
        const from = numOf(a[1]);
        const to = numOf(a[2]);
        const part = h.items.slice(from, to).sort(cmpFn(it, a[3], true));
        h.items.splice(from, part.length, ...part);
      } else h.items.sort(cmpFn(it, a[1], true));
      return VOID;
    }
    case "fill": {
      if (!h) return it.err("Arrays.fill needs an array", "null");
      if (a.length === 4) for (let i = numOf(a[1]); i < numOf(a[2]); i++) h.items[i] = it.coerce(a[3], h.elem);
      else h.items = h.items.map(() => it.coerce(a[1], h.elem));
      return VOID;
    }
    case "asList":
      return it.mkSeq("list", "List", null, false, a.length === 1 && h ? [...h.items] : a);
    case "copyOf":
    case "copyOfRange": {
      if (!h) return it.err(`Arrays.${name} needs an array`, "null");
      const from = name === "copyOf" ? 0 : numOf(a[1]);
      const to = name === "copyOf" ? numOf(a[1]) : numOf(a[2]);
      const items = Array.from({ length: to - from }, (_, i) => h.items[from + i] ?? (h.elem ? it.defaultVal(h.elem, "zero") : INT(0)));
      return it.mkSeq("array", h.label, h.elem, false, items);
    }
    case "equals": {
      const b = it.seqOf(a[1]);
      return { t: "bool", v: !!h && !!b && h.items.length === b.items.length && h.items.every((x, i) => it.valEq(x, b.items[i])) };
    }
    case "stream":
      return it.err("Java streams are not supported yet. Use a for loop instead.");
  }
  void nat;
  return undefined;
}

function collectionsFn(it: Interp, name: string, a: V[]): V | undefined {
  const h = it.seqOf(a[0]);
  const nat = natCompare(it);
  switch (name) {
    case "sort":
      h?.items.sort(cmpFn(it, a[1], true));
      return VOID;
    case "reverse":
      h?.items.reverse();
      return VOID;
    case "shuffle":
      return VOID;
    case "swap": {
      if (!h) return VOID;
      const i = numOf(a[1]);
      const j = numOf(a[2]);
      [h.items[i], h.items[j]] = [h.items[j], h.items[i]];
      return VOID;
    }
    case "max":
    case "min": {
      if (!h || !h.items.length) return it.err("NoSuchElementException: collection is empty");
      const c = cmpFn(it, a[1], true);
      return h.items.reduce((m, x) => ((name === "max" ? c(x, m) > 0 : c(x, m) < 0) ? x : m));
    }
    case "reverseOrder":
      return { t: "func", name: "reverseOrder", cmp: "greater", call: ([x, y]) => INT(nat(y, x)) };
    case "frequency":
      return INT(h ? h.items.filter((x) => it.valEq(x, a[1])).length : 0);
    case "emptyList":
      return it.mkSeq("list", "List", null, false, []);
    case "nCopies":
      return it.mkSeq("list", "List", null, false, Array.from({ length: numOf(a[0]) }, () => a[1]));
    case "unmodifiableList":
    case "unmodifiableSet":
    case "unmodifiableMap":
    case "synchronizedList":
      return a[0];
    case "addAll":
      if (h) for (const x of a.slice(1)) h.items.push(x);
      return { t: "bool", v: true };
  }
  return undefined;
}

// ---------- member access (fields) ----------
export function memberValue(it: Interp, e: Member): V {
  if (e.obj.k === "name" && !it.lookup(e.obj.name)) {
    const cls = e.obj.name;
    const c: Record<string, Record<string, V>> = {
      Integer: { MAX_VALUE: INT(2147483647), MIN_VALUE: INT(-2147483648) },
      Long: { MAX_VALUE: LONG(Number.MAX_SAFE_INTEGER), MIN_VALUE: LONG(Number.MIN_SAFE_INTEGER) },
      Double: { MAX_VALUE: DBL(Number.MAX_VALUE), MIN_VALUE: DBL(Number.MIN_VALUE), POSITIVE_INFINITY: DBL(Infinity), NEGATIVE_INFINITY: DBL(-Infinity) },
      Math: { PI: DBL(Math.PI), E: DBL(Math.E) },
      Character: { MAX_VALUE: CHR(0xffff), MIN_VALUE: CHR(0) },
      Short: { MAX_VALUE: INT(32767), MIN_VALUE: INT(-32768) },
      System: { out: { t: "stream", name: "sysout" }, err: { t: "stream", name: "syserr" }, in: { t: "stream", name: "sysin" } },
    };
    if (c[cls]?.[e.name]) return c[cls][e.name];
    const en = it.prog.enums.get(e.name);
    if (en !== undefined) return INT(en);
    if (it.findClass(cls)) {
      const b = it.lookup(e.name);
      if (b) return it.read(b.loc);
    }
  }
  const ov = it.ev(e.obj);
  if (ov.t === "ref") {
    const h = it.obj(ov.id);
    if (h.kind === "seq" && e.name === "length" && it.java) return INT(h.items.length);
  }
  if (ov.t === "ptr" && ov.loc.k === "elem") {
    const h = it.obj(ov.loc.id);
    if (h.kind === "map") {
      if (ov.loc.idx >= h.keys.length) it.err("Iterator points past the end of the map (did you check != end()?)", "null");
      if (e.name === "first") return h.keys[ov.loc.idx];
      if (e.name === "second") return h.vals[ov.loc.idx];
    }
    if (h.kind === "seq" && (e.name === "first" || e.name === "second")) {
      const p = it.read(ov.loc);
      if (p.t === "ref") return it.read({ k: "field", id: p.id, name: e.name });
    }
  }
  if (ov.t === "str" && it.java && e.name === "length") it.err("For a String use .length() with parentheses");
  const id = it.objId(ov, e);
  return it.read({ k: "field", id, name: e.name });
}

// ---------- scope expressions: numeric_limits<int>::max(), Integer::sum, string::npos ----------
export function callScope(it: Interp, s: Scope, call: Call | null): V {
  const t = s.type.name;
  if (t === "numeric_limits") {
    const arg = s.type.args[0]?.name ?? "int";
    const lim: Record<string, [number, number]> = { int: [2147483647, -2147483648], long: [Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER], double: [Number.MAX_VALUE, -Number.MAX_VALUE], char: [127, -128] };
    const [mx, mn] = lim[arg] ?? lim.int;
    const v = s.name === "max" ? mx : s.name === "min" || s.name === "lowest" ? mn : 0;
    return arg === "double" ? DBL(v) : arg === "long" ? LONG(v) : INT(v);
  }
  if (s.name === "npos") return INT(-1);
  if (it.java) {
    // method reference: Integer::sum, String::length, Main::helper
    const fn: V = {
      t: "func",
      name: `${t}::${s.name}`,
      call: (args) => {
        const r = callStatic(it, t, s.name, null, args);
        if (r !== undefined) return r;
        const ucls = it.findClass(t);
        const m = ucls ? it.findMethod(t, s.name, args.length) : undefined;
        if (m) return it.callUser(m, args.map((v) => ({ v, loc: null })), null);
        if (args[0]?.t === "str") return stringMethod(it, args[0].v, s.name, args.slice(1), null);
        return it.err(`Method reference ${t}::${s.name} is not supported`);
      },
    };
    if (call) return fn.t === "func" ? fn.call(evAll(it, call.args)) : VOID;
    return fn;
  }
  const ucls = it.findClass(t);
  if (ucls && call) {
    const m = it.findMethod(t, s.name, call.args.length);
    if (m) return it.invoke(m, call.args, null);
  }
  const b = it.lookup(s.name);
  if (b && !call) return it.read(b.loc);
  return it.err(`Unknown ${t}::${s.name}`);
}

// ---------- method calls ----------
const CPP_STR_MUT = new Set(["push_back", "pop_back", "append", "insert", "erase", "clear", "resize", "replace", "begin", "end", "assign", "swap"]);

export function callMemberExpr(it: Interp, m: Member, call: Call, wantLoc: boolean): V | LocResult {
  const name = m.name;
  // Static calls: Math.max, Arrays.sort, Integer.parseInt, Main.helper()
  if (m.obj.k === "name" && !it.lookup(m.obj.name)) {
    const cls = m.obj.name;
    if (cls !== "System" || name !== "out") {
      const r = callStatic(it, cls, name, call);
      if (r !== undefined) return r;
      if (it.java && !["out", "err", "in"].includes(cls)) {
        if (it.findClass(cls)) return it.err(`cannot find symbol: method ${name} in class ${cls}`);
      }
    }
  }
  // C++ strings: methods that change the string need its location
  let strLoc: Loc | null = null;
  let ov: V;
  if (!it.java && CPP_STR_MUT.has(name) && ["name", "index", "member"].includes(m.obj.k)) {
    const loc = it.lv(m.obj);
    ov = it.read(loc);
    if (ov.t === "str") strLoc = loc;
  } else ov = it.ev(m.obj);

  if (ov.t === "ptr" && !(ov.loc.k === "elem" && it.obj(ov.loc.id).kind === "map")) {
    const inner = it.read(ov.loc);
    if (inner.t === "ref" || inner.t === "str") ov = inner;
  }
  const A = () => evAll(it, call.args);
  switch (ov.t) {
    case "stream":
      return streamMethod(it, ov.name, name, call);
    case "static": {
      const r = callStatic(it, ov.name, name, call);
      if (r !== undefined) return r;
      return it.err(`Unknown method ${ov.name}.${name}()`);
    }
    case "str":
      return stringMethod(it, ov.v, name, A(), strLoc);
    case "null":
      return it.err(
        it.java ? `Cannot invoke "${name}()" because "${it.text(m.obj)}" is null` : `'${it.text(m.obj)}' is ${it.nullText()}, cannot call ${name}()`,
        "null",
      );
    case "uninit":
      return it.err(`'${it.text(m.obj)}' is used before it has a value`, "null");
    case "func": {
      const a = A();
      if (["compare", "apply", "test", "accept", "get", "applyAsInt", "run", "call"].includes(name)) return ov.call(a);
      if (name === "reversed") {
        const f = ov;
        return { t: "func", name: "reversed", call: ([x, y]) => f.call([y, x]) };
      }
      return it.err(`Unknown method ${name}() on a function`);
    }
    case "int":
    case "long":
    case "double":
    case "char":
    case "bool": {
      const a = A();
      switch (name) {
        case "equals":
          return { t: "bool", v: it.valEq(ov, a[0]) };
        case "compareTo": {
          const d = numOf(ov) - numOf(a[0]);
          return INT(d < 0 ? -1 : d > 0 ? 1 : 0);
        }
        case "intValue":
          return INT(numOf(ov));
        case "longValue":
          return LONG(numOf(ov));
        case "doubleValue":
          return DBL(numOf(ov));
        case "charValue":
          return CHR(numOf(ov));
        case "booleanValue":
          return ov;
        case "hashCode":
          return INT(numOf(ov));
        case "toString":
          return STR(it.jstr(ov));
      }
      return it.err(`Cannot call ${name}() on a ${ov.t}`);
    }
    case "ref":
      break;
    default:
      return it.err(`Cannot call ${name}() on '${it.text(m.obj)}'`);
  }
  const id = ov.id;
  const h = it.obj(id);
  if (h.kind === "obj") {
    const meth = it.findMethod(h.cls, name, call.args.length);
    if (meth) return it.invoke(meth, call.args, ov);
    return objectMethod(it, ov, h, name, A());
  }
  if (h.kind === "seq") return seqMethod(it, id, h, name, call, wantLoc);
  if (h.kind === "map") return mapMethod(it, id, h, name, call, wantLoc);
  return specialMethod(it, h, name, A());
}

function streamMethod(it: Interp, s: string, name: string, call: Call): V {
  const a = evAll(it, call.args);
  if (s === "sysout" || s === "syserr") {
    const print = (txt: string) => {
      if (s === "sysout") it.out += txt;
    };
    const one = (v: V | undefined) => {
      if (!v) return "";
      const h = it.seqOf(v);
      if (h && h.ctype === "array" && h.elem?.name === "char") return seqToStr(it, h);
      return it.jstr(v);
    };
    switch (name) {
      case "println":
        print(one(a[0]) + "\n");
        return VOID;
      case "print":
        print(one(a[0]));
        return VOID;
      case "printf":
      case "format":
        print(cformat(it, a[0]?.t === "str" ? a[0].v : "", a.slice(1), true));
        return VOID;
      case "flush":
        return VOID;
    }
  }
  if (s === "cin") {
    if (name === "get") {
      const c = it.input.char(false);
      return INT(c === null ? -1 : c.charCodeAt(0));
    }
    if (name === "ignore" || name === "tie" || name === "sync_with_stdio") return VOID;
    if (name === "eof") return it.boolV(!it.input.hasToken());
  }
  if (s === "cout" && (name === "precision" || name === "setf" || name === "tie" || name === "flush")) {
    if (name === "precision" && a[0]) it.cout.prec = numOf(a[0]);
    return VOID;
  }
  return it.err(`Unknown stream method ${name}()`);
}

export function stringMethod(it: Interp, s: string, name: string, a: V[], loc: Loc | null): V {
  const n = (i: number) => numOf(a[i]);
  const strArg = (v: V | undefined) => (!v ? "" : v.t === "str" ? v.v : v.t === "char" ? String.fromCharCode(v.v) : it.jstr(v));
  const bounds = (i: number, len = s.length) => {
    if (i < 0 || i > len) it.err(it.java ? `StringIndexOutOfBoundsException: index ${i}, length ${s.length}` : `out_of_range: index ${i} is past the end of the string (size ${s.length})`);
  };
  const set = (v: string) => {
    if (!loc) it.err("This string cannot be changed here");
    it.write(loc, STR(v));
    return VOID;
  };
  switch (name) {
    case "length":
    case "size":
      return INT(s.length);
    case "charAt":
    case "at": {
      const i = n(0);
      if (i < 0 || i >= s.length) bounds(-1);
      return CHR(s.charCodeAt(i));
    }
    case "isEmpty":
    case "empty":
      return it.boolV(s.length === 0);
    case "isBlank":
      return it.boolV(s.trim().length === 0);
    case "substring": {
      const b = n(0);
      const e = a.length > 1 ? n(1) : s.length;
      if (b < 0 || e > s.length || b > e) it.err(`StringIndexOutOfBoundsException: begin ${b}, end ${e}, length ${s.length}`);
      return STR(s.slice(b, e));
    }
    case "substr": {
      const b = n(0);
      bounds(b);
      return STR(a.length > 1 ? s.substr(b, n(1)) : s.slice(b));
    }
    case "indexOf":
    case "find":
      return INT(s.indexOf(strArg(a[0]), a[1] ? n(1) : 0));
    case "lastIndexOf":
    case "rfind":
      return INT(s.lastIndexOf(strArg(a[0])));
    case "contains":
      return it.boolV(s.includes(strArg(a[0])));
    case "startsWith":
      return it.boolV(s.startsWith(strArg(a[0])));
    case "endsWith":
      return it.boolV(s.endsWith(strArg(a[0])));
    case "equals":
      return it.boolV(a[0]?.t === "str" && a[0].v === s);
    case "equalsIgnoreCase":
      return it.boolV(a[0]?.t === "str" && a[0].v.toLowerCase() === s.toLowerCase());
    case "compareTo":
    case "compare": {
      const o = strArg(a[0]);
      if (it.java) {
        for (let i = 0; i < Math.min(s.length, o.length); i++) if (s[i] !== o[i]) return INT(s.charCodeAt(i) - o.charCodeAt(i));
        return INT(s.length - o.length);
      }
      return INT(s < o ? -1 : s > o ? 1 : 0);
    }
    case "compareToIgnoreCase":
      return INT(s.toLowerCase() < strArg(a[0]).toLowerCase() ? -1 : s.toLowerCase() > strArg(a[0]).toLowerCase() ? 1 : 0);
    case "toCharArray":
      return it.mkSeq("array", "char[]", simpleType("char"), false, [...s].map((c) => CHR(c.charCodeAt(0))));
    case "toUpperCase":
      return STR(s.toUpperCase());
    case "toLowerCase":
      return STR(s.toLowerCase());
    case "trim":
    case "strip":
      return STR(s.trim());
    case "split": {
      const re = new RegExp(strArg(a[0]));
      let parts = s.split(re);
      while (parts.length > 1 && parts[parts.length - 1] === "") parts.pop();
      if (parts[0] === "" && s.length > 0 && strArg(a[0]) !== "") {
        /* Java keeps a leading empty string */
      }
      if (s === "") parts = [""];
      return it.mkSeq("array", "String[]", simpleType("String"), false, parts.map(STR));
    }
    case "replace":
      if (loc && !it.java) {
        const pos = n(0);
        const len = n(1);
        return set(s.slice(0, pos) + strArg(a[2]) + s.slice(pos + len));
      }
      return STR(s.split(strArg(a[0])).join(strArg(a[1])));
    case "replaceAll":
      return STR(s.replace(new RegExp(strArg(a[0]), "g"), strArg(a[1])));
    case "concat":
      return STR(s + strArg(a[0]));
    case "repeat":
      return STR(s.repeat(n(0)));
    case "hashCode": {
      let hc = 0;
      for (const c of s) hc = (hc * 31 + c.charCodeAt(0)) | 0;
      return INT(hc);
    }
    case "matches":
      return it.boolV(new RegExp(`^(?:${strArg(a[0])})$`).test(s));
    case "toString":
    case "c_str":
    case "intern":
    case "strip_":
      return STR(s);
    case "chars":
      return it.err("Java streams are not supported yet. Use toCharArray() in a for loop.");
    case "back":
      if (!s.length) it.err("back() on an empty string");
      return CHR(s.charCodeAt(s.length - 1));
    case "front":
      if (!s.length) it.err("front() on an empty string");
      return CHR(s.charCodeAt(0));
    // C++ mutators
    case "push_back":
      return set(s + strArg(a[0]));
    case "pop_back":
      if (!s.length) it.err("pop_back() on an empty string");
      return set(s.slice(0, -1));
    case "append":
      return set(s + (a.length === 2 && isNum(a[0]) ? String.fromCharCode(n(1)).repeat(n(0)) : strArg(a[0])));
    case "insert":
      return set(s.slice(0, n(0)) + strArg(a[1]) + s.slice(n(0)));
    case "erase": {
      if (a[0]?.t === "ptr" && a[0].loc.k === "strchar") {
        const i = a[0].loc.idx;
        return set(s.slice(0, i) + s.slice(i + 1));
      }
      const pos = a.length ? n(0) : 0;
      const len = a.length > 1 ? n(1) : s.length;
      return set(s.slice(0, pos) + s.slice(pos + len));
    }
    case "clear":
      return set("");
    case "resize":
      return set(s.length >= n(0) ? s.slice(0, n(0)) : s + String.fromCharCode(a[1] ? n(1) : 0).repeat(n(0) - s.length));
    case "assign":
      return set(strArg(a[0]));
    case "begin":
    case "end":
      if (!loc) it.err("begin()/end() needs a string variable");
      return { t: "ptr", loc: { k: "strchar", base: loc, idx: name === "begin" ? 0 : s.length } };
  }
  return it.err(`Unknown string method ${name}()`);
}

function objectMethod(it: Interp, ov: V, h: HObj, name: string, a: V[]): V {
  switch (name) {
    case "getKey":
      return h.fields.get("key") ?? NULL;
    case "getValue":
      return h.fields.get("value") ?? NULL;
    case "setValue":
      h.fields.set("value", a[0]);
      return a[0];
    case "getMessage":
    case "what":
      return h.fields.get("message") ?? NULL;
    case "printStackTrace":
      return VOID;
    case "toString":
      return STR(it.jstr(ov));
    case "equals":
      return { t: "bool", v: it.valEq(ov, a[0]) };
    case "hashCode":
      return INT(ov.t === "ref" ? ov.id * 7919 : 0);
    case "getClass":
      return STR(h.cls);
  }
  return it.err(it.java ? `cannot find symbol: method ${name}() in class ${h.cls}` : `'${h.cls}' has no member function '${name}'`);
}

function specialMethod(it: Interp, h: H, name: string, a: V[]): V {
  const need = <T>(v: T | null, what: string): T => {
    if (v === null) it.err(it.java ? `NoSuchElementException: no more input (${what}). Type input in the Input box.` : "No more input");
    return v;
  };
  if (h.kind === "scanner") {
    switch (name) {
      case "nextInt":
      case "nextLong":
      case "nextShort":
      case "nextByte": {
        const t = need(it.input.token(), name);
        if (!/^[-+]?\d+$/.test(t)) it.err(`InputMismatchException: "${t}" is not a whole number`);
        return name === "nextLong" ? LONG(Number(t)) : INT(Number(t));
      }
      case "nextDouble":
      case "nextFloat": {
        const t = need(it.input.token(), name);
        if (Number.isNaN(Number(t))) it.err(`InputMismatchException: "${t}" is not a number`);
        return DBL(Number(t));
      }
      case "nextBoolean":
        return { t: "bool", v: need(it.input.token(), name).toLowerCase() === "true" };
      case "next":
        return STR(need(it.input.token(), name));
      case "nextLine":
        return STR(need(it.input.line(), name));
      case "hasNext":
      case "hasNextLine":
        return { t: "bool", v: it.input.hasToken() };
      case "hasNextInt": {
        const save = it.input.pos;
        const t = it.input.token();
        it.input.pos = save;
        return { t: "bool", v: t !== null && /^[-+]?\d+$/.test(t) };
      }
      case "close":
        return VOID;
    }
  }
  if (h.kind === "reader") {
    if (name === "readLine") {
      const l = it.input.line();
      return l === null ? NULL : STR(l);
    }
    if (name === "read") {
      const c = it.input.char(false);
      return INT(c === null ? -1 : c.charCodeAt(0));
    }
    if (name === "close" || name === "ready") return VOID;
  }
  if (h.kind === "random") {
    h.seed = (h.seed * 1103515245 + 12345) % 2147483648;
    if (name === "nextInt") return INT(a[0] ? h.seed % numOf(a[0]) : h.seed);
    if (name === "nextDouble") return DBL(h.seed / 2147483648);
    if (name === "nextBoolean") return { t: "bool", v: h.seed % 2 === 0 };
  }
  if (h.kind === "tokenizer") {
    if (name === "nextToken") {
      if (h.i >= h.toks.length) it.err("NoSuchElementException");
      return STR(h.toks[h.i++]);
    }
    if (name === "hasMoreTokens" || name === "hasMoreElements") return { t: "bool", v: h.i < h.toks.length };
    if (name === "countTokens") return INT(h.toks.length - h.i);
  }
  return it.err(`Unknown method ${name}()`);
}

function seqMethod(it: Interp, id: number, h: HSeq, name: string, call: Call, wantLoc: boolean): V | LocResult {
  const a = () => call.args.map((x) => it.ev(x, h.elem));
  const empty = (what: string): never => {
    if (it.java) {
      if (h.ctype === "stack" && (what === "pop" || what === "peek")) it.err("EmptyStackException: the stack is empty");
      it.err(`NoSuchElementException: ${what}() on an empty ${h.label}`);
    }
    return it.err(`${what}() on an empty ${h.label}: undefined behavior in C++ (check empty() first)`);
  };
  const java = it.java;
  const items = h.items;
  const loc = (i: number): V | LocResult => (wantLoc ? { __loc: { k: "elem", id, idx: i } } : items[i]);
  const bounds = (i: number) => {
    if (i < 0 || i >= items.length)
      it.err(java ? `IndexOutOfBoundsException: Index ${i} out of bounds for length ${items.length}` : `out_of_range: index ${i} is out of range (size ${items.length})`);
  };
  const add = (v: V) => {
    if (h.ctype === "set") return it.setAdd(h, v);
    if (h.ctype === "pq") {
      it.pqPush(h, v);
      return true;
    }
    items.push(it.copyIfValue(it.coerce(v, h.elem)));
    return true;
  };
  const emplaceVal = (vals: V[]): V => {
    if (vals.length === 1) return vals[0];
    if (h.elem?.name === "pair") return it.mkPair(it.coerce(vals[0], h.elem.args[0] ?? null), it.coerce(vals[1], h.elem.args[1] ?? null), h.elem.args[0] ?? null, h.elem.args[1] ?? null);
    if (h.elem) return it.constructType(h.elem, vals, true);
    return vals[0];
  };
  const elemIndex = (v: V) => (v.t === "ptr" && v.loc.k === "elem" ? v.loc.idx : -1);
  switch (name) {
    // ----- size -----
    case "size":
    case "length":
      return INT(items.length);
    case "isEmpty":
      return { t: "bool", v: items.length === 0 };
    case "empty":
      return java ? { t: "bool", v: items.length === 0 } : it.boolV(items.length === 0);
    case "clear":
      items.length = 0;
      return VOID;
    // ----- index access -----
    case "get":
    case "at":
    case "elementAt": {
      const i = numOf(it.ev(call.args[0]));
      bounds(i);
      return loc(i);
    }
    case "set": {
      const [i, v] = a();
      bounds(numOf(i));
      const old = items[numOf(i)];
      it.write({ k: "elem", id, idx: numOf(i) }, v);
      return old;
    }
    case "front":
    case "getFirst":
    case "element":
    case "peekFirst":
    case "first":
      if (!items.length) return name === "peekFirst" ? NULL : empty(name);
      if (h.ctype === "stack" && h.frontTop) return items[0];
      return loc(0);
    case "back":
    case "getLast":
    case "peekLast":
    case "last":
      if (!items.length) return name === "peekLast" ? NULL : empty(name);
      return loc(items.length - 1);
    case "top":
      if (!items.length) return empty("top");
      return h.ctype === "pq" ? items[0] : loc(items.length - 1);
    case "peek":
      if (!items.length) return h.ctype === "stack" && !h.frontTop ? empty("peek") : NULL;
      if (h.ctype === "stack" && !h.frontTop) return items[items.length - 1];
      return items[0];
    // ----- adding -----
    case "add":
    case "addLast":
    case "offer":
    case "offerLast":
    case "addElement": {
      const v = a();
      if (v.length === 2 && name === "add") {
        const i = numOf(v[0]);
        if (i < 0 || i > items.length) bounds(i);
        items.splice(i, 0, it.coerce(v[1], h.elem));
        return VOID;
      }
      return { t: "bool", v: add(v[0]) };
    }
    case "addFirst":
    case "offerFirst":
    case "push_front":
    case "emplace_front":
      items.unshift(it.copyIfValue(it.coerce(emplaceVal(a()), h.elem)));
      return VOID;
    case "push_back":
    case "emplace_back":
      items.push(it.copyIfValue(it.coerce(emplaceVal(a()), h.elem)));
      return VOID;
    case "push":
    case "emplace": {
      const v = emplaceVal(a());
      if (h.ctype === "set") return it.boolV(it.setAdd(h, v));
      if (h.ctype === "pq") it.pqPush(h, v);
      else if (java && (h.ctype === "deque" || h.ctype === "list")) {
        items.unshift(it.coerce(v, h.elem));
        h.frontTop = true;
        h.disp = "stack";
        h.ctype = "stack";
      } else items.push(it.copyIfValue(it.coerce(v, h.elem)));
      return java ? v : VOID;
    }
    case "addAll": {
      const [src] = a();
      const s = it.seqOf(src);
      const m = src.t === "ref" ? it.heap.get(src.id) : undefined;
      for (const x of s ? [...s.items] : m && m.kind === "map" ? [...m.keys] : []) add(x);
      return { t: "bool", v: true };
    }
    // ----- removing -----
    case "pop": {
      if (!items.length) return empty("pop");
      let v: V;
      if (h.ctype === "pq") v = it.pqPop(h);
      else if (h.ctype === "queue" || h.frontTop || (java && h.ctype !== "stack")) v = items.shift()!;
      else v = items.pop()!;
      return java ? v : VOID;
    }
    case "poll":
    case "pollFirst":
    case "removeFirst":
    case "pop_front":
    case "remove":
    case "dequeue": {
      if (name === "remove" && call.args.length) {
        const [x] = a();
        if (h.ctype === "set") {
          const i = items.findIndex((y) => it.valEq(y, x));
          if (i >= 0) items.splice(i, 1);
          return { t: "bool", v: i >= 0 };
        }
        if (x.t === "int" && h.ctype !== "queue" && h.ctype !== "pq" && h.ctype !== "deque" && call.args[0].k !== "cast") {
          bounds(x.v);
          return items.splice(x.v, 1)[0];
        }
        const i = items.findIndex((y) => it.valEq(y, x));
        if (i >= 0) {
          if (h.ctype === "pq") {
            items.splice(i, 1);
            const rest = items.splice(0);
            rest.forEach((y) => it.pqPush(h, y));
          } else items.splice(i, 1);
        }
        return { t: "bool", v: i >= 0 };
      }
      if (!items.length) return name === "poll" || name === "pollFirst" ? NULL : empty(name);
      if (h.ctype === "pq") return it.pqPop(h);
      if (h.ctype === "set" && name === "pollFirst") return items.shift()!;
      const v = items.shift()!;
      return name === "pop_front" ? VOID : v;
    }
    case "pollLast":
    case "removeLast":
    case "pop_back":
      if (!items.length) return name === "pollLast" ? NULL : empty(name);
      return name === "pop_back" ? (items.pop(), VOID) : items.pop()!;
    // ----- searching -----
    case "contains":
      return { t: "bool", v: items.some((x) => it.valEq(x, it.ev(call.args[0]))) };
    case "indexOf":
    case "lastIndexOf": {
      const x = it.ev(call.args[0]);
      const i = name === "indexOf" ? items.findIndex((y) => it.valEq(y, x)) : items.map((y) => it.valEq(y, x)).lastIndexOf(true);
      return INT(i);
    }
    case "count":
      return INT(items.filter((x) => it.valEq(x, it.ev(call.args[0]))).length);
    case "find": {
      const x = it.ev(call.args[0]);
      const i = items.findIndex((y) => it.valEq(y, x));
      return ptrTo(id, i < 0 ? items.length : i);
    }
    case "lower_bound":
    case "upper_bound":
    case "ceiling":
    case "floor":
    case "higher":
    case "lower": {
      const x = it.ev(call.args[0]);
      const c = h.cmp ?? natCompare(it);
      if (name === "lower_bound" || name === "upper_bound") {
        let i = 0;
        while (i < items.length && (name === "lower_bound" ? c(items[i], x) < 0 : c(items[i], x) <= 0)) i++;
        return ptrTo(id, i);
      }
      const pick =
        name === "ceiling" ? items.find((y) => c(y, x) >= 0) : name === "higher" ? items.find((y) => c(y, x) > 0) : name === "floor" ? [...items].reverse().find((y) => c(y, x) <= 0) : [...items].reverse().find((y) => c(y, x) < 0);
      return pick ?? NULL;
    }
    // ----- iterators -----
    case "begin":
    case "cbegin":
      return ptrTo(id, 0);
    case "end":
    case "cend":
      return ptrTo(id, items.length);
    case "insert": {
      const v = a();
      if (h.ctype === "set") {
        if (v.length === 2 && v[0].t === "ptr" && v[1].t === "ptr") {
          for (const x of it.iterRange(v[0], v[1])) it.setAdd(h, x);
          return VOID;
        }
        return it.boolV(it.setAdd(h, v[0]));
      }
      if (h.ctype === "sb") {
        const s = it.java ? it.jstr(v[1]) : "";
        items.splice(numOf(v[0]), 0, ...[...s].map((c) => CHR(c.charCodeAt(0))));
        return { t: "ref", id };
      }
      const i = v[0].t === "ptr" ? elemIndex(v[0]) : numOf(v[0]);
      if (v.length === 3) items.splice(i, 0, ...Array.from({ length: numOf(v[1]) }, () => it.coerce(v[2], h.elem)));
      else items.splice(i, 0, it.copyIfValue(it.coerce(v[1], h.elem)));
      return ptrTo(id, i);
    }
    case "erase": {
      const v = a();
      if (h.ctype === "set" && v[0].t !== "ptr") {
        const before = items.length;
        for (let i = items.length - 1; i >= 0; i--) if (it.valEq(items[i], v[0])) items.splice(i, 1);
        return INT(before - items.length);
      }
      const i = elemIndex(v[0]);
      const j = v[1] ? elemIndex(v[1]) : i + 1;
      if (i < 0 || i >= items.length) it.err("erase(): iterator is out of range");
      items.splice(i, j - i);
      return ptrTo(id, i);
    }
    case "resize": {
      const v = a();
      const n = numOf(v[0]);
      while (items.length > n) items.pop();
      while (items.length < n) items.push(v[1] ? it.copyIfValue(it.coerce(v[1], h.elem)) : h.elem ? it.defaultVal(h.elem, "zero") : INT(0));
      return VOID;
    }
    case "assign": {
      const v = a();
      items.length = 0;
      for (let i = 0; i < numOf(v[0]); i++) items.push(it.copyIfValue(it.coerce(v[1], h.elem)));
      return VOID;
    }
    case "reserve":
    case "shrink_to_fit":
    case "ensureCapacity":
    case "trimToSize":
      return VOID;
    case "swap": {
      const [o] = a();
      const other = it.seqOf(o);
      if (other) [h.items, other.items] = [other.items, h.items];
      return VOID;
    }
    // ----- Java list helpers -----
    case "sort":
      items.sort(cmpFn(it, a()[0], true));
      return VOID;
    case "subList": {
      const [x, y] = a();
      return it.mkSeq("list", h.label, h.elem, false, items.slice(numOf(x), numOf(y)));
    }
    case "toArray":
      return it.mkSeq("array", `${h.elem?.name ?? "Object"}[]`, h.elem, false, [...items]);
    case "equals": {
      const o = it.seqOf(a()[0]);
      return { t: "bool", v: !!o && o.items.length === items.length && items.every((x, i) => it.valEq(x, o.items[i])) };
    }
    case "forEach": {
      const [f] = a();
      if (f.t === "func") for (const x of [...items]) f.call([x]);
      return VOID;
    }
    case "toString":
      return STR(it.jstr({ t: "ref", id }));
    case "hashCode":
      return INT(id);
    case "stream":
      return it.err("Java streams are not supported yet. Use a for loop instead.");
    case "iterator":
    case "descendingIterator":
      return it.err("Iterators are not supported yet. Use a for-each loop instead.");
    // ----- StringBuilder -----
    case "append": {
      const [v] = a();
      const s = v.t === "char" ? String.fromCharCode(v.v) : it.jstr(v);
      items.push(...[...s].map((c) => CHR(c.charCodeAt(0))));
      return { t: "ref", id };
    }
    case "reverse":
      items.reverse();
      return { t: "ref", id };
    case "charAt": {
      const i = numOf(a()[0]);
      if (i < 0 || i >= items.length) it.err(`StringIndexOutOfBoundsException: index ${i}, length ${items.length}`);
      return items[i];
    }
    case "setCharAt": {
      const [i, c] = a();
      items[numOf(i)] = CHR(numOf(c));
      return VOID;
    }
    case "deleteCharAt": {
      const i = numOf(a()[0]);
      if (i < 0 || i >= items.length) it.err(`StringIndexOutOfBoundsException: index ${i}, length ${items.length}`);
      items.splice(i, 1);
      return { t: "ref", id };
    }
    case "delete": {
      const [x, y] = a();
      items.splice(numOf(x), Math.min(numOf(y), items.length) - numOf(x));
      return { t: "ref", id };
    }
    case "setLength": {
      const n = numOf(a()[0]);
      while (items.length > n) items.pop();
      while (items.length < n) items.push(CHR(0));
      return VOID;
    }
  }
  return it.err(java ? `cannot find symbol: method ${name}() for ${h.label}` : `${h.label} has no member '${name}'`);
}

function mapMethod(it: Interp, id: number, h: HMap, name: string, call: Call, wantLoc: boolean): V | LocResult {
  const a = () => call.args.map((x, i) => it.ev(x, i === 0 ? h.keyT : h.valT));
  const get = (k: V) => {
    const i = it.mapFind(h, k);
    return i >= 0 ? h.vals[i] : null;
  };
  const key = (v: V) => it.coerce(v, h.keyT);
  const nat = h.cmp ?? natCompare(it);
  switch (name) {
    case "put": {
      const [k, v] = a();
      const old = get(key(k));
      it.mapPut(h, key(k), it.coerce(v, h.valT));
      return old ?? NULL;
    }
    case "get":
      return get(key(a()[0])) ?? NULL;
    case "getOrDefault": {
      const [k, d] = a();
      return get(key(k)) ?? d;
    }
    case "containsKey":
      return { t: "bool", v: it.mapFind(h, key(a()[0])) >= 0 };
    case "containsValue": {
      const [v] = a();
      return { t: "bool", v: h.vals.some((x) => it.valEq(x, v)) };
    }
    case "count":
      return INT(it.mapFind(h, key(a()[0])) >= 0 ? 1 : 0);
    case "remove":
    case "erase": {
      const [k] = a();
      if (k.t === "ptr" && k.loc.k === "elem") {
        const i = k.loc.idx;
        h.keys.splice(i, 1);
        h.vals.splice(i, 1);
        return ptrTo(id, i);
      }
      const i = it.mapFind(h, key(k));
      if (i < 0) return name === "erase" ? INT(0) : NULL;
      const old = h.vals[i];
      h.keys.splice(i, 1);
      h.vals.splice(i, 1);
      return name === "erase" ? INT(1) : old;
    }
    case "size":
      return INT(h.keys.length);
    case "isEmpty":
      return { t: "bool", v: h.keys.length === 0 };
    case "empty":
      return it.boolV(h.keys.length === 0);
    case "clear":
      h.keys.length = 0;
      h.vals.length = 0;
      return VOID;
    case "keySet": {
      const r = it.mkSeq("set", `Set<${h.keyT?.name ?? "K"}>`, h.keyT, false, [...h.keys]);
      return r;
    }
    case "values":
      return it.mkSeq("list", `Collection<${h.valT?.name ?? "V"}>`, h.valT, false, [...h.vals]);
    case "entrySet":
      return it.mkSeq(
        "list",
        "Set<Entry>",
        null,
        false,
        h.keys.map((k, i) => ({
          t: "ref",
          id: it.alloc({ kind: "obj", cls: "Entry", fields: new Map([["key", k], ["value", h.vals[i]]]), fieldTypes: new Map(), valueSem: false }),
        })),
      );
    case "putIfAbsent": {
      const [k, v] = a();
      const old = get(key(k));
      if (old === null || old.t === "null") it.mapPut(h, key(k), v);
      return old ?? NULL;
    }
    case "merge": {
      const [k, v, f] = a();
      const old = get(key(k));
      it.mapPut(h, key(k), old === null || old.t === "null" ? v : f.t === "func" ? f.call([old, v]) : v);
      return get(key(k)) ?? NULL;
    }
    case "computeIfAbsent": {
      const [k, f] = a();
      const old = get(key(k));
      if (old !== null && old.t !== "null") return old;
      const v = f.t === "func" ? f.call([k]) : NULL;
      it.mapPut(h, key(k), v);
      return v;
    }
    case "computeIfPresent":
    case "compute": {
      const [k, f] = a();
      const old = get(key(k));
      if (name === "computeIfPresent" && (old === null || old.t === "null")) return NULL;
      const v = f.t === "func" ? f.call([k, old ?? NULL]) : NULL;
      it.mapPut(h, key(k), v);
      return v;
    }
    case "forEach": {
      const [f] = a();
      if (f.t === "func") h.keys.forEach((k, i) => f.call([k, h.vals[i]]));
      return VOID;
    }
    case "firstKey":
    case "lastKey":
      if (!h.keys.length) it.err("NoSuchElementException: the map is empty");
      return name === "firstKey" ? h.keys[0] : h.keys[h.keys.length - 1];
    case "floorKey":
    case "ceilingKey":
    case "higherKey":
    case "lowerKey": {
      const k = key(a()[0]);
      const ks = h.keys;
      const r =
        name === "ceilingKey" ? ks.find((y) => nat(y, k) >= 0) : name === "higherKey" ? ks.find((y) => nat(y, k) > 0) : name === "floorKey" ? [...ks].reverse().find((y) => nat(y, k) <= 0) : [...ks].reverse().find((y) => nat(y, k) < 0);
      return r ?? NULL;
    }
    case "firstEntry":
    case "lastEntry":
    case "pollFirstEntry":
    case "pollLastEntry": {
      if (!h.keys.length) return NULL;
      const i = name.includes("First") ? 0 : h.keys.length - 1;
      const ent: V = { t: "ref", id: it.alloc({ kind: "obj", cls: "Entry", fields: new Map([["key", h.keys[i]], ["value", h.vals[i]]]), fieldTypes: new Map(), valueSem: false }) };
      if (name.startsWith("poll")) {
        h.keys.splice(i, 1);
        h.vals.splice(i, 1);
      }
      return ent;
    }
    // C++
    case "find": {
      const i = it.mapFind(h, key(a()[0]));
      return ptrTo(id, i < 0 ? h.keys.length : i);
    }
    case "begin":
      return ptrTo(id, 0);
    case "end":
      return ptrTo(id, h.keys.length);
    case "at": {
      const k = key(it.ev(call.args[0], h.keyT));
      if (it.mapFind(h, k) < 0) it.err(`out_of_range: key ${it.coutStr(k)} is not in the map`);
      return wantLoc ? { __loc: { k: "mapval", id, key: k } } : get(k)!;
    }
    case "insert":
    case "emplace": {
      const v = a();
      let k: V;
      let val: V;
      if (v.length === 2) [k, val] = v;
      else {
        const p = v[0];
        const ph = p.t === "ref" ? it.heap.get(p.id) : undefined;
        if (ph && ph.kind === "obj") {
          k = ph.fields.get("first")!;
          val = ph.fields.get("second")!;
        } else if (ph && ph.kind === "seq") {
          k = ph.items[0];
          val = ph.items[1];
        } else return it.err("insert() needs a {key, value} pair");
      }
      const exists = it.mapFind(h, key(k)) >= 0;
      if (!exists) it.mapPut(h, key(k), it.coerce(val, h.valT));
      return it.boolV(!exists);
    }
    case "lower_bound":
    case "upper_bound": {
      const k = key(a()[0]);
      let i = 0;
      while (i < h.keys.length && (name === "lower_bound" ? nat(h.keys[i], k) < 0 : nat(h.keys[i], k) <= 0)) i++;
      return ptrTo(id, i);
    }
    case "toString":
      return STR(it.jstr({ t: "ref", id }));
    case "equals":
      return { t: "bool", v: false };
  }
  return it.err(it.java ? `cannot find symbol: method ${name}() for ${h.label}` : `${h.label} has no member '${name}'`);
}
