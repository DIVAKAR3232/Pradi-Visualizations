"use client";

import { useEffect, useRef } from "react";

export function OutputView({ out, prevOut, error }: { out: string; prevOut: string; error?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: "smooth" });
  }, [out, error]);
  const fresh = out.startsWith(prevOut) ? out.slice(prevOut.length) : "";
  const old = fresh ? prevOut : out;

  return (
    <div ref={ref} className="max-h-60 min-h-24 overflow-auto rounded-xl bg-black/40 p-3 font-mono text-[13px] leading-relaxed ring-1 ring-white/[0.06]">
      {!out && !error && <span className="text-slate-600">Nothing printed yet</span>}
      <span className="whitespace-pre-wrap text-slate-300">{old}</span>
      {fresh && <span className="animate-fresh whitespace-pre-wrap rounded text-emerald-300">{fresh}</span>}
      {error && <div className="mt-1 whitespace-pre-wrap text-red-400">{error}</div>}
    </div>
  );
}
