import { fmtVal, heapObj, nameOf, substitute, valKey } from "./format";
import { type HeapObj, SEQ_KINDS, type Step, type TraceResult, type Val } from "./types";

export type Tone = "start" | "info" | "call" | "return" | "true" | "false" | "loop" | "error" | "done";

export type Highlights = {
  vars: Set<string>; // `${frameId}:${name}` that changed or were created
  cells: Map<string, Set<number>>; // heap id -> changed indexes
  swapped: Map<string, [number, number]>;
  keys: Map<string, Set<string>>; // heap id -> changed dict keys / object fields
};

export type Explanation = {
  tone: Tone;
  title: string; // text with `code` spans
  why?: string;
  details: string[];
  highlights: Highlights;
};

const emptyHL = (): Highlights => ({ vars: new Set(), cells: new Map(), swapped: new Map(), keys: new Map() });

const indentOf = (s: string) => s.length - s.trimStart().length;
const isBlank = (s: string | undefined) => s === undefined || s.trim() === "" || s.trim().startsWith("#");

/** Last line number (1-based) of the block that starts after `line`. */
function blockEnd(lines: string[], line: number): number {
  const base = indentOf(lines[line - 1] ?? "");
  let end = line;
  for (let i = line; i < lines.length; i++) {
    if (isBlank(lines[i])) continue;
    if (indentOf(lines[i]) <= base) break;
    end = i + 1;
  }
  return end;
}

function addTo<K, V>(m: Map<K, Set<V>>, k: K, v: V) {
  if (!m.has(k)) m.set(k, new Set());
  m.get(k)!.add(v);
}

function seqItems(o: HeapObj | undefined): Val[] | null {
  return o && SEQ_KINDS.has(o.kind) && "items" in o ? o.items : null;
}

/** Everything that changed between two snapshots, in plain English. */
function diff(prev: Step, cur: Step, hl: Highlights): string[] {
  const out: string[] = [];
  const cellChanges: { label: string; from: Val; to: Val }[] = [];

  for (const f of cur.stack) {
    const pf = prev.stack.find((x) => x.id === f.id);
    if (!pf) continue;
    for (const [name, v] of f.vars) {
      const pv = pf.vars.find(([n]) => n === name)?.[1];
      const o = heapObj(v, cur.heap);
      if (!pv) {
        hl.vars.add(`${f.id}:${name}`);
        if (o?.kind === "function") out.push(`Defined function \`${name}(${o.params.join(", ")})\` — it only runs when it is called.`);
        else if (o?.kind === "class") out.push(`Defined class \`${name}\` — a blueprint for creating objects.`);
        else out.push(`Created \`${name}\` = \`${fmtVal(v, cur.heap)}\``);
      } else if (valKey(pv) !== valKey(v)) {
        hl.vars.add(`${f.id}:${name}`);
        out.push(`\`${name}\` changed: \`${fmtVal(pv, prev.heap)}\` → \`${fmtVal(v, cur.heap)}\``);
      }
    }
  }

  for (const [id, o] of Object.entries(cur.heap)) {
    const p = prev.heap[id];
    if (!p || p.kind !== o.kind) continue;
    const name = nameOf(id, cur) ?? o.kind;
    const a = seqItems(p);
    const b = seqItems(o);
    if (a && b && o.kind !== "set") {
      const n = Math.min(a.length, b.length);
      const changed: number[] = [];
      for (let i = 0; i < n; i++) if (valKey(a[i]) !== valKey(b[i])) changed.push(i);
      const lenP = (p as { len: number }).len;
      const lenC = (o as { len: number }).len;
      if (lenC === lenP + 1 && changed.length === 0) {
        addTo(hl.cells, id, b.length - 1);
        out.push(`Added \`${fmtVal(b[b.length - 1], cur.heap)}\` to the end of \`${name}\` (now ${lenC} items).`);
      } else if (lenC === lenP - 1 && changed.length === 0) {
        out.push(`Removed the last item \`${fmtVal(a[a.length - 1], prev.heap)}\` from \`${name}\`.`);
      } else if (lenC === lenP - 1 && a.slice(1).every((x, i) => valKey(x) === valKey(b[i]))) {
        out.push(`Removed the first item \`${fmtVal(a[0], prev.heap)}\` from \`${name}\`.`);
      } else if (lenC === lenP + 1 && b.slice(1).every((x, i) => valKey(x) === valKey(a[i]))) {
        addTo(hl.cells, id, 0);
        out.push(`Added \`${fmtVal(b[0], cur.heap)}\` to the front of \`${name}\`.`);
      } else if (changed.length === 2 && lenC === lenP && valKey(a[changed[0]]) === valKey(b[changed[1]]) && valKey(a[changed[1]]) === valKey(b[changed[0]])) {
        const [i, j] = changed;
        hl.swapped.set(id, [i, j]);
        changed.forEach((i) => addTo(hl.cells, id, i));
        out.push(`Swapped \`${name}[${i}]\` and \`${name}[${j}]\` → \`${fmtVal(b[i], cur.heap)}\` and \`${fmtVal(b[j], cur.heap)}\` traded places.`);
      } else {
        changed.forEach((i) => addTo(hl.cells, id, i));
        for (const i of changed) cellChanges.push({ label: `${name}[${i}]`, from: a[i], to: b[i] });
        if (lenC !== lenP) out.push(`\`${name}\` now has ${lenC} items (was ${lenP}).`);
      }
    } else if (a && b) {
      const ka = new Set(a.map(valKey));
      const kb = new Set(b.map(valKey));
      b.forEach((x, i) => {
        if (!ka.has(valKey(x))) {
          addTo(hl.cells, id, i);
          out.push(`Added \`${fmtVal(x, cur.heap)}\` to set \`${name}\`.`);
        }
      });
      a.forEach((x) => !kb.has(valKey(x)) && out.push(`Removed \`${fmtVal(x, prev.heap)}\` from set \`${name}\`.`));
    } else if (o.kind === "dict" && p.kind === "dict") {
      const before = new Map(p.entries.map(([k, v]) => [valKey(k), v]));
      const after = new Set<string>();
      for (const [k, v] of o.entries) {
        const kk = valKey(k);
        after.add(kk);
        const old = before.get(kk);
        if (!old) {
          addTo(hl.keys, id, kk);
          out.push(`Added key \`${fmtVal(k, cur.heap)}\` → \`${fmtVal(v, cur.heap)}\` to \`${name}\`.`);
        } else if (valKey(old) !== valKey(v)) {
          addTo(hl.keys, id, kk);
          out.push(`\`${name}[${fmtVal(k, cur.heap)}]\` changed: \`${fmtVal(old, prev.heap)}\` → \`${fmtVal(v, cur.heap)}\``);
        }
      }
      for (const [k] of p.entries) if (!after.has(valKey(k))) out.push(`Removed key \`${fmtVal(k, prev.heap)}\` from \`${name}\`.`);
    } else if (o.kind === "object" && p.kind === "object") {
      for (const [field, v] of o.fields) {
        const old = p.fields.find(([n]) => n === field)?.[1];
        if (!old || valKey(old) !== valKey(v)) {
          addTo(hl.keys, id, field);
          out.push(
            old
              ? `\`${name}.${field}\` changed: \`${fmtVal(old, prev.heap)}\` → \`${fmtVal(v, cur.heap)}\``
              : `Set \`${name}.${field}\` = \`${fmtVal(v, cur.heap)}\``,
          );
        }
      }
    }
  }

  const [c1, c2] = cellChanges;
  if (cellChanges.length === 2 && valKey(c1.from) === valKey(c2.to) && valKey(c2.from) === valKey(c1.to)) {
    out.push(`Swapped \`${c1.label}\` and \`${c2.label}\` → \`${fmtVal(c2.from, prev.heap)}\` and \`${fmtVal(c1.from, prev.heap)}\` traded places.`);
  } else {
    for (const c of cellChanges.slice(0, 4))
      out.push(`\`${c.label}\` changed: \`${fmtVal(c.from, prev.heap)}\` → \`${fmtVal(c.to, cur.heap)}\``);
    if (cellChanges.length > 4) out.push(`…and ${cellChanges.length - 4} more cells changed.`);
  }

  if (cur.out.length > prev.out.length && cur.out.startsWith(prev.out)) {
    const printed = cur.out.slice(prev.out.length).replace(/\n$/, "");
    out.push(`Printed \`${printed.length > 60 ? printed.slice(0, 60) + "…" : printed}\` to the output.`);
  }
  return out;
}

export function explain(trace: TraceResult, i: number, lines: string[]): Explanation {
  const hl = emptyHL();
  const cur = trace.steps[i];
  const prev = trace.steps[i - 1];
  const codeAt = (n: number) => (lines[n - 1] ?? "").trim();
  const isLast = i === trace.steps.length - 1;

  if (!cur) return { tone: "info", title: "Nothing to show", details: [], highlights: hl };

  if (isLast && trace.error && !trace.syntax) {
    const details = prev ? diff(prev, cur, hl) : [];
    return {
      tone: "error",
      title: `Error on line ${trace.errorLine ?? cur.line}: \`${trace.error}\``,
      why: errorHint(trace.error),
      details,
      highlights: hl,
    };
  }

  if (!prev) {
    return {
      tone: "start",
      title: `Program starts. Line ${cur.line} runs first.`,
      why: "The program runs one line at a time. Use ▶ or → to move step by step.",
      details: [],
      highlights: hl,
    };
  }

  const details = diff(prev, cur, hl);
  const top = cur.stack[cur.stack.length - 1];

  if (cur.event === "call") {
    const params = top.vars.filter(([n]) => n !== "this");
    const args = params.map(([n, v]) => `${n}=${fmtVal(v, cur.heap)}`).join(", ");
    const depth = cur.stack.filter((f) => f.name === cur.func).length;
    params.forEach(([n]) => hl.vars.add(`${top.id}:${n}`));
    const self = top.vars.find(([n]) => n === "this")?.[1];
    const selfObj = self && self.k === "r" ? cur.heap[self.id] : undefined;
    if (selfObj && selfObj.kind === "object" && selfObj.cls === cur.func) {
      return {
        tone: "call",
        title: `Creating a new \`${cur.func}\` object: constructor \`${cur.func}(${args})\` runs`,
        why: "A constructor sets up the fields of a brand-new object. `this` points to the object being built.",
        details: [],
        highlights: hl,
      };
    }
    return {
      tone: "call",
      title: `Calling \`${cur.func}(${args})\``,
      why:
        depth > 1
          ? `Recursion: \`${cur.func}\` is calling itself (depth ${depth}). A new frame is stacked on top with its own copy of the variables. The older frames wait until this one returns.`
          : `The program pauses the line that made the call and creates a new frame on the call stack for \`${cur.func}\` with its own local variables.`,
      details: [],
      highlights: hl,
    };
  }

  if (cur.event === "return") {
    if (cur.func === "Global") {
      return {
        tone: "done",
        title: "Program finished ✓",
        why: cur.out ? "Every line has run. The final output is shown in the Output panel." : "Every line has run. The program printed nothing.",
        details,
        highlights: hl,
      };
    }
    const caller = cur.stack[cur.stack.length - 2];
    if (cur.cond) details.unshift(`Checked \`${cur.cond.expr}\`: it is **${cur.cond.value ? "true" : "false"}**.`);
    if (cur.ret && cur.ret.k === "p" && cur.ret.t === "void") {
      return {
        tone: "return",
        title: `\`${cur.func}\` is done. It returns nothing (\`void\`).`,
        why: `The frame for \`${cur.func}\` is removed from the stack and the program goes back to ${caller ? `\`${caller.name}\` at line ${caller.line}` : "the caller"}.`,
        details,
        highlights: hl,
      };
    }
    return {
      tone: "return",
      title: `\`${cur.func}\` returns \`${fmtVal(cur.ret, cur.heap)}\``,
      why: `The frame for \`${cur.func}\` is removed from the stack and \`${fmtVal(cur.ret, cur.heap)}\` is sent back to ${
        caller ? `\`${caller.name}\` at line ${caller.line}` : "the caller"
      }.`,
      details,
      highlights: hl,
    };
  }

  if (cur.event === "exception") {
    return {
      tone: "error",
      title: `Exception raised: \`${cur.exc}\``,
      why: "The program stops the current line and looks for a matching `except` / `catch` block. If none is found, the program crashes.",
      details,
      highlights: hl,
    };
  }

  if (prev.event === "return" && prev.func !== "Global") {
    const isVoid = prev.ret?.k === "p" && prev.ret.t === "void";
    return {
      tone: "return",
      title: isVoid
        ? `Back in \`${cur.func}\` after \`${prev.func}\` finished.`
        : `Back in \`${cur.func}\`, using the returned value \`${fmtVal(prev.ret, prev.heap)}\``,
      why: `\`${prev.func}\` has finished, so its frame is gone. The line that called it continues with the result.`,
      details,
      highlights: hl,
    };
  }

  if (prev.event === "call") {
    return {
      tone: "info",
      title: `Inside \`${cur.func}\`: start running its body.`,
      why: "The parameters already hold the values passed in by the caller.",
      details,
      highlights: hl,
    };
  }

  // Java / C / C++: the interpreter tells us exactly which condition it evaluated.
  if (cur.cond) {
    const { kw, expr, value } = cur.cond;
    const sub = substitute(expr, prev);
    const shown = sub !== expr ? `\`${expr}\` → \`${sub}\`` : `\`${expr}\``;
    const result = `**${value ? "true" : "false"}**`;
    const where: Record<string, [string, string]> = {
      if: ["so the code inside the `if` block runs.", "so the `if` block is skipped (the `else` part runs if there is one)."],
      while: ["so the loop body runs again.", "so the loop stops and the program moves past it."],
      "do-while": ["so the loop goes back to the top for another round.", "so the do-while loop ends."],
      for: ["so the loop body runs.", "so the loop ends and the program moves past it."],
      ternary: ["so the value before `:` is used.", "so the value after `:` is used."],
      switch: ["so this case matches.", "so this case is skipped."],
    };
    if (kw === "foreach") {
      const top = cur.stack[cur.stack.length - 1];
      return value
        ? {
            tone: "loop",
            title: `Next round of the loop: ${details.length ? details[0].replace(/^Created /, "").replace(/ changed: .* → /, " = ") : "the next item is taken"}`,
            why: `A for-each loop takes the next item from \`${expr}\` each round.`,
            details: details.slice(1),
            highlights: hl,
          }
        : {
            tone: "false",
            title: `Loop over \`${expr}\` is finished. No items are left.`,
            why: top ? "The program continues with the first line after the loop." : undefined,
            details,
            highlights: hl,
          };
    }
    const [yes, no] = where[kw] ?? where.if;
    return {
      tone: value ? "true" : "false",
      title: `Checked ${shown}: it is ${result}, ${value ? yes : no}`,
      why:
        kw === "for"
          ? "A `for` loop checks its condition before every round. After each round it runs the update part (like `i++`)."
          : kw === "while"
            ? "A `while` loop checks its condition before every round."
            : undefined,
      details,
      highlights: hl,
    };
  }

  const text = codeAt(prev.line).replace(/\s+#.*$/, "");
  const cond = text.match(/^(if|elif|while)\s+(.+?):\s*(.*)$/);
  if (cond && cur.stack.length === prev.stack.length) {
    const [, kw, expr] = cond;
    const end = blockEnd(lines, prev.line);
    const taken = cur.line > prev.line && cur.line <= end;
    const sub = substitute(expr, prev);
    const shown = sub !== expr ? `\`${expr}\` → \`${sub}\`` : `\`${expr}\``;
    const where =
      kw === "while"
        ? taken
          ? "so the loop body runs again."
          : "so the loop stops and the program moves past it."
        : taken
          ? `so the code inside the \`${kw}\` block runs.`
          : `so the \`${kw}\` block is skipped.`;
    return {
      tone: taken ? "true" : "false",
      title: `Checked ${shown}: it is **${taken ? "True" : "False"}**, ${where}`,
      why: kw === "while" ? "A `while` loop checks its condition before every round." : undefined,
      details,
      highlights: hl,
    };
  }

  const loop = text.match(/^for\s+(.+?)\s+in\s+(.+):\s*(.*)$/);
  if (loop && cur.stack.length === prev.stack.length) {
    const end = blockEnd(lines, prev.line);
    const taken = cur.line > prev.line && cur.line <= end;
    if (taken) {
      const vars = loop[1].split(",").map((s) => s.trim());
      const vals = vars.map((n) => `${n} = ${fmtVal(top.vars.find(([x]) => x === n)?.[1], cur.heap)}`).join(", ");
      return {
        tone: "loop",
        title: `Next round of the loop: \`${vals}\``,
        why: `A \`for\` loop takes the next item from \`${loop[2]}\` each round.`,
        details: details.filter((d) => !vars.some((v) => d.startsWith(`\`${v}\``) || d.startsWith(`Created \`${v}\``))),
        highlights: hl,
      };
    }
    return {
      tone: "false",
      title: `Loop over \`${loop[2]}\` is finished. No items are left.`,
      why: "The program continues with the first line after the loop.",
      details,
      highlights: hl,
    };
  }

  if (/^(break|continue)\b/.test(text)) {
    return {
      tone: "loop",
      title: text.startsWith("break") ? "`break`: exit the loop immediately." : "`continue`: skip the rest of this round and start the next one.",
      details,
      highlights: hl,
    };
  }

  return {
    tone: "info",
    title: details.length ? `Line ${prev.line} ran: \`${text}\`` : `Line ${prev.line} ran: \`${text}\` (no values changed)`,
    details,
    highlights: hl,
  };
}

function errorHint(err: string): string {
  if (/ArrayIndexOutOfBounds|StringIndexOutOfBounds|IndexOutOfBounds|out of range|out of bounds/i.test(err))
    return "The code used an index that does not exist. Valid indexes are 0 to length - 1. Check the loop limits.";
  if (/NullPointer|null pointer|nullptr|NULL/.test(err)) return "The code used a reference that points to nothing (null). Check it before using `.` or `->`.";
  if (/ArithmeticException|division by zero|Floating point exception/i.test(err)) return "The code divided by zero. Add a check before dividing.";
  if (/StackOverflow|Stack overflow/i.test(err)) return "The function kept calling itself without stopping. Check the base case.";
  if (/InputMismatch|NoSuchElement|No more input/i.test(err)) return "The program asked for input but there was none left (or it was the wrong type). Type input in the Input box.";
  if (/NumberFormatException/.test(err)) return "The text could not be turned into a number.";
  if (err.startsWith("IndexError")) return "The code tried to use an index that does not exist. Check loop limits: valid indexes are 0 to len - 1.";
  if (err.startsWith("ZeroDivisionError")) return "The code divided by zero. Add a check before dividing.";
  if (err.startsWith("NameError")) return "A variable or function is used before it was created, or its name is misspelled.";
  if (err.startsWith("TypeError")) return "An operation got the wrong kind of value, for example adding a number to a string.";
  if (err.startsWith("KeyError")) return "The code looked up a key that is not in the dictionary. Use `in` or `.get()` first.";
  if (err.startsWith("RecursionError")) return "The function kept calling itself without stopping. Check the base case.";
  if (err.startsWith("AttributeError")) return "The object does not have that attribute. Often this means a variable is `None`.";
  if (err.startsWith("EOFError")) return "The program asked for input but there was none left. Type input lines in the Input box.";
  if (err.startsWith("ValueError")) return "A function got a value of the right type but the wrong content, like int('abc').";
  return "Read the error message and look at the highlighted line.";
}
