// Recursive-descent parser for the Java / C / C++ subset used in DSA practice code.
import type { ClassDecl, Declarator, Expr, FuncDecl, Param, Program, Stmt, TypeRef } from "./ast";
import { CodeError, lex, type Token } from "./lexer";

export type Dialect = "java" | "c" | "cpp";

const PRIM_WORDS = new Set(["int", "long", "short", "char", "double", "float", "bool", "boolean", "void", "byte", "unsigned", "signed", "size_t", "auto", "var", "wchar_t", "int64_t", "int32_t", "uint64_t", "uint32_t"]);
const MODIFIERS = new Set([
  "const", "static", "final", "public", "private", "protected", "volatile", "inline", "extern", "register", "abstract",
  "synchronized", "transient", "mutable", "constexpr", "virtual", "explicit", "friend", "typename", "strictfp", "native",
]);

export const JAVA_TYPES = [
  "String", "StringBuilder", "StringBuffer", "Integer", "Long", "Double", "Float", "Character", "Boolean", "Short", "Byte", "Object",
  "Scanner", "ArrayList", "List", "LinkedList", "HashMap", "Map", "TreeMap", "LinkedHashMap", "HashSet", "Set", "TreeSet",
  "LinkedHashSet", "Stack", "Queue", "Deque", "ArrayDeque", "PriorityQueue", "Iterator", "Entry", "BufferedReader",
  "InputStreamReader", "Comparator", "Collection", "Vector", "Random", "StringTokenizer", "Number", "Comparable",
];
export const CPP_TYPES = [
  "string", "vector", "map", "unordered_map", "set", "unordered_set", "multiset", "multimap", "stack", "queue", "deque",
  "priority_queue", "pair", "list", "array", "greater", "less", "greater_equal", "less_equal", "tuple", "numeric_limits",
  "ll", "iterator", "ostream", "istream", "function",
];
const STMT_KEYWORDS = new Set(["return", "if", "else", "while", "for", "do", "switch", "case", "default", "break", "continue", "new", "delete", "throw", "try", "catch", "sizeof", "true", "false", "null", "nullptr", "this", "instanceof"]);

const BIN_PREC: Record<string, number> = {
  "||": 1, "&&": 2, "|": 3, "^": 4, "&": 5, "==": 6, "!=": 6, "<": 7, ">": 7, "<=": 7, ">=": 7, instanceof: 7,
  "<<": 8, ">>": 8, ">>>": 8, "+": 9, "-": 9, "*": 10, "/": 10, "%": 10,
};
const ASSIGN_OPS = new Set(["=", "+=", "-=", "*=", "/=", "%=", "&=", "|=", "^=", "<<=", ">>=", ">>>="]);

export const simpleType = (name: string): TypeRef => ({ name, args: [], ptr: 0, ref: false, dims: 0 });

export class Parser {
  private toks: Token[];
  private pos = 0;
  private typeNames = new Set<string>();
  private known: Set<string>;
  private prog: Program = { classes: new Map(), funcs: [], globals: [], typedefs: new Map(), enums: new Map() };

  constructor(
    private src: string,
    private lang: Dialect,
  ) {
    this.toks = lex(src);
    this.known = new Set(lang === "java" ? JAVA_TYPES : lang === "cpp" ? CPP_TYPES : []);
    this.prescan();
  }

  // ---------- token helpers ----------
  private peek(o = 0): Token {
    return this.toks[Math.min(this.pos + o, this.toks.length - 1)];
  }
  private next(): Token {
    return this.toks[this.pos++];
  }
  private is(v: string, o = 0): boolean {
    const t = this.peek(o);
    return (t.k === "op" || t.k === "id") && t.v === v;
  }
  private accept(v: string): boolean {
    if (this.is(v)) {
      this.pos++;
      return true;
    }
    return false;
  }
  private expect(v: string, what?: string): Token {
    if (this.is(v)) return this.next();
    const t = this.peek();
    const got = t.k === "eof" ? "end of code" : `'${t.v}'`;
    throw new CodeError(`Expected '${v}'${what ? ` ${what}` : ""} but found ${got}`, t.k === "eof" ? this.toks[this.pos - 1]?.line ?? t.line : t.line);
  }
  private ident(what = "a name"): string {
    const t = this.peek();
    if (t.k !== "id") throw new CodeError(`Expected ${what} but found '${t.v || "end of code"}'`, t.line);
    this.pos++;
    return t.v;
  }
  private get prevEnd(): number {
    return this.toks[this.pos - 1]?.end ?? 0;
  }
  private fail(msg: string, t = this.peek()): never {
    throw new CodeError(msg, t.line);
  }

  /** Collect user type names (struct/class/typedef) before parsing so declarations can be recognized. */
  private prescan() {
    const t = this.toks;
    for (let i = 0; i < t.length - 1; i++) {
      if (t[i].k === "id" && ["struct", "class", "interface", "enum", "union"].includes(t[i].v) && t[i + 1].k === "id") {
        this.typeNames.add(t[i + 1].v);
      }
      if (t[i].k === "id" && t[i].v === "typedef") {
        let depth = 0;
        for (let j = i + 1; j < t.length; j++) {
          if (t[j].v === "{") depth++;
          if (t[j].v === "}") depth--;
          if (depth === 0 && t[j].v === ";") {
            if (t[j - 1].k === "id") this.typeNames.add(t[j - 1].v);
            break;
          }
        }
      }
      if (t[i].k === "id" && t[i].v === "using" && t[i + 1].k === "id" && t[i + 2]?.v === "=") this.typeNames.add(t[i + 1].v);
    }
  }

  private isTypeWord(w: string): boolean {
    if (this.lang === "java" && ["unsigned", "signed", "size_t", "bool", "auto", "wchar_t", "int64_t", "int32_t", "uint64_t", "uint32_t"].includes(w)) return false;
    return PRIM_WORDS.has(w) || this.known.has(w) || this.typeNames.has(w) || this.prog.typedefs.has(w);
  }

  // ---------- types ----------
  private closeAngle() {
    const t = this.peek();
    if (t.k === "op" && t.v.startsWith(">") && t.v !== ">") {
      // split '>>' into '>' '>' permanently so re-parsing the same tokens gives the same result
      const rest = t.v.slice(1);
      this.toks.splice(this.pos, 1, { ...t, v: ">", end: t.start + 1 }, { ...t, v: rest, start: t.start + 1 });
    }
    if (this.is(">")) this.pos++;
    else this.fail(`Expected '>' to close the type but found '${t.v}'`);
  }

  /** Parses a type, or returns null (and restores position) if the tokens are not a type. */
  tryType(): TypeRef | null {
    const save = this.pos;
    try {
      return this.parseTypeStrict();
    } catch {
      this.pos = save;
      return null;
    }
  }

  private parseTypeStrict(): TypeRef {
    while (this.peek().k === "id" && MODIFIERS.has(this.peek().v)) this.pos++;
    if (this.peek().k === "id" && ["struct", "class", "enum", "union"].includes(this.peek().v)) this.pos++;
    const t = this.peek();
    if (t.k !== "id") throw new Error("not a type");
    let name: string;
    if (this.is("std") && this.is("::", 1)) this.pos += 2;
    const w = this.peek().v;
    if (PRIM_WORDS.has(w)) {
      const words: string[] = [];
      while (this.peek().k === "id" && PRIM_WORDS.has(this.peek().v)) {
        words.push(this.next().v);
        if (words[0] === "auto" || words[0] === "var") break;
      }
      if (words.includes("auto") || words.includes("var")) name = "auto";
      else if (words.includes("double") || words.includes("float")) name = words.includes("float") ? "float" : "double";
      else if (words.includes("char") || words.includes("wchar_t")) name = "char";
      else if (words.includes("bool") || words.includes("boolean")) name = "bool";
      else if (words.includes("void")) name = "void";
      else if (words.includes("long") || words.some((x) => x.includes("64")) || words.includes("size_t")) name = "long";
      else name = "int";
    } else if (this.isTypeWord(w)) {
      this.pos++;
      name = w;
      // Java qualified names: Map.Entry
      while (this.lang === "java" && this.is(".") && this.peek(1).k === "id" && this.isTypeWord(this.peek(1).v)) {
        this.pos++;
        name = this.next().v;
      }
    } else {
      throw new Error("not a type");
    }
    const td = this.prog.typedefs.get(name);
    const type: TypeRef = td ? { ...td, args: [...td.args] } : { name, args: [], ptr: 0, ref: false, dims: 0 };
    if (this.is("<") && name !== "auto" && !PRIM_WORDS.has(name)) {
      this.pos++;
      while (!this.is(">") && !this.is(">>") && !this.is(">>>")) {
        const nt = this.peek();
        if (nt.k === "num") {
          this.pos++;
          type.args.push({ ...simpleType("#"), num: nt.num });
        } else if (this.is("?")) {
          this.pos++;
          if (this.accept("extends") || this.accept("super")) type.args.push(this.parseTypeStrict());
          else type.args.push(simpleType("Object"));
        } else {
          type.args.push(this.parseTypeStrict());
        }
        if (!this.accept(",")) break;
      }
      this.closeAngle();
    }
    // vector<int>::iterator
    if (this.is("::") && this.peek(1).v === "iterator") {
      this.pos += 2;
      type.name = "iterator";
    }
    while (this.is("[") && this.is("]", 1)) {
      this.pos += 2;
      type.dims++;
    }
    while (this.is("*") || (this.is("const") && type.ptr > 0)) {
      if (this.next().v === "*") type.ptr++;
    }
    if (this.is("&") || this.is("&&")) {
      this.pos++;
      type.ref = true;
    }
    if (this.is("...")) {
      this.pos++;
      type.dims++;
    }
    return type;
  }

  private parseType(what = "a type"): TypeRef {
    const t = this.tryType();
    if (!t) this.fail(`Expected ${what} but found '${this.peek().v}'`);
    return t;
  }

  /** True if the tokens ahead look like `Type name` (a declaration). */
  private isDeclStart(): boolean {
    const save = this.pos;
    const t = this.tryType();
    const p = this.peek();
    const ok = !!t && ((p.k === "id" && !STMT_KEYWORDS.has(p.v)) || (t.name === "auto" && p.v === "["));
    this.pos = save;
    return ok;
  }

  // ---------- program ----------
  parseProgram(): Program {
    while (this.peek().k !== "eof") this.parseTopLevel();
    return this.prog;
  }

  private skipUntil(v: string) {
    while (!this.is(v) && this.peek().k !== "eof") this.pos++;
    this.accept(v);
  }

  private skipAnnotation() {
    while (this.is("@") && !this.is("interface", 1)) {
      this.pos++;
      this.ident();
      if (this.is("(")) this.skipBalanced("(", ")");
    }
  }

  private skipBalanced(open: string, close: string) {
    let depth = 0;
    do {
      if (this.is(open)) depth++;
      else if (this.is(close)) depth--;
      this.pos++;
    } while (depth > 0 && this.peek().k !== "eof");
  }

  private parseTopLevel() {
    this.skipAnnotation();
    const t = this.peek();
    if (t.v === ";") {
      this.pos++;
      return;
    }
    if (t.v === "import" || t.v === "package") return this.skipUntil(";");
    if (t.v === "using") {
      this.pos++;
      if (this.peek().k === "id" && this.is("=", 1)) {
        const name = this.ident();
        this.pos++;
        this.prog.typedefs.set(name, this.parseType());
        this.expect(";");
        return;
      }
      return this.skipUntil(";");
    }
    if (t.v === "template") {
      this.pos++;
      this.expect("<");
      while (!this.is(">")) {
        if ((this.is("typename") || this.is("class")) && this.peek(1).k === "id") {
          this.pos++;
          const n = this.ident();
          this.typeNames.add(n);
          this.prog.typedefs.set(n, simpleType("auto"));
        } else this.pos++;
      }
      this.pos++;
      return;
    }
    if (t.v === "typedef") return this.parseTypedef();
    // class / struct / interface / enum definitions
    let j = 0;
    while (this.peek(j).k === "id" && MODIFIERS.has(this.peek(j).v)) j++;
    const kw = this.peek(j).v;
    if ((kw === "class" || kw === "interface" || (kw === "struct" && (this.is("{", j + 2) || this.is(":", j + 2)))) && this.peek(j).k === "id") {
      this.pos += j;
      this.parseClass();
      return;
    }
    if (kw === "enum" && this.peek(j).k === "id") {
      this.pos += j;
      this.parseEnum();
      return;
    }
    if (this.lang === "java") this.fail(`Java code must be inside a class. Unexpected '${t.v}'`);
    this.parseFuncOrGlobal(null);
  }

  private parseTypedef() {
    this.expect("typedef");
    if ((this.is("struct") || this.is("union")) && (this.is("{", 1) || this.is("{", 2))) {
      const line = this.next().line;
      let name = this.peek().k === "id" ? this.ident() : "";
      const cls = this.parseClassBody(name || "__anon", line, true);
      const alias = this.ident("a type name");
      if (!name) {
        name = alias;
        cls.name = alias;
      }
      this.prog.classes.set(name, cls);
      this.typeNames.add(name);
      if (alias !== name) this.prog.typedefs.set(alias, simpleType(name));
      while (this.accept(",")) {
        const extra = this.parseTypeStrictPtrAlias(name);
        this.prog.typedefs.set(extra.alias, extra.type);
      }
      this.expect(";");
      return;
    }
    const type = this.parseType();
    const alias = this.ident("a type name");
    this.prog.typedefs.set(alias, type);
    this.typeNames.add(alias);
    this.expect(";");
  }

  private parseTypeStrictPtrAlias(base: string) {
    let ptr = 0;
    while (this.accept("*")) ptr++;
    const alias = this.ident();
    this.typeNames.add(alias);
    return { alias, type: { ...simpleType(base), ptr } };
  }

  private parseEnum() {
    this.expect("enum");
    if (this.is("class")) this.pos++;
    if (this.peek().k === "id") this.typeNames.add(this.ident());
    this.expect("{");
    let n = 0;
    while (!this.is("}")) {
      const name = this.ident("an enum value");
      if (this.accept("=")) {
        const t = this.next();
        n = (t.v === "-" ? -(this.next().num ?? 0) : t.num) ?? 0;
      }
      this.prog.enums.set(name, n++);
      if (this.is("(")) this.skipBalanced("(", ")");
      if (!this.accept(",")) break;
    }
    this.expect("}");
    this.accept(";");
  }

  private parseClass() {
    while (this.peek().k === "id" && MODIFIERS.has(this.peek().v)) this.pos++;
    const kwTok = this.next();
    const isStruct = kwTok.v === "struct";
    const name = this.ident("a class name");
    this.typeNames.add(name);
    if (this.is("<")) {
      this.pos++;
      while (!this.is(">")) {
        if (this.peek().k === "id") {
          const tp = this.next().v;
          if (!this.isTypeWord(tp)) {
            this.typeNames.add(tp);
            this.prog.typedefs.set(tp, simpleType("auto"));
          }
        } else this.pos++;
      }
      this.pos++;
    }
    let superName: string | null = null;
    if (this.accept("extends")) {
      superName = this.parseType().name;
      while (this.accept(",")) this.parseType();
    }
    if (this.accept("implements")) {
      this.parseType();
      while (this.accept(",")) this.parseType();
    }
    if (this.accept(":")) {
      while (!this.is("{")) {
        if (this.peek().k === "id" && !MODIFIERS.has(this.peek().v) && !["public", "private", "protected", "virtual"].includes(this.peek().v))
          superName = this.peek().v;
        this.pos++;
      }
    }
    const cls = this.parseClassBody(name, kwTok.line, isStruct, superName);
    this.prog.classes.set(name, cls);
    if (this.lang !== "java") {
      // struct Node { ... } a, b;
      if (this.peek().k === "id") {
        const type = simpleType(name);
        const decls = this.parseDeclarators(type);
        this.prog.globals.push({ k: "decl", type, decls, isStatic: true, line: kwTok.line });
      }
      this.accept(";");
    }
  }

  private parseClassBody(name: string, line: number, isStruct: boolean, superName: string | null = null): ClassDecl {
    const cls: ClassDecl = { name, superName, fields: [], methods: [], ctors: [], line, isStruct, initBlocks: [] };
    this.expect("{", `to start class ${name}`);
    while (!this.is("}")) {
      if (this.peek().k === "eof") this.fail(`Class ${name} is missing its closing '}'`);
      this.skipAnnotation();
      if (this.accept(";")) continue;
      // C++ access labels
      if ((this.is("public") || this.is("private") || this.is("protected")) && this.is(":", 1)) {
        this.pos += 2;
        continue;
      }
      let j = 0;
      let isStatic = false;
      while (this.peek(j).k === "id" && MODIFIERS.has(this.peek(j).v)) {
        if (this.peek(j).v === "static") isStatic = true;
        j++;
      }
      const kw = this.peek(j).v;
      if (kw === "class" || kw === "interface" || (kw === "struct" && this.is("{", j + 2))) {
        this.pos += j;
        this.parseClass();
        continue;
      }
      if (kw === "enum") {
        this.pos += j;
        this.parseEnum();
        continue;
      }
      if (isStatic && this.is("{", j)) {
        this.pos += j;
        cls.initBlocks.push(this.parseBlock());
        continue;
      }
      if (this.is("{")) {
        cls.initBlocks.push(this.parseBlock());
        continue;
      }
      // destructor
      if (this.is("~", j)) {
        this.pos += j + 1;
        this.ident();
        this.skipBalanced("(", ")");
        if (this.is("{")) this.parseBlock();
        else this.accept(";");
        continue;
      }
      // constructor
      if (this.peek(j).v === name && this.is("(", j + 1)) {
        this.pos += j;
        const ctorLine = this.next().line;
        const params = this.parseParams();
        const inits: FuncDecl["inits"] = [];
        if (this.accept(":")) {
          do {
            const iline = this.peek().line;
            const field = this.ident("a field name");
            const brace = this.is("{");
            this.expect(brace ? "{" : "(");
            const args = this.parseArgs(brace ? "}" : ")");
            inits.push({ name: field, args, line: iline });
          } while (this.accept(","));
        }
        if (this.accept("throws")) {
          this.parseType();
          while (this.accept(",")) this.parseType();
        }
        const body = this.is("{") ? this.parseBlock() : (this.expect(";"), null);
        cls.ctors.push({
          name, ret: null, params, body, line: ctorLine, endLine: body && body.k === "block" ? body.endLine : ctorLine,
          isStatic: false, cls: name, isCtor: true, inits,
        });
        continue;
      }
      this.parseFuncOrGlobal(cls, isStatic);
    }
    this.expect("}");
    return cls;
  }

  private parseParams(): Param[] {
    this.expect("(");
    const params: Param[] = [];
    if (this.is("void") && this.is(")", 1)) this.pos++;
    while (!this.is(")")) {
      this.skipAnnotation();
      const type = this.parseType("a parameter type");
      let name = "";
      if (this.peek().k === "id") name = this.ident();
      while (this.is("[")) {
        this.pos++;
        if (!this.is("]")) this.parseExpr();
        this.expect("]");
        type.dims++;
      }
      let def: Expr | null = null;
      if (this.accept("=")) def = this.parseAssign();
      params.push({ type, name, def });
      if (!this.accept(",")) break;
    }
    this.expect(")");
    return params;
  }

  private parseFuncOrGlobal(cls: ClassDecl | null, isStaticMember = false) {
    const line = this.peek().line;
    let isStatic = isStaticMember;
    {
      let j = 0;
      while (this.peek(j).k === "id" && MODIFIERS.has(this.peek(j).v)) {
        if (this.peek(j).v === "static") isStatic = true;
        j++;
      }
    }
    // Java generic method: static <T> void f(...)
    {
      let j = 0;
      while (this.peek(j).k === "id" && MODIFIERS.has(this.peek(j).v)) j++;
      if (this.is("<", j)) {
        this.pos += j + 1;
        while (!this.is(">")) {
          if (this.peek().k === "id" && !this.isTypeWord(this.peek().v)) {
            this.typeNames.add(this.peek().v);
            this.prog.typedefs.set(this.peek().v, simpleType("auto"));
          }
          this.pos++;
        }
        this.pos++;
      }
    }
    const type = this.parseType("a type or function");
    if (this.is("operator")) this.fail("Operator overloading is not supported yet");
    const nameTok = this.peek();
    if (nameTok.k !== "id") this.fail(`Expected a name after the type but found '${nameTok.v}'`);
    // `vector<bool> visited(5, false);` is a variable, `int f(int x)` is a function
    const after = this.peek(2);
    const looksLikeFunc =
      this.is("(", 1) &&
      (this.lang === "java" || after.v === ")" || (after.k === "id" && (this.isTypeWord(after.v) || MODIFIERS.has(after.v) || after.v === "struct")));
    if (looksLikeFunc) {
      this.pos++;
      const params = this.parseParams();
      while (this.is("const") || this.is("override") || this.is("noexcept")) this.pos++;
      if (this.accept("throws")) {
        this.parseType();
        while (this.accept(",")) this.parseType();
      }
      let body: Stmt | null = null;
      if (this.is("{")) body = this.parseBlock();
      else if (this.accept("=")) {
        this.next();
        this.expect(";");
      } else this.expect(";", "or a function body");
      const fn: FuncDecl = {
        name: nameTok.v, ret: type, params, body, line: nameTok.line,
        endLine: body && body.k === "block" ? body.endLine : nameTok.line,
        isStatic: cls ? isStatic || this.lang !== "java" : true, cls: cls?.name ?? null, isCtor: false, inits: [],
      };
      if (!body) return;
      if (cls) {
        cls.methods.push(fn);
        if (fn.isStatic && this.lang === "java") this.prog.funcs.push(fn);
      } else this.prog.funcs.push(fn);
      return;
    }
    const decls = this.parseDeclarators(type);
    this.expect(";");
    if (cls) {
      for (const d of decls) cls.fields.push({ type, decl: d, isStatic });
      if (isStatic) this.prog.globals.push({ k: "decl", type, decls, isStatic: true, line });
    } else {
      this.prog.globals.push({ k: "decl", type, decls, isStatic: true, line });
    }
  }

  // ---------- statements ----------
  private parseBlock(): Stmt {
    const line = this.expect("{").line;
    const body: Stmt[] = [];
    while (!this.is("}")) {
      if (this.peek().k === "eof") this.fail("A block is missing its closing '}'", this.toks[this.pos - 1]);
      body.push(this.parseStatement());
    }
    const endLine = this.next().line;
    return { k: "block", body, line, endLine };
  }

  private parseDeclarators(type: TypeRef): Declarator[] {
    const decls: Declarator[] = [];
    do {
      const line = this.peek().line;
      let ptr = 0;
      let ref = false;
      while (this.accept("*")) ptr++;
      if (this.accept("&") || this.accept("&&")) ref = true;
      let bindings: string[] | null = null;
      let name = "";
      if (this.is("[")) {
        this.pos++;
        bindings = [];
        while (!this.is("]")) {
          bindings.push(this.ident());
          if (!this.accept(",")) break;
        }
        this.expect("]");
        name = `[${bindings.join(", ")}]`;
      } else name = this.ident("a variable name");
      const dims: (Expr | null)[] = [];
      while (this.is("[")) {
        this.pos++;
        dims.push(this.is("]") ? null : this.parseExpr());
        this.expect("]");
      }
      let init: Expr | null = null;
      let ctorArgs: Expr[] | null = null;
      if (this.accept("=")) {
        init = this.is("{") ? this.parseListExpr() : this.parseAssign();
      } else if (this.is("(") && this.lang !== "java") {
        this.pos++;
        ctorArgs = this.parseArgs(")");
      } else if (this.is("{") && this.lang !== "java") {
        init = this.parseListExpr();
      }
      decls.push({ name, line, ptr, ref, dims, init, ctorArgs, bindings });
    } while (this.accept(","));
    return decls;
  }

  private parseDeclStmt(): Stmt {
    const line = this.peek().line;
    let isStatic = false;
    for (let j = 0; this.peek(j).k === "id" && MODIFIERS.has(this.peek(j).v); j++) if (this.peek(j).v === "static") isStatic = true;
    const type = this.parseType();
    const decls = this.parseDeclarators(type);
    return { k: "decl", type, decls, isStatic, line };
  }

  parseStatement(): Stmt {
    const t = this.peek();
    const line = t.line;
    if (t.k === "op") {
      if (t.v === "{") return this.parseBlock();
      if (t.v === ";") {
        this.pos++;
        return { k: "empty", line };
      }
    }
    if (t.k === "id") {
      switch (t.v) {
        case "if": {
          this.pos++;
          this.expect("(", "after if");
          const c = this.parseExpr();
          this.expect(")", "to close the if condition");
          const then = this.parseStatement();
          const els = this.accept("else") ? this.parseStatement() : null;
          return { k: "if", c, then, else: els, line };
        }
        case "while": {
          this.pos++;
          this.expect("(", "after while");
          const c = this.parseExpr();
          this.expect(")", "to close the while condition");
          return { k: "while", c, body: this.parseStatement(), line };
        }
        case "do": {
          this.pos++;
          const body = this.parseStatement();
          const condLine = this.expect("while").line;
          this.expect("(");
          const c = this.parseExpr();
          this.expect(")");
          this.expect(";");
          return { k: "dowhile", body, c, condLine, line };
        }
        case "for":
          return this.parseFor();
        case "return": {
          this.pos++;
          const e = this.is(";") ? null : this.is("{") ? this.parseListExpr() : this.parseExpr();
          this.expect(";", "after return");
          return { k: "return", e, line };
        }
        case "break":
        case "continue":
          this.pos++;
          if (this.peek().k === "id") this.pos++; // labels
          this.expect(";");
          return { k: t.v, line } as Stmt;
        case "switch":
          return this.parseSwitch();
        case "try":
          return this.parseTry();
        case "throw": {
          this.pos++;
          const e = this.is(";") ? null : this.parseExpr();
          this.expect(";");
          return { k: "throw", e, line };
        }
        case "delete": {
          this.pos++;
          if (this.is("[")) {
            this.pos++;
            this.expect("]");
          }
          const e = this.parseExpr();
          this.expect(";");
          return { k: "delete", e, line };
        }
        case "using":
        case "typedef":
          this.skipUntil(";");
          return { k: "empty", line };
        case "class":
        case "struct":
          if (this.is("{", 2)) {
            this.parseClass();
            return { k: "empty", line };
          }
      }
      // label:  (outer: for ...)
      if (this.is(":", 1) && !this.isTypeWord(t.v) && this.lang === "java") {
        this.pos += 2;
        return this.parseStatement();
      }
      if (this.isDeclStart()) {
        const d = this.parseDeclStmt();
        this.expect(";", "after the declaration");
        return d;
      }
    }
    const e = this.parseExpr();
    this.expect(";", "at the end of the statement");
    return { k: "expr", e, line };
  }

  private parseFor(): Stmt {
    const line = this.expect("for").line;
    this.expect("(", "after for");
    // for-each: for (Type x : items)
    const save = this.pos;
    const type = this.tryType();
    if (type) {
      let ref = type.ref;
      if (this.accept("&") || this.accept("&&")) ref = true;
      let bindings: string[] | null = null;
      let name = "";
      if (this.is("[")) {
        this.pos++;
        bindings = [];
        while (!this.is("]")) {
          bindings.push(this.ident());
          if (!this.accept(",")) break;
        }
        this.pos++;
        name = `[${bindings.join(", ")}]`;
      } else if (this.peek().k === "id") name = this.next().v;
      if (name && this.accept(":")) {
        const iter = this.parseExpr();
        this.expect(")");
        const body = this.parseStatement();
        return { k: "foreach", type, name, bindings, ref, iter, body, line };
      }
    }
    this.pos = save;
    let init: Stmt | null = null;
    if (!this.is(";")) {
      const iline = this.peek().line;
      if (this.isDeclStart()) init = this.parseDeclStmt();
      else {
        const es = [this.parseExpr()];
        while (this.accept(",")) es.push(this.parseExpr());
        init = es.length === 1 ? { k: "expr", e: es[0], line: iline } : { k: "block", body: es.map((e) => ({ k: "expr", e, line: iline }) as Stmt), line: iline, endLine: iline };
      }
    }
    this.expect(";", "in the for loop");
    const c = this.is(";") ? null : this.parseExpr();
    this.expect(";", "in the for loop");
    const update: Expr[] = [];
    while (!this.is(")")) {
      update.push(this.parseExpr());
      if (!this.accept(",")) break;
    }
    this.expect(")", "to close the for loop");
    const body = this.parseStatement();
    return { k: "for", init, c, update, body, line };
  }

  private parseSwitch(): Stmt {
    const line = this.expect("switch").line;
    this.expect("(");
    const e = this.parseExpr();
    this.expect(")");
    this.expect("{");
    const cases: { tests: Expr[] | null; body: Stmt[]; line: number }[] = [];
    while (!this.is("}")) {
      const cline = this.peek().line;
      if (this.accept("default")) {
        if (!this.accept(":")) this.expect("->");
        cases.push({ tests: null, body: [], line: cline });
      } else if (this.accept("case")) {
        const tests = [this.parseTernary()];
        while (this.accept(",")) tests.push(this.parseTernary());
        if (!this.accept(":")) this.expect("->");
        cases.push({ tests, body: [], line: cline });
      } else {
        if (!cases.length) this.fail("Expected 'case' inside switch");
        cases[cases.length - 1].body.push(this.parseStatement());
      }
    }
    this.expect("}");
    return { k: "switch", e, cases, line };
  }

  private parseTry(): Stmt {
    const line = this.expect("try").line;
    const block = this.parseBlock();
    const catches: { type: TypeRef | null; name: string | null; body: Stmt }[] = [];
    while (this.accept("catch")) {
      this.expect("(");
      let type: TypeRef | null = null;
      let name: string | null = null;
      if (this.accept("...")) {
        /* catch all */
      } else {
        type = this.tryType() ?? simpleType(this.ident());
        while (this.accept("|")) this.parseType();
        if (this.peek().k === "id") name = this.ident();
      }
      this.expect(")");
      catches.push({ type, name, body: this.parseBlock() });
    }
    const fin = this.accept("finally") ? this.parseBlock() : null;
    return { k: "try", block, catches, fin, line };
  }

  // ---------- expressions ----------
  private mk<E extends Partial<Expr>>(start: Token, e: E): Expr {
    return { ...e, line: start.line, start: start.start, end: this.prevEnd } as unknown as Expr;
  }

  parseExpr(): Expr {
    return this.parseAssign();
  }

  private parseArgs(close: string): Expr[] {
    const args: Expr[] = [];
    while (!this.is(close)) {
      args.push(this.is("{") ? this.parseListExpr() : this.parseAssign());
      if (!this.accept(",")) break;
    }
    this.expect(close, "to close the argument list");
    return args;
  }

  private parseListExpr(): Expr {
    const start = this.expect("{");
    const items: Expr[] = [];
    while (!this.is("}")) {
      items.push(this.is("{") ? this.parseListExpr() : this.parseAssign());
      if (!this.accept(",")) break;
    }
    this.expect("}", "to close the { } list");
    return this.mk(start, { k: "list", items });
  }

  parseAssign(): Expr {
    const start = this.peek();
    const target = this.parseTernary();
    const t = this.peek();
    if (t.k === "op" && ASSIGN_OPS.has(t.v)) {
      this.pos++;
      const value = this.is("{") ? this.parseListExpr() : this.parseAssign();
      return this.mk(start, { k: "assign", op: t.v, target, value });
    }
    return target;
  }

  private parseTernary(): Expr {
    const start = this.peek();
    const c = this.parseBinary(1);
    if (this.accept("?")) {
      const a = this.parseAssign();
      this.expect(":", "in the ?: expression");
      const b = this.parseAssign();
      return this.mk(start, { k: "cond", c, a, b });
    }
    return c;
  }

  private parseBinary(minPrec: number): Expr {
    const start = this.peek();
    let left = this.parseUnary();
    for (;;) {
      const t = this.peek();
      if (t.k !== "op" && !(t.k === "id" && t.v === "instanceof")) break;
      const prec = BIN_PREC[t.v];
      if (prec === undefined || prec < minPrec) break;
      this.pos++;
      if (t.v === "instanceof") {
        const type = this.parseType();
        left = this.mk(start, { k: "instanceof", e: left, type });
        continue;
      }
      const right = this.parseBinary(prec + 1);
      left =
        t.v === "&&" || t.v === "||"
          ? this.mk(start, { k: "logic", op: t.v, l: left, r: right })
          : this.mk(start, { k: "bin", op: t.v, l: left, r: right });
    }
    return left;
  }

  private looksLikeCast(): boolean {
    // at '('
    const save = this.pos;
    this.pos++;
    const type = this.tryType();
    let ok = false;
    if (type && this.is(")")) {
      const after = this.peek(1);
      const prim = PRIM_WORDS.has(type.name) || type.ptr > 0 || type.dims > 0;
      const starts = after.k === "id" || after.k === "num" || after.k === "str" || after.k === "char" || ["(", "!", "~", "-", "+", "*", "&", "++", "--"].includes(after.v);
      ok = starts && (prim || !["-", "+", "*", "&"].includes(after.v));
    }
    this.pos = save;
    return ok;
  }

  private parseUnary(): Expr {
    const start = this.peek();
    const t = start;
    if (t.k === "op") {
      if (t.v === "++" || t.v === "--") {
        this.pos++;
        const e = this.parseUnary();
        return this.mk(start, { k: "incdec", op: t.v, prefix: true, e });
      }
      if (t.v === "-" || t.v === "+" || t.v === "!" || t.v === "~") {
        this.pos++;
        const e = this.parseUnary();
        return this.mk(start, { k: "un", op: t.v, e });
      }
      if (t.v === "*" && this.lang !== "java") {
        this.pos++;
        return this.mk(start, { k: "deref", e: this.parseUnary() });
      }
      if (t.v === "&" && this.lang !== "java") {
        this.pos++;
        return this.mk(start, { k: "addr", e: this.parseUnary() });
      }
      if (t.v === "(" && this.looksLikeCast()) {
        this.pos++;
        const type = this.parseType();
        this.expect(")");
        const e = this.parseUnary();
        return this.mk(start, { k: "cast", type, e });
      }
    }
    if (t.k === "id" && t.v === "new") return this.parsePostfix(this.parseNew());
    if (t.k === "id" && t.v === "sizeof") {
      this.pos++;
      if (this.is("(")) {
        const save = this.pos;
        this.pos++;
        const type = this.tryType();
        if (type && this.accept(")")) return this.mk(start, { k: "sizeof", type, e: null });
        this.pos = save;
      }
      const e = this.parseUnary();
      return this.mk(start, { k: "sizeof", type: null, e });
    }
    return this.parsePostfix(this.parsePrimary());
  }

  private parseNew(): Expr {
    const start = this.expect("new");
    const type = this.parseType("a type after new");
    const dims: (Expr | null)[] = [];
    while (this.is("[")) {
      this.pos++;
      dims.push(this.is("]") ? null : this.parseExpr());
      this.expect("]");
    }
    type.dims += 0;
    let init: Expr | null = null;
    let args: Expr[] = [];
    if (this.is("{")) {
      if (!dims.length && type.dims === 0 && this.lang === "java") this.fail("Anonymous classes are not supported yet");
      init = this.parseListExpr();
    } else if (this.is("(")) {
      this.pos++;
      args = this.parseArgs(")");
      if (this.is("{") && this.lang === "java") this.fail("Anonymous classes are not supported yet. Use a lambda instead: (a, b) -> a - b");
    }
    return this.mk(start, { k: "new", type, args, dims, init });
  }

  private parsePostfix(e: Expr): Expr {
    const start = this.toks.find((t) => t.start === e.start) ?? this.peek();
    for (;;) {
      const t = this.peek();
      if (t.k !== "op") break;
      if (t.v === "(") {
        this.pos++;
        const args = this.parseArgs(")");
        e = this.mk(start, { k: "call", callee: e, args });
      } else if (t.v === "[") {
        this.pos++;
        const idx = this.parseExpr();
        this.expect("]", "to close the index");
        e = this.mk(start, { k: "index", obj: e, idx });
      } else if (t.v === "." || t.v === "->") {
        this.pos++;
        if (this.is("<")) {
          // obj.<T>method()
          this.skipBalanced("<", ">");
        }
        const name = this.ident("a member name");
        e = this.mk(start, { k: "member", obj: e, name, arrow: t.v === "->" });
      } else if (t.v === "++" || t.v === "--") {
        this.pos++;
        e = this.mk(start, { k: "incdec", op: t.v, prefix: false, e });
      } else if (t.v === "::" && this.lang === "java" && e.k === "name") {
        this.pos++;
        const name = this.is("new") ? (this.pos++, "new") : this.ident();
        e = this.mk(start, { k: "scope", type: simpleType(e.name), name });
      } else break;
    }
    return e;
  }

  private parseLambdaParams(): Param[] {
    const params: Param[] = [];
    if (this.peek().k === "id" && !this.is("(")) {
      params.push({ type: null, name: this.ident() });
      return params;
    }
    this.expect("(");
    while (!this.is(")")) {
      const save = this.pos;
      const type = this.tryType();
      if (type && this.peek().k === "id") params.push({ type, name: this.ident() });
      else {
        this.pos = save;
        params.push({ type: null, name: this.ident() });
      }
      if (!this.accept(",")) break;
    }
    this.expect(")");
    return params;
  }

  private parsePrimary(): Expr {
    const t = this.peek();
    const start = t;
    switch (t.k) {
      case "num":
        this.pos++;
        return this.mk(start, { k: "num", v: t.num ?? 0, isFloat: !!t.isFloat, isLong: /[lL]/.test(t.v) });
      case "str":
        this.pos++;
        return this.mk(start, { k: "str", v: t.v });
      case "char":
        this.pos++;
        return this.mk(start, { k: "char", v: t.v });
      case "eof":
        this.fail("The code ended unexpectedly. Is a ')' or '}' missing?", this.toks[this.pos - 1] ?? t);
    }
    if (t.k === "op") {
      if (t.v === "(") {
        // Java lambda: (a, b) -> ...
        if (this.lang === "java") {
          let depth = 0;
          let j = 0;
          do {
            const v = this.peek(j).v;
            if (v === "(") depth++;
            else if (v === ")") depth--;
            j++;
          } while (depth > 0 && this.peek(j).k !== "eof");
          if (this.is("->", j)) {
            const params = this.parseLambdaParams();
            this.expect("->");
            const body = this.is("{") ? this.parseBlock() : this.parseAssign();
            return this.mk(start, { k: "lambda", params, body });
          }
        }
        this.pos++;
        const e = this.parseExpr();
        this.expect(")", "to close the parenthesis");
        return { ...e, start: start.start, end: this.prevEnd };
      }
      if (t.v === "{") return this.parseListExpr();
      if (t.v === "[" && this.lang === "cpp") {
        // C++ lambda
        this.skipBalanced("[", "]");
        const params = this.is("(") ? this.parseParams() : [];
        while (this.is("mutable") || this.is("noexcept")) this.pos++;
        if (this.accept("->")) this.parseType();
        const body = this.parseBlock();
        return this.mk(start, { k: "lambda", params, body });
      }
      if (t.v === "::") {
        this.pos++;
        return this.parsePrimary();
      }
      this.fail(`Unexpected '${t.v}'`);
    }
    // identifiers
    const w = t.v;
    if (w === "std" && this.is("::", 1)) {
      this.pos += 2;
      return this.parsePrimary();
    }
    if (w === "true" || w === "false") {
      this.pos++;
      return this.mk(start, { k: "bool", v: w === "true" });
    }
    if (w === "null" || w === "nullptr" || w === "NULL") {
      this.pos++;
      return this.mk(start, { k: "null", text: w });
    }
    if (w === "this") {
      this.pos++;
      return this.mk(start, { k: "this" });
    }
    if (this.lang === "java" && this.is("->", 1)) {
      const params = this.parseLambdaParams();
      this.expect("->");
      const body = this.is("{") ? this.parseBlock() : this.parseAssign();
      return this.mk(start, { k: "lambda", params, body });
    }
    if (["static_cast", "dynamic_cast", "reinterpret_cast", "const_cast"].includes(w)) {
      this.pos++;
      this.expect("<");
      const type = this.parseType();
      this.closeAngle();
      this.expect("(");
      const e = this.parseExpr();
      this.expect(")");
      return this.mk(start, { k: "cast", type, e });
    }
    if (this.lang !== "java" && this.isTypeWord(w) && !PRIM_WORDS.has(w) && (this.is("<", 1) || this.is("(", 1) || this.is("{", 1) || this.is("::", 1))) {
      const type = this.parseType();
      if (this.accept("::")) {
        const name = this.ident();
        return this.mk(start, { k: "scope", type, name });
      }
      const brace = this.is("{");
      this.expect(brace ? "{" : "(");
      const args = this.parseArgs(brace ? "}" : ")");
      return this.mk(start, { k: "construct", type, args, brace });
    }
    if (this.lang !== "java" && PRIM_WORDS.has(w) && this.is("(", 1)) {
      // int(x), double(x) functional casts
      const type = this.parseType();
      this.expect("(");
      const e = this.parseExpr();
      this.expect(")");
      return this.mk(start, { k: "cast", type, e });
    }
    this.pos++;
    if (this.lang !== "java" && this.is("::") && this.peek(1).k === "id") {
      // Class::member (C++ static)
      this.pos++;
      const name = this.ident();
      return this.mk(start, { k: "scope", type: simpleType(w), name });
    }
    return this.mk(start, { k: "name", name: w });
  }
}

export function parse(src: string, lang: Dialect): Program {
  return new Parser(src, lang).parseProgram();
}
