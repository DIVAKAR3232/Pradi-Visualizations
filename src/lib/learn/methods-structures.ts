import type { Method } from "./types";

// Stacks, queues, linked lists, recursion & backtracking, trees, BSTs and heaps.

const TREE_PY = `class TreeNode:
    def __init__(self, val, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

#        3
#       / \\
#      9   20
#         /  \\
#        15   7
root = TreeNode(3, TreeNode(9), TreeNode(20, TreeNode(15), TreeNode(7)))
`;

const TREE_JAVA_CLASS = `class TreeNode {
    int val;
    TreeNode left, right;
    TreeNode(int val) { this.val = val; }
}
`;

const TREE_JAVA_BUILD = `        TreeNode root = new TreeNode(3);
        root.left = new TreeNode(9);
        root.right = new TreeNode(20);
        root.right.left = new TreeNode(15);
        root.right.right = new TreeNode(7);
`;

const TREE_CPP_STRUCT = `struct TreeNode {
    int val;
    TreeNode* left;
    TreeNode* right;
    TreeNode(int v) : val(v), left(nullptr), right(nullptr) {}
};
`;

const TREE_CPP_BUILD = `    TreeNode* root = new TreeNode(3);
    root->left = new TreeNode(9);
    root->right = new TreeNode(20);
    root->right->left = new TreeNode(15);
    root->right->right = new TreeNode(7);
`;

export const matchingStack: Method = {
  id: "stack-matching",
  name: "Stack for Matching & Undo",
  idea: "Push openings (or kept characters); when a closing / cancelling item arrives, it must match the top of the stack.",
  when: ["Balanced brackets", "Remove adjacent duplicates, backspace strings", "Simplify a path, nested decoding", "Collisions (asteroids)"],
  brute: "Repeatedly scan and delete pairs: O(n²)",
  optimal: "O(n) time, O(n) space",
  steps: ["For each character: if it opens something, push it.", "If it closes, the top must be its partner — pop it, or fail.", "At the end the stack must be empty."],
  code: {
    python: `def is_valid(s):
    pairs = {")": "(", "]": "[", "}": "{"}
    stack = []
    for ch in s:
        if ch in "([{":
            stack.append(ch)
        elif not stack or stack.pop() != pairs[ch]:
            return False
    return not stack

print(is_valid("{[()]}"), is_valid("([)]"))
`,
    java: `import java.util.*;

public class Main {
    static boolean isValid(String s) {
        Stack<Character> stack = new Stack<>();
        for (char ch : s.toCharArray()) {
            if (ch == '(' || ch == '[' || ch == '{') {
                stack.push(ch);
            } else {
                if (stack.isEmpty()) return false;
                char top = stack.pop();
                if ((ch == ')' && top != '(') || (ch == ']' && top != '[') || (ch == '}' && top != '{')) return false;
            }
        }
        return stack.isEmpty();
    }

    public static void main(String[] args) {
        System.out.println(isValid("{[()]}") + " " + isValid("([)]"));
    }
}
`,
    cpp: `#include <bits/stdc++.h>
using namespace std;

bool isValid(string s) {
    stack<char> st;
    for (char ch : s) {
        if (ch == '(' || ch == '[' || ch == '{') {
            st.push(ch);
        } else {
            if (st.empty()) return false;
            char top = st.top();
            st.pop();
            if ((ch == ')' && top != '(') || (ch == ']' && top != '[') || (ch == '}' && top != '{')) return false;
        }
    }
    return st.empty();
}

int main() {
    cout << isValid("{[()]}") << " " << isValid("([)]") << endl;
    return 0;
}
`,
  },
  problems: [20, 1047, 844, 71, 735, 394, 32],
};

export const exprStack: Method = {
  id: "expression-evaluation",
  name: "Expression Evaluation with Stacks",
  idea: "Numbers go on a stack; an operator pops its operands, computes, and pushes the result (postfix), or signs/parentheses are tracked for infix.",
  when: ["Reverse Polish Notation", "Calculators with + − * / and parentheses"],
  brute: "Recursive string rewriting",
  optimal: "O(n)",
  steps: ["Read tokens left to right.", "Number → push.", "Operator → pop b, pop a, push a op b.", "The last value on the stack is the answer."],
  code: {
    python: `def eval_rpn(tokens):
    stack = []
    for t in tokens:
        if t in "+-*/":
            b = stack.pop()
            a = stack.pop()
            if t == "+":
                stack.append(a + b)
            elif t == "-":
                stack.append(a - b)
            elif t == "*":
                stack.append(a * b)
            else:
                stack.append(int(a / b))
        else:
            stack.append(int(t))
    return stack[0]

print(eval_rpn(["2", "1", "+", "3", "*"]))
`,
    java: `import java.util.*;

public class Main {
    static int evalRPN(String[] tokens) {
        Stack<Integer> stack = new Stack<>();
        for (String t : tokens) {
            if (t.equals("+") || t.equals("-") || t.equals("*") || t.equals("/")) {
                int b = stack.pop(), a = stack.pop();
                if (t.equals("+")) stack.push(a + b);
                else if (t.equals("-")) stack.push(a - b);
                else if (t.equals("*")) stack.push(a * b);
                else stack.push(a / b);
            } else {
                stack.push(Integer.parseInt(t));
            }
        }
        return stack.pop();
    }

    public static void main(String[] args) {
        System.out.println(evalRPN(new String[]{"2", "1", "+", "3", "*"}));
    }
}
`,
    cpp: `#include <bits/stdc++.h>
using namespace std;

int evalRPN(vector<string>& tokens) {
    stack<int> st;
    for (string t : tokens) {
        if (t == "+" || t == "-" || t == "*" || t == "/") {
            int b = st.top(); st.pop();
            int a = st.top(); st.pop();
            if (t == "+") st.push(a + b);
            else if (t == "-") st.push(a - b);
            else if (t == "*") st.push(a * b);
            else st.push(a / b);
        } else {
            st.push(stoi(t));
        }
    }
    return st.top();
}

int main() {
    vector<string> tokens = {"2", "1", "+", "3", "*"};
    cout << evalRPN(tokens) << endl;
    return 0;
}
`,
  },
  problems: [150, 227, 224],
};

export const stackDesign: Method = {
  id: "stack-queue-design",
  name: "Designing Stacks & Queues",
  idea: "Build one structure from another (queue from two stacks) or keep extra info per element (current minimum) for O(1) operations.",
  when: ["Min stack / max stack", "Queue using stacks, stack using queues", "Circular queue / deque with a fixed array"],
  brute: "O(n) scans per operation",
  optimal: "O(1) (amortized) per operation",
  steps: ["Decide what each operation must return in O(1).", "Store that information alongside each pushed value (e.g. min so far).", "For two-stack queues, move items to the out-stack only when it is empty."],
  code: {
    python: `class MinStack:
    def __init__(self):
        self.stack = []   # pairs (value, minimum so far)

    def push(self, x):
        current_min = min(x, self.stack[-1][1]) if self.stack else x
        self.stack.append((x, current_min))

    def pop(self):
        self.stack.pop()

    def top(self):
        return self.stack[-1][0]

    def get_min(self):
        return self.stack[-1][1]

s = MinStack()
s.push(5)
s.push(2)
s.push(7)
print(s.get_min())
s.pop()
s.pop()
print(s.get_min())
`,
    java: `import java.util.*;

public class Main {
    static Stack<Integer> values = new Stack<>();
    static Stack<Integer> mins = new Stack<>();

    static void push(int x) {
        values.push(x);
        mins.push(mins.isEmpty() ? x : Math.min(x, mins.peek()));
    }

    static void pop() {
        values.pop();
        mins.pop();
    }

    public static void main(String[] args) {
        push(5);
        push(2);
        push(7);
        System.out.println(mins.peek());
        pop();
        pop();
        System.out.println(mins.peek());
    }
}
`,
    cpp: `#include <bits/stdc++.h>
using namespace std;

stack<int> values, mins;

void push(int x) {
    values.push(x);
    mins.push(mins.empty() ? x : min(x, mins.top()));
}

void pop() {
    values.pop();
    mins.pop();
}

int main() {
    push(5);
    push(2);
    push(7);
    cout << mins.top() << endl;
    pop();
    pop();
    cout << mins.top() << endl;
    return 0;
}
`,
  },
  problems: [225, 232, 933, 155, 622, 641],
};

export const bfs: Method = {
  id: "bfs",
  name: "Breadth-First Search (queue)",
  idea: "Explore level by level with a queue; the first time you reach a node is along a shortest path (unweighted).",
  when: ["Shortest path / fewest steps in an unweighted graph or grid", "Spreading processes (rotting oranges, fire)", "Level-order traversal", "Multi-source distances"],
  brute: "Try all paths with DFS (exponential)",
  optimal: "O(V + E)",
  steps: ["Push the start node(s) and mark them visited.", "Pop a node, process it.", "Push every unvisited neighbor and mark it visited.", "Repeat until the queue is empty; count levels for distance."],
  code: {
    python: `from collections import deque

adj = [[1, 2], [0, 3, 4], [0, 4], [1, 5], [1, 2, 5], [3, 4]]
dist = [-1] * len(adj)
dist[0] = 0
queue = deque([0])
while queue:
    node = queue.popleft()
    for nei in adj[node]:
        if dist[nei] == -1:
            dist[nei] = dist[node] + 1
            queue.append(nei)

print(dist)
`,
    java: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        int[][] adj = {{1, 2}, {0, 3, 4}, {0, 4}, {1, 5}, {1, 2, 5}, {3, 4}};
        int[] dist = new int[adj.length];
        Arrays.fill(dist, -1);
        dist[0] = 0;
        Queue<Integer> queue = new ArrayDeque<>();
        queue.add(0);
        while (!queue.isEmpty()) {
            int node = queue.poll();
            for (int nei : adj[node]) {
                if (dist[nei] == -1) {
                    dist[nei] = dist[node] + 1;
                    queue.add(nei);
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
    vector<vector<int>> adj = {{1, 2}, {0, 3, 4}, {0, 4}, {1, 5}, {1, 2, 5}, {3, 4}};
    vector<int> dist(adj.size(), -1);
    dist[0] = 0;
    queue<int> q;
    q.push(0);
    while (!q.empty()) {
        int node = q.front();
        q.pop();
        for (int nei : adj[node]) {
            if (dist[nei] == -1) {
                dist[nei] = dist[node] + 1;
                q.push(nei);
            }
        }
    }
    for (int d : dist) cout << d << " ";
    return 0;
}
`,
  },
  problems: [1971, 994, 542, 841, 127, 1293],
};

export const llReversal: Method = {
  id: "linked-list-reversal",
  name: "In-place Linked List Reversal",
  idea: "Walk the list with prev / curr / next pointers and flip each next pointer backward.",
  when: ["Reverse a whole list or a sub-range", "Reverse in groups of k", "Palindrome list, reorder list (reverse the second half)"],
  brute: "Copy values into an array: O(n) space",
  optimal: "O(n) time, O(1) space",
  steps: ["prev = null, curr = head.", "Save next = curr.next.", "Point curr.next to prev.", "Move prev = curr, curr = next. Repeat until curr is null; prev is the new head."],
  code: {
    python: `class Node:
    def __init__(self, val):
        self.val = val
        self.next = None

def reverse(head):
    prev = None
    curr = head
    while curr:
        nxt = curr.next
        curr.next = prev
        prev = curr
        curr = nxt
    return prev

head = Node(1)
head.next = Node(2)
head.next.next = Node(3)
head = reverse(head)
print(head.val, head.next.val, head.next.next.val)
`,
    java: `class Node {
    int val;
    Node next;
    Node(int val) { this.val = val; }
}

public class Main {
    static Node reverse(Node head) {
        Node prev = null, curr = head;
        while (curr != null) {
            Node next = curr.next;
            curr.next = prev;
            prev = curr;
            curr = next;
        }
        return prev;
    }

    public static void main(String[] args) {
        Node head = new Node(1);
        head.next = new Node(2);
        head.next.next = new Node(3);
        head = reverse(head);
        for (Node p = head; p != null; p = p.next) System.out.print(p.val + " ");
    }
}
`,
    cpp: `#include <bits/stdc++.h>
using namespace std;

struct Node {
    int val;
    Node* next;
    Node(int v) : val(v), next(nullptr) {}
};

Node* reverse(Node* head) {
    Node* prev = nullptr;
    Node* curr = head;
    while (curr != nullptr) {
        Node* nxt = curr->next;
        curr->next = prev;
        prev = curr;
        curr = nxt;
    }
    return prev;
}

int main() {
    Node* head = new Node(1);
    head->next = new Node(2);
    head->next->next = new Node(3);
    head = reverse(head);
    for (Node* p = head; p != nullptr; p = p->next) cout << p->val << " ";
    return 0;
}
`,
    c: `#include <stdio.h>
#include <stdlib.h>

struct Node {
    int val;
    struct Node* next;
};

struct Node* newNode(int val) {
    struct Node* n = (struct Node*)malloc(sizeof(struct Node));
    n->val = val;
    n->next = NULL;
    return n;
}

int main() {
    struct Node* head = newNode(1);
    head->next = newNode(2);
    head->next->next = newNode(3);
    struct Node* prev = NULL;
    struct Node* curr = head;
    while (curr != NULL) {
        struct Node* next = curr->next;
        curr->next = prev;
        prev = curr;
        curr = next;
    }
    for (struct Node* p = prev; p != NULL; p = p->next) printf("%d ", p->val);
    return 0;
}
`,
  },
  problems: [206, 234, 92, 24, 61, 143, 25],
};

export const dummyMerge: Method = {
  id: "dummy-node",
  name: "Dummy Node & Merging Lists",
  idea: "Start the result with a dummy node so you never special-case the head; append the smaller node each step.",
  when: ["Merge sorted lists", "Remove nodes (including the head)", "Add numbers stored in lists", "Partition / odd-even rearranging"],
  brute: "Collect values, sort, rebuild: O(n log n)",
  optimal: "O(n + m) time, O(1) extra space",
  steps: ["dummy = new node, tail = dummy.", "While both lists have nodes: attach the smaller one to tail, advance it.", "Attach whatever is left.", "Return dummy.next."],
  code: {
    python: `class Node:
    def __init__(self, val, nxt=None):
        self.val = val
        self.next = nxt

def merge(a, b):
    dummy = tail = Node(0)
    while a and b:
        if a.val <= b.val:
            tail.next = a
            a = a.next
        else:
            tail.next = b
            b = b.next
        tail = tail.next
    tail.next = a if a else b
    return dummy.next

l1 = Node(1, Node(3, Node(5)))
l2 = Node(2, Node(4))
p = merge(l1, l2)
while p:
    print(p.val, end=" ")
    p = p.next
`,
    java: `class Node {
    int val;
    Node next;
    Node(int val) { this.val = val; }
}

public class Main {
    static Node merge(Node a, Node b) {
        Node dummy = new Node(0), tail = dummy;
        while (a != null && b != null) {
            if (a.val <= b.val) { tail.next = a; a = a.next; }
            else { tail.next = b; b = b.next; }
            tail = tail.next;
        }
        tail.next = (a != null) ? a : b;
        return dummy.next;
    }

    public static void main(String[] args) {
        Node a = new Node(1); a.next = new Node(3); a.next.next = new Node(5);
        Node b = new Node(2); b.next = new Node(4);
        for (Node p = merge(a, b); p != null; p = p.next) System.out.print(p.val + " ");
    }
}
`,
    cpp: `#include <bits/stdc++.h>
using namespace std;

struct Node {
    int val;
    Node* next;
    Node(int v) : val(v), next(nullptr) {}
};

Node* merge(Node* a, Node* b) {
    Node* dummy = new Node(0);
    Node* tail = dummy;
    while (a != nullptr && b != nullptr) {
        if (a->val <= b->val) { tail->next = a; a = a->next; }
        else { tail->next = b; b = b->next; }
        tail = tail->next;
    }
    tail->next = (a != nullptr) ? a : b;
    return dummy->next;
}

int main() {
    Node* a = new Node(1); a->next = new Node(3); a->next->next = new Node(5);
    Node* b = new Node(2); b->next = new Node(4);
    for (Node* p = merge(a, b); p != nullptr; p = p->next) cout << p->val << " ";
    return 0;
}
`,
  },
  problems: [21, 83, 203, 160, 2, 82, 445, 328, 148, 23],
};

export const recursionBasics: Method = {
  id: "recursion",
  name: "Recursion Basics",
  idea: "Solve a problem by solving a smaller copy of itself; every recursion needs a base case that stops it.",
  when: ["The problem is defined in terms of smaller inputs (n − 1, n / 2)", "Trees, divide and conquer", "Fast power, Fibonacci-like sequences"],
  brute: "—",
  optimal: "Depends; add memoization to remove repeated work",
  steps: ["Write the base case first (smallest input).", "Assume the function already works for smaller inputs.", "Combine the smaller answers into the answer for this input."],
  code: {
    python: `def power(x, n):
    if n == 0:
        return 1
    half = power(x, n // 2)        # solve the smaller problem once
    if n % 2 == 0:
        return half * half
    return half * half * x

print(power(2, 10))
`,
    java: `public class Main {
    static long power(long x, int n) {
        if (n == 0) return 1;
        long half = power(x, n / 2);
        return (n % 2 == 0) ? half * half : half * half * x;
    }

    public static void main(String[] args) {
        System.out.println(power(2, 10));
    }
}
`,
    cpp: `#include <bits/stdc++.h>
using namespace std;

long long power(long long x, int n) {
    if (n == 0) return 1;
    long long half = power(x, n / 2);
    return (n % 2 == 0) ? half * half : half * half * x;
}

int main() {
    cout << power(2, 10) << endl;
    return 0;
}
`,
    c: `#include <stdio.h>

long power(long x, int n) {
    if (n == 0) return 1;
    long half = power(x, n / 2);
    return (n % 2 == 0) ? half * half : half * half * x;
}

int main() {
    printf("%ld", power(2, 10));
    return 0;
}
`,
  },
  problems: [509, 70, 344, 50],
};

export const subsets: Method = {
  id: "backtracking-subsets",
  name: "Backtracking: Subsets",
  idea: "For each element choose \"take it\" or \"skip it\"; record the current path at every node of the recursion tree.",
  when: ["All subsets / power set", "Partition a string into valid pieces", "Restore IP addresses, choose-or-skip problems"],
  brute: "—",
  optimal: "O(2ⁿ · n) — the output itself is exponential",
  steps: ["Recursive function with a start index and the current path.", "Record the path.", "For i from start: add nums[i], recurse with i + 1, then remove it (undo).", "Skip duplicates after sorting for the \"II\" versions."],
  code: {
    python: `def subsets(nums):
    result = []
    path = []

    def backtrack(start):
        result.append(path[:])
        for i in range(start, len(nums)):
            path.append(nums[i])      # choose
            backtrack(i + 1)          # explore
            path.pop()                # undo

    backtrack(0)
    return result

print(subsets([1, 2, 3]))
`,
    java: `import java.util.*;

public class Main {
    static List<List<Integer>> result = new ArrayList<>();
    static List<Integer> path = new ArrayList<>();

    static void backtrack(int[] nums, int start) {
        result.add(new ArrayList<>(path));
        for (int i = start; i < nums.length; i++) {
            path.add(nums[i]);
            backtrack(nums, i + 1);
            path.remove(path.size() - 1);
        }
    }

    public static void main(String[] args) {
        backtrack(new int[]{1, 2, 3}, 0);
        System.out.println(result);
    }
}
`,
    cpp: `#include <bits/stdc++.h>
using namespace std;

vector<vector<int>> result;
vector<int> path;

void backtrack(vector<int>& nums, int start) {
    result.push_back(path);
    for (int i = start; i < nums.size(); i++) {
        path.push_back(nums[i]);
        backtrack(nums, i + 1);
        path.pop_back();
    }
}

int main() {
    vector<int> nums = {1, 2, 3};
    backtrack(nums, 0);
    cout << result.size() << " subsets" << endl;
    return 0;
}
`,
  },
  problems: [1863, 78, 90, 131, 93],
};

export const permutations: Method = {
  id: "backtracking-permutations",
  name: "Backtracking: Permutations & Choices",
  idea: "Fill positions one at a time, trying every unused option; undo the choice after exploring it.",
  when: ["All orderings / arrangements", "Letter combinations of a phone number", "Generate valid parentheses"],
  brute: "—",
  optimal: "O(n! · n) for permutations",
  steps: ["Keep a used[] array and the current path.", "If the path is full, record it.", "For each unused element: mark, add, recurse, then unmark and remove."],
  code: {
    python: `def permute(nums):
    result, path = [], []
    used = [False] * len(nums)

    def backtrack():
        if len(path) == len(nums):
            result.append(path[:])
            return
        for i in range(len(nums)):
            if not used[i]:
                used[i] = True
                path.append(nums[i])
                backtrack()
                path.pop()
                used[i] = False

    backtrack()
    return result

print(permute([1, 2, 3]))
`,
    java: `import java.util.*;

public class Main {
    static List<List<Integer>> result = new ArrayList<>();

    static void backtrack(int[] nums, boolean[] used, List<Integer> path) {
        if (path.size() == nums.length) {
            result.add(new ArrayList<>(path));
            return;
        }
        for (int i = 0; i < nums.length; i++) {
            if (used[i]) continue;
            used[i] = true;
            path.add(nums[i]);
            backtrack(nums, used, path);
            path.remove(path.size() - 1);
            used[i] = false;
        }
    }

    public static void main(String[] args) {
        int[] nums = {1, 2, 3};
        backtrack(nums, new boolean[nums.length], new ArrayList<>());
        System.out.println(result);
    }
}
`,
    cpp: `#include <bits/stdc++.h>
using namespace std;

vector<vector<int>> result;

void backtrack(vector<int>& nums, vector<bool>& used, vector<int>& path) {
    if (path.size() == nums.size()) {
        result.push_back(path);
        return;
    }
    for (int i = 0; i < nums.size(); i++) {
        if (used[i]) continue;
        used[i] = true;
        path.push_back(nums[i]);
        backtrack(nums, used, path);
        path.pop_back();
        used[i] = false;
    }
}

int main() {
    vector<int> nums = {1, 2, 3};
    vector<bool> used(nums.size(), false);
    vector<int> path;
    backtrack(nums, used, path);
    cout << result.size() << " permutations" << endl;
    return 0;
}
`,
  },
  problems: [46, 47, 17, 22],
};

export const combinationSum: Method = {
  id: "backtracking-combinations",
  name: "Backtracking: Combination Sum",
  idea: "Pick numbers in non-decreasing index order, subtract from the remaining target, and prune as soon as it goes negative.",
  when: ["Combinations that add up to a target", "Choose k numbers out of n", "Reuse allowed / not allowed variants"],
  brute: "All subsets then filter",
  optimal: "Exponential, but pruning cuts most branches",
  steps: ["backtrack(start, remaining).", "If remaining == 0, record the path.", "For i from start: if nums[i] > remaining, stop (sorted input).", "Choose nums[i], recurse with i (reuse) or i + 1 (no reuse), undo."],
  code: {
    python: `def combination_sum(candidates, target):
    candidates.sort()
    result, path = [], []

    def backtrack(start, remaining):
        if remaining == 0:
            result.append(path[:])
            return
        for i in range(start, len(candidates)):
            if candidates[i] > remaining:
                break                     # prune
            path.append(candidates[i])
            backtrack(i, remaining - candidates[i])   # i: reuse allowed
            path.pop()

    backtrack(0, target)
    return result

print(combination_sum([2, 3, 6, 7], 7))
`,
    java: `import java.util.*;

public class Main {
    static List<List<Integer>> result = new ArrayList<>();
    static List<Integer> path = new ArrayList<>();

    static void backtrack(int[] c, int start, int remaining) {
        if (remaining == 0) {
            result.add(new ArrayList<>(path));
            return;
        }
        for (int i = start; i < c.length; i++) {
            if (c[i] > remaining) break;
            path.add(c[i]);
            backtrack(c, i, remaining - c[i]);
            path.remove(path.size() - 1);
        }
    }

    public static void main(String[] args) {
        int[] c = {2, 3, 6, 7};
        Arrays.sort(c);
        backtrack(c, 0, 7);
        System.out.println(result);
    }
}
`,
    cpp: `#include <bits/stdc++.h>
using namespace std;

vector<vector<int>> result;
vector<int> path;

void backtrack(vector<int>& c, int start, int remaining) {
    if (remaining == 0) {
        result.push_back(path);
        return;
    }
    for (int i = start; i < c.size(); i++) {
        if (c[i] > remaining) break;
        path.push_back(c[i]);
        backtrack(c, i, remaining - c[i]);
        path.pop_back();
    }
}

int main() {
    vector<int> c = {2, 3, 6, 7};
    sort(c.begin(), c.end());
    backtrack(c, 0, 7);
    for (auto& r : result) {
        for (int x : r) cout << x << " ";
        cout << endl;
    }
    return 0;
}
`,
  },
  problems: [39, 40, 216, 77, 377],
};

export const gridBacktracking: Method = {
  id: "backtracking-grid",
  name: "Backtracking on Boards (N-Queens, Word Search)",
  idea: "Place / step one cell at a time, check constraints immediately, and undo the move when a branch fails.",
  when: ["N-Queens, Sudoku", "Find a word in a grid", "Constraint satisfaction on a board"],
  brute: "Try every full board",
  optimal: "Exponential, pruned by constraint checks",
  steps: ["Choose the next cell / row.", "Try each option that does not break a rule.", "Mark it, recurse, then unmark (backtrack).", "Stop when the board is complete."],
  code: {
    python: `def solve_n_queens(n):
    cols, diag1, diag2 = set(), set(), set()
    board = [-1] * n            # board[row] = column of the queen
    solutions = []

    def place(row):
        if row == n:
            solutions.append(board[:])
            return
        for c in range(n):
            if c in cols or row - c in diag1 or row + c in diag2:
                continue
            cols.add(c); diag1.add(row - c); diag2.add(row + c)
            board[row] = c
            place(row + 1)
            cols.remove(c); diag1.remove(row - c); diag2.remove(row + c)

    place(0)
    return solutions

print(solve_n_queens(4))
`,
    java: `import java.util.*;

public class Main {
    static int n = 4, count = 0;
    static boolean[] cols = new boolean[4];
    static boolean[] d1 = new boolean[8];
    static boolean[] d2 = new boolean[8];

    static void place(int row) {
        if (row == n) { count++; return; }
        for (int c = 0; c < n; c++) {
            if (cols[c] || d1[row - c + n] || d2[row + c]) continue;
            cols[c] = d1[row - c + n] = d2[row + c] = true;
            place(row + 1);
            cols[c] = d1[row - c + n] = d2[row + c] = false;
        }
    }

    public static void main(String[] args) {
        place(0);
        System.out.println(count + " solutions");
    }
}
`,
    cpp: `#include <bits/stdc++.h>
using namespace std;

int n = 4, countSolutions = 0;
vector<bool> cols(4, false), d1(8, false), d2(8, false);

void place(int row) {
    if (row == n) { countSolutions++; return; }
    for (int c = 0; c < n; c++) {
        if (cols[c] || d1[row - c + n] || d2[row + c]) continue;
        cols[c] = true; d1[row - c + n] = true; d2[row + c] = true;
        place(row + 1);
        cols[c] = false; d1[row - c + n] = false; d2[row + c] = false;
    }
}

int main() {
    place(0);
    cout << countSolutions << " solutions" << endl;
    return 0;
}
`,
  },
  problems: [79, 51, 52, 37, 212],
};

export const treeDfs: Method = {
  id: "tree-dfs",
  name: "Tree DFS Traversals",
  idea: "Visit a node and recurse into its children; the order (pre / in / post) decides when the node itself is processed.",
  when: ["Pre / in / post-order traversal", "Compare or mirror trees", "Flatten a tree, invert a tree"],
  brute: "—",
  optimal: "O(n) time, O(height) stack",
  steps: ["If the node is null, return.", "Pre-order: process node, then left, then right.", "In-order: left, node, right (sorted order in a BST).", "Post-order: left, right, node."],
  code: {
    python: TREE_PY + `
def inorder(node, out):
    if node is None:
        return
    inorder(node.left, out)
    out.append(node.val)
    inorder(node.right, out)

result = []
inorder(root, result)
print(result)
`,
    java: `import java.util.*;

` + TREE_JAVA_CLASS + `
public class Main {
    static void inorder(TreeNode node, List<Integer> out) {
        if (node == null) return;
        inorder(node.left, out);
        out.add(node.val);
        inorder(node.right, out);
    }

    public static void main(String[] args) {
` + TREE_JAVA_BUILD + `        List<Integer> result = new ArrayList<>();
        inorder(root, result);
        System.out.println(result);
    }
}
`,
    cpp: `#include <bits/stdc++.h>
using namespace std;

` + TREE_CPP_STRUCT + `
void inorder(TreeNode* node, vector<int>& out) {
    if (node == nullptr) return;
    inorder(node->left, out);
    out.push_back(node->val);
    inorder(node->right, out);
}

int main() {
` + TREE_CPP_BUILD + `    vector<int> result;
    inorder(root, result);
    for (int x : result) cout << x << " ";
    return 0;
}
`,
  },
  problems: [94, 144, 145, 226, 100, 101, 572, 114],
};

export const treeBfs: Method = {
  id: "tree-bfs",
  name: "Tree BFS (level order)",
  idea: "Process the tree one level at a time with a queue; the queue size at the start of a level is the level's width.",
  when: ["Level-order output", "Right / left side view", "Zigzag order, level averages, minimum depth", "Width of a tree"],
  brute: "—",
  optimal: "O(n) time, O(width) space",
  steps: ["Push the root.", "While the queue is not empty: size = queue length.", "Pop exactly `size` nodes — that is one level — and push their children.", "Record the level."],
  code: {
    python: TREE_PY + `
from collections import deque

def level_order(root):
    levels = []
    queue = deque([root])
    while queue:
        level = []
        for _ in range(len(queue)):
            node = queue.popleft()
            level.append(node.val)
            if node.left:
                queue.append(node.left)
            if node.right:
                queue.append(node.right)
        levels.append(level)
    return levels

print(level_order(root))
`,
    java: `import java.util.*;

` + TREE_JAVA_CLASS + `
public class Main {
    public static void main(String[] args) {
` + TREE_JAVA_BUILD + `        List<List<Integer>> levels = new ArrayList<>();
        Queue<TreeNode> queue = new ArrayDeque<>();
        queue.add(root);
        while (!queue.isEmpty()) {
            int size = queue.size();
            List<Integer> level = new ArrayList<>();
            for (int i = 0; i < size; i++) {
                TreeNode node = queue.poll();
                level.add(node.val);
                if (node.left != null) queue.add(node.left);
                if (node.right != null) queue.add(node.right);
            }
            levels.add(level);
        }
        System.out.println(levels);
    }
}
`,
    cpp: `#include <bits/stdc++.h>
using namespace std;

` + TREE_CPP_STRUCT + `
int main() {
` + TREE_CPP_BUILD + `    queue<TreeNode*> q;
    q.push(root);
    while (!q.empty()) {
        int size = q.size();
        for (int i = 0; i < size; i++) {
            TreeNode* node = q.front();
            q.pop();
            cout << node->val << " ";
            if (node->left) q.push(node->left);
            if (node->right) q.push(node->right);
        }
        cout << endl;
    }
    return 0;
}
`,
  },
  problems: [637, 111, 102, 103, 199, 662, 987],
};

export const treeHeight: Method = {
  id: "tree-bottom-up",
  name: "Bottom-up Tree DP (height / diameter)",
  idea: "Let each child return a summary (height, best path) and combine the two summaries at the parent.",
  when: ["Max depth, balanced check", "Diameter, maximum path sum", "Any answer that depends on both subtrees"],
  brute: "Recompute heights at every node: O(n²)",
  optimal: "O(n) — one post-order pass",
  steps: ["Recurse into left and right first (post-order).", "Combine: height = 1 + max(left, right).", "Update a global answer with something that uses both sides (left + right).", "Return the single-side summary to the parent."],
  code: {
    python: TREE_PY + `
best = 0

def height(node):
    global best
    if node is None:
        return 0
    left = height(node.left)
    right = height(node.right)
    best = max(best, left + right)     # diameter through this node
    return 1 + max(left, right)

print("height:", height(root), "diameter:", best)
`,
    java: TREE_JAVA_CLASS + `
public class Main {
    static int best = 0;

    static int height(TreeNode node) {
        if (node == null) return 0;
        int left = height(node.left);
        int right = height(node.right);
        best = Math.max(best, left + right);
        return 1 + Math.max(left, right);
    }

    public static void main(String[] args) {
` + TREE_JAVA_BUILD + `        int h = height(root);
        System.out.println("height: " + h + " diameter: " + best);
    }
}
`,
    cpp: `#include <bits/stdc++.h>
using namespace std;

` + TREE_CPP_STRUCT + `
int best = 0;

int height(TreeNode* node) {
    if (node == nullptr) return 0;
    int left = height(node->left);
    int right = height(node->right);
    best = max(best, left + right);
    return 1 + max(left, right);
}

int main() {
` + TREE_CPP_BUILD + `    int h = height(root);
    cout << "height: " << h << " diameter: " << best << endl;
    return 0;
}
`,
  },
  problems: [104, 110, 543, 124],
};

export const treePath: Method = {
  id: "tree-paths",
  name: "Root-to-Leaf Paths (top-down DFS)",
  idea: "Carry information down from the root (remaining sum, current path, max so far) and check it at the leaves.",
  when: ["Path sum equals target", "All root-to-leaf paths", "Count good nodes (max on the path so far)", "Paths that can start anywhere (prefix sums on the path)"],
  brute: "—",
  optimal: "O(n)",
  steps: ["dfs(node, state) where state comes from the parent.", "Update the state with node.val.", "At a leaf, check the condition.", "Recurse into children with the updated state; undo path changes when returning."],
  code: {
    python: TREE_PY + `
def has_path_sum(node, remaining):
    if node is None:
        return False
    remaining -= node.val
    if node.left is None and node.right is None:
        return remaining == 0
    return has_path_sum(node.left, remaining) or has_path_sum(node.right, remaining)

print(has_path_sum(root, 30))   # 3 -> 20 -> 7
`,
    java: TREE_JAVA_CLASS + `
public class Main {
    static boolean hasPathSum(TreeNode node, int remaining) {
        if (node == null) return false;
        remaining -= node.val;
        if (node.left == null && node.right == null) return remaining == 0;
        return hasPathSum(node.left, remaining) || hasPathSum(node.right, remaining);
    }

    public static void main(String[] args) {
` + TREE_JAVA_BUILD + `        System.out.println(hasPathSum(root, 30));
    }
}
`,
    cpp: `#include <bits/stdc++.h>
using namespace std;

` + TREE_CPP_STRUCT + `
bool hasPathSum(TreeNode* node, int remaining) {
    if (node == nullptr) return false;
    remaining -= node->val;
    if (node->left == nullptr && node->right == nullptr) return remaining == 0;
    return hasPathSum(node->left, remaining) || hasPathSum(node->right, remaining);
}

int main() {
` + TREE_CPP_BUILD + `    cout << (hasPathSum(root, 30) ? "true" : "false") << endl;
    return 0;
}
`,
  },
  problems: [112, 257, 113, 437, 1448, 124],
};

export const treeConstruct: Method = {
  id: "tree-construction",
  name: "Build & Serialize Trees",
  idea: "The first preorder value is the root; its position in inorder splits the left and right subtrees. Serialization records nulls so the tree can be rebuilt.",
  when: ["Construct a tree from two traversals", "Sorted array to balanced BST", "Serialize / deserialize"],
  brute: "Search the root in inorder each time: O(n²)",
  optimal: "O(n) with a value → index map",
  steps: ["Map each inorder value to its index.", "Take the next preorder value as the root.", "Left subtree size = (root index in inorder) − (inorder start).", "Recurse for left and right ranges."],
  code: {
    python: `class TreeNode:
    def __init__(self, val):
        self.val = val
        self.left = None
        self.right = None

def sorted_to_bst(nums, lo, hi):
    if lo > hi:
        return None
    mid = (lo + hi) // 2
    node = TreeNode(nums[mid])           # middle becomes the root
    node.left = sorted_to_bst(nums, lo, mid - 1)
    node.right = sorted_to_bst(nums, mid + 1, hi)
    return node

nums = [-10, -3, 0, 5, 9]
root = sorted_to_bst(nums, 0, len(nums) - 1)
print(root.val, root.left.val, root.right.val)
`,
    java: TREE_JAVA_CLASS + `
public class Main {
    static TreeNode build(int[] nums, int lo, int hi) {
        if (lo > hi) return null;
        int mid = (lo + hi) / 2;
        TreeNode node = new TreeNode(nums[mid]);
        node.left = build(nums, lo, mid - 1);
        node.right = build(nums, mid + 1, hi);
        return node;
    }

    public static void main(String[] args) {
        int[] nums = {-10, -3, 0, 5, 9};
        TreeNode root = build(nums, 0, nums.length - 1);
        System.out.println(root.val + " " + root.left.val + " " + root.right.val);
    }
}
`,
    cpp: `#include <bits/stdc++.h>
using namespace std;

` + TREE_CPP_STRUCT + `
TreeNode* build(vector<int>& nums, int lo, int hi) {
    if (lo > hi) return nullptr;
    int mid = (lo + hi) / 2;
    TreeNode* node = new TreeNode(nums[mid]);
    node->left = build(nums, lo, mid - 1);
    node->right = build(nums, mid + 1, hi);
    return node;
}

int main() {
    vector<int> nums = {-10, -3, 0, 5, 9};
    TreeNode* root = build(nums, 0, nums.size() - 1);
    cout << root->val << " " << root->left->val << " " << root->right->val << endl;
    return 0;
}
`,
  },
  problems: [108, 105, 297],
};

export const lca: Method = {
  id: "lowest-common-ancestor",
  name: "Lowest Common Ancestor",
  idea: "Search both subtrees; the first node where p and q are found on different sides (or the node is p or q) is the LCA.",
  when: ["Lowest common ancestor of two nodes", "Distance between two nodes", "In a BST, use values to go left or right"],
  brute: "Store both root paths and compare: O(n) space",
  optimal: "O(n) time, O(height) stack (O(height) for a BST)",
  steps: ["If node is null, p, or q, return node.", "left = lca(node.left), right = lca(node.right).", "If both are non-null, node is the LCA.", "Otherwise return the non-null side."],
  code: {
    python: TREE_PY + `
def lca(node, p, q):
    if node is None or node.val == p or node.val == q:
        return node
    left = lca(node.left, p, q)
    right = lca(node.right, p, q)
    if left and right:
        return node
    return left if left else right

print(lca(root, 15, 7).val)
`,
    java: TREE_JAVA_CLASS + `
public class Main {
    static TreeNode lca(TreeNode node, int p, int q) {
        if (node == null || node.val == p || node.val == q) return node;
        TreeNode left = lca(node.left, p, q);
        TreeNode right = lca(node.right, p, q);
        if (left != null && right != null) return node;
        return left != null ? left : right;
    }

    public static void main(String[] args) {
` + TREE_JAVA_BUILD + `        System.out.println(lca(root, 15, 7).val);
    }
}
`,
    cpp: `#include <bits/stdc++.h>
using namespace std;

` + TREE_CPP_STRUCT + `
TreeNode* lca(TreeNode* node, int p, int q) {
    if (node == nullptr || node->val == p || node->val == q) return node;
    TreeNode* left = lca(node->left, p, q);
    TreeNode* right = lca(node->right, p, q);
    if (left != nullptr && right != nullptr) return node;
    return left != nullptr ? left : right;
}

int main() {
` + TREE_CPP_BUILD + `    cout << lca(root, 15, 7)->val << endl;
    return 0;
}
`,
  },
  problems: [236, 235],
};

export const bstOps: Method = {
  id: "bst-operations",
  name: "BST Search / Insert / Delete",
  idea: "Every left value is smaller and every right value is larger, so each comparison discards a whole subtree.",
  when: ["Search, insert, delete in a BST", "Range sums using the ordering", "LCA in a BST"],
  brute: "Visit every node: O(n)",
  optimal: "O(height) — O(log n) when balanced",
  steps: ["Compare target with node.val.", "Smaller → go left, larger → go right.", "Insert where you fall off the tree.", "Delete: replace with the in-order successor when there are two children."],
  code: {
    python: `class Node:
    def __init__(self, val):
        self.val = val
        self.left = None
        self.right = None

def insert(root, val):
    if root is None:
        return Node(val)
    if val < root.val:
        root.left = insert(root.left, val)
    else:
        root.right = insert(root.right, val)
    return root

def search(root, val):
    while root and root.val != val:
        root = root.left if val < root.val else root.right
    return root is not None

root = None
for v in [50, 30, 70, 20, 40, 60]:
    root = insert(root, v)
print(search(root, 40), search(root, 45))
`,
    java: `class Node {
    int val;
    Node left, right;
    Node(int val) { this.val = val; }
}

public class Main {
    static Node insert(Node root, int val) {
        if (root == null) return new Node(val);
        if (val < root.val) root.left = insert(root.left, val);
        else root.right = insert(root.right, val);
        return root;
    }

    static boolean search(Node root, int val) {
        while (root != null && root.val != val) root = val < root.val ? root.left : root.right;
        return root != null;
    }

    public static void main(String[] args) {
        Node root = null;
        int[] values = {50, 30, 70, 20, 40, 60};
        for (int v : values) root = insert(root, v);
        System.out.println(search(root, 40) + " " + search(root, 45));
    }
}
`,
    cpp: `#include <bits/stdc++.h>
using namespace std;

struct Node {
    int val;
    Node* left;
    Node* right;
    Node(int v) : val(v), left(nullptr), right(nullptr) {}
};

Node* insert(Node* root, int val) {
    if (root == nullptr) return new Node(val);
    if (val < root->val) root->left = insert(root->left, val);
    else root->right = insert(root->right, val);
    return root;
}

bool search(Node* root, int val) {
    while (root != nullptr && root->val != val) root = val < root->val ? root->left : root->right;
    return root != nullptr;
}

int main() {
    Node* root = nullptr;
    vector<int> values = {50, 30, 70, 20, 40, 60};
    for (int v : values) root = insert(root, v);
    cout << search(root, 40) << " " << search(root, 45) << endl;
    return 0;
}
`,
  },
  problems: [700, 938, 701, 450, 235],
};

export const bstInorder: Method = {
  id: "bst-inorder",
  name: "BST + In-order = Sorted",
  idea: "An in-order traversal of a BST visits values in sorted order — use it to validate, find the k-th smallest, or compare neighbors.",
  when: ["Validate a BST", "K-th smallest / largest", "Minimum difference between nodes", "Recover swapped nodes, BST iterator"],
  brute: "Collect, sort, compare",
  optimal: "O(n) (or O(h + k) for k-th smallest)",
  steps: ["Traverse in-order, keeping the previous value.", "Each value must be greater than the previous one.", "Count visited nodes to stop at the k-th."],
  code: {
    python: `class Node:
    def __init__(self, val, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

root = Node(5, Node(3, Node(2), Node(4)), Node(7, Node(6), Node(8)))

def kth_smallest(root, k):
    stack, node = [], root
    while stack or node:
        while node:
            stack.append(node)
            node = node.left
        node = stack.pop()
        k -= 1
        if k == 0:
            return node.val
        node = node.right

print(kth_smallest(root, 3))
`,
    java: `import java.util.*;

class Node {
    int val;
    Node left, right;
    Node(int val) { this.val = val; }
}

public class Main {
    static int kthSmallest(Node root, int k) {
        Stack<Node> stack = new Stack<>();
        Node node = root;
        while (!stack.isEmpty() || node != null) {
            while (node != null) {
                stack.push(node);
                node = node.left;
            }
            node = stack.pop();
            if (--k == 0) return node.val;
            node = node.right;
        }
        return -1;
    }

    public static void main(String[] args) {
        Node root = new Node(5);
        root.left = new Node(3); root.right = new Node(7);
        root.left.left = new Node(2); root.left.right = new Node(4);
        root.right.left = new Node(6); root.right.right = new Node(8);
        System.out.println(kthSmallest(root, 3));
    }
}
`,
    cpp: `#include <bits/stdc++.h>
using namespace std;

struct Node {
    int val;
    Node* left;
    Node* right;
    Node(int v) : val(v), left(nullptr), right(nullptr) {}
};

int kthSmallest(Node* root, int k) {
    stack<Node*> st;
    Node* node = root;
    while (!st.empty() || node != nullptr) {
        while (node != nullptr) {
            st.push(node);
            node = node->left;
        }
        node = st.top();
        st.pop();
        if (--k == 0) return node->val;
        node = node->right;
    }
    return -1;
}

int main() {
    Node* root = new Node(5);
    root->left = new Node(3); root->right = new Node(7);
    root->left->left = new Node(2); root->left->right = new Node(4);
    root->right->left = new Node(6); root->right->right = new Node(8);
    cout << kthSmallest(root, 3) << endl;
    return 0;
}
`,
  },
  problems: [530, 653, 230, 98, 173, 99, 1373],
};

export const topK: Method = {
  id: "top-k-heap",
  name: "Top-K with a Heap",
  idea: "Keep a min-heap of size k: anything smaller than the heap top cannot be in the top k, so the heap always holds the k largest.",
  when: ["K largest / smallest / most frequent", "K closest points", "Kth largest in a stream"],
  brute: "Sort everything: O(n log n)",
  optimal: "O(n log k)",
  steps: ["Push each element into a min-heap.", "If the heap grows beyond k, pop the smallest.", "The heap top is the k-th largest; the heap holds the top k."],
  code: {
    python: `import heapq

def kth_largest(nums, k):
    heap = []
    for x in nums:
        heapq.heappush(heap, x)
        if len(heap) > k:
            heapq.heappop(heap)     # drop the smallest
    return heap[0]

print(kth_largest([3, 2, 1, 5, 6, 4], 2))
`,
    java: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        int[] nums = {3, 2, 1, 5, 6, 4};
        int k = 2;
        PriorityQueue<Integer> heap = new PriorityQueue<>();
        for (int x : nums) {
            heap.offer(x);
            if (heap.size() > k) heap.poll();
        }
        System.out.println(heap.peek());
    }
}
`,
    cpp: `#include <bits/stdc++.h>
using namespace std;

int main() {
    vector<int> nums = {3, 2, 1, 5, 6, 4};
    int k = 2;
    priority_queue<int, vector<int>, greater<int>> heap;
    for (int x : nums) {
        heap.push(x);
        if (heap.size() > k) heap.pop();
    }
    cout << heap.top() << endl;
    return 0;
}
`,
  },
  problems: [703, 1046, 215, 347, 973, 692],
};

export const twoHeaps: Method = {
  id: "two-heaps",
  name: "Two Heaps (running median)",
  idea: "A max-heap holds the smaller half and a min-heap the larger half; their tops give the median in O(1).",
  when: ["Median of a stream", "Sliding-window median", "Pick the best affordable item repeatedly (IPO)"],
  brute: "Sort after every insert: O(n log n) each",
  optimal: "O(log n) per insert, O(1) median",
  steps: ["Push into the max-heap (small half).", "Move its top to the min-heap.", "If the min-heap is bigger, move its top back.", "Median = max-heap top (odd) or the average of both tops (even)."],
  code: {
    python: `import heapq

small, large = [], []     # small is a max-heap (store negatives)

def add(num):
    heapq.heappush(small, -num)
    heapq.heappush(large, -heapq.heappop(small))
    if len(large) > len(small):
        heapq.heappush(small, -heapq.heappop(large))

def median():
    if len(small) > len(large):
        return -small[0]
    return (-small[0] + large[0]) / 2

for x in [5, 15, 1, 3]:
    add(x)
    print(median())
`,
    java: `import java.util.*;

public class Main {
    static PriorityQueue<Integer> small = new PriorityQueue<>(Collections.reverseOrder());
    static PriorityQueue<Integer> large = new PriorityQueue<>();

    static void add(int num) {
        small.offer(num);
        large.offer(small.poll());
        if (large.size() > small.size()) small.offer(large.poll());
    }

    static double median() {
        if (small.size() > large.size()) return small.peek();
        return (small.peek() + large.peek()) / 2.0;
    }

    public static void main(String[] args) {
        int[] nums = {5, 15, 1, 3};
        for (int x : nums) {
            add(x);
            System.out.println(median());
        }
    }
}
`,
    cpp: `#include <bits/stdc++.h>
using namespace std;

priority_queue<int> small;
priority_queue<int, vector<int>, greater<int>> large;

void add(int num) {
    small.push(num);
    large.push(small.top());
    small.pop();
    if (large.size() > small.size()) {
        small.push(large.top());
        large.pop();
    }
}

double median() {
    if (small.size() > large.size()) return small.top();
    return (small.top() + large.top()) / 2.0;
}

int main() {
    vector<int> nums = {5, 15, 1, 3};
    for (int x : nums) {
        add(x);
        cout << median() << endl;
    }
    return 0;
}
`,
  },
  problems: [295, 480, 502],
};

export const kWayMerge: Method = {
  id: "k-way-merge",
  name: "K-way Merge with a Heap",
  idea: "Put the head of each sorted list into a min-heap; repeatedly pop the smallest and push the next item from the same list.",
  when: ["Merge k sorted lists / arrays", "K-th smallest in a sorted matrix", "K smallest pair sums"],
  brute: "Concatenate and sort: O(N log N)",
  optimal: "O(N log k)",
  steps: ["Push (value, list index, element index) for the first element of every list.", "Pop the smallest, add it to the output.", "Push the next element from the same list, if any."],
  code: {
    python: `import heapq

lists = [[1, 4, 7], [2, 5, 8], [3, 6, 9]]
heap = [(lst[0], i, 0) for i, lst in enumerate(lists)]
heapq.heapify(heap)
merged = []
while heap:
    val, i, j = heapq.heappop(heap)
    merged.append(val)
    if j + 1 < len(lists[i]):
        heapq.heappush(heap, (lists[i][j + 1], i, j + 1))

print(merged)
`,
    java: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        int[][] lists = {{1, 4, 7}, {2, 5, 8}, {3, 6, 9}};
        PriorityQueue<int[]> heap = new PriorityQueue<>((a, b) -> a[0] - b[0]);
        for (int i = 0; i < lists.length; i++) heap.offer(new int[]{lists[i][0], i, 0});
        List<Integer> merged = new ArrayList<>();
        while (!heap.isEmpty()) {
            int[] top = heap.poll();
            merged.add(top[0]);
            int i = top[1], j = top[2];
            if (j + 1 < lists[i].length) heap.offer(new int[]{lists[i][j + 1], i, j + 1});
        }
        System.out.println(merged);
    }
}
`,
    cpp: `#include <bits/stdc++.h>
using namespace std;

int main() {
    vector<vector<int>> lists = {{1, 4, 7}, {2, 5, 8}, {3, 6, 9}};
    priority_queue<vector<int>, vector<vector<int>>, greater<vector<int>>> heap;
    for (int i = 0; i < lists.size(); i++) heap.push({lists[i][0], i, 0});
    vector<int> merged;
    while (!heap.empty()) {
        vector<int> top = heap.top();
        heap.pop();
        merged.push_back(top[0]);
        int i = top[1], j = top[2];
        if (j + 1 < lists[i].size()) heap.push({lists[i][j + 1], i, j + 1});
    }
    for (int x : merged) cout << x << " ";
    return 0;
}
`,
  },
  problems: [373, 378, 23],
};

export const heapGreedy: Method = {
  id: "heap-greedy",
  name: "Greedy Scheduling with a Heap",
  idea: "Always act on the currently most urgent / most frequent / most expensive item, which a heap gives in O(log n).",
  when: ["Task scheduling with cooldowns", "Reorganize so no two neighbors are equal", "Use limited resources (ladders, bricks) on the biggest needs"],
  brute: "Re-scan for the best item every time: O(n²)",
  optimal: "O(n log n)",
  steps: ["Count / collect the items.", "Push them into a heap ordered by priority.", "Pop the best, use it, push it back if it still has uses."],
  code: {
    python: `import heapq

def last_stone_weight(stones):
    heap = [-s for s in stones]      # max-heap via negatives
    heapq.heapify(heap)
    while len(heap) > 1:
        a = -heapq.heappop(heap)
        b = -heapq.heappop(heap)
        if a != b:
            heapq.heappush(heap, -(a - b))
    return -heap[0] if heap else 0

print(last_stone_weight([2, 7, 4, 1, 8, 1]))
`,
    java: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        int[] stones = {2, 7, 4, 1, 8, 1};
        PriorityQueue<Integer> heap = new PriorityQueue<>(Collections.reverseOrder());
        for (int s : stones) heap.offer(s);
        while (heap.size() > 1) {
            int a = heap.poll(), b = heap.poll();
            if (a != b) heap.offer(a - b);
        }
        System.out.println(heap.isEmpty() ? 0 : heap.peek());
    }
}
`,
    cpp: `#include <bits/stdc++.h>
using namespace std;

int main() {
    vector<int> stones = {2, 7, 4, 1, 8, 1};
    priority_queue<int> heap;
    for (int s : stones) heap.push(s);
    while (heap.size() > 1) {
        int a = heap.top(); heap.pop();
        int b = heap.top(); heap.pop();
        if (a != b) heap.push(a - b);
    }
    cout << (heap.empty() ? 0 : heap.top()) << endl;
    return 0;
}
`,
  },
  problems: [621, 767, 1642, 630],
};
