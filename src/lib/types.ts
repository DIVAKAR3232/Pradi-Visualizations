/**
 * Display format shared by every language. Each tracer (Python via Pyodide, Java/C/C++ via our own
 * interpreter) produces a TraceResult made of Steps, and the UI only ever reads this format.
 *
 * Prim `t` values:
 *  Python: int, float, str ('quoted'), bool (True/False), NoneType (None), bigint
 *  Java/C/C++: int, long, double, float, char ('a'), boolean (true/false), String / string ("quoted"),
 *              null (v = "null" | "nullptr" | "NULL"), ptr (v = "&x"), iter, uninit (v = "?")
 */
export type Prim = { k: "p"; t: string; v: string | number | boolean | null };
export type Ref = { k: "r"; id: string };
export type Val = Prim | Ref;

/**
 * Sequence kinds:
 *  list / tuple / set  - plain sequences (arrays, vectors, ArrayList, Python lists...)
 *  deque / queue       - items are front → back
 *  stack               - items are bottom → top
 *  pq                  - priority queue, items in binary-heap array order (index 0 = top)
 * `type` is an optional display label like "vector<int>", "HashMap<String, Integer>", "int[]".
 */
export type SeqKind = "list" | "tuple" | "set" | "deque" | "queue" | "stack" | "pq";

export type HeapObj =
  | { kind: SeqKind; items: Val[]; len: number; type?: string }
  | { kind: "dict"; entries: [Val, Val][]; len: number; type?: string }
  | { kind: "object"; cls: string; fields: [string, Val][] }
  | { kind: "function"; name: string; params: string[] }
  | { kind: "class"; name: string }
  | { kind: "other"; type: string; repr: string };

export type Heap = Record<string, HeapObj>;

export type Frame = { id: number; name: string; line: number; vars: [string, Val][] };

/** A condition the program just evaluated (filled in by the Java/C/C++ interpreter). */
export type CondInfo = { kw: "if" | "while" | "for" | "do-while" | "foreach" | "ternary" | "switch"; expr: string; value: boolean };

export type Step = {
  line: number;
  event: "call" | "line" | "return" | "exception";
  func: string;
  stack: Frame[];
  heap: Heap;
  out: string;
  ret?: Val;
  exc?: string;
  /** Condition evaluated between the previous step and this one. */
  cond?: CondInfo;
};

export type TraceResult = {
  steps: Step[];
  out?: string;
  error?: string;
  errorLine?: number | null;
  limit?: boolean;
  syntax?: boolean;
  lang?: Language;
  maxSteps?: number;
  /** The program stopped because it is waiting for the user to type input. */
  needInput?: boolean;
  /** Text the program printed as the input prompt (Python input("...")). */
  prompt?: string;
};

export type Language = "python" | "java" | "cpp" | "c";

export const SEQ_KINDS: ReadonlySet<string> = new Set(["list", "tuple", "set", "deque", "queue", "stack", "pq"]);
