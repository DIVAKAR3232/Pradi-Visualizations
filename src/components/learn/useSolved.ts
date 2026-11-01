"use client";

import { useCallback, useEffect, useState } from "react";

const KEY = "pradi-learn-solved";

function load(): Set<number> {
  try {
    const raw = window.localStorage.getItem(KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(arr) ? arr.filter((x) => typeof x === "number") : []);
  } catch {
    return new Set();
  }
}

/** Problems the viewer marked as solved, remembered in this browser only. */
export function useSolved() {
  const [solved, setSolved] = useState<Set<number>>(() => new Set());

  useEffect(() => {
    // Read after mount so the server render and first client render match.
    const s = load();
    if (s.size) setSolved(s);
  }, []);

  const toggle = useCallback((id: number) => {
    setSolved((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try {
        window.localStorage.setItem(KEY, JSON.stringify([...next]));
      } catch {
        /* storage blocked: keep it in memory only */
      }
      return next;
    });
  }, []);

  return { solved, toggle };
}
