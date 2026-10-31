"use client";

import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw, SkipForward } from "lucide-react";

type Props = {
  index: number;
  total: number;
  playing: boolean;
  speed: number;
  onSeek: (i: number) => void;
  onTogglePlay: () => void;
  onSpeed: (s: number) => void;
};

const SPEEDS = [0.5, 1, 2, 4];

export function Player({ index, total, playing, speed, onSeek, onTogglePlay, onSpeed }: Props) {
  const last = Math.max(total - 1, 0);
  const pct = last ? (index / last) * 100 : 0;
  const btn =
    "grid size-9 place-items-center rounded-xl text-slate-300 transition hover:bg-white/10 hover:text-white active:scale-95 disabled:pointer-events-none disabled:opacity-30";

  return (
    <div className="flex flex-col gap-3">
      <div className="relative h-6">
        <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-white/[0.08]" />
        <div
          className="absolute left-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-gradient-to-r from-violet-500 via-indigo-400 to-cyan-400 shadow-[0_0_14px_rgba(129,140,248,0.6)]"
          style={{ width: `${pct}%` }}
        />
        <input
          type="range"
          aria-label="Step timeline"
          min={0}
          max={last}
          value={index}
          onChange={(e) => onSeek(Number(e.target.value))}
          className="timeline absolute inset-0 w-full"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <button className={btn} onClick={() => onSeek(0)} disabled={index === 0} title="Restart (Home)">
            <RotateCcw className="size-4" />
          </button>
          <button className={btn} onClick={() => onSeek(index - 1)} disabled={index === 0} title="Step back (←)">
            <ChevronLeft className="size-5" />
          </button>
          <button
            onClick={onTogglePlay}
            disabled={total === 0}
            title="Play / Pause (Space)"
            className="mx-1 grid size-11 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-500 text-white shadow-lg shadow-indigo-500/30 transition hover:brightness-110 active:scale-95 disabled:opacity-40"
          >
            {playing ? <Pause className="size-5 fill-current" /> : <Play className="ml-0.5 size-5 fill-current" />}
          </button>
          <button className={btn} onClick={() => onSeek(index + 1)} disabled={index >= last} title="Step forward (→)">
            <ChevronRight className="size-5" />
          </button>
          <button className={btn} onClick={() => onSeek(last)} disabled={index >= last} title="Jump to end (End)">
            <SkipForward className="size-4" />
          </button>
        </div>

        <div className="font-mono text-xs tabular-nums text-slate-400">
          Step <span className="text-white">{total ? index + 1 : 0}</span> / {total}
        </div>

        <div className="flex items-center gap-0.5 rounded-xl bg-white/[0.04] p-0.5 ring-1 ring-white/[0.06]">
          {SPEEDS.map((s) => (
            <button
              key={s}
              onClick={() => onSpeed(s)}
              className={`rounded-lg px-2 py-1 font-mono text-xs transition ${
                s === speed ? "bg-white/15 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
