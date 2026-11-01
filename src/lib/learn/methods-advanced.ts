import type { Method } from "./types";

// Graphs, tries, greedy, intervals, dynamic programming and bit manipulation.

export const graphDfs: Method = {
  id: "graph-dfs",
  name: "DFS / Flood Fill",
  idea: "From a start cell or node, go as deep as possible marking everything you reach; each new start is a new component.",
  when: ["Count islands / connected components", "Area of a region, fill a region", "Can you reach X from Y?", "Cells connected to the border"],
  brute: "—",
  optimal: "O(V + E), or O(rows·cols) on a grid",
  steps: ["Loop over every cell / node.", "If it is unvisited land, count a new component and DFS from it.", "DFS marks the cell and recurses into its 4 neighbors that are inside the grid and unvisited."],
  code: {
    python: `def num_islands(grid):
    rows, cols = len(grid), len(grid[0])

    def dfs(r, c):
        if r < 0 or c < 0 or r >= rows or c >= cols or grid[r][c] != "1":
            return
        grid[r][c] = "0"          # mark visited
        dfs(r + 1, c)
        dfs(r - 1, c)
        dfs(r, c + 1)
        dfs(r, c - 1)

    count = 0
    for r in range(rows):
        for c in range(cols):
            if grid[r][c] == "1":
                count += 1
                dfs(r, c)
    return count

grid = [["1", "1", "0", "0"],
        ["1", "0", "0", "1"],
        ["0", "0", "1", "1"]]
print(num_islands(grid))
`,
    java: `public class Main {
    static int rows, cols;

    static void dfs(char[][] grid, int r, int c) {
        if (r < 0 || c < 0 || r >= rows || c >= cols || grid[r][c] != '1') return;
        grid[r][c] = '0';
        dfs(grid, r + 1, c);
        dfs(grid, r - 1, c);
        dfs(grid, r, c + 1);
        dfs(grid, r, c - 1);
    }

    public static void main(String[] args) {
        char[][] grid = {{'1', '1', '0', '0'}, {'1', '0', '0', '1'}, {'0', '0', '1', '1'}};
        rows = grid.length;
        cols = grid[0].length;
        int count = 0;
        for (int r = 0; r < rows; r++) {
            for (int c = 0; c < cols; c++) {
                if (grid[r][c] == '1') {
                    count++;
                    dfs(grid, r, c);
                }
            }
        }
        System.out.println(count);
    }
}
`,
    cpp: `#include <bits/stdc++.h>
using namespace std;

int rows, cols;

void dfs(vector<vector<int>>& grid, int r, int c) {
    if (r < 0 || c < 0 || r >= rows || c >= cols || grid[r][c] != 1) return;
    grid[r][c] = 0;
    dfs(grid, r + 1, c);
    dfs(grid, r - 1, c);
    dfs(grid, r, c + 1);
    dfs(grid, r, c - 1);
}

int main() {
    vector<vector<int>> grid = {{1, 1, 0, 0}, {1, 0, 0, 1}, {0, 0, 1, 1}};
    rows = grid.size();
    cols = grid[0].size();
    int count = 0;
    for (int r = 0; r < rows; r++) {
        for (int c = 0; c < cols; c++) {
            if (grid[r][c] == 1) {
                count++;
                dfs(grid, r, c);
            }
        }
    }
    cout << count << endl;
    return 0;
}
`,
  },
  problems: [1971, 997, 200, 695, 133, 547, 130, 417, 1020, 785, 329, 1192],
};

export const topoSort: Method = {
  id: "topological-sort",
  name: "Topological Sort (Kahn's BFS)",
  idea: "Repeatedly take nodes with no remaining prerequisites (in-degree 0); if some nodes never reach 0 there is a cycle.",
  when: ["Courses with prerequisites", "Order of tasks with dependencies", "Detect a cycle in a directed graph"],
  brute: "Try all orders",
  optimal: "O(V + E)",
  steps: ["Count in-degrees.", "Queue every node with in-degree 0.", "Pop a node, add it to the order, and decrease its neighbors' in-degrees; queue those that hit 0.", "If the order has all nodes, it is valid; otherwise there is a cycle."],
  code: {
    python: `from collections import deque

def course_order(n, prereqs):
    adj = [[] for _ in range(n)]
    indegree = [0] * n
    for course, pre in prereqs:
        adj[pre].append(course)
        indegree[course] += 1
    queue = deque(i for i in range(n) if indegree[i] == 0)
    order = []
    while queue:
        node = queue.popleft()
        order.append(node)
        for nei in adj[node]:
            indegree[nei] -= 1
            if indegree[nei] == 0:
                queue.append(nei)
    return order if len(order) == n else []

print(course_order(4, [[1, 0], [2, 0], [3, 1], [3, 2]]))
`,
    java: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        int n = 4;
        int[][] prereqs = {{1, 0}, {2, 0}, {3, 1}, {3, 2}};
        List<List<Integer>> adj = new ArrayList<>();
        for (int i = 0; i < n; i++) adj.add(new ArrayList<>());
        int[] indegree = new int[n];
        for (int[] p : prereqs) {
            adj.get(p[1]).add(p[0]);
            indegree[p[0]]++;
        }
        Queue<Integer> queue = new ArrayDeque<>();
        for (int i = 0; i < n; i++) if (indegree[i] == 0) queue.add(i);
        List<Integer> order = new ArrayList<>();
        while (!queue.isEmpty()) {
            int node = queue.poll();
            order.add(node);
            for (int nei : adj.get(node)) {
                indegree[nei]--;
                if (indegree[nei] == 0) queue.add(nei);
            }
        }
        System.out.println(order.size() == n ? order.toString() : "cycle!");
    }
}
`,
    cpp: `#include <bits/stdc++.h>
using namespace std;

int main() {
    int n = 4;
    vector<vector<int>> prereqs = {{1, 0}, {2, 0}, {3, 1}, {3, 2}};
    vector<vector<int>> adj(n);
    vector<int> indegree(n, 0);
    for (auto& p : prereqs) {
        adj[p[1]].push_back(p[0]);
        indegree[p[0]]++;
    }
    queue<int> q;
    for (int i = 0; i < n; i++) if (indegree[i] == 0) q.push(i);
    vector<int> order;
    while (!q.empty()) {
        int node = q.front();
        q.pop();
        order.push_back(node);
        for (int nei : adj[node]) {
            indegree[nei]--;
            if (indegree[nei] == 0) q.push(nei);
        }
    }
    for (int x : order) cout << x << " ";
    return 0;
}
`,
  },
  problems: [207, 210, 802, 1203],
};

export const unionFind: Method = {
  id: "union-find",
  name: "Union-Find (Disjoint Set Union)",
  idea: "Keep a parent pointer per node; find() returns the group's root (with path compression) and union() links two roots.",
  when: ["Connected components with edges arriving over time", "Detect a cycle in an undirected graph", "Group accounts / equations", "Kruskal's MST"],
  brute: "Re-run BFS after every edge: O(E · (V + E))",
  optimal: "Almost O(1) per operation (inverse Ackermann)",
  steps: ["parent[i] = i for every node.", "find(x): follow parents to the root, compressing the path.", "union(a, b): if roots differ, attach one root to the other (component count − 1).", "Same root ⇒ already connected (an extra edge makes a cycle)."],
  code: {
    python: `parent = list(range(5))

def find(x):
    while parent[x] != x:
        parent[x] = parent[parent[x]]   # path compression
        x = parent[x]
    return x

def union(a, b):
    ra, rb = find(a), find(b)
    if ra == rb:
        return False                    # already connected: cycle edge
    parent[ra] = rb
    return True

edges = [[0, 1], [1, 2], [3, 4], [2, 0]]
for a, b in edges:
    if not union(a, b):
        print("redundant edge:", [a, b])
groups = len(set(find(i) for i in range(5)))
print("components:", groups)
`,
    java: `import java.util.*;

public class Main {
    static int[] parent = new int[5];

    static int find(int x) {
        while (parent[x] != x) {
            parent[x] = parent[parent[x]];
            x = parent[x];
        }
        return x;
    }

    static boolean union(int a, int b) {
        int ra = find(a), rb = find(b);
        if (ra == rb) return false;
        parent[ra] = rb;
        return true;
    }

    public static void main(String[] args) {
        for (int i = 0; i < 5; i++) parent[i] = i;
        int[][] edges = {{0, 1}, {1, 2}, {3, 4}, {2, 0}};
        int components = 5;
        for (int[] e : edges) {
            if (union(e[0], e[1])) components--;
            else System.out.println("redundant edge: " + e[0] + "-" + e[1]);
        }
        System.out.println("components: " + components);
    }
}
`,
    cpp: `#include <bits/stdc++.h>
using namespace std;

vector<int> parent(5);

int find(int x) {
    while (parent[x] != x) {
        parent[x] = parent[parent[x]];
        x = parent[x];
    }
    return x;
}

bool unite(int a, int b) {
    int ra = find(a), rb = find(b);
    if (ra == rb) return false;
    parent[ra] = rb;
    return true;
}

int main() {
    for (int i = 0; i < 5; i++) parent[i] = i;
    vector<vector<int>> edges = {{0, 1}, {1, 2}, {3, 4}, {2, 0}};
    int components = 5;
    for (auto& e : edges) {
        if (unite(e[0], e[1])) components--;
        else cout << "redundant edge: " << e[0] << "-" << e[1] << endl;
    }
    cout << "components: " << components << endl;
    return 0;
}
`,
  },
  problems: [547, 684, 721, 1319, 1579],
};

export const dijkstra: Method = {
  id: "dijkstra",
  name: "Dijkstra's Shortest Path",
  idea: "Always expand the closest unfinished node (min-heap); with non-negative weights its distance is final.",
  when: ["Shortest path with weighted edges (no negatives)", "Minimum effort / time / cost to reach", "Network delay"],
  brute: "Try all paths (exponential)",
  optimal: "O((V + E) log V)",
  steps: ["dist[start] = 0, others = ∞; push (0, start).", "Pop the smallest (d, node); skip if d > dist[node].", "Relax each edge: if d + w < dist[nei], update and push.", "dist[] holds the shortest distances."],
  code: {
    python: `import heapq

def dijkstra(n, edges, start):
    adj = [[] for _ in range(n)]
    for u, v, w in edges:
        adj[u].append((v, w))
    dist = [float("inf")] * n
    dist[start] = 0
    heap = [(0, start)]
    while heap:
        d, node = heapq.heappop(heap)
        if d > dist[node]:
            continue
        for nei, w in adj[node]:
            if d + w < dist[nei]:
                dist[nei] = d + w
                heapq.heappush(heap, (dist[nei], nei))
    return dist

print(dijkstra(4, [[0, 1, 4], [0, 2, 1], [2, 1, 2], [1, 3, 1], [2, 3, 5]], 0))
`,
    java: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        int n = 4;
        int[][] edges = {{0, 1, 4}, {0, 2, 1}, {2, 1, 2}, {1, 3, 1}, {2, 3, 5}};
        List<List<int[]>> adj = new ArrayList<>();
        for (int i = 0; i < n; i++) adj.add(new ArrayList<>());
        for (int[] e : edges) adj.get(e[0]).add(new int[]{e[1], e[2]});
        int[] dist = new int[n];
        Arrays.fill(dist, Integer.MAX_VALUE);
        dist[0] = 0;
        PriorityQueue<int[]> heap = new PriorityQueue<>((a, b) -> a[0] - b[0]);
        heap.offer(new int[]{0, 0});
        while (!heap.isEmpty()) {
            int[] top = heap.poll();
            int d = top[0], node = top[1];
            if (d > dist[node]) continue;
            for (int[] e : adj.get(node)) {
                if (d + e[1] < dist[e[0]]) {
                    dist[e[0]] = d + e[1];
                    heap.offer(new int[]{dist[e[0]], e[0]});
                }
            }
        }
        System.out.println(Arrays.toString(dist));
    }
}
`,
    cpp: `#include <bits/stdc++.h>
using namespace std;

int main() {
    int n = 4;
    vector<vector<int>> edges = {{0, 1, 4}, {0, 2, 1}, {2, 1, 2}, {1, 3, 1}, {2, 3, 5}};
    vector<vector<pair<int, int>>> adj(n);
    for (auto& e : edges) adj[e[0]].push_back({e[1], e[2]});
    vector<int> dist(n, INT_MAX);
    dist[0] = 0;
    priority_queue<pair<int, int>, vector<pair<int, int>>, greater<pair<int, int>>> heap;
    heap.push({0, 0});
    while (!heap.empty()) {
        pair<int, int> top = heap.top();
        heap.pop();
        int d = top.first, node = top.second;
        if (d > dist[node]) continue;
        for (auto& e : adj[node]) {
            if (d + e.second < dist[e.first]) {
                dist[e.first] = d + e.second;
                heap.push({dist[e.first], e.first});
            }
        }
    }
    for (int x : dist) cout << x << " ";
    return 0;
}
`,
  },
  problems: [743, 1631, 1514, 787, 778],
};

export const mst: Method = {
  id: "minimum-spanning-tree",
  name: "Minimum Spanning Tree (Kruskal / Prim)",
  idea: "Connect all nodes with the cheapest total edge weight: take edges from cheapest to most expensive, skipping any that close a cycle.",
  when: ["\"Connect all points / cities with minimum cost\"", "Critical edges of an MST"],
  brute: "Try all spanning trees",
  optimal: "O(E log E)",
  steps: ["Sort edges by weight.", "For each edge, union its endpoints with Union-Find.", "If they were in different groups, add the edge's cost.", "Stop after V − 1 edges."],
  code: {
    python: `def min_cost_connect(n, edges):
    parent = list(range(n))

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    total = 0
    used = 0
    for w, u, v in sorted(edges):
        ru, rv = find(u), find(v)
        if ru != rv:
            parent[ru] = rv
            total += w
            used += 1
            if used == n - 1:
                break
    return total

print(min_cost_connect(4, [[1, 0, 1], [4, 0, 2], [3, 1, 2], [2, 1, 3], [5, 2, 3]]))
`,
    java: `import java.util.*;

public class Main {
    static int[] parent;

    static int find(int x) {
        while (parent[x] != x) {
            parent[x] = parent[parent[x]];
            x = parent[x];
        }
        return x;
    }

    public static void main(String[] args) {
        int n = 4;
        int[][] edges = {{1, 0, 1}, {4, 0, 2}, {3, 1, 2}, {2, 1, 3}, {5, 2, 3}};
        Arrays.sort(edges, (a, b) -> a[0] - b[0]);
        parent = new int[n];
        for (int i = 0; i < n; i++) parent[i] = i;
        int total = 0;
        for (int[] e : edges) {
            int ru = find(e[1]), rv = find(e[2]);
            if (ru != rv) {
                parent[ru] = rv;
                total += e[0];
            }
        }
        System.out.println(total);
    }
}
`,
    cpp: `#include <bits/stdc++.h>
using namespace std;

vector<int> parent;

int find(int x) {
    while (parent[x] != x) {
        parent[x] = parent[parent[x]];
        x = parent[x];
    }
    return x;
}

int main() {
    int n = 4;
    vector<vector<int>> edges = {{1, 0, 1}, {4, 0, 2}, {3, 1, 2}, {2, 1, 3}, {5, 2, 3}};
    sort(edges.begin(), edges.end());
    parent.resize(n);
    for (int i = 0; i < n; i++) parent[i] = i;
    int total = 0;
    for (auto& e : edges) {
        int ru = find(e[1]), rv = find(e[2]);
        if (ru != rv) {
            parent[ru] = rv;
            total += e[0];
        }
    }
    cout << total << endl;
    return 0;
}
`,
  },
  problems: [1584, 1489],
};

export const trie: Method = {
  id: "trie",
  name: "Trie (Prefix Tree)",
  idea: "Store words character by character in a tree of children maps; every path from the root spells a prefix.",
  when: ["Prefix search, autocomplete", "Many words checked against many queries", "Word search on a board with a dictionary", "Replace words with their shortest root"],
  brute: "Compare against every word: O(N · L) per query",
  optimal: "O(L) per insert / search",
  steps: ["Root is an empty node with children {}.", "Insert: walk / create a child for each character; mark the last node as end of word.", "Search: walk the characters; fail if a child is missing.", "Prefix check: same walk, no end-of-word check."],
  code: {
    python: `class TrieNode:
    def __init__(self):
        self.children = {}
        self.end = False

class Trie:
    def __init__(self):
        self.root = TrieNode()

    def insert(self, word):
        node = self.root
        for ch in word:
            if ch not in node.children:
                node.children[ch] = TrieNode()
            node = node.children[ch]
        node.end = True

    def search(self, word, prefix=False):
        node = self.root
        for ch in word:
            if ch not in node.children:
                return False
            node = node.children[ch]
        return prefix or node.end

t = Trie()
for w in ["app", "apple", "bat"]:
    t.insert(w)
print(t.search("app"), t.search("ap"), t.search("ap", prefix=True))
`,
    java: `import java.util.*;

class TrieNode {
    Map<Character, TrieNode> children = new HashMap<>();
    boolean end = false;
}

public class Main {
    static TrieNode root = new TrieNode();

    static void insert(String word) {
        TrieNode node = root;
        for (char ch : word.toCharArray()) {
            if (!node.children.containsKey(ch)) node.children.put(ch, new TrieNode());
            node = node.children.get(ch);
        }
        node.end = true;
    }

    static boolean search(String word, boolean prefix) {
        TrieNode node = root;
        for (char ch : word.toCharArray()) {
            if (!node.children.containsKey(ch)) return false;
            node = node.children.get(ch);
        }
        return prefix || node.end;
    }

    public static void main(String[] args) {
        insert("app");
        insert("apple");
        insert("bat");
        System.out.println(search("app", false) + " " + search("ap", false) + " " + search("ap", true));
    }
}
`,
    cpp: `#include <bits/stdc++.h>
using namespace std;

struct TrieNode {
    map<char, TrieNode*> children;
    bool end = false;
};

TrieNode* root = new TrieNode();

void insert(string word) {
    TrieNode* node = root;
    for (char ch : word) {
        if (!node->children.count(ch)) node->children[ch] = new TrieNode();
        node = node->children[ch];
    }
    node->end = true;
}

bool search(string word, bool prefix) {
    TrieNode* node = root;
    for (char ch : word) {
        if (!node->children.count(ch)) return false;
        node = node->children[ch];
    }
    return prefix || node->end;
}

int main() {
    insert("app");
    insert("apple");
    insert("bat");
    cout << search("app", false) << " " << search("ap", false) << " " << search("ap", true) << endl;
    return 0;
}
`,
  },
  problems: [14, 208, 211, 1268, 648, 720, 677, 212, 1032, 2416],
};

export const bitTrie: Method = {
  id: "bitwise-trie",
  name: "Bitwise Trie (maximum XOR)",
  idea: "Insert numbers bit by bit from the highest bit; to maximize XOR with x, greedily walk toward the opposite bit at each level.",
  when: ["Maximum XOR of two numbers", "Max XOR with a limit per query"],
  brute: "O(n²) — XOR every pair",
  optimal: "O(n · bits)",
  steps: ["Insert each number's bits (bit 31 → 0) into a binary trie.", "For a query x, at each bit try to go to the child with the opposite bit.", "Each successful opposite step adds 2^bit to the XOR."],
  code: {
    python: `def find_maximum_xor(nums, bits=5):
    root = {}
    for x in nums:
        node = root
        for b in range(bits - 1, -1, -1):
            bit = (x >> b) & 1
            node = node.setdefault(bit, {})
    best = 0
    for x in nums:
        node, cur = root, 0
        for b in range(bits - 1, -1, -1):
            bit = (x >> b) & 1
            if 1 - bit in node:
                cur |= 1 << b
                node = node[1 - bit]
            else:
                node = node[bit]
        best = max(best, cur)
    return best

print(find_maximum_xor([3, 10, 5, 25, 2, 8]))
`,
    java: `public class Main {
    static int[][] next = new int[200][2];
    static int size = 1;

    static void insert(int x, int bits) {
        int node = 0;
        for (int b = bits - 1; b >= 0; b--) {
            int bit = (x >> b) & 1;
            if (next[node][bit] == 0) next[node][bit] = size++;
            node = next[node][bit];
        }
    }

    public static void main(String[] args) {
        int[] nums = {3, 10, 5, 25, 2, 8};
        int bits = 5, best = 0;
        for (int x : nums) insert(x, bits);
        for (int x : nums) {
            int node = 0, cur = 0;
            for (int b = bits - 1; b >= 0; b--) {
                int bit = (x >> b) & 1;
                if (next[node][1 - bit] != 0) {
                    cur |= 1 << b;
                    node = next[node][1 - bit];
                } else {
                    node = next[node][bit];
                }
            }
            best = Math.max(best, cur);
        }
        System.out.println(best);
    }
}
`,
    cpp: `#include <bits/stdc++.h>
using namespace std;

int main() {
    vector<int> nums = {3, 10, 5, 25, 2, 8};
    int bits = 5, best = 0, size = 1;
    vector<vector<int>> next(200, vector<int>(2, 0));
    for (int x : nums) {
        int node = 0;
        for (int b = bits - 1; b >= 0; b--) {
            int bit = (x >> b) & 1;
            if (next[node][bit] == 0) next[node][bit] = size++;
            node = next[node][bit];
        }
    }
    for (int x : nums) {
        int node = 0, cur = 0;
        for (int b = bits - 1; b >= 0; b--) {
            int bit = (x >> b) & 1;
            if (next[node][1 - bit] != 0) {
                cur |= 1 << b;
                node = next[node][1 - bit];
            } else {
                node = next[node][bit];
            }
        }
        best = max(best, cur);
    }
    cout << best << endl;
    return 0;
}
`,
  },
  problems: [421, 1707],
};

export const greedyChoice: Method = {
  id: "greedy",
  name: "Greedy (best local choice)",
  idea: "Make the choice that looks best right now and never undo it — works when a local choice can never hurt the final answer.",
  when: ["Jump games (farthest reach)", "Gas station / running balance", "Change-making with fixed coins", "Valid parenthesis string with wildcards"],
  brute: "Try every sequence of choices (exponential) or DP",
  optimal: "Usually O(n) or O(n log n)",
  steps: ["Define the greedy rule (e.g. track the farthest index reachable).", "Scan once, updating that quantity.", "Return as soon as the rule shows success or failure."],
  code: {
    python: `def can_jump(nums):
    farthest = 0
    for i, jump in enumerate(nums):
        if i > farthest:
            return False            # stuck before reaching i
        farthest = max(farthest, i + jump)
    return True

print(can_jump([2, 3, 1, 1, 4]), can_jump([3, 2, 1, 0, 4]))
`,
    java: `public class Main {
    static boolean canJump(int[] nums) {
        int farthest = 0;
        for (int i = 0; i < nums.length; i++) {
            if (i > farthest) return false;
            farthest = Math.max(farthest, i + nums[i]);
        }
        return true;
    }

    public static void main(String[] args) {
        System.out.println(canJump(new int[]{2, 3, 1, 1, 4}) + " " + canJump(new int[]{3, 2, 1, 0, 4}));
    }
}
`,
    cpp: `#include <bits/stdc++.h>
using namespace std;

bool canJump(vector<int> nums) {
    int farthest = 0;
    for (int i = 0; i < nums.size(); i++) {
        if (i > farthest) return false;
        farthest = max(farthest, i + nums[i]);
    }
    return true;
}

int main() {
    cout << canJump({2, 3, 1, 1, 4}) << " " << canJump({3, 2, 1, 0, 4}) << endl;
    return 0;
}
`,
  },
  problems: [860, 605, 55, 45, 134, 678, 846, 135, 330],
};

export const intervalScheduling: Method = {
  id: "interval-scheduling",
  name: "Interval Scheduling (sort by end)",
  idea: "Sort intervals by their end time and greedily keep each one that starts after the last kept end — this keeps the most intervals.",
  when: ["Minimum intervals to remove to stop overlaps", "Minimum arrows / points to hit all intervals", "Partition a string into labeled pieces"],
  brute: "Try all subsets",
  optimal: "O(n log n)",
  steps: ["Sort by end.", "lastEnd = −∞, kept = 0.", "If start ≥ lastEnd: keep it, lastEnd = end.", "Removed = n − kept."],
  code: {
    python: `def erase_overlap_intervals(intervals):
    intervals.sort(key=lambda x: x[1])
    kept = 0
    last_end = -10**9
    for start, end in intervals:
        if start >= last_end:
            kept += 1
            last_end = end
    return len(intervals) - kept

print(erase_overlap_intervals([[1, 2], [2, 3], [3, 4], [1, 3]]))
`,
    java: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        int[][] intervals = {{1, 2}, {2, 3}, {3, 4}, {1, 3}};
        Arrays.sort(intervals, (a, b) -> a[1] - b[1]);
        int kept = 0, lastEnd = Integer.MIN_VALUE;
        for (int[] in : intervals) {
            if (in[0] >= lastEnd) {
                kept++;
                lastEnd = in[1];
            }
        }
        System.out.println(intervals.length - kept);
    }
}
`,
    cpp: `#include <bits/stdc++.h>
using namespace std;

int main() {
    vector<vector<int>> intervals = {{1, 2}, {2, 3}, {3, 4}, {1, 3}};
    sort(intervals.begin(), intervals.end(), [](vector<int>& a, vector<int>& b) { return a[1] < b[1]; });
    int kept = 0, lastEnd = INT_MIN;
    for (auto& in : intervals) {
        if (in[0] >= lastEnd) {
            kept++;
            lastEnd = in[1];
        }
    }
    cout << intervals.size() - kept << endl;
    return 0;
}
`,
  },
  problems: [435, 452, 763, 630],
};

export const dp1d: Method = {
  id: "dp-1d",
  name: "1D Dynamic Programming",
  idea: "dp[i] = best answer for the first i items, computed from a few earlier states (dp[i−1], dp[i−2], …).",
  when: ["\"How many ways\" to reach step i", "Choose / skip each item with a constraint (house robber)", "Decode ways, word break", "Minimum cost to reach the end"],
  brute: "Plain recursion: O(2ⁿ)",
  optimal: "O(n) time, often O(1) space",
  steps: ["Define dp[i] in words.", "Find the recurrence (e.g. dp[i] = max(dp[i−1], dp[i−2] + nums[i])).", "Set base cases.", "Fill left to right; the answer is dp[n] (or keep just two variables)."],
  code: {
    python: `def rob(nums):
    prev2, prev1 = 0, 0          # dp[i-2], dp[i-1]
    for x in nums:
        current = max(prev1, prev2 + x)   # skip x, or take x
        prev2, prev1 = prev1, current
    return prev1

print(rob([2, 7, 9, 3, 1]))
`,
    java: `public class Main {
    static int rob(int[] nums) {
        int[] dp = new int[nums.length + 1];
        dp[1] = nums[0];
        for (int i = 2; i <= nums.length; i++) {
            dp[i] = Math.max(dp[i - 1], dp[i - 2] + nums[i - 1]);
        }
        return dp[nums.length];
    }

    public static void main(String[] args) {
        System.out.println(rob(new int[]{2, 7, 9, 3, 1}));
    }
}
`,
    cpp: `#include <bits/stdc++.h>
using namespace std;

int rob(vector<int>& nums) {
    vector<int> dp(nums.size() + 1, 0);
    dp[1] = nums[0];
    for (int i = 2; i <= nums.size(); i++) {
        dp[i] = max(dp[i - 1], dp[i - 2] + nums[i - 1]);
    }
    return dp[nums.size()];
}

int main() {
    vector<int> nums = {2, 7, 9, 3, 1};
    cout << rob(nums) << endl;
    return 0;
}
`,
    c: `#include <stdio.h>

int main() {
    int nums[] = {2, 7, 9, 3, 1};
    int n = 5;
    int dp[6] = {0};
    dp[1] = nums[0];
    for (int i = 2; i <= n; i++) {
        int take = dp[i - 2] + nums[i - 1];
        dp[i] = dp[i - 1] > take ? dp[i - 1] : take;
    }
    printf("%d", dp[n]);
    return 0;
}
`,
  },
  problems: [70, 746, 509, 198, 213, 91, 139, 279, 32],
};

export const dpGrid: Method = {
  id: "dp-grid",
  name: "2D Grid DP",
  idea: "dp[i][j] = answer for reaching cell (i, j), built from the cells you can come from (top and left).",
  when: ["Count paths in a grid", "Minimum path sum, triangle", "Largest square of 1s", "Moves only right / down"],
  brute: "Recursion over all paths: O(2^(m+n))",
  optimal: "O(m·n) time, O(n) space possible",
  steps: ["dp[0][*] and dp[*][0] are the base cases.", "dp[i][j] = combine(dp[i−1][j], dp[i][j−1]) + cell cost.", "Answer at dp[m−1][n−1]."],
  code: {
    python: `def unique_paths(m, n):
    dp = [[1] * n for _ in range(m)]
    for i in range(1, m):
        for j in range(1, n):
            dp[i][j] = dp[i - 1][j] + dp[i][j - 1]   # from top + from left
    return dp[m - 1][n - 1]

print(unique_paths(3, 4))
`,
    java: `public class Main {
    public static void main(String[] args) {
        int m = 3, n = 4;
        int[][] dp = new int[m][n];
        for (int i = 0; i < m; i++) dp[i][0] = 1;
        for (int j = 0; j < n; j++) dp[0][j] = 1;
        for (int i = 1; i < m; i++) {
            for (int j = 1; j < n; j++) {
                dp[i][j] = dp[i - 1][j] + dp[i][j - 1];
            }
        }
        System.out.println(dp[m - 1][n - 1]);
    }
}
`,
    cpp: `#include <bits/stdc++.h>
using namespace std;

int main() {
    int m = 3, n = 4;
    vector<vector<int>> dp(m, vector<int>(n, 1));
    for (int i = 1; i < m; i++) {
        for (int j = 1; j < n; j++) {
            dp[i][j] = dp[i - 1][j] + dp[i][j - 1];
        }
    }
    cout << dp[m - 1][n - 1] << endl;
    return 0;
}
`,
  },
  problems: [118, 62, 63, 64, 120, 221, 174],
};

export const knapsack: Method = {
  id: "dp-knapsack",
  name: "Knapsack DP (0/1 & unbounded)",
  idea: "dp[s] = can we make (or the best way to make) sum s using the items so far; loop sums backward for 0/1, forward for unlimited use.",
  when: ["Pick items under a capacity / target sum", "Partition into equal subsets, target sum with + and −", "Coin change (min coins / number of ways)"],
  brute: "All subsets: O(2ⁿ)",
  optimal: "O(n · target)",
  steps: ["dp[0] = base (true / 0 coins / 1 way).", "For each item: loop s from target down to item (0/1) or up from item (unbounded).", "dp[s] = combine(dp[s], dp[s − item])."],
  code: {
    python: `def coin_change(coins, amount):
    INF = amount + 1
    dp = [0] + [INF] * amount          # dp[s] = fewest coins for sum s
    for coin in coins:
        for s in range(coin, amount + 1):   # unbounded: forward loop
            dp[s] = min(dp[s], dp[s - coin] + 1)
    return -1 if dp[amount] == INF else dp[amount]

print(coin_change([1, 2, 5], 11))
`,
    java: `import java.util.*;

public class Main {
    static int coinChange(int[] coins, int amount) {
        int[] dp = new int[amount + 1];
        Arrays.fill(dp, amount + 1);
        dp[0] = 0;
        for (int coin : coins) {
            for (int s = coin; s <= amount; s++) {
                dp[s] = Math.min(dp[s], dp[s - coin] + 1);
            }
        }
        return dp[amount] > amount ? -1 : dp[amount];
    }

    public static void main(String[] args) {
        System.out.println(coinChange(new int[]{1, 2, 5}, 11));
    }
}
`,
    cpp: `#include <bits/stdc++.h>
using namespace std;

int coinChange(vector<int>& coins, int amount) {
    vector<int> dp(amount + 1, amount + 1);
    dp[0] = 0;
    for (int coin : coins) {
        for (int s = coin; s <= amount; s++) {
            dp[s] = min(dp[s], dp[s - coin] + 1);
        }
    }
    return dp[amount] > amount ? -1 : dp[amount];
}

int main() {
    vector<int> coins = {1, 2, 5};
    cout << coinChange(coins, 11) << endl;
    return 0;
}
`,
  },
  problems: [416, 494, 322, 518, 474, 377, 879],
};

export const lis: Method = {
  id: "dp-lis",
  name: "Longest Increasing Subsequence",
  idea: "dp[i] = length of the longest increasing subsequence ending at i; or keep the smallest tail for each length and binary search (O(n log n)).",
  when: ["Longest increasing / chain / divisible subsequence", "Russian doll envelopes (sort, then LIS)", "Count of longest subsequences"],
  brute: "All subsequences: O(2ⁿ)",
  optimal: "O(n²) DP, O(n log n) with patience sorting",
  steps: ["dp[i] = 1 for all i.", "For each i, for each j < i with nums[j] < nums[i]: dp[i] = max(dp[i], dp[j] + 1).", "Answer = max(dp)."],
  code: {
    python: `def length_of_lis(nums):
    dp = [1] * len(nums)
    for i in range(len(nums)):
        for j in range(i):
            if nums[j] < nums[i]:
                dp[i] = max(dp[i], dp[j] + 1)
    return max(dp)

print(length_of_lis([10, 9, 2, 5, 3, 7, 101, 18]))
`,
    java: `import java.util.*;

public class Main {
    static int lengthOfLIS(int[] nums) {
        int[] dp = new int[nums.length];
        Arrays.fill(dp, 1);
        int best = 1;
        for (int i = 0; i < nums.length; i++) {
            for (int j = 0; j < i; j++) {
                if (nums[j] < nums[i]) dp[i] = Math.max(dp[i], dp[j] + 1);
            }
            best = Math.max(best, dp[i]);
        }
        return best;
    }

    public static void main(String[] args) {
        System.out.println(lengthOfLIS(new int[]{10, 9, 2, 5, 3, 7, 101, 18}));
    }
}
`,
    cpp: `#include <bits/stdc++.h>
using namespace std;

int lengthOfLIS(vector<int>& nums) {
    vector<int> dp(nums.size(), 1);
    int best = 1;
    for (int i = 0; i < nums.size(); i++) {
        for (int j = 0; j < i; j++) {
            if (nums[j] < nums[i]) dp[i] = max(dp[i], dp[j] + 1);
        }
        best = max(best, dp[i]);
    }
    return best;
}

int main() {
    vector<int> nums = {10, 9, 2, 5, 3, 7, 101, 18};
    cout << lengthOfLIS(nums) << endl;
    return 0;
}
`,
  },
  problems: [300, 673, 368, 1048, 354, 1964],
};

export const dpStrings: Method = {
  id: "dp-strings",
  name: "DP on Two Strings",
  idea: "dp[i][j] = answer for the first i chars of a and the first j chars of b; match → diagonal, mismatch → best of neighbors.",
  when: ["Longest common subsequence", "Edit distance, delete / insert operations", "Wildcard / regex matching", "Palindromic subsequence (string vs its reverse)"],
  brute: "All subsequences: O(2ⁿ · 2ᵐ)",
  optimal: "O(n · m)",
  steps: ["dp has (n + 1) × (m + 1) cells, row/column 0 = empty string.", "If a[i−1] == b[j−1]: dp[i][j] = dp[i−1][j−1] + 1 (LCS).", "Else dp[i][j] = max(dp[i−1][j], dp[i][j−1]).", "Answer at dp[n][m]."],
  code: {
    python: `def lcs(a, b):
    n, m = len(a), len(b)
    dp = [[0] * (m + 1) for _ in range(n + 1)]
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            if a[i - 1] == b[j - 1]:
                dp[i][j] = dp[i - 1][j - 1] + 1
            else:
                dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])
    return dp[n][m]

print(lcs("abcde", "ace"))
`,
    java: `public class Main {
    static int lcs(String a, String b) {
        int n = a.length(), m = b.length();
        int[][] dp = new int[n + 1][m + 1];
        for (int i = 1; i <= n; i++) {
            for (int j = 1; j <= m; j++) {
                if (a.charAt(i - 1) == b.charAt(j - 1)) dp[i][j] = dp[i - 1][j - 1] + 1;
                else dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
            }
        }
        return dp[n][m];
    }

    public static void main(String[] args) {
        System.out.println(lcs("abcde", "ace"));
    }
}
`,
    cpp: `#include <bits/stdc++.h>
using namespace std;

int lcs(string a, string b) {
    int n = a.size(), m = b.size();
    vector<vector<int>> dp(n + 1, vector<int>(m + 1, 0));
    for (int i = 1; i <= n; i++) {
        for (int j = 1; j <= m; j++) {
            if (a[i - 1] == b[j - 1]) dp[i][j] = dp[i - 1][j - 1] + 1;
            else dp[i][j] = max(dp[i - 1][j], dp[i][j - 1]);
        }
    }
    return dp[n][m];
}

int main() {
    cout << lcs("abcde", "ace") << endl;
    return 0;
}
`,
  },
  problems: [392, 1143, 72, 583, 516, 647, 97, 5, 10, 44, 115, 1312],
};

export const dpStock: Method = {
  id: "dp-stocks",
  name: "State-Machine DP (stock problems)",
  idea: "Track a few states per day (holding / not holding / cooling down) and update each from yesterday's states.",
  when: ["Buy & sell stock with limits, cooldowns or fees", "Any problem where you are in one of a few modes each day"],
  brute: "Try every buy/sell day pair (exponential with k transactions)",
  optimal: "O(n) (or O(n · k))",
  steps: ["hold = best profit while holding a stock, free = best while not holding.", "Each day: new_hold = max(hold, free − price); new_free = max(free, hold + price − fee).", "Answer = free at the end."],
  code: {
    python: `def max_profit(prices, fee):
    hold, free = -prices[0], 0
    for p in prices[1:]:
        hold, free = max(hold, free - p), max(free, hold + p - fee)
    return free

print(max_profit([1, 3, 2, 8, 4, 9], 2))
`,
    java: `public class Main {
    static int maxProfit(int[] prices, int fee) {
        int hold = -prices[0], free = 0;
        for (int i = 1; i < prices.length; i++) {
            int newHold = Math.max(hold, free - prices[i]);
            int newFree = Math.max(free, hold + prices[i] - fee);
            hold = newHold;
            free = newFree;
        }
        return free;
    }

    public static void main(String[] args) {
        System.out.println(maxProfit(new int[]{1, 3, 2, 8, 4, 9}, 2));
    }
}
`,
    cpp: `#include <bits/stdc++.h>
using namespace std;

int maxProfit(vector<int>& prices, int fee) {
    int hold = -prices[0], free = 0;
    for (int i = 1; i < prices.size(); i++) {
        int newHold = max(hold, free - prices[i]);
        int newFree = max(free, hold + prices[i] - fee);
        hold = newHold;
        free = newFree;
    }
    return free;
}

int main() {
    vector<int> prices = {1, 3, 2, 8, 4, 9};
    cout << maxProfit(prices, 2) << endl;
    return 0;
}
`,
  },
  problems: [121, 122, 309, 714, 123, 188],
};

export const xorTricks: Method = {
  id: "xor-tricks",
  name: "XOR Tricks",
  idea: "x ^ x = 0 and x ^ 0 = x, so XOR-ing everything cancels pairs and leaves the odd one out.",
  when: ["Every element appears twice except one", "Find the missing number in 0..n", "The extra character between two strings"],
  brute: "Hash map counting: O(n) space",
  optimal: "O(n) time, O(1) space",
  steps: ["result = 0.", "XOR every number into result.", "Pairs cancel; what remains is the answer."],
  code: {
    python: `def single_number(nums):
    result = 0
    for x in nums:
        result ^= x
    return result

print(single_number([4, 1, 2, 1, 2]))
`,
    java: `public class Main {
    public static void main(String[] args) {
        int[] nums = {4, 1, 2, 1, 2};
        int result = 0;
        for (int x : nums) result ^= x;
        System.out.println(result);
    }
}
`,
    cpp: `#include <bits/stdc++.h>
using namespace std;

int main() {
    vector<int> nums = {4, 1, 2, 1, 2};
    int result = 0;
    for (int x : nums) result ^= x;
    cout << result << endl;
    return 0;
}
`,
    c: `#include <stdio.h>

int main() {
    int nums[] = {4, 1, 2, 1, 2};
    int result = 0;
    for (int i = 0; i < 5; i++) result ^= nums[i];
    printf("%d", result);
    return 0;
}
`,
  },
  problems: [136, 268, 389, 1863, 260, 137],
};

export const bitCount: Method = {
  id: "bit-counting",
  name: "Counting & Manipulating Bits",
  idea: "n & (n − 1) removes the lowest set bit; shifts and masks read or write single bits.",
  when: ["Count set bits, Hamming distance", "Power of two", "Add without +, reverse bits", "Counting bits for 0..n (dp[i] = dp[i >> 1] + (i & 1))"],
  brute: "Convert to a binary string",
  optimal: "O(number of bits)",
  steps: ["Read bit k: (n >> k) & 1.", "Set bit k: n | (1 << k); clear: n & ~(1 << k).", "Count ones: repeat n &= n − 1 until n is 0."],
  code: {
    python: `def count_bits(n):
    count = 0
    while n:
        n &= n - 1        # drop the lowest set bit
        count += 1
    return count

def is_power_of_two(n):
    return n > 0 and n & (n - 1) == 0

print(count_bits(11), is_power_of_two(16), is_power_of_two(18))
`,
    java: `public class Main {
    static int countBits(int n) {
        int count = 0;
        while (n != 0) {
            n &= n - 1;
            count++;
        }
        return count;
    }

    public static void main(String[] args) {
        int n = 16;
        System.out.println(countBits(11) + " " + (n > 0 && (n & (n - 1)) == 0));
    }
}
`,
    cpp: `#include <bits/stdc++.h>
using namespace std;

int countBits(int n) {
    int count = 0;
    while (n != 0) {
        n &= n - 1;
        count++;
    }
    return count;
}

int main() {
    int n = 16;
    cout << countBits(11) << " " << (n > 0 && (n & (n - 1)) == 0) << endl;
    return 0;
}
`,
  },
  problems: [191, 338, 461, 231, 190, 477, 201, 371],
};

export const bitmask: Method = {
  id: "bitmask",
  name: "Bitmask Enumeration",
  idea: "A number from 0 to 2ⁿ − 1 encodes a subset: bit i is 1 when item i is chosen.",
  when: ["n ≤ 20 and you need all subsets", "Track a set of used letters / visited nodes in one integer", "DP over subsets"],
  brute: "Recursive subset generation",
  optimal: "O(2ⁿ · n)",
  steps: ["Loop mask from 0 to (1 << n) − 1.", "Item i is in the subset when (mask >> i) & 1 is 1.", "Build / evaluate the subset for that mask."],
  code: {
    python: `nums = [1, 2, 3]
n = len(nums)
for mask in range(1 << n):
    subset = [nums[i] for i in range(n) if (mask >> i) & 1]
    print(bin(mask)[2:].zfill(n), subset)
`,
    java: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        int[] nums = {1, 2, 3};
        int n = nums.length;
        for (int mask = 0; mask < (1 << n); mask++) {
            List<Integer> subset = new ArrayList<>();
            for (int i = 0; i < n; i++) {
                if (((mask >> i) & 1) == 1) subset.add(nums[i]);
            }
            System.out.println(mask + " " + subset);
        }
    }
}
`,
    cpp: `#include <bits/stdc++.h>
using namespace std;

int main() {
    vector<int> nums = {1, 2, 3};
    int n = nums.size();
    for (int mask = 0; mask < (1 << n); mask++) {
        cout << mask << ": ";
        for (int i = 0; i < n; i++) {
            if ((mask >> i) & 1) cout << nums[i] << " ";
        }
        cout << endl;
    }
    return 0;
}
`,
  },
  problems: [78, 1239, 847],
};
