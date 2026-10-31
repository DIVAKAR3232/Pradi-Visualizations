// Splits Java / C / C++ source into tokens.

export type TokKind = "id" | "num" | "str" | "char" | "op" | "eof";
export type Token = { k: TokKind; v: string; line: number; start: number; end: number; num?: number; isFloat?: boolean };

export class CodeError extends Error {
  constructor(
    message: string,
    public line: number,
    public kind: "syntax" | "runtime" = "syntax",
  ) {
    super(message);
  }
}

const OPS = [
  ">>>=", "<<=", ">>=", ">>>", "...", "->*", "::", "->", "++", "--", "&&", "||", "==", "!=", "<=", ">=", "+=", "-=", "*=", "/=", "%=",
  "&=", "|=", "^=", "<<", ">>",
];
const SINGLE = "+-*/%=<>!&|^~?:;,.()[]{}@#";

function unescape(s: string, line: number): string {
  let out = "";
  for (let i = 0; i < s.length; i++) {
    if (s[i] !== "\\") {
      out += s[i];
      continue;
    }
    const c = s[++i];
    switch (c) {
      case "n": out += "\n"; break;
      case "t": out += "\t"; break;
      case "r": out += "\r"; break;
      case "0": out += "\0"; break;
      case "\\": out += "\\"; break;
      case "'": out += "'"; break;
      case '"': out += '"'; break;
      case "a": out += "\x07"; break;
      case "b": out += "\b"; break;
      case "f": out += "\f"; break;
      case "v": out += "\v"; break;
      case "u": {
        out += String.fromCharCode(parseInt(s.slice(i + 1, i + 5), 16));
        i += 4;
        break;
      }
      default:
        if (c === undefined) throw new CodeError("Bad escape sequence", line);
        out += c;
    }
  }
  return out;
}

export function lex(src: string): Token[] {
  const toks: Token[] = [];
  const macros = new Map<string, Token[]>();
  let i = 0;
  let line = 1;
  const n = src.length;

  while (i < n) {
    const c = src[i];
    if (c === "\n") {
      line++;
      i++;
      continue;
    }
    if (c === " " || c === "\t" || c === "\r") {
      i++;
      continue;
    }
    // comments
    if (c === "/" && src[i + 1] === "/") {
      while (i < n && src[i] !== "\n") i++;
      continue;
    }
    if (c === "/" && src[i + 1] === "*") {
      i += 2;
      while (i < n && !(src[i] === "*" && src[i + 1] === "/")) {
        if (src[i] === "\n") line++;
        i++;
      }
      i += 2;
      continue;
    }
    // preprocessor: keep simple #define NAME value, skip everything else
    if (c === "#") {
      let j = i;
      while (j < n && src[j] !== "\n") {
        if (src[j] === "\\" && src[j + 1] === "\n") j++;
        j++;
      }
      const text = src.slice(i + 1, j).trim();
      const m = text.match(/^define\s+([A-Za-z_]\w*)\s+(.+)$/);
      if (m) {
        const body = lex(m[2]).filter((t) => t.k !== "eof");
        macros.set(m[1], body);
      }
      i = j;
      continue;
    }
    // identifiers
    if (/[A-Za-z_$]/.test(c)) {
      let j = i + 1;
      while (j < n && /[\w$]/.test(src[j])) j++;
      const word = src.slice(i, j);
      const macro = macros.get(word);
      if (macro) {
        for (const t of macro) toks.push({ ...t, line, start: i, end: j });
      } else {
        toks.push({ k: "id", v: word, line, start: i, end: j });
      }
      i = j;
      continue;
    }
    // numbers
    if (/[0-9]/.test(c) || (c === "." && /[0-9]/.test(src[i + 1] ?? ""))) {
      let j = i;
      let isFloat = false;
      let value: number;
      if (c === "0" && /[xX]/.test(src[i + 1] ?? "")) {
        j += 2;
        while (j < n && /[0-9a-fA-F_]/.test(src[j])) j++;
        value = parseInt(src.slice(i + 2, j).replace(/_/g, ""), 16);
      } else if (c === "0" && /[bB]/.test(src[i + 1] ?? "")) {
        j += 2;
        while (j < n && /[01_]/.test(src[j])) j++;
        value = parseInt(src.slice(i + 2, j).replace(/_/g, ""), 2);
      } else {
        while (j < n && /[0-9_']/.test(src[j])) j++;
        if (src[j] === "." && /[0-9]/.test(src[j + 1] ?? "")) {
          isFloat = true;
          j++;
          while (j < n && /[0-9_]/.test(src[j])) j++;
        } else if (src[j] === "." && !/[A-Za-z_]/.test(src[j + 1] ?? "")) {
          isFloat = true;
          j++;
        }
        if (/[eE]/.test(src[j] ?? "") && /[-+0-9]/.test(src[j + 1] ?? "")) {
          isFloat = true;
          j++;
          if (/[-+]/.test(src[j])) j++;
          while (j < n && /[0-9]/.test(src[j])) j++;
        }
        value = Number(src.slice(i, j).replace(/[_']/g, ""));
      }
      // suffixes
      let suffix = "";
      while (j < n && /[lLuUfFdD]/.test(src[j])) suffix += src[j++];
      if (/[fFdD]/.test(suffix)) isFloat = true;
      toks.push({ k: "num", v: src.slice(i, j), num: value, isFloat, line, start: i, end: j });
      i = j;
      continue;
    }
    // strings
    if (c === '"') {
      let j = i + 1;
      while (j < n && src[j] !== '"') {
        if (src[j] === "\\") j++;
        if (src[j] === "\n") throw new CodeError("String is missing its closing quote", line);
        j++;
      }
      if (j >= n) throw new CodeError("String is missing its closing quote", line);
      const raw = src.slice(i + 1, j);
      const prev = toks[toks.length - 1];
      if (prev && prev.k === "str") {
        // "abc" "def" → "abcdef" (C/C++ string literal joining)
        prev.v += unescape(raw, line);
        prev.end = j + 1;
      } else {
        toks.push({ k: "str", v: unescape(raw, line), line, start: i, end: j + 1 });
      }
      i = j + 1;
      continue;
    }
    if (c === "'") {
      let j = i + 1;
      while (j < n && src[j] !== "'") {
        if (src[j] === "\\") j++;
        j++;
      }
      const v = unescape(src.slice(i + 1, j), line);
      if (v.length !== 1) throw new CodeError(`A char literal must hold exactly one character: '${src.slice(i + 1, j)}'`, line);
      toks.push({ k: "char", v, line, start: i, end: j + 1 });
      i = j + 1;
      continue;
    }
    // operators
    const op = OPS.find((o) => src.startsWith(o, i));
    if (op) {
      toks.push({ k: "op", v: op, line, start: i, end: i + op.length });
      i += op.length;
      continue;
    }
    if (SINGLE.includes(c)) {
      toks.push({ k: "op", v: c, line, start: i, end: i + 1 });
      i++;
      continue;
    }
    throw new CodeError(`Unexpected character '${c}'`, line);
  }
  toks.push({ k: "eof", v: "", line, start: n, end: n });
  return toks;
}
