# Records a step-by-step trace of a Python program.
# Runs inside Pyodide (Python in the browser). Called from pyodide-worker.js.
import sys, io, json, builtins, math, collections

MAX_STEPS = 3000
MAX_ITEMS = 100
MAX_STR = 300


class _StepLimit(Exception):
    pass


def _prim(v):
    t = type(v).__name__
    if isinstance(v, float) and (math.isinf(v) or math.isnan(v)):
        return {"k": "p", "t": t, "v": str(v)}
    if isinstance(v, int) and not isinstance(v, bool) and abs(v) > 2**53:
        return {"k": "p", "t": "bigint", "v": str(v)}
    if isinstance(v, str) and len(v) > MAX_STR:
        v = v[:MAX_STR] + "..."
    return {"k": "p", "t": t, "v": v}


def _is_prim(v):
    return v is None or isinstance(v, (bool, int, float, str))


def _encode_all(roots):
    """Encode values; objects go into a heap dict keyed by id (iterative, so long linked lists are fine)."""
    heap = {}
    queue = []

    def ref(v):
        if _is_prim(v):
            return _prim(v)
        if type(v).__name__ == "module":
            return {"k": "p", "t": "module", "v": v.__name__}
        key = str(id(v))
        if key not in heap:
            heap[key] = None
            queue.append(v)
        return {"k": "r", "id": key}

    encoded = [[(name, ref(val)) for name, val in group] for group in roots]

    while queue:
        v = queue.pop()
        key = str(id(v))
        try:
            if isinstance(v, (list, tuple, collections.deque)):
                kind = "deque" if isinstance(v, collections.deque) else type(v).__name__
                if kind not in ("list", "tuple", "deque"):
                    kind = "list"
                items = list(v)[:MAX_ITEMS]
                heap[key] = {"kind": kind, "items": [ref(x) for x in items], "len": len(v)}
            elif isinstance(v, (set, frozenset)):
                items = list(v)
                try:
                    items.sort()
                except Exception:
                    pass
                heap[key] = {"kind": "set", "items": [ref(x) for x in items[:MAX_ITEMS]], "len": len(v)}
            elif isinstance(v, dict):
                entries = list(v.items())[:MAX_ITEMS]
                heap[key] = {"kind": "dict", "entries": [[ref(a), ref(b)] for a, b in entries], "len": len(v)}
            elif callable(v) and hasattr(v, "__code__"):
                params = list(v.__code__.co_varnames[: v.__code__.co_argcount])
                heap[key] = {"kind": "function", "name": v.__name__, "params": params}
            elif isinstance(v, type):
                heap[key] = {"kind": "class", "name": v.__name__}
            elif hasattr(v, "__dict__") and not callable(v):
                fields = [(k, ref(x)) for k, x in vars(v).items() if not k.startswith("__")]
                heap[key] = {"kind": "object", "cls": type(v).__name__, "fields": fields}
            else:
                r = repr(v)
                heap[key] = {"kind": "other", "type": type(v).__name__, "repr": r[:MAX_STR]}
        except Exception as e:  # never let encoding break the trace
            heap[key] = {"kind": "other", "type": type(v).__name__, "repr": "<" + str(e) + ">"}

    return encoded, heap


_HIDDEN = {"__name__", "__builtins__", "__doc__", "__loader__", "__spec__", "__package__", "__file__", "__cached__", "__annotations__"}


def _frame_vars(frame, is_module):
    src = frame.f_globals if is_module else frame.f_locals
    out = []
    for name, val in list(src.items()):
        if name in _HIDDEN or name.startswith("__") or type(val).__name__ == "module":
            continue
        out.append((name, val))
    return out


def run_trace(code, stdin_text=""):
    steps = []
    out = io.StringIO()
    in_lines = stdin_text.split("\n") if stdin_text else []
    in_pos = [0]
    frame_ids = {}
    next_frame_id = [1]

    def fake_input(prompt=""):
        out.write(str(prompt))
        if in_pos[0] < len(in_lines):
            v = in_lines[in_pos[0]]
            in_pos[0] += 1
            out.write(v + "\n")
            return v
        raise EOFError("No more input. Type input lines in the Input box (one per line).")

    user_builtins = dict(builtins.__dict__)
    user_builtins["input"] = fake_input
    user_globals = {"__name__": "__main__", "__builtins__": user_builtins}

    def collect_stack(frame):
        frames = []
        f = frame
        while f is not None:
            if f.f_code.co_filename == "<user>":
                frames.append(f)
            f = f.f_back
        frames.reverse()
        return frames

    def record(frame, event, arg):
        if len(steps) >= MAX_STEPS:
            raise _StepLimit()
        frames = collect_stack(frame)
        groups = []
        meta = []
        for f in frames:
            is_module = f.f_code.co_name == "<module>"
            fid = 0 if is_module else frame_ids.setdefault(id(f), None)
            if fid is None:
                fid = next_frame_id[0]
                next_frame_id[0] += 1
                frame_ids[id(f)] = fid
            groups.append(_frame_vars(f, is_module))
            meta.append((fid, "Global" if is_module else f.f_code.co_name, f.f_lineno))
        extra = []
        if event == "return":
            extra = [("__ret__", arg)]
        encoded, heap = _encode_all(groups + [extra])
        stack = []
        for (fid, name, line), vars_ in zip(meta, encoded[:-1]):
            stack.append({"id": fid, "name": name, "line": line, "vars": vars_})
        step = {
            "line": frame.f_lineno,
            "event": event,
            "func": "Global" if frame.f_code.co_name == "<module>" else frame.f_code.co_name,
            "stack": stack,
            "heap": heap,
            "out": out.getvalue(),
        }
        if event == "return":
            step["ret"] = encoded[-1][0][1]
        if event == "exception":
            exc_type, exc_val = arg[0], arg[1]
            step["exc"] = exc_type.__name__ + ": " + str(exc_val)
        steps.append(step)
        if event == "return" and id(frame) in frame_ids:
            del frame_ids[id(frame)]

    def tracer(frame, event, arg):
        if frame.f_code.co_filename != "<user>":
            return None
        if event == "call":
            loc = frame.f_locals
            if "__module__" in loc and "__qualname__" in loc:
                return None  # skip class bodies
            if frame.f_code.co_name == "<module>":
                return tracer
        if event in ("call", "line", "return", "exception"):
            record(frame, event, arg)
        return tracer

    result = {"steps": steps, "lang": "python", "maxSteps": MAX_STEPS}
    try:
        compiled = compile(code, "<user>", "exec")
    except SyntaxError as e:
        result["error"] = "SyntaxError: " + str(e.msg)
        result["errorLine"] = e.lineno
        result["syntax"] = True
        return json.dumps(result)

    old_stdout = sys.stdout
    sys.stdout = out
    old_limit = sys.getrecursionlimit()
    sys.setrecursionlimit(400)
    sys.settrace(tracer)
    try:
        exec(compiled, user_globals)
    except _StepLimit:
        result["limit"] = True
    except BaseException as e:
        tb = e.__traceback__
        line = None
        while tb is not None:
            if tb.tb_frame.f_code.co_filename == "<user>":
                line = tb.tb_lineno
            tb = tb.tb_next
        result["error"] = type(e).__name__ + ": " + str(e)
        result["errorLine"] = line
    finally:
        sys.settrace(None)
        sys.stdout = old_stdout
        sys.setrecursionlimit(old_limit)

    result["out"] = out.getvalue()
    return json.dumps(result, ensure_ascii=False)
