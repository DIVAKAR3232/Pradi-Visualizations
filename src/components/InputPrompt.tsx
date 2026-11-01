"use client";

import { CornerDownLeft, Keyboard, Loader2, Square } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

type Props = {
  /** Everything the program has printed so far. */
  out: string;
  /** Python input("prompt") text, printed just before it waits. */
  prompt?: string;
  line: number;
  busy: boolean;
  given: string[];
  onSubmit: (value: string) => void;
  onEof: () => void;
};

/** A small terminal that appears when the program is waiting for the user to type input. */
export function InputPrompt({ out, prompt, line, busy, given, onSubmit, onEof }: Props) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (busy) return;
    inputRef.current?.focus({ preventScroll: true });
    boxRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [busy, line]);

  const tail = (out + (prompt ?? "")).split("\n").slice(-4);
  const send = () => {
    if (busy) return;
    onSubmit(value);
    setValue("");
  };

  return (
    <motion.div
      ref={boxRef}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="panel relative overflow-hidden p-4 ring-1 ring-cyan-400/40 shadow-[0_0_40px_-12px_rgba(34,211,238,0.6)]"
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-400/15 px-2.5 py-1 text-xs font-medium text-cyan-200 ring-1 ring-cyan-400/30">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-cyan-300 opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-cyan-300" />
          </span>
          Waiting for your input
        </span>
        <span className="text-xs text-slate-400">line {line}</span>
        {given.length > 0 && (
          <span className="ml-auto truncate text-xs text-slate-500">
            Given so far: <span className="font-mono text-slate-300">{given.join(" ⏎ ")}</span>
          </span>
        )}
      </div>

      <div className="rounded-xl bg-black/50 p-3 font-mono text-[13px] ring-1 ring-white/[0.08]">
        {tail.map((l, i) => (
          <div key={i} className="whitespace-pre-wrap text-slate-400">
            {i === tail.length - 1 ? null : l || " "}
          </div>
        ))}
        <div className="flex items-center gap-2">
          {tail[tail.length - 1] && <span className="whitespace-pre text-slate-200">{tail[tail.length - 1]}</span>}
          <span className="text-cyan-300">›</span>
          <input
            ref={inputRef}
            value={value}
            disabled={busy}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                send();
              }
            }}
            placeholder="type a value and press Enter"
            aria-label="Program input"
            className="min-w-0 flex-1 bg-transparent text-cyan-100 caret-cyan-300 outline-none placeholder:text-slate-600"
          />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          onClick={send}
          disabled={busy}
          className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <CornerDownLeft className="size-4" />}
          Send
        </button>
        <button
          onClick={onEof}
          disabled={busy}
          title="Tell the program there is no more input (like Ctrl+D)"
          className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm text-slate-300 ring-1 ring-white/10 transition hover:bg-white/[0.06] disabled:opacity-60"
        >
          <Square className="size-3.5" /> End of input
        </button>
        <span className="flex items-center gap-1.5 text-xs text-slate-500">
          <Keyboard className="size-3.5" /> One line at a time. You can type several values on one line, like <code className="text-slate-300">10 20 30</code>
        </span>
      </div>
    </motion.div>
  );
}
