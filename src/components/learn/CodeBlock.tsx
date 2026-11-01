"use client";

import { Fragment, type ReactNode } from "react";

const KEYWORDS = new Set(
  (
    "def return if elif else for while in not and or is None True False class import from as lambda pass break continue global yield with try except " +
    "public private protected static void int long double float char boolean bool new null nullptr true false const struct auto using namespace " +
    "include vector string map set queue stack pair unordered_map unordered_set priority_queue deque this throw throws final extends implements"
  ).split(" "),
);

const TOKEN = /(#.*$|\/\/.*$|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|\b\d+(?:\.\d+)?\b|\b[A-Za-z_]\w*\b)/gm;

function highlight(line: string, lang: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  for (const m of line.matchAll(TOKEN)) {
    const t = m[0];
    const i = m.index ?? 0;
    if (i > last) out.push(line.slice(last, i));
    let cls = "";
    if (t.startsWith("//") || (t.startsWith("#") && lang === "python")) cls = "text-slate-500 italic";
    else if (t.startsWith("#")) cls = "text-fuchsia-300";
    else if (t.startsWith('"') || t.startsWith("'")) cls = "text-emerald-300";
    else if (/^\d/.test(t)) cls = "text-amber-300";
    else if (KEYWORDS.has(t)) cls = "text-violet-300";
    else if (/^[A-Z]/.test(t)) cls = "text-sky-300";
    out.push(cls ? (
      <span key={i} className={cls}>
        {t}
      </span>
    ) : (
      t
    ));
    last = i + t.length;
  }
  if (last < line.length) out.push(line.slice(last));
  return out;
}

/** Read-only code with line numbers and light syntax colors. */
export function CodeBlock({ code, lang }: { code: string; lang: string }) {
  const lines = code.replace(/\n$/, "").split("\n");
  return (
    <div className="max-h-[460px] overflow-auto rounded-xl bg-black/40 py-3 ring-1 ring-white/[0.06]">
      <pre className="min-w-fit font-mono text-[12.5px] leading-[1.65]">
        {lines.map((l, i) => (
          <Fragment key={i}>
            <span className="inline-block w-9 select-none pr-3 text-right text-slate-600">{i + 1}</span>
            <span className="pr-4 text-slate-200">{highlight(l, lang)}</span>
            {"\n"}
          </Fragment>
        ))}
      </pre>
    </div>
  );
}
