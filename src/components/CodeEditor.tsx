"use client";

import Editor, { type BeforeMount, type OnMount } from "@monaco-editor/react";
import { useEffect, useRef } from "react";
import type { Language } from "@/lib/types";

type Props = {
  code: string;
  language: Language;
  onChange: (code: string) => void;
  nextLine?: number;
  prevLine?: number;
  errorLine?: number | null;
  locked: boolean;
};

const MONACO_LANG: Record<Language, string> = { python: "python", java: "java", cpp: "cpp", c: "c" };

const defineTheme: BeforeMount = (monaco) => {
  monaco.editor.defineTheme("lens", {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "comment", foreground: "64748b", fontStyle: "italic" },
      { token: "keyword", foreground: "c084fc" },
      { token: "string", foreground: "86efac" },
      { token: "number", foreground: "fbbf24" },
      { token: "identifier", foreground: "e2e8f0" },
    ],
    colors: {
      "editor.background": "#00000000",
      "editor.lineHighlightBackground": "#ffffff08",
      "editorLineNumber.foreground": "#475569",
      "editorLineNumber.activeForeground": "#cbd5e1",
      "editorGutter.background": "#00000000",
      "editor.selectionBackground": "#6366f155",
      "scrollbarSlider.background": "#ffffff14",
    },
  });
};

export function CodeEditor({ code, language, onChange, nextLine, prevLine, errorLine, locked }: Props) {
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);
  const decoRef = useRef<ReturnType<Parameters<OnMount>[0]["createDecorationsCollection"]> | null>(null);

  const onMount: OnMount = (editor) => {
    editorRef.current = editor;
    decoRef.current = editor.createDecorationsCollection([]);
  };

  useEffect(() => {
    const editor = editorRef.current;
    const deco = decoRef.current;
    if (!editor || !deco) return;
    const d = [];
    if (prevLine && prevLine !== nextLine)
      d.push({ range: { startLineNumber: prevLine, startColumn: 1, endLineNumber: prevLine, endColumn: 1 }, options: { isWholeLine: true, className: "line-prev", glyphMarginClassName: "glyph-prev" } });
    if (nextLine)
      d.push({ range: { startLineNumber: nextLine, startColumn: 1, endLineNumber: nextLine, endColumn: 1 }, options: { isWholeLine: true, className: "line-next", glyphMarginClassName: "glyph-next" } });
    if (errorLine)
      d.push({ range: { startLineNumber: errorLine, startColumn: 1, endLineNumber: errorLine, endColumn: 1 }, options: { isWholeLine: true, className: "line-error", glyphMarginClassName: "glyph-error" } });
    deco.set(d);
    const focus = errorLine ?? nextLine;
    if (focus) editor.revealLineInCenterIfOutsideViewport(focus);
  }, [nextLine, prevLine, errorLine]);

  return (
    <Editor
      height="100%"
      language={MONACO_LANG[language]}
      value={code}
      theme="lens"
      beforeMount={defineTheme}
      onMount={onMount}
      onChange={(v) => onChange(v ?? "")}
      loading={<div className="p-4 text-sm text-slate-500">Loading editor…</div>}
      options={{
        readOnly: locked,
        fontSize: 14,
        fontFamily: "var(--font-geist-mono), Consolas, monospace",
        fontLigatures: true,
        minimap: { enabled: false },
        glyphMargin: true,
        lineNumbersMinChars: 3,
        scrollBeyondLastLine: false,
        padding: { top: 14, bottom: 14 },
        renderLineHighlight: locked ? "none" : "line",
        smoothScrolling: true,
        cursorSmoothCaretAnimation: "on",
        tabSize: 4,
        automaticLayout: true,
        overviewRulerLanes: 0,
        stickyScroll: { enabled: false },
        scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8 },
      }}
    />
  );
}
