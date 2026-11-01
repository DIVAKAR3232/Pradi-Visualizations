"use client";

import {
  AlertTriangle,
  Braces,
  ChevronDown,
  Cpu,
  Keyboard,
  Layers,
  Loader2,
  Pencil,
  Sparkles,
  Terminal,
  TextCursorInput,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CodeEditor } from "@/components/CodeEditor";
import { ExplanationCard } from "@/components/ExplanationCard";
import { InputPrompt } from "@/components/InputPrompt";
import { MemoryView } from "@/components/MemoryView";
import { OutputView } from "@/components/OutputView";
import { Player } from "@/components/Player";
import { RecursionTree } from "@/components/RecursionTree";
import { RichText } from "@/components/RichText";
import { NavTabs } from "@/components/NavTabs";
import { ShareButton } from "@/components/ShareButton";
import { hasStructures, StructuresPanel } from "@/components/StructuresPanel";
import { traceCFamily } from "@/lib/cfamily";
import { EXAMPLES } from "@/lib/examples";
import { explain } from "@/lib/explain";
import { indexVars } from "@/lib/format";
import { initRunner, onRunnerStatus, type RunnerStatus, tracePython } from "@/lib/pythonRunner";
import { decodeShare, shareTokenFromHash } from "@/lib/share";
import { buildCallTree, computeReads, detectStructures } from "@/lib/structures";
import type { Language, TraceResult } from "@/lib/types";

const LANGS: { id: Language; label: string }[] = [
  { id: "python", label: "Python" },
  { id: "java", label: "Java" },
  { id: "cpp", label: "C++" },
  { id: "c", label: "C" },
];

export default function Home() {
  const [lang, setLang] = useState<Language>("python");
  const [exampleId, setExampleId] = useState(EXAMPLES.python[0].id);
  const [code, setCode] = useState(EXAMPLES.python[0].code);
  const [stdin, setStdin] = useState("");
  const [showInput, setShowInput] = useState(false);
  const [trace, setTrace] = useState<TraceResult | null>(null);
  const [traceCode, setTraceCode] = useState("");
  const [idx, setIdx] = useState(0);
  const [dir, setDir] = useState(1);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [running, setRunning] = useState(false);
  const [eof, setEof] = useState(false);
  const [answering, setAnswering] = useState(false);
  const [engine, setEngine] = useState<RunnerStatus>("loading");

  useEffect(() => {
    initRunner();
    return onRunnerStatus(setEngine);
  }, []);

  // Open a shared link (#s=...) with its language, code and input.
  useEffect(() => {
    const token = shareTokenFromHash();
    if (!token) return;
    decodeShare(token).then((shared) => {
      if (!shared) return;
      setLang(shared.lang);
      setExampleId("");
      setCode(shared.code);
      setStdin(shared.stdin);
      setShowInput(!!shared.stdin);
    });
  }, []);

  const steps = trace?.steps ?? [];
  const hasSteps = steps.length > 0;
  const last = steps.length - 1;

  const seek = useCallback(
    (i: number) => {
      const n = Math.max(0, Math.min(i, last));
      setDir(n >= idx ? 1 : -1);
      setIdx(n);
    },
    [idx, last],
  );

  // Auto-play
  useEffect(() => {
    if (!playing || !hasSteps) return;
    if (idx >= last) {
      setPlaying(false);
      return;
    }
    const t = setTimeout(() => {
      setDir(1);
      setIdx((i) => i + 1);
    }, 1000 / speed);
    return () => clearTimeout(t);
  }, [playing, idx, speed, hasSteps, last]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!hasSteps) return;
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el.tagName === "TEXTAREA" && !el.closest(".monaco-editor")) return;
      if (el.tagName === "INPUT" || el.tagName === "SELECT") return;
      const map: Record<string, () => void> = {
        ArrowRight: () => seek(idx + 1),
        ArrowLeft: () => seek(idx - 1),
        Home: () => seek(0),
        End: () => seek(last),
        " ": () => setPlaying((p) => (idx >= last ? false : !p)),
      };
      const fn = map[e.key];
      if (fn) {
        e.preventDefault();
        e.stopPropagation();
        fn();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [hasSteps, idx, last, seek]);

  /** Runs the program. Interactive: when it needs input that was not given yet, it stops there and asks. */
  const runTrace = async (src: string, input: string, endOfInput: boolean) => {
    // Let the spinner paint before the (synchronous) interpreter starts.
    await new Promise((r) => setTimeout(r, 30));
    const opts = { interactive: true, eof: endOfInput };
    return lang === "python" ? tracePython(src, input, opts) : traceCFamily(src, lang, input, opts);
  };

  const visualize = async () => {
    setRunning(true);
    setPlaying(false);
    setEof(false);
    const result = await runTrace(code, stdin, false);
    setTrace(result);
    setTraceCode(code);
    setIdx(0);
    setDir(1);
    setRunning(false);
  };

  /** The user typed a line while the program was waiting: run again with it and carry on from here. */
  const answerInput = async (value: string | null) => {
    const pos = idx;
    const newStdin = value === null ? stdin : `${stdin && !stdin.endsWith("\n") ? stdin + "\n" : stdin}${value}\n`;
    const endOfInput = value === null;
    setAnswering(true);
    setStdin(newStdin);
    if (endOfInput) setEof(true);
    const result = await runTrace(traceCode, newStdin, endOfInput || eof);
    setTrace(result);
    setDir(1);
    setIdx(Math.min(pos + 1, Math.max(result.steps.length - 1, 0)));
    setAnswering(false);
    setPlaying(true);
  };

  const editCode = () => {
    setTrace(null);
    setPlaying(false);
  };

  const onCodeChange = (v: string) => {
    setCode(v);
    if (trace && !hasSteps) setTrace(null);
  };

  const pickExample = (id: string, language: Language = lang) => {
    const ex = EXAMPLES[language].find((e) => e.id === id) ?? EXAMPLES[language][0];
    setExampleId(ex.id);
    setCode(ex.code);
    setStdin(ex.stdin ?? "");
    setShowInput(!!ex.stdin);
    setTrace(null);
    setPlaying(false);
  };

  const switchLang = (l: Language) => {
    if (l === lang) return;
    setLang(l);
    pickExample(exampleId, l);
  };

  const lines = useMemo(() => (traceCode || code).split("\n"), [traceCode, code]);
  const indexMap = useMemo(() => indexVars(traceCode), [traceCode]);
  const step = steps[idx];
  const prevStep = steps[idx - 1];
  const ex = useMemo(() => (trace && hasSteps ? explain(trace, idx, lines) : null), [trace, hasSteps, idx, lines]);

  const atErrorEnd = !!trace?.error && !trace.syntax && idx === last;
  const errorLine = trace?.syntax ? trace.errorLine : atErrorEnd ? trace?.errorLine : null;
  const nextLine = hasSteps && !atErrorEnd ? step?.line : undefined;
  const structs = useMemo(() => (step ? detectStructures(step) : null), [step]);
  const reads = useMemo(() => (step && nextLine ? computeReads(lines[nextLine - 1], step) : undefined), [step, nextLine, lines]);
  const callTree = useMemo(() => buildCallTree(trace?.steps ?? []), [trace]);
  const ctx = step && ex ? { step, hl: ex.highlights, direction: dir, reads, structs: structs ?? undefined } : null;

  return (
    <div className="relative z-10 flex min-h-dvh flex-col lg:h-dvh">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 sm:px-6">
        <div className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-violet-500 via-indigo-500 to-cyan-400 shadow-lg shadow-indigo-500/30">
          <Braces className="size-5 text-white" />
        </div>
        <div className="leading-tight">
          <div className="text-[17px] font-semibold tracking-tight text-white">
            Pradi <span className="bg-gradient-to-r from-violet-300 to-cyan-300 bg-clip-text text-transparent">Visualizer</span>
          </div>
          <div className="hidden text-xs text-slate-400 sm:block">See your code run, one line at a time</div>
        </div>
        <div className="ml-auto" />
        <NavTabs compactOnMobile />
        <ShareButton lang={lang} code={code} stdin={stdin} />
        <div className="flex items-center gap-2 rounded-full bg-white/[0.04] px-3 py-1.5 text-xs text-slate-400 ring-1 ring-white/[0.08]">
          {engine === "loading" && lang === "python" && <Loader2 className="size-3.5 animate-spin text-indigo-300" />}
          {(engine === "ready" || lang !== "python") && <span className="size-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />}
          {engine === "error" && lang === "python" && <span className="size-2 rounded-full bg-red-400" />}
          <span className="hidden sm:inline">
            {lang !== "python"
              ? `${LANGS.find((l) => l.id === lang)?.label} interpreter ready`
              : engine === "loading"
                ? "Loading Python engine…"
                : engine === "ready"
                  ? "Python engine ready"
                  : "Engine failed to load"}
          </span>
          <Cpu className="size-3.5 sm:hidden" />
        </div>
      </header>

      <main className="grid flex-1 grid-cols-[minmax(0,1fr)] gap-4 px-4 pb-4 sm:px-6 lg:min-h-0 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        {/* Left: editor + player */}
        <section className="flex flex-col gap-4 lg:min-h-0">
          <div className="panel flex flex-col overflow-hidden lg:min-h-0 lg:flex-1">
            <div className="flex flex-wrap items-center gap-2 border-b border-white/[0.06] p-2">
              <div className="flex gap-0.5 rounded-xl bg-black/30 p-1">
                {LANGS.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => switchLang(l.id)}
                    className={`relative rounded-lg px-3 py-1.5 text-sm transition ${
                      lang === l.id ? "text-white" : "text-slate-500 hover:text-slate-200"
                    }`}
                  >
                    {lang === l.id && (
                      <motion.span layoutId="lang-pill" className="absolute inset-0 rounded-lg bg-white/[0.1] shadow-inner" transition={{ type: "spring", stiffness: 500, damping: 35 }} />
                    )}
                    <span className="relative">{l.label}</span>
                  </button>
                ))}
              </div>
              <label className="relative ml-auto">
                <span className="sr-only">Examples</span>
                <select
                  value={exampleId}
                  onChange={(e) => pickExample(e.target.value)}
                  className="appearance-none rounded-xl bg-white/[0.05] py-2 pl-3 pr-8 text-sm text-slate-200 ring-1 ring-white/10 outline-none transition hover:bg-white/[0.08] focus:ring-indigo-400/50"
                >
                  {exampleId === "" && (
                    <option value="" className="bg-slate-900">
                      Shared code
                    </option>
                  )}
                  {EXAMPLES[lang].map((e) => (
                    <option key={e.id} value={e.id} className="bg-slate-900">
                      {e.tag}: {e.title}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              </label>
            </div>

            <div className="relative h-[380px] lg:h-auto lg:min-h-0 lg:flex-1">
              <CodeEditor
                code={code}
                language={lang}
                onChange={onCodeChange}
                nextLine={nextLine}
                prevLine={hasSteps && !atErrorEnd ? prevStep?.line : undefined}
                errorLine={errorLine}
                locked={hasSteps}
              />
            </div>

            <AnimatePresence initial={false}>
              {showInput && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden border-t border-white/[0.06]"
                >
                  <div className="p-3">
                    <div className="panel-title mb-2">
                      <TextCursorInput className="size-3.5" /> Input (optional: type it here first, or answer when the program asks)
                    </div>
                    <textarea
                      value={stdin}
                      onChange={(e) => setStdin(e.target.value)}
                      disabled={hasSteps}
                      rows={3}
                      placeholder={"5\n1 2 3 4 5"}
                      className="w-full resize-none rounded-xl bg-black/30 p-2.5 font-mono text-sm text-slate-200 ring-1 ring-white/10 outline-none placeholder:text-slate-600 focus:ring-indigo-400/50 disabled:opacity-60"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex items-center gap-2 border-t border-white/[0.06] p-2">
              <button
                onClick={() => setShowInput((s) => !s)}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm transition ${
                  showInput ? "bg-white/10 text-white" : "text-slate-400 hover:bg-white/[0.06] hover:text-white"
                }`}
              >
                <TextCursorInput className="size-4" /> Input
              </button>
              {hasSteps ? (
                <button
                  onClick={editCode}
                  className="ml-auto flex items-center gap-2 rounded-xl bg-white/[0.08] px-4 py-2 text-sm font-medium text-white ring-1 ring-white/10 transition hover:bg-white/[0.12] active:scale-[0.98]"
                >
                  <Pencil className="size-4" /> Edit code
                </button>
              ) : (
                <button
                  onClick={visualize}
                  disabled={running || !code.trim()}
                  className="group relative ml-auto flex items-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-violet-500 via-indigo-500 to-cyan-500 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
                >
                  <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                  {running ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                  {running ? (engine === "loading" && lang === "python" ? "Loading Python…" : "Tracing…") : "Visualize"}
                </button>
              )}
            </div>
          </div>

          <div className="panel p-4">
            {hasSteps ? (
              <Player
                index={idx}
                total={steps.length}
                playing={playing}
                speed={speed}
                onSeek={(i) => {
                  setPlaying(false);
                  seek(i);
                }}
                onTogglePlay={() => {
                  if (idx >= last) {
                    seek(0);
                    setPlaying(true);
                  } else setPlaying((p) => !p);
                }}
                onSpeed={setSpeed}
              />
            ) : (
              <div className="flex items-center gap-3 text-sm text-slate-400">
                <Keyboard className="size-4 shrink-0 text-slate-500" />
                <span>
                  After you press <span className="text-slate-200">Visualize</span>: <Kbd>Space</Kbd> play/pause, <Kbd>←</Kbd> <Kbd>→</Kbd> step,{" "}
                  <Kbd>Home</Kbd> restart
                </span>
              </div>
            )}
          </div>
        </section>

        {/* Right: explanation + memory + output */}
        <section className="flex flex-col gap-4 lg:min-h-0 lg:overflow-y-auto lg:pr-1 [&>*]:shrink-0">
          {trace?.limit && hasSteps && (
            <div className="flex items-center gap-2 rounded-xl bg-amber-400/10 px-3 py-2 text-sm text-amber-200 ring-1 ring-amber-400/30">
              <AlertTriangle className="size-4 shrink-0" />
              Stopped after {(trace.maxSteps ?? 3000).toLocaleString()} steps. This may be an infinite loop, or the input is too big. Showing the first{" "}
              {(trace.maxSteps ?? 3000).toLocaleString()} steps.
            </div>
          )}

          {trace && !hasSteps && trace.error ? (
            <ErrorCard error={trace.error} line={trace.errorLine} />
          ) : ex && ctx ? (
            <>
              <ExplanationCard ex={ex} stepKey={idx} nextLine={nextLine} nextCode={nextLine ? lines[nextLine - 1]?.trim() : undefined} />
              {trace?.needInput && idx === last && (
                <InputPrompt
                  out={step.out}
                  prompt={trace.prompt}
                  line={step.line}
                  busy={answering}
                  given={stdin.split("\n").filter((l, i, a) => l !== "" || i < a.length - 1)}
                  onSubmit={(v) => answerInput(v)}
                  onEof={() => answerInput(null)}
                />
              )}
              {structs && hasStructures(structs) && <StructuresPanel structs={structs} ctx={ctx} />}
              <RecursionTree tree={callTree} idx={idx} />
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_260px]">
                <div className="panel min-w-0 p-4">
                  <div className="panel-title mb-3">
                    <Layers className="size-3.5" /> Memory: frames & data
                  </div>
                  <MemoryView ctx={ctx} indexMap={indexMap} />
                </div>
                <div className="flex flex-col gap-4">
                  <div className="panel p-4">
                    <div className="panel-title mb-3">
                      <Layers className="size-3.5" /> Call stack
                    </div>
                    <CallStack names={step.stack.map((f) => f.name)} />
                  </div>
                  <div className="panel p-4">
                    <div className="panel-title mb-3">
                      <Terminal className="size-3.5" /> Output
                    </div>
                    <OutputView out={step.out} prevOut={prevStep?.out ?? ""} error={atErrorEnd ? trace?.error : undefined} />
                  </div>
                </div>
              </div>
            </>
          ) : (
            <Welcome />
          )}
        </section>
      </main>
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="rounded-md bg-white/[0.08] px-1.5 py-0.5 font-mono text-[11px] text-slate-200 ring-1 ring-white/10">{children}</kbd>;
}

function CallStack({ names }: { names: string[] }) {
  return (
    <motion.div layoutRoot className="flex flex-col-reverse gap-1.5">
      <AnimatePresence initial={false}>
        {names.map((n, i) => (
          <motion.div
            key={`${i}-${n}`}
            layout
            initial={{ opacity: 0, y: -12, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.9 }}
            className={`rounded-lg px-3 py-1.5 font-mono text-xs ring-1 ${
              i === names.length - 1 ? "bg-violet-500/15 text-violet-100 ring-violet-400/40" : "bg-white/[0.03] text-slate-400 ring-white/[0.08]"
            }`}
          >
            {n === "Global" ? "Global" : `${n}()`}
            {i === names.length - 1 && <span className="float-right text-[10px] text-violet-300">running</span>}
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  );
}

function ErrorCard({ error, line }: { error: string; line?: number | null }) {
  return (
    <div className="panel p-5 ring-red-400/30">
      <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-red-400/15 px-2.5 py-1 text-xs font-medium text-red-300 ring-1 ring-red-400/30">
        <AlertTriangle className="size-3.5" /> Could not run the code
      </div>
      <p className="text-base text-slate-100">
        <RichText text={`${line ? `Line ${line}: ` : ""}\`${error}\``} />
      </p>
      <p className="mt-2 text-sm text-slate-400">Fix the highlighted line in the editor, then press Visualize again.</p>
    </div>
  );
}

const FEATURES = [
  { t: "Line by line", d: "The green arrow shows the line about to run. Grey shows the one that just ran." },
  { t: "Plain-English why", d: "Every step says what changed and why: conditions, loops, calls and returns." },
  { t: "Live data structures", d: "Arrays with moving pointers, swaps, 2D grids, dictionaries, sets and objects." },
  { t: "Recursion made visible", d: "Each call gets its own frame. Watch the stack grow and unwind." },
];

function Welcome() {
  return (
    <div className="panel relative flex flex-1 flex-col justify-center overflow-hidden p-6 sm:p-10">
      <div className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full bg-violet-600/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-16 size-72 rounded-full bg-cyan-500/10 blur-3xl" />
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="relative max-w-xl">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/[0.05] px-3 py-1 text-xs text-slate-300 ring-1 ring-white/10">
          <Sparkles className="size-3.5 text-violet-300" /> Free · runs in your browser
        </div>
        <h1 className="text-3xl font-semibold leading-tight tracking-tight text-white sm:text-4xl">
          Watch your code{" "}
          <span className="bg-gradient-to-r from-violet-300 via-indigo-300 to-cyan-300 bg-clip-text text-transparent">think.</span>
        </h1>
        <p className="mt-3 text-slate-400">
          Paste code or pick an example, then press <span className="font-medium text-slate-200">Visualize</span>. Play it like a video, pause anywhere, and step back
          and forth to see exactly what each line does.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.t}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 * i + 0.1 }}
              className="rounded-xl bg-white/[0.03] p-3.5 ring-1 ring-white/[0.07]"
            >
              <div className="text-sm font-medium text-white">{f.t}</div>
              <div className="mt-1 text-sm text-slate-400">{f.d}</div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
