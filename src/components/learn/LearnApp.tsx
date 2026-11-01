"use client";

import {
  AppWindow,
  ArrowLeft,
  ArrowLeftRight,
  ArrowUpDown,
  Binary,
  BookOpen,
  Braces,
  CalendarRange,
  Check,
  ChevronRight,
  Copy,
  Flame,
  GitBranch,
  Grid3x3,
  Hash,
  Layers,
  Lightbulb,
  Link2,
  ListOrdered,
  ListTree,
  type LucideIcon,
  Network,
  Play,
  Rows3,
  Search,
  Sigma,
  Table2,
  Target,
  TreePine,
  Triangle,
  Type,
  Waypoints,
  X,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { NavTabs } from "@/components/NavTabs";
import { PROBLEMS } from "@/lib/learn/problems";
import { IMPORTANT, METHODS, METHODS_FOR_PROBLEM, problemsOf, TOPICS, topicProblemIds } from "@/lib/learn/topics";
import type { Difficulty, Method, Problem, TemplateLang, Topic } from "@/lib/learn/types";
import { encodeShare } from "@/lib/share";
import { CodeBlock } from "./CodeBlock";
import { DIFF_STYLE, DiffPill, ProblemCard } from "./ProblemCard";
import { useSolved } from "./useSolved";

const ICONS: Record<string, LucideIcon> = {
  rows: Rows3,
  type: Type,
  hash: Hash,
  pointers: ArrowLeftRight,
  window: AppWindow,
  sigma: Sigma,
  search: Search,
  sort: ArrowUpDown,
  layers: Layers,
  queue: ListOrdered,
  link: Link2,
  branch: GitBranch,
  tree: TreePine,
  treeSorted: ListTree,
  pyramid: Triangle,
  graph: Waypoints,
  trie: Network,
  zap: Zap,
  intervals: CalendarRange,
  grid: Grid3x3,
  binary: Binary,
  matrix: Table2,
};

const LANG_LABEL: Record<TemplateLang, string> = { python: "Python", java: "Java", cpp: "C++", c: "C" };
const DIFFS: Difficulty[] = ["Easy", "Medium", "Hard"];

type Route = { tab: "concepts" | "important"; topic?: string; method?: string };

function parseHash(): Route {
  if (typeof window === "undefined") return { tab: "concepts" };
  const h = decodeURIComponent(window.location.hash.replace(/^#\/?/, ""));
  if (h === "important") return { tab: "important" };
  const [kind, topic, method] = h.split("/");
  if (kind === "topic" && topic && TOPICS.some((t) => t.id === topic)) return { tab: "concepts", topic, method: method && METHODS[method] ? method : undefined };
  return { tab: "concepts" };
}

function hashOf(r: Route): string {
  if (r.tab === "important") return "#important";
  if (r.topic) return `#topic/${r.topic}${r.method ? `/${r.method}` : ""}`;
  return "#";
}

const topicOfMethod = (id: string) => TOPICS.find((t) => t.methods.some((m) => m.id === id));

export function LearnApp() {
  const [route, setRoute] = useState<Route>({ tab: "concepts" });
  const [query, setQuery] = useState("");
  const [diff, setDiff] = useState<Difficulty | "All">("All");
  const { solved, toggle } = useSolved();

  useEffect(() => {
    const sync = () => setRoute(parseHash());
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  const go = useCallback((r: Route) => {
    const h = hashOf(r);
    if (h === "#") window.history.pushState(null, "", window.location.pathname);
    else window.location.hash = h;
    setRoute(r);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const openMethod = useCallback(
    (m: Method, topicId?: string) => go({ tab: "concepts", topic: topicId ?? topicOfMethod(m.id)?.id, method: m.id }),
    [go],
  );

  const topic = route.topic ? TOPICS.find((t) => t.id === route.topic) : undefined;
  const method = route.method ? METHODS[route.method] : undefined;
  const q = query.trim().toLowerCase();
  const passDiff = (p: Problem) => diff === "All" || p.diff === diff;

  const totalProblems = useMemo(() => new Set(TOPICS.flatMap(topicProblemIds)).size, []);
  const solvedCount = useMemo(() => [...solved].filter((id) => PROBLEMS[id]).length, [solved]);

  return (
    <div className="relative z-10 min-h-dvh pb-16">
      <header className="flex items-center gap-3 px-4 py-3 sm:px-6">
        <a href="/" className="grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet-500 via-indigo-500 to-cyan-400 shadow-lg shadow-indigo-500/30">
          <Braces className="size-5 text-white" />
        </a>
        <div className="min-w-0 leading-tight">
          <div className="truncate text-[17px] font-semibold tracking-tight text-white">
            Pradi <span className="bg-gradient-to-r from-violet-300 to-cyan-300 bg-clip-text text-transparent">Visualizer</span>
          </div>
          <div className="hidden text-xs text-slate-400 sm:block">Learn the patterns, then practice them</div>
        </div>
        <div className="ml-auto" />
        <NavTabs />
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        {/* Hero (home only) */}
        {route.tab === "concepts" && !route.topic && !q && (
        <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="panel relative mt-2 overflow-hidden p-5 sm:p-7">
          <div className="pointer-events-none absolute -right-20 -top-24 size-72 rounded-full bg-violet-600/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 left-10 size-64 rounded-full bg-cyan-500/10 blur-3xl" />
          <div className="relative flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/[0.05] px-3 py-1 text-xs text-slate-300 ring-1 ring-white/10">
                <BookOpen className="size-3.5 text-violet-300" /> Concepts → methods → LeetCode practice
              </div>
              <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                Learn DSA by <span className="bg-gradient-to-r from-violet-300 via-indigo-300 to-cyan-300 bg-clip-text text-transparent">patterns</span>
              </h1>
              <p className="mt-2 text-sm text-slate-400 sm:text-base">
                Pick a topic, learn each method that solves it, run its template in the visualizer, then practice real LeetCode problems grouped by difficulty.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <Stat label="Topics" value={TOPICS.length} />
              <Stat label="Methods" value={Object.keys(METHODS).length} />
              <Stat label="Solved" value={`${solvedCount}/${totalProblems}`} accent />
            </div>
          </div>
        </motion.section>
        )}

        {/* Toolbar */}
        <div className="sticky top-0 z-20 -mx-4 mt-4 bg-[#06070d]/80 px-4 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="flex shrink-0 gap-1 rounded-xl bg-black/30 p-1 ring-1 ring-white/[0.08]">
              {(
                [
                  ["concepts", "Concepts", BookOpen],
                  ["important", "Important Questions", Flame],
                ] as const
              ).map(([id, label, Icon]) => (
                <button
                  key={id}
                  onClick={() => go({ tab: id })}
                  className={`relative flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition lg:flex-none ${
                    route.tab === id ? "text-white" : "text-slate-400 hover:text-white"
                  }`}
                >
                  {route.tab === id && <motion.span layoutId="learn-tab" className="absolute inset-0 rounded-lg bg-white/[0.1]" transition={{ type: "spring", stiffness: 500, damping: 35 }} />}
                  <Icon className={`relative size-4 ${id === "important" ? "text-orange-300" : ""}`} />
                  <span className="relative">
                    {id === "important" ? (
                      <>
                        <span className="sm:hidden">Important</span>
                        <span className="hidden sm:inline">{label}</span>
                      </>
                    ) : (
                      label
                    )}
                  </span>
                </button>
              ))}
            </div>
            <label className="relative min-w-0 flex-1">
              <span className="sr-only">Search</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search methods or problems (e.g. kadane, 3sum, 239)"
                className="w-full rounded-xl bg-white/[0.05] py-2 pl-9 pr-9 text-sm text-slate-100 ring-1 ring-white/10 outline-none placeholder:text-slate-500 focus:ring-violet-400/50"
              />
              {query && (
                <button onClick={() => setQuery("")} className="absolute right-2 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-md text-slate-400 hover:bg-white/10 hover:text-white" title="Clear search">
                  <X className="size-4" />
                </button>
              )}
            </label>
            <div className="flex shrink-0 gap-1 overflow-x-auto">
              {(["All", ...DIFFS] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => setDiff(d)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium ring-1 transition ${
                    diff === d
                      ? d === "All"
                        ? "bg-white/15 text-white ring-white/20"
                        : `${DIFF_STYLE[d].bg} ${DIFF_STYLE[d].text} ${DIFF_STYLE[d].ring}`
                      : "text-slate-400 ring-white/[0.08] hover:text-white"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={`${route.tab}-${route.topic ?? ""}-${route.method ?? ""}-${q ? "search" : ""}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            className="mt-2"
          >
            {route.tab === "important" ? (
              <ImportantView q={q} passDiff={passDiff} solved={solved} toggle={toggle} openMethod={openMethod} />
            ) : q ? (
              <SearchView q={q} passDiff={passDiff} solved={solved} toggle={toggle} openMethod={openMethod} />
            ) : method && topic ? (
              <MethodView topic={topic} method={method} go={go} passDiff={passDiff} solved={solved} toggle={toggle} openMethod={openMethod} />
            ) : topic ? (
              <TopicView topic={topic} go={go} solved={solved} />
            ) : (
              <TopicGrid go={go} solved={solved} />
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number | string; accent?: boolean }) {
  return (
    <div className="rounded-xl bg-white/[0.04] px-3 py-2 text-center ring-1 ring-white/[0.08] sm:px-4">
      <div className={`font-mono text-lg font-semibold tabular-nums sm:text-xl ${accent ? "text-emerald-300" : "text-white"}`}>{value}</div>
      <div className="text-[11px] uppercase tracking-wider text-slate-500">{label}</div>
    </div>
  );
}

function Progress({ done, total }: { done: number; total: number }) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.08]">
        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400" />
      </div>
      <span className="shrink-0 font-mono text-[11px] tabular-nums text-slate-400">
        {done}/{total}
      </span>
    </div>
  );
}

function Breadcrumb({ items }: { items: { label: string; onClick?: () => void }[] }) {
  return (
    <nav className="mb-4 flex flex-wrap items-center gap-1 text-sm text-slate-400" aria-label="Breadcrumb">
      {items.map((it, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <ChevronRight className="size-3.5 text-slate-600" />}
          {it.onClick ? (
            <button onClick={it.onClick} className="rounded px-1 hover:bg-white/[0.06] hover:text-white">
              {i === 0 && <ArrowLeft className="mr-1 inline size-3.5" />}
              {it.label}
            </button>
          ) : (
            <span className="px-1 text-slate-200">{it.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

function TopicIcon({ topic, size = "size-11" }: { topic: Topic; size?: string }) {
  const Icon = ICONS[topic.icon] ?? Rows3;
  return (
    <div className={`grid ${size} shrink-0 place-items-center rounded-xl bg-gradient-to-br ${topic.color} shadow-lg shadow-black/30`}>
      <Icon className="size-5 text-white" />
    </div>
  );
}

// ---------- views ----------

function TopicGrid({ go, solved }: { go: (r: Route) => void; solved: Set<number> }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {TOPICS.map((t, i) => {
        const ids = topicProblemIds(t);
        const done = ids.filter((id) => solved.has(id)).length;
        return (
          <motion.button
            key={t.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.025, 0.4) }}
            whileHover={{ y: -2 }}
            onClick={() => go({ tab: "concepts", topic: t.id })}
            className="panel group flex flex-col gap-3 p-4 text-left transition hover:ring-violet-400/40"
          >
            <div className="flex items-start gap-3">
              <TopicIcon topic={t} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold text-white">{t.name}</h2>
                  {t.id === "arrays" && <span className="rounded-full bg-violet-400/15 px-2 py-0.5 text-[10px] font-medium text-violet-200">Start here</span>}
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-slate-400">{t.blurb}</p>
              </div>
              <ChevronRight className="mt-1 size-4 shrink-0 text-slate-600 transition group-hover:translate-x-0.5 group-hover:text-violet-300" />
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span>
                <span className="text-slate-300">{t.methods.length}</span> methods
              </span>
              <span>
                <span className="text-slate-300">{ids.length}</span> problems
              </span>
            </div>
            <Progress done={done} total={ids.length} />
          </motion.button>
        );
      })}
    </div>
  );
}

function diffCounts(m: Method) {
  const c = { Easy: 0, Medium: 0, Hard: 0 };
  for (const p of problemsOf(m)) c[p.diff]++;
  return c;
}

function TopicView({ topic, go, solved }: { topic: Topic; go: (r: Route) => void; solved: Set<number> }) {
  const ids = topicProblemIds(topic);
  return (
    <div>
      <Breadcrumb items={[{ label: "All topics", onClick: () => go({ tab: "concepts" }) }, { label: topic.name }]} />
      <div className="panel mb-4 flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
        <TopicIcon topic={topic} size="size-14" />
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-semibold text-white sm:text-2xl">{topic.name}</h2>
          <p className="mt-1 text-sm text-slate-400">{topic.blurb}</p>
        </div>
        <div className="w-full sm:w-56">
          <div className="mb-1 text-xs text-slate-500">Your progress</div>
          <Progress done={ids.filter((id) => solved.has(id)).length} total={ids.length} />
        </div>
      </div>
      <div className="panel-title mb-3 px-1">
        <Target className="size-3.5" /> {topic.methods.length} methods to solve {topic.name.toLowerCase()} problems
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {topic.methods.map((m, i) => {
          const c = diffCounts(m);
          return (
            <motion.button
              key={m.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.03, 0.4) }}
              whileHover={{ y: -2 }}
              onClick={() => go({ tab: "concepts", topic: topic.id, method: m.id })}
              className="panel group flex flex-col gap-3 p-4 text-left transition hover:ring-violet-400/40"
            >
              <div className="flex items-start gap-3">
                <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-white/[0.06] font-mono text-xs text-slate-300 ring-1 ring-white/10">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-white">{m.name}</h3>
                  <p className="mt-1 text-sm text-slate-400">{m.idea}</p>
                </div>
                <ChevronRight className="mt-1 size-4 shrink-0 text-slate-600 transition group-hover:translate-x-0.5 group-hover:text-violet-300" />
              </div>
              <ul className="flex flex-col gap-1 pl-10">
                {m.when.slice(0, 2).map((w) => (
                  <li key={w} className="flex gap-2 text-xs text-slate-400">
                    <Lightbulb className="mt-0.5 size-3 shrink-0 text-amber-300/80" />
                    {w}
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap items-center gap-1.5 pl-10">
                {DIFFS.map((d) =>
                  c[d] ? (
                    <span key={d} className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] ring-1 ${DIFF_STYLE[d].bg} ${DIFF_STYLE[d].text} ${DIFF_STYLE[d].ring}`}>
                      {c[d]} {d}
                    </span>
                  ) : null,
                )}
                <span className="ml-auto font-mono text-[11px] text-slate-500">{m.optimal.split(" ")[0]}</span>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

function readPref(): TemplateLang {
  try {
    const v = window.localStorage.getItem("pradi-learn-lang");
    if (v === "python" || v === "java" || v === "cpp" || v === "c") return v;
  } catch {
    /* ignore */
  }
  return "python";
}

type ListProps = {
  passDiff: (p: Problem) => boolean;
  solved: Set<number>;
  toggle: (id: number) => void;
  openMethod: (m: Method, topicId?: string) => void;
};

function MethodView({ topic, method, go, passDiff, solved, toggle, openMethod }: ListProps & { topic: Topic; method: Method; go: (r: Route) => void }) {
  const langs = (Object.keys(LANG_LABEL) as TemplateLang[]).filter((l) => method.code[l]);
  const [lang, setLang] = useState<TemplateLang>("python");
  const [copied, setCopied] = useState(false);
  const [opening, setOpening] = useState(false);
  useEffect(() => {
    const pref = readPref();
    if (method.code[pref]) setLang(pref);
  }, [method]);
  const pick = (l: TemplateLang) => {
    setLang(l);
    try {
      window.localStorage.setItem("pradi-learn-lang", l);
    } catch {
      /* ignore */
    }
  };
  const code = method.code[lang] ?? method.code.python;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked */
    }
  };
  const visualize = async () => {
    setOpening(true);
    const token = await encodeShare({ lang, code, stdin: "" });
    window.location.href = `/#s=${token}`;
  };
  const problems = problemsOf(method);
  const others = TOPICS.filter((t) => t.id !== topic.id && t.methods.some((m) => m.id === method.id));
  const idx = topic.methods.findIndex((m) => m.id === method.id);
  const next = topic.methods[idx + 1];

  return (
    <div>
      <Breadcrumb
        items={[
          { label: "All topics", onClick: () => go({ tab: "concepts" }) },
          { label: topic.name, onClick: () => go({ tab: "concepts", topic: topic.id }) },
          { label: method.name },
        ]}
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        {/* Explanation */}
        <div className="flex min-w-0 flex-col gap-4">
          <div className="panel relative overflow-hidden p-5">
            <div className={`pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-gradient-to-br ${topic.color} opacity-20 blur-3xl`} />
            <div className="relative">
              <div className="mb-2 text-xs font-medium uppercase tracking-wider text-violet-300">{topic.name} · method {idx + 1} of {topic.methods.length}</div>
              <h2 className="text-xl font-semibold text-white sm:text-2xl">{method.name}</h2>
              <p className="mt-2 text-[15px] leading-relaxed text-slate-300">{method.idea}</p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <div className="rounded-xl bg-rose-400/[0.06] p-3 ring-1 ring-rose-400/20">
                  <div className="text-[11px] font-medium uppercase tracking-wider text-rose-300">Brute force</div>
                  <div className="mt-1 text-sm text-slate-300">{method.brute}</div>
                </div>
                <div className="rounded-xl bg-emerald-400/[0.06] p-3 ring-1 ring-emerald-400/20">
                  <div className="text-[11px] font-medium uppercase tracking-wider text-emerald-300">Optimized</div>
                  <div className="mt-1 text-sm text-slate-300">{method.optimal}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="panel p-5">
            <div className="panel-title mb-3">
              <Lightbulb className="size-3.5 text-amber-300" /> When to use it
            </div>
            <ul className="flex flex-col gap-2">
              {method.when.map((w) => (
                <li key={w} className="flex gap-2 text-sm text-slate-300">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-amber-300" />
                  {w}
                </li>
              ))}
            </ul>
          </div>

          <div className="panel p-5">
            <div className="panel-title mb-3">
              <ListOrdered className="size-3.5" /> Step by step
            </div>
            <ol className="flex flex-col gap-2.5">
              {method.steps.map((s, i) => (
                <li key={i} className="flex gap-3 text-sm text-slate-300">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-violet-500/20 font-mono text-xs text-violet-200 ring-1 ring-violet-400/30">{i + 1}</span>
                  <span className="pt-0.5">{s}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>

        {/* Template */}
        <div className="panel flex min-w-0 flex-col gap-3 p-4 lg:sticky lg:top-24 lg:self-start">
          <div className="flex flex-wrap items-center gap-2">
            <div className="panel-title mr-auto">
              <Braces className="size-3.5" /> Template
            </div>
            <div className="flex gap-0.5 rounded-xl bg-black/30 p-1">
              {langs.map((l) => (
                <button
                  key={l}
                  onClick={() => pick(l)}
                  className={`rounded-lg px-2.5 py-1 text-xs transition ${lang === l ? "bg-white/[0.12] text-white" : "text-slate-400 hover:text-white"}`}
                >
                  {LANG_LABEL[l]}
                </button>
              ))}
            </div>
          </div>
          <CodeBlock code={code} lang={lang} />
          <div className="flex flex-wrap gap-2">
            <button
              onClick={visualize}
              disabled={opening}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 via-indigo-500 to-cyan-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
            >
              <Play className="size-4 fill-current" /> {opening ? "Opening…" : "Visualize this template"}
            </button>
            <button onClick={copy} className="flex items-center gap-1.5 rounded-xl bg-white/[0.06] px-3 py-2 text-sm text-slate-200 ring-1 ring-white/10 transition hover:bg-white/[0.1]">
              {copied ? <Check className="size-4 text-emerald-400" /> : <Copy className="size-4" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          {others.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
              Also used in:
              {others.map((t) => (
                <button key={t.id} onClick={() => go({ tab: "concepts", topic: t.id, method: method.id })} className="rounded-full bg-white/[0.04] px-2 py-0.5 text-slate-300 ring-1 ring-white/10 hover:ring-violet-300/50">
                  {t.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Practice problems */}
      <div className="mt-6 flex flex-wrap items-end justify-between gap-2 px-1">
        <div>
          <h3 className="text-lg font-semibold text-white">Practice: {method.name}</h3>
          <p className="text-sm text-slate-400">Click a problem to open it on LeetCode. Tick the box when you have solved it.</p>
        </div>
        <div className="w-full sm:w-56">
          <Progress done={problems.filter((p) => solved.has(p.id)).length} total={problems.length} />
        </div>
      </div>
      <div className="mt-3 grid gap-3 lg:grid-cols-3">
        {DIFFS.map((d) => {
          const list = problems.filter((p) => p.diff === d && passDiff(p));
          return (
            <div key={d} className="panel p-3">
              <div className="mb-3 flex items-center gap-2 px-1">
                <span className={`size-2 rounded-full ${DIFF_STYLE[d].dot}`} />
                <span className={`text-sm font-semibold ${DIFF_STYLE[d].text}`}>{d}</span>
                <span className="text-xs text-slate-500">{list.length}</span>
              </div>
              <div className="flex flex-col gap-2">
                {list.length === 0 && (
                  <div className="rounded-xl px-3 py-4 text-center text-xs text-slate-500 ring-1 ring-dashed ring-white/10">
                    {problems.some((p) => p.diff === d) ? "Hidden by the difficulty filter" : `No ${d.toLowerCase()} problems for this method`}
                  </div>
                )}
                {list.map((p) => (
                  <ProblemCard
                    key={p.id}
                    problem={p}
                    methods={METHODS_FOR_PROBLEM[p.id] ?? [method]}
                    focus={method.id}
                    solved={solved.has(p.id)}
                    onToggle={() => toggle(p.id)}
                    onMethod={(m) => openMethod(m, m.id === method.id ? topic.id : undefined)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {next && (
        <button
          onClick={() => go({ tab: "concepts", topic: topic.id, method: next.id })}
          className="panel group mt-4 flex w-full items-center gap-3 p-4 text-left transition hover:ring-violet-400/40"
        >
          <div className="min-w-0 flex-1">
            <div className="text-xs text-slate-500">Next method in {topic.name}</div>
            <div className="truncate font-semibold text-white">{next.name}</div>
          </div>
          <ChevronRight className="size-5 text-slate-500 transition group-hover:translate-x-0.5 group-hover:text-violet-300" />
        </button>
      )}
    </div>
  );
}

function ImportantView({ q, passDiff, solved, toggle, openMethod }: ListProps & { q: string }) {
  const groups = IMPORTANT.map((g) => ({
    ...g,
    items: g.problems
      .map((x) => ({ p: PROBLEMS[x.id], top: !!x.top }))
      .filter((x) => x.p && passDiff(x.p) && (!q || `${x.p.id} ${x.p.title}`.toLowerCase().includes(q) || (METHODS_FOR_PROBLEM[x.p.id] ?? []).some((m) => m.name.toLowerCase().includes(q)))),
  })).filter((g) => g.items.length);
  const all = IMPORTANT.flatMap((g) => g.problems.map((p) => p.id));
  return (
    <div>
      <div className="panel mb-4 flex flex-col gap-3 p-5 sm:flex-row sm:items-center">
        <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-orange-500 to-rose-500 shadow-lg shadow-black/30">
          <Flame className="size-6 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-semibold text-white">Important interview questions</h2>
          <p className="mt-1 text-sm text-slate-400">
            The most frequently asked DSA questions in placements (Blind 75 / NeetCode 150 style), grouped by topic. <span className="text-orange-300">Frequently asked</span> marks the must-do ones. Each card shows the method that solves it.
          </p>
        </div>
        <div className="w-full sm:w-56">
          <div className="mb-1 text-xs text-slate-500">Your progress</div>
          <Progress done={all.filter((id) => solved.has(id)).length} total={all.length} />
        </div>
      </div>
      {groups.length === 0 && <Empty />}
      <div className="flex flex-col gap-5">
        {groups.map((g) => (
          <section key={g.topic}>
            <div className="mb-2 flex items-center gap-3 px-1">
              <h3 className="font-semibold text-white">{g.topic}</h3>
              <span className="text-xs text-slate-500">{g.items.length} questions</span>
              <div className="ml-auto hidden w-40 sm:block">
                <Progress done={g.problems.filter((x) => solved.has(x.id)).length} total={g.problems.length} />
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {g.items.map(({ p, top }) => (
                <ProblemCard key={p.id} problem={p} methods={METHODS_FOR_PROBLEM[p.id] ?? []} top={top} solved={solved.has(p.id)} onToggle={() => toggle(p.id)} onMethod={(m) => openMethod(m)} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function SearchView({ q, passDiff, solved, toggle, openMethod }: ListProps & { q: string }) {
  const methods = Object.values(METHODS).filter((m) => `${m.name} ${m.idea} ${m.when.join(" ")}`.toLowerCase().includes(q));
  const problems = Object.values(PROBLEMS)
    .filter((p) => METHODS_FOR_PROBLEM[p.id] && passDiff(p))
    .filter((p) => `${p.id} ${p.title}`.toLowerCase().includes(q) || (METHODS_FOR_PROBLEM[p.id] ?? []).some((m) => m.name.toLowerCase().includes(q)))
    .slice(0, 60);
  if (!methods.length && !problems.length) return <Empty />;
  return (
    <div className="flex flex-col gap-5">
      {methods.length > 0 && (
        <section>
          <div className="panel-title mb-2 px-1">Methods ({methods.length})</div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {methods.map((m) => {
              const t = topicOfMethod(m.id);
              return (
                <button key={m.id} onClick={() => openMethod(m)} className="panel group flex items-start gap-3 p-3 text-left transition hover:ring-violet-400/40">
                  {t && <TopicIcon topic={t} size="size-9" />}
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-white">{m.name}</div>
                    <div className="line-clamp-2 text-xs text-slate-400">{m.idea}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}
      {problems.length > 0 && (
        <section>
          <div className="panel-title mb-2 px-1">Problems ({problems.length})</div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {problems.map((p) => (
              <ProblemCard key={p.id} problem={p} methods={METHODS_FOR_PROBLEM[p.id] ?? []} solved={solved.has(p.id)} onToggle={() => toggle(p.id)} onMethod={(m) => openMethod(m)} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Empty() {
  return (
    <div className="panel p-8 text-center text-sm text-slate-400">
      Nothing matches. Try another word or set the difficulty filter to <span className="text-white">All</span>.
    </div>
  );
}

export { DiffPill };
