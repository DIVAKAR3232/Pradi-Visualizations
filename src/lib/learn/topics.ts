import * as A from "./methods-arrays";
import * as V from "./methods-advanced";
import * as C from "./methods-core";
import * as S from "./methods-structures";
import { PROBLEMS } from "./problems";
import type { ImportantGroup, Method, Problem, Topic } from "./types";

export const TOPICS: Topic[] = [
  {
    id: "arrays",
    name: "Arrays",
    blurb: "The most asked topic. Learn these patterns and most array problems become a known recipe.",
    icon: "rows",
    color: "from-violet-500 to-indigo-500",
    methods: [A.twoPointers, A.readWrite, A.slidingFixed, A.slidingVar, A.prefixSum, A.prefixHash, A.kadane, A.hashLookup, A.sortGreedy, A.bsSorted, A.bsAnswer, A.dutchFlag, A.cyclicSort, A.monoStack, A.mergeIntervals, A.boyerMoore, A.diffArray, A.matrixTraversal],
  },
  {
    id: "strings",
    name: "Strings",
    blurb: "Palindromes, anagrams, windows over characters, parsing and pattern matching.",
    icon: "type",
    color: "from-sky-500 to-cyan-400",
    methods: [C.palindrome, C.charFreq, A.slidingVar, C.stringBuild, C.kmp, V.dpStrings],
  },
  {
    id: "hashing",
    name: "Hashing",
    blurb: "Trade memory for speed: O(1) lookups turn O(n²) searches into O(n).",
    icon: "hash",
    color: "from-emerald-500 to-teal-400",
    methods: [A.hashLookup, C.charFreq, A.prefixHash, C.designHash],
  },
  {
    id: "two-pointers",
    name: "Two Pointers",
    blurb: "Two indexes moving through the data so you never need nested loops.",
    icon: "pointers",
    color: "from-fuchsia-500 to-pink-500",
    methods: [A.twoPointers, A.readWrite, C.fastSlow],
  },
  {
    id: "sliding-window",
    name: "Sliding Window",
    blurb: "Subarrays and substrings that grow on the right and shrink on the left.",
    icon: "window",
    color: "from-amber-500 to-orange-500",
    methods: [A.slidingFixed, A.slidingVar, C.monoDeque],
  },
  {
    id: "prefix-sum",
    name: "Prefix Sum",
    blurb: "Precompute running totals to answer range questions instantly.",
    icon: "sigma",
    color: "from-lime-500 to-emerald-500",
    methods: [A.prefixSum, A.prefixHash, C.prefix2d, A.diffArray],
  },
  {
    id: "binary-search",
    name: "Binary Search",
    blurb: "Halve the search space every step, on arrays and on answers.",
    icon: "search",
    color: "from-indigo-500 to-blue-500",
    methods: [A.bsSorted, C.bsRotated, A.bsAnswer, C.matrixSearch],
  },
  {
    id: "sorting",
    name: "Sorting",
    blurb: "Merge sort, quickselect, custom orders and counting sort.",
    icon: "sort",
    color: "from-rose-500 to-orange-400",
    methods: [C.mergeSortCount, C.quickselect, C.customSort, A.dutchFlag],
  },
  {
    id: "stack",
    name: "Stack",
    blurb: "Last in, first out: matching, undo, next-greater and expression evaluation.",
    icon: "layers",
    color: "from-purple-500 to-violet-500",
    methods: [S.matchingStack, A.monoStack, S.exprStack, S.stackDesign],
  },
  {
    id: "queue",
    name: "Queue & Deque",
    blurb: "First in, first out: BFS, sliding maximums and queue designs.",
    icon: "queue",
    color: "from-cyan-500 to-sky-500",
    methods: [S.bfs, C.monoDeque, S.stackDesign],
  },
  {
    id: "linked-list",
    name: "Linked List",
    blurb: "Pointer manipulation: reverse, merge, find the middle, detect cycles.",
    icon: "link",
    color: "from-teal-500 to-cyan-500",
    methods: [S.llReversal, C.fastSlow, S.dummyMerge],
  },
  {
    id: "backtracking",
    name: "Recursion & Backtracking",
    blurb: "Explore every choice, undo it, and prune branches that cannot work.",
    icon: "branch",
    color: "from-pink-500 to-rose-500",
    methods: [S.recursionBasics, S.subsets, S.permutations, S.combinationSum, S.gridBacktracking],
  },
  {
    id: "trees",
    name: "Binary Trees",
    blurb: "DFS and BFS on trees, heights, paths, construction and ancestors.",
    icon: "tree",
    color: "from-green-500 to-emerald-500",
    methods: [S.treeDfs, S.treeBfs, S.treeHeight, S.treePath, S.treeConstruct, S.lca],
  },
  {
    id: "bst",
    name: "Binary Search Tree",
    blurb: "Ordered trees: smaller to the left, larger to the right.",
    icon: "treeSorted",
    color: "from-emerald-500 to-lime-500",
    methods: [S.bstOps, S.bstInorder],
  },
  {
    id: "heap",
    name: "Heap / Priority Queue",
    blurb: "Always grab the smallest or largest item fast.",
    icon: "pyramid",
    color: "from-orange-500 to-amber-400",
    methods: [S.topK, S.twoHeaps, S.kWayMerge, S.heapGreedy],
  },
  {
    id: "graphs",
    name: "Graphs",
    blurb: "BFS, DFS, topological order, union-find, shortest paths and spanning trees.",
    icon: "graph",
    color: "from-blue-500 to-indigo-500",
    methods: [S.bfs, V.graphDfs, V.topoSort, V.unionFind, V.dijkstra, V.mst],
  },
  {
    id: "trie",
    name: "Trie",
    blurb: "Prefix trees for fast word and prefix lookups.",
    icon: "trie",
    color: "from-violet-500 to-fuchsia-500",
    methods: [V.trie, V.bitTrie],
  },
  {
    id: "greedy",
    name: "Greedy",
    blurb: "Take the best choice now and never look back, when it is safe to.",
    icon: "zap",
    color: "from-yellow-500 to-amber-500",
    methods: [V.greedyChoice, A.sortGreedy, V.intervalScheduling],
  },
  {
    id: "intervals",
    name: "Intervals",
    blurb: "Merge, schedule and sweep over ranges.",
    icon: "intervals",
    color: "from-sky-500 to-indigo-400",
    methods: [A.mergeIntervals, V.intervalScheduling, A.diffArray],
  },
  {
    id: "dp",
    name: "Dynamic Programming",
    blurb: "Break a problem into overlapping subproblems and store their answers.",
    icon: "grid",
    color: "from-indigo-500 to-violet-500",
    methods: [V.dp1d, V.dpGrid, V.knapsack, V.lis, V.dpStrings, V.dpStock],
  },
  {
    id: "bits",
    name: "Bit Manipulation",
    blurb: "XOR, masks and shifts for constant-space tricks.",
    icon: "binary",
    color: "from-slate-400 to-slate-600",
    methods: [V.xorTricks, V.bitCount, V.bitmask],
  },
  {
    id: "matrix",
    name: "Matrix",
    blurb: "2D grids: traversal orders, in-place tricks, searching and 2D prefix sums.",
    icon: "matrix",
    color: "from-cyan-500 to-teal-500",
    methods: [A.matrixTraversal, C.matrixInplace, C.matrixSearch, C.prefix2d],
  },
];

/** Every method by id (a method can appear in several topics). */
export const METHODS: Record<string, Method> = Object.fromEntries(TOPICS.flatMap((t) => t.methods).map((m) => [m.id, m]));

/** Method names for each problem number. */
export const METHODS_FOR_PROBLEM: Record<number, Method[]> = (() => {
  const map: Record<number, Method[]> = {};
  for (const m of Object.values(METHODS)) for (const p of m.problems) (map[p] ??= []).push(m);
  return map;
})();

export function problemsOf(m: Method): Problem[] {
  return m.problems.map((id) => PROBLEMS[id]).filter(Boolean);
}

export function topicProblemIds(t: Topic): number[] {
  return [...new Set(t.methods.flatMap((m) => m.problems))].filter((id) => PROBLEMS[id]);
}

/** Frequently asked interview questions (Blind 75 / NeetCode 150 / SDE-sheet style), grouped by topic. `top` = must-do. */
export const IMPORTANT: ImportantGroup[] = [
  { topic: "Arrays", problems: [{ id: 1, top: true }, { id: 121, top: true }, { id: 217 }, { id: 238, top: true }, { id: 53, top: true }, { id: 152 }, { id: 15, top: true }, { id: 11 }, { id: 75 }, { id: 31 }, { id: 169 }, { id: 287 }, { id: 560 }, { id: 128, top: true }, { id: 41 }, { id: 42, top: true }] },
  { topic: "Strings", problems: [{ id: 3, top: true }, { id: 424 }, { id: 76, top: true }, { id: 242 }, { id: 49, top: true }, { id: 125 }, { id: 5, top: true }, { id: 647 }, { id: 14 }, { id: 438 }] },
  { topic: "Binary Search", problems: [{ id: 704 }, { id: 33, top: true }, { id: 153, top: true }, { id: 34 }, { id: 74 }, { id: 875 }, { id: 4, top: true }] },
  { topic: "Linked List", problems: [{ id: 206, top: true }, { id: 21, top: true }, { id: 141, top: true }, { id: 143 }, { id: 19 }, { id: 2 }, { id: 160 }, { id: 234 }, { id: 138 }, { id: 146, top: true }, { id: 23, top: true }, { id: 25 }] },
  { topic: "Stack & Queue", problems: [{ id: 20, top: true }, { id: 155 }, { id: 150 }, { id: 739, top: true }, { id: 84, top: true }, { id: 239, top: true }, { id: 232 }] },
  { topic: "Binary Trees", problems: [{ id: 104, top: true }, { id: 100 }, { id: 226, top: true }, { id: 572 }, { id: 102, top: true }, { id: 199 }, { id: 543 }, { id: 236, top: true }, { id: 105 }, { id: 124, top: true }, { id: 297, top: true }] },
  { topic: "Binary Search Tree", problems: [{ id: 98, top: true }, { id: 230, top: true }, { id: 235 }, { id: 450 }] },
  { topic: "Heap", problems: [{ id: 215, top: true }, { id: 347, top: true }, { id: 973 }, { id: 621 }, { id: 295, top: true }, { id: 703 }] },
  { topic: "Graphs", problems: [{ id: 200, top: true }, { id: 133, top: true }, { id: 207, top: true }, { id: 210 }, { id: 417 }, { id: 994, top: true }, { id: 684 }, { id: 743, top: true }, { id: 1584 }, { id: 127 }] },
  { topic: "Backtracking", problems: [{ id: 78, top: true }, { id: 46, top: true }, { id: 39, top: true }, { id: 79, top: true }, { id: 17 }, { id: 22 }, { id: 131 }, { id: 51 }] },
  { topic: "Dynamic Programming", problems: [{ id: 70, top: true }, { id: 198, top: true }, { id: 213 }, { id: 322, top: true }, { id: 300, top: true }, { id: 1143, top: true }, { id: 139 }, { id: 416 }, { id: 62 }, { id: 72, top: true }, { id: 91 }] },
  { topic: "Greedy & Intervals", problems: [{ id: 55, top: true }, { id: 45 }, { id: 134 }, { id: 763 }, { id: 56, top: true }, { id: 57 }, { id: 435 }] },
  { topic: "Trie", problems: [{ id: 208, top: true }, { id: 211 }, { id: 212 }] },
  { topic: "Bit Manipulation", problems: [{ id: 136, top: true }, { id: 191 }, { id: 338 }, { id: 268 }, { id: 371 }, { id: 190 }] },
  { topic: "Matrix", problems: [{ id: 54, top: true }, { id: 48, top: true }, { id: 73 }, { id: 240 }] },
];
