import type { Language, TraceResult } from "../types";
import { Interp } from "./interpreter";
import { CodeError } from "./lexer";
import { parse } from "./parser";

/** Runs Java / C / C++ code with our own step-by-step interpreter (fully in the browser). */
export function runCFamily(code: string, lang: Exclude<Language, "python">, stdin: string): TraceResult {
  const label = lang === "java" ? "Compile error" : "Compile error";
  let prog;
  try {
    prog = parse(code, lang);
  } catch (e) {
    if (e instanceof CodeError) return { steps: [], error: `${label}: ${e.message}`, errorLine: e.line, syntax: true, lang };
    return { steps: [], error: `${label}: ${e instanceof Error ? e.message : String(e)}`, syntax: true, lang };
  }
  return new Interp(prog, lang, code, stdin).run();
}

export async function traceCFamily(code: string, lang: Exclude<Language, "python">, stdin: string): Promise<TraceResult> {
  return runCFamily(code, lang, stdin);
}
