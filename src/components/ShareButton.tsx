"use client";

import { Check, Link2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { encodeShare } from "@/lib/share";
import type { Language } from "@/lib/types";

export function ShareButton({ lang, code, stdin }: { lang: Language; code: string; stdin: string }) {
  const [toast, setToast] = useState<string | null>(null);

  const share = async () => {
    const token = await encodeShare({ lang, code, stdin });
    const url = `${window.location.origin}${window.location.pathname}#s=${token}`;
    window.history.replaceState(null, "", `#s=${token}`);
    try {
      await navigator.clipboard.writeText(url);
      setToast("Link copied. Anyone who opens it sees this code.");
    } catch {
      setToast("Link is in the address bar. Copy it from there.");
    }
    setTimeout(() => setToast(null), 2600);
  };

  return (
    <>
      <button
        onClick={share}
        title="Copy a link to this code"
        className="flex items-center gap-1.5 rounded-full bg-white/[0.05] px-3 py-1.5 text-xs font-medium text-slate-200 ring-1 ring-white/10 transition hover:bg-white/[0.1] active:scale-95"
      >
        <Link2 className="size-3.5" />
        <span className="hidden sm:inline">Share</span>
      </button>
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            className="fixed inset-x-4 bottom-5 z-50 mx-auto flex w-fit max-w-[calc(100vw-2rem)] items-center gap-2 rounded-xl bg-slate-900/95 px-4 py-2.5 text-sm text-slate-100 shadow-2xl ring-1 ring-emerald-400/30 backdrop-blur"
          >
            <Check className="size-4 text-emerald-400" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
