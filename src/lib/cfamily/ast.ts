// Syntax tree for the Java / C / C++ subset we support.

export type TypeRef = {
  name: string; // int, long, double, float, char, bool, void, string, String, auto, or a class / library type
  args: TypeRef[]; // generic / template arguments
  ptr: number; // number of *
  ref: boolean; // C++ reference (&)
  dims: number; // Java-style [] dimensions
  num?: number; // numeric template argument (std::array<int, 5>)
};

type Pos = { line: number; start: number; end: number };

export type Expr = Pos &
  (
    | { k: "num"; v: number; isFloat: boolean; isLong: boolean }
    | { k: "str"; v: string }
    | { k: "char"; v: string }
    | { k: "bool"; v: boolean }
    | { k: "null"; text: string }
    | { k: "name"; name: string }
    | { k: "this" }
    | { k: "bin"; op: string; l: Expr; r: Expr }
    | { k: "logic"; op: "&&" | "||"; l: Expr; r: Expr }
    | { k: "un"; op: string; e: Expr }
    | { k: "incdec"; op: "++" | "--"; prefix: boolean; e: Expr }
    | { k: "assign"; op: string; target: Expr; value: Expr }
    | { k: "cond"; c: Expr; a: Expr; b: Expr }
    | { k: "call"; callee: Expr; args: Expr[] }
    | { k: "index"; obj: Expr; idx: Expr }
    | { k: "member"; obj: Expr; name: string; arrow: boolean }
    | { k: "scope"; type: TypeRef; name: string } // numeric_limits<int>::max, Integer::sum
    | { k: "new"; type: TypeRef; args: Expr[]; dims: (Expr | null)[]; init: Expr | null }
    | { k: "cast"; type: TypeRef; e: Expr }
    | { k: "deref"; e: Expr }
    | { k: "addr"; e: Expr }
    | { k: "sizeof"; type: TypeRef | null; e: Expr | null }
    | { k: "list"; items: Expr[] }
    | { k: "lambda"; params: Param[]; body: Stmt | Expr }
    | { k: "construct"; type: TypeRef; args: Expr[]; brace: boolean } // vector<int>(5, 0), Node(3), Point{1, 2}
    | { k: "instanceof"; e: Expr; type: TypeRef }
  );

export type Param = { type: TypeRef | null; name: string; def?: Expr | null };

export type Declarator = {
  name: string;
  line: number;
  ptr: number; // extra * on this declarator (int *a, b)
  ref: boolean;
  dims: (Expr | null)[]; // C array dims: int a[5][5], int a[]
  init: Expr | null; // = value
  ctorArgs: Expr[] | null; // vector<int> v(n, 0)
  bindings: string[] | null; // auto [a, b] = ...
};

export type Stmt = { line: number } & (
  | { k: "block"; body: Stmt[]; endLine: number }
  | { k: "decl"; type: TypeRef; decls: Declarator[]; isStatic: boolean }
  | { k: "expr"; e: Expr }
  | { k: "if"; c: Expr; then: Stmt; else: Stmt | null }
  | { k: "while"; c: Expr; body: Stmt }
  | { k: "dowhile"; body: Stmt; c: Expr; condLine: number }
  | { k: "for"; init: Stmt | null; c: Expr | null; update: Expr[]; body: Stmt }
  | { k: "foreach"; type: TypeRef; name: string; bindings: string[] | null; ref: boolean; iter: Expr; body: Stmt }
  | { k: "return"; e: Expr | null }
  | { k: "break" }
  | { k: "continue" }
  | { k: "switch"; e: Expr; cases: { tests: Expr[] | null; body: Stmt[]; line: number }[] }
  | { k: "try"; block: Stmt; catches: { type: TypeRef | null; name: string | null; body: Stmt }[]; fin: Stmt | null }
  | { k: "throw"; e: Expr | null }
  | { k: "empty" }
  | { k: "delete"; e: Expr }
);

export type FuncDecl = {
  name: string;
  ret: TypeRef | null; // null for constructors
  params: Param[];
  body: Stmt | null;
  line: number;
  endLine: number;
  isStatic: boolean;
  cls: string | null;
  isCtor: boolean;
  inits: { name: string; args: Expr[]; line: number }[]; // C++ member initializer list
};

export type FieldDecl = { type: TypeRef; decl: Declarator; isStatic: boolean };

export type ClassDecl = {
  name: string;
  superName: string | null;
  fields: FieldDecl[];
  methods: FuncDecl[];
  ctors: FuncDecl[];
  line: number;
  isStruct: boolean;
  initBlocks: Stmt[];
};

export type Program = {
  classes: Map<string, ClassDecl>;
  funcs: FuncDecl[]; // free functions (C/C++) and Java static methods
  globals: Stmt[]; // global declarations (C/C++) / static field initializers (Java)
  typedefs: Map<string, TypeRef>;
  enums: Map<string, number>;
};
