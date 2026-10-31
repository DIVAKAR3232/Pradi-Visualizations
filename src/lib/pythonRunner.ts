import type { TraceResult } from "./types";

// Talks to the Pyodide web worker. One worker is shared by the whole page.
const TIMEOUT_MS = 15000;

type Listener = (status: RunnerStatus) => void;
export type RunnerStatus = "loading" | "ready" | "error";

let worker: Worker | null = null;
let status: RunnerStatus = "loading";
const listeners = new Set<Listener>();
let nextId = 1;
const pending = new Map<number, (r: TraceResult) => void>();

function setStatus(s: RunnerStatus) {
  status = s;
  listeners.forEach((l) => l(s));
}

function startWorker() {
  setStatus("loading");
  worker = new Worker("/pyodide-worker.js");
  worker.onmessage = (e: MessageEvent) => {
    const msg = e.data;
    if (msg.type === "ready") setStatus("ready");
    else if (msg.type === "loadError") setStatus("error");
    else if (msg.type === "result") {
      const done = pending.get(msg.id);
      pending.delete(msg.id);
      done?.(msg.result);
    }
  };
}

export function initRunner() {
  if (!worker) startWorker();
}

export function onRunnerStatus(l: Listener) {
  listeners.add(l);
  l(status);
  return () => {
    listeners.delete(l);
  };
}

function whenReady(): Promise<boolean> {
  return new Promise((resolve) => {
    const off = onRunnerStatus((s) => {
      if (s === "loading") return;
      queueMicrotask(() => off());
      resolve(s === "ready");
    });
  });
}

export async function tracePython(code: string, stdin: string): Promise<TraceResult> {
  initRunner();
  if (!(await whenReady())) {
    return { steps: [], error: "Could not load the Python engine. Check your internet connection and reload the page." };
  }
  const id = nextId++;
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      // The program is stuck inside one long operation: restart the worker.
      pending.delete(id);
      worker?.terminate();
      worker = null;
      startWorker();
      resolve({ steps: [], error: "Timeout: the program took longer than 15 seconds. Try a smaller input." });
    }, TIMEOUT_MS);
    pending.set(id, (r) => {
      clearTimeout(timer);
      resolve(r);
    });
    worker!.postMessage({ id, code, stdin });
  });
}
