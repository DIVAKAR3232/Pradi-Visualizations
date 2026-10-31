// Runs Python in the browser (Pyodide) and returns a step-by-step trace.
importScripts("https://cdn.jsdelivr.net/pyodide/v0.28.3/full/pyodide.js");

const ready = (async () => {
  const py = await loadPyodide();
  const src = await (await fetch("/tracer.py")).text();
  py.runPython(src);
  return py;
})();

ready
  .then(() => self.postMessage({ type: "ready" }))
  .catch((err) => self.postMessage({ type: "loadError", error: String(err) }));

self.onmessage = async (e) => {
  const { id, code, stdin } = e.data;
  try {
    const py = await ready;
    const run = py.globals.get("run_trace");
    const json = run(code, stdin || "");
    run.destroy();
    self.postMessage({ type: "result", id, result: JSON.parse(json) });
  } catch (err) {
    self.postMessage({ type: "result", id, result: { steps: [], error: String(err) } });
  }
};
