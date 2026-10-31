import type { Language } from "./types";

export type Example = { id: string; title: string; tag: string; code: string; stdin?: string };

const PYTHON: Example[] = [
  {
    id: "bubble",
    title: "Bubble Sort",
    tag: "Sorting",
    code: `arr = [5, 2, 9, 1, 6]
n = len(arr)

for i in range(n):
    for j in range(n - i - 1):
        if arr[j] > arr[j + 1]:
            arr[j], arr[j + 1] = arr[j + 1], arr[j]

print("Sorted:", arr)
`,
  },
  {
    id: "binary",
    title: "Binary Search",
    tag: "Searching",
    code: `def binary_search(arr, target):
    low, high = 0, len(arr) - 1
    while low <= high:
        mid = (low + high) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            low = mid + 1
        else:
            high = mid - 1
    return -1

nums = [2, 5, 8, 12, 16, 23, 38, 56]
print("Found at index", binary_search(nums, 23))
`,
  },
  {
    id: "fib",
    title: "Fibonacci (Recursion)",
    tag: "Recursion",
    code: `def fib(n):
    if n <= 1:
        return n
    return fib(n - 1) + fib(n - 2)

result = fib(4)
print(result)
`,
  },
  {
    id: "twosum",
    title: "Two Sum (HashMap)",
    tag: "Hashing",
    code: `def two_sum(nums, target):
    seen = {}
    for i in range(len(nums)):
        need = target - nums[i]
        if need in seen:
            return [seen[need], i]
        seen[nums[i]] = i
    return []

print(two_sum([2, 7, 11, 15], 9))
`,
  },
  {
    id: "stack",
    title: "Valid Parentheses (Stack)",
    tag: "Stack",
    code: `def is_valid(s):
    stack = []
    pairs = {")": "(", "]": "[", "}": "{"}
    for ch in s:
        if ch in "([{":
            stack.append(ch)
        else:
            if not stack or stack.pop() != pairs[ch]:
                return False
    return len(stack) == 0

print(is_valid("{[()]}"))
`,
  },
  {
    id: "linked",
    title: "Reverse a Linked List",
    tag: "Linked List",
    code: `class Node:
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
head.next.next.next = Node(4)

head = reverse(head)
p = head
while p:
    print(p.val, end=" ")
    p = p.next
`,
  },
  {
    id: "bst",
    title: "Binary Search Tree",
    tag: "Tree",
    code: `class TreeNode:
    def __init__(self, val):
        self.val = val
        self.left = None
        self.right = None

def insert(root, val):
    if root is None:
        return TreeNode(val)
    if val < root.val:
        root.left = insert(root.left, val)
    else:
        root.right = insert(root.right, val)
    return root

def inorder(root, out):
    if root:
        inorder(root.left, out)
        out.append(root.val)
        inorder(root.right, out)

root = None
for v in [50, 30, 70, 20, 40, 60]:
    root = insert(root, v)

result = []
inorder(root, result)
print("Inorder:", result)
`,
  },
  {
    id: "bfs",
    title: "BFS on a Graph (Queue)",
    tag: "Graph",
    code: `from collections import deque

adj = [[1, 2], [0, 3, 4], [0, 4], [1, 5], [1, 2, 5], [3, 4]]
visited = [False] * len(adj)
order = []

queue = deque([0])
visited[0] = True
while queue:
    node = queue.popleft()
    order.append(node)
    for nei in adj[node]:
        if not visited[nei]:
            visited[nei] = True
            queue.append(nei)

print("BFS order:", order)
`,
  },
  {
    id: "dfs",
    title: "DFS on a Graph (Recursion)",
    tag: "Graph",
    code: `adj = [[1, 2], [0, 3], [0, 4], [1], [2]]
visited = [False] * len(adj)

def dfs(node):
    visited[node] = True
    print("visit", node)
    for nei in adj[node]:
        if not visited[nei]:
            dfs(nei)

dfs(0)
`,
  },
  {
    id: "climb",
    title: "Climbing Stairs (1D DP)",
    tag: "DP",
    code: `n = 6
dp = [0] * (n + 1)
dp[0] = 1
dp[1] = 1

for i in range(2, n + 1):
    dp[i] = dp[i - 1] + dp[i - 2]

print("Ways to climb", n, "stairs:", dp[n])
`,
  },
  {
    id: "lcs",
    title: "Longest Common Subsequence (2D DP)",
    tag: "DP",
    code: `a = "ABCB"
b = "BDCB"
m, n = len(a), len(b)
dp = [[0] * (n + 1) for _ in range(m + 1)]

for i in range(1, m + 1):
    for j in range(1, n + 1):
        if a[i - 1] == b[j - 1]:
            dp[i][j] = dp[i - 1][j - 1] + 1
        else:
            dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])

print("LCS length:", dp[m][n])
`,
  },
  {
    id: "heap",
    title: "K-th Largest (Min Heap)",
    tag: "Heap",
    code: `import heapq

nums = [7, 2, 9, 4, 1, 8]
k = 3
heap = []
for x in nums:
    heapq.heappush(heap, x)
    if len(heap) > k:
        heapq.heappop(heap)

print(k, "rd largest:", heap[0])
`,
  },
  {
    id: "matrix",
    title: "Matrix Transpose (2D)",
    tag: "2D Array",
    code: `matrix = [
    [1, 2, 3],
    [4, 5, 6],
    [7, 8, 9],
]
n = len(matrix)

for i in range(n):
    for j in range(i + 1, n):
        matrix[i][j], matrix[j][i] = matrix[j][i], matrix[i][j]

print(matrix)
`,
  },
  {
    id: "input",
    title: "Average of N numbers (input)",
    tag: "Input",
    stdin: "4\n10 20 30 40",
    code: `n = int(input())
nums = list(map(int, input().split()))

total = 0
for x in nums:
    total += x

print("Average:", total / n)
`,
  },
];

const JAVA: Example[] = [
  {
    id: "bubble",
    title: "Bubble Sort",
    tag: "Sorting",
    code: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        int[] arr = {5, 2, 9, 1, 6};
        int n = arr.length;

        for (int i = 0; i < n - 1; i++) {
            for (int j = 0; j < n - i - 1; j++) {
                if (arr[j] > arr[j + 1]) {
                    int temp = arr[j];
                    arr[j] = arr[j + 1];
                    arr[j + 1] = temp;
                }
            }
        }
        System.out.println("Sorted: " + Arrays.toString(arr));
    }
}
`,
  },
  {
    id: "binary",
    title: "Binary Search",
    tag: "Searching",
    code: `public class Main {
    static int binarySearch(int[] arr, int target) {
        int low = 0, high = arr.length - 1;
        while (low <= high) {
            int mid = (low + high) / 2;
            if (arr[mid] == target) {
                return mid;
            } else if (arr[mid] < target) {
                low = mid + 1;
            } else {
                high = mid - 1;
            }
        }
        return -1;
    }

    public static void main(String[] args) {
        int[] nums = {2, 5, 8, 12, 16, 23, 38, 56};
        System.out.println("Found at index " + binarySearch(nums, 23));
    }
}
`,
  },
  {
    id: "fib",
    title: "Fibonacci (Recursion)",
    tag: "Recursion",
    code: `public class Main {
    static int fib(int n) {
        if (n <= 1) {
            return n;
        }
        return fib(n - 1) + fib(n - 2);
    }

    public static void main(String[] args) {
        int result = fib(4);
        System.out.println(result);
    }
}
`,
  },
  {
    id: "twosum",
    title: "Two Sum (HashMap)",
    tag: "Hashing",
    code: `import java.util.*;

public class Main {
    static int[] twoSum(int[] nums, int target) {
        Map<Integer, Integer> seen = new HashMap<>();
        for (int i = 0; i < nums.length; i++) {
            int need = target - nums[i];
            if (seen.containsKey(need)) {
                return new int[]{seen.get(need), i};
            }
            seen.put(nums[i], i);
        }
        return new int[]{};
    }

    public static void main(String[] args) {
        int[] ans = twoSum(new int[]{2, 7, 11, 15}, 9);
        System.out.println(ans[0] + ", " + ans[1]);
    }
}
`,
  },
  {
    id: "stack",
    title: "Valid Parentheses (Stack)",
    tag: "Stack",
    code: `import java.util.*;

public class Main {
    static boolean isValid(String s) {
        Stack<Character> stack = new Stack<>();
        for (char ch : s.toCharArray()) {
            if (ch == '(' || ch == '[' || ch == '{') {
                stack.push(ch);
            } else {
                if (stack.isEmpty()) return false;
                char top = stack.pop();
                if ((ch == ')' && top != '(') || (ch == ']' && top != '[') || (ch == '}' && top != '{')) {
                    return false;
                }
            }
        }
        return stack.isEmpty();
    }

    public static void main(String[] args) {
        System.out.println(isValid("{[()]}"));
    }
}
`,
  },
  {
    id: "linked",
    title: "Reverse a Linked List",
    tag: "Linked List",
    code: `class Node {
    int val;
    Node next;
    Node(int val) {
        this.val = val;
    }
}

public class Main {
    static Node reverse(Node head) {
        Node prev = null;
        Node curr = head;
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
        head.next.next.next = new Node(4);

        head = reverse(head);
        for (Node p = head; p != null; p = p.next) {
            System.out.print(p.val + " ");
        }
    }
}
`,
  },
  {
    id: "bst",
    title: "Binary Search Tree",
    tag: "Tree",
    code: `import java.util.*;

class TreeNode {
    int val;
    TreeNode left, right;
    TreeNode(int val) {
        this.val = val;
    }
}

public class Main {
    static TreeNode insert(TreeNode root, int val) {
        if (root == null) return new TreeNode(val);
        if (val < root.val) {
            root.left = insert(root.left, val);
        } else {
            root.right = insert(root.right, val);
        }
        return root;
    }

    static void inorder(TreeNode root, List<Integer> out) {
        if (root == null) return;
        inorder(root.left, out);
        out.add(root.val);
        inorder(root.right, out);
    }

    public static void main(String[] args) {
        TreeNode root = null;
        int[] values = {50, 30, 70, 20, 40, 60};
        for (int v : values) {
            root = insert(root, v);
        }
        List<Integer> result = new ArrayList<>();
        inorder(root, result);
        System.out.println("Inorder: " + result);
    }
}
`,
  },
  {
    id: "bfs",
    title: "BFS on a Graph (Queue)",
    tag: "Graph",
    code: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        int n = 6;
        int[][] edges = {{0, 1}, {0, 2}, {1, 3}, {1, 4}, {2, 4}, {3, 5}, {4, 5}};
        List<List<Integer>> adj = new ArrayList<>();
        for (int i = 0; i < n; i++) {
            adj.add(new ArrayList<>());
        }
        for (int[] e : edges) {
            adj.get(e[0]).add(e[1]);
            adj.get(e[1]).add(e[0]);
        }

        boolean[] visited = new boolean[n];
        Queue<Integer> queue = new ArrayDeque<>();
        queue.add(0);
        visited[0] = true;
        while (!queue.isEmpty()) {
            int node = queue.poll();
            System.out.print(node + " ");
            for (int nei : adj.get(node)) {
                if (!visited[nei]) {
                    visited[nei] = true;
                    queue.add(nei);
                }
            }
        }
    }
}
`,
  },
  {
    id: "dfs",
    title: "DFS on a Graph (Recursion)",
    tag: "Graph",
    code: `import java.util.*;

public class Main {
    static int[][] adj = {{1, 2}, {0, 3}, {0, 4}, {1}, {2}};
    static boolean[] visited = new boolean[5];

    static void dfs(int node) {
        visited[node] = true;
        System.out.println("visit " + node);
        for (int nei : adj[node]) {
            if (!visited[nei]) {
                dfs(nei);
            }
        }
    }

    public static void main(String[] args) {
        dfs(0);
    }
}
`,
  },
  {
    id: "climb",
    title: "Climbing Stairs (1D DP)",
    tag: "DP",
    code: `public class Main {
    public static void main(String[] args) {
        int n = 6;
        int[] dp = new int[n + 1];
        dp[0] = 1;
        dp[1] = 1;
        for (int i = 2; i <= n; i++) {
            dp[i] = dp[i - 1] + dp[i - 2];
        }
        System.out.println("Ways to climb " + n + " stairs: " + dp[n]);
    }
}
`,
  },
  {
    id: "lcs",
    title: "Longest Common Subsequence (2D DP)",
    tag: "DP",
    code: `public class Main {
    public static void main(String[] args) {
        String a = "ABCB", b = "BDCB";
        int m = a.length(), n = b.length();
        int[][] dp = new int[m + 1][n + 1];

        for (int i = 1; i <= m; i++) {
            for (int j = 1; j <= n; j++) {
                if (a.charAt(i - 1) == b.charAt(j - 1)) {
                    dp[i][j] = dp[i - 1][j - 1] + 1;
                } else {
                    dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
                }
            }
        }
        System.out.println("LCS length: " + dp[m][n]);
    }
}
`,
  },
  {
    id: "heap",
    title: "K-th Largest (PriorityQueue)",
    tag: "Heap",
    code: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        int[] nums = {7, 2, 9, 4, 1, 8};
        int k = 3;
        PriorityQueue<Integer> minHeap = new PriorityQueue<>();
        for (int x : nums) {
            minHeap.offer(x);
            if (minHeap.size() > k) {
                minHeap.poll();
            }
        }
        System.out.println(k + "rd largest: " + minHeap.peek());
    }
}
`,
  },
  {
    id: "input",
    title: "Average of N numbers (Scanner)",
    tag: "Input",
    stdin: "4\n10 20 30 40",
    code: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        int[] nums = new int[n];
        int total = 0;
        for (int i = 0; i < n; i++) {
            nums[i] = sc.nextInt();
            total += nums[i];
        }
        System.out.println("Average: " + (double) total / n);
    }
}
`,
  },
];

const CPP: Example[] = [
  {
    id: "bubble",
    title: "Bubble Sort",
    tag: "Sorting",
    code: `#include <bits/stdc++.h>
using namespace std;

int main() {
    vector<int> arr = {5, 2, 9, 1, 6};
    int n = arr.size();

    for (int i = 0; i < n - 1; i++) {
        for (int j = 0; j < n - i - 1; j++) {
            if (arr[j] > arr[j + 1]) {
                swap(arr[j], arr[j + 1]);
            }
        }
    }

    cout << "Sorted: ";
    for (int x : arr) cout << x << " ";
    cout << endl;
    return 0;
}
`,
  },
  {
    id: "binary",
    title: "Binary Search",
    tag: "Searching",
    code: `#include <bits/stdc++.h>
using namespace std;

int binarySearch(vector<int>& arr, int target) {
    int low = 0, high = arr.size() - 1;
    while (low <= high) {
        int mid = (low + high) / 2;
        if (arr[mid] == target) {
            return mid;
        } else if (arr[mid] < target) {
            low = mid + 1;
        } else {
            high = mid - 1;
        }
    }
    return -1;
}

int main() {
    vector<int> nums = {2, 5, 8, 12, 16, 23, 38, 56};
    cout << "Found at index " << binarySearch(nums, 23) << endl;
    return 0;
}
`,
  },
  {
    id: "fib",
    title: "Fibonacci (Recursion)",
    tag: "Recursion",
    code: `#include <iostream>
using namespace std;

int fib(int n) {
    if (n <= 1) {
        return n;
    }
    return fib(n - 1) + fib(n - 2);
}

int main() {
    int result = fib(4);
    cout << result << endl;
    return 0;
}
`,
  },
  {
    id: "twosum",
    title: "Two Sum (unordered_map)",
    tag: "Hashing",
    code: `#include <bits/stdc++.h>
using namespace std;

vector<int> twoSum(vector<int>& nums, int target) {
    unordered_map<int, int> seen;
    for (int i = 0; i < nums.size(); i++) {
        int need = target - nums[i];
        if (seen.count(need)) {
            return {seen[need], i};
        }
        seen[nums[i]] = i;
    }
    return {};
}

int main() {
    vector<int> nums = {2, 7, 11, 15};
    vector<int> ans = twoSum(nums, 9);
    cout << ans[0] << ", " << ans[1] << endl;
    return 0;
}
`,
  },
  {
    id: "stack",
    title: "Valid Parentheses (stack)",
    tag: "Stack",
    code: `#include <bits/stdc++.h>
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
            if ((ch == ')' && top != '(') || (ch == ']' && top != '[') || (ch == '}' && top != '{')) {
                return false;
            }
        }
    }
    return st.empty();
}

int main() {
    cout << (isValid("{[()]}") ? "true" : "false") << endl;
    return 0;
}
`,
  },
  {
    id: "linked",
    title: "Reverse a Linked List",
    tag: "Linked List",
    code: `#include <iostream>
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
    head->next->next->next = new Node(4);

    head = reverse(head);
    for (Node* p = head; p != nullptr; p = p->next) {
        cout << p->val << " ";
    }
    return 0;
}
`,
  },
  {
    id: "bst",
    title: "Binary Search Tree",
    tag: "Tree",
    code: `#include <bits/stdc++.h>
using namespace std;

struct TreeNode {
    int val;
    TreeNode* left;
    TreeNode* right;
    TreeNode(int v) : val(v), left(nullptr), right(nullptr) {}
};

TreeNode* insert(TreeNode* root, int val) {
    if (root == nullptr) return new TreeNode(val);
    if (val < root->val) {
        root->left = insert(root->left, val);
    } else {
        root->right = insert(root->right, val);
    }
    return root;
}

void inorder(TreeNode* root, vector<int>& out) {
    if (root == nullptr) return;
    inorder(root->left, out);
    out.push_back(root->val);
    inorder(root->right, out);
}

int main() {
    TreeNode* root = nullptr;
    vector<int> values = {50, 30, 70, 20, 40, 60};
    for (int v : values) {
        root = insert(root, v);
    }
    vector<int> result;
    inorder(root, result);
    cout << "Inorder: ";
    for (int x : result) cout << x << " ";
    return 0;
}
`,
  },
  {
    id: "bfs",
    title: "BFS on a Graph (queue)",
    tag: "Graph",
    code: `#include <bits/stdc++.h>
using namespace std;

int main() {
    int n = 6;
    vector<vector<int>> adj(n);
    vector<pair<int, int>> edges = {{0, 1}, {0, 2}, {1, 3}, {1, 4}, {2, 4}, {3, 5}, {4, 5}};
    for (auto& e : edges) {
        adj[e.first].push_back(e.second);
        adj[e.second].push_back(e.first);
    }

    vector<bool> visited(n, false);
    queue<int> q;
    q.push(0);
    visited[0] = true;
    while (!q.empty()) {
        int node = q.front();
        q.pop();
        cout << node << " ";
        for (int nei : adj[node]) {
            if (!visited[nei]) {
                visited[nei] = true;
                q.push(nei);
            }
        }
    }
    return 0;
}
`,
  },
  {
    id: "dfs",
    title: "DFS on a Graph (Recursion)",
    tag: "Graph",
    code: `#include <bits/stdc++.h>
using namespace std;

vector<vector<int>> adj = {{1, 2}, {0, 3}, {0, 4}, {1}, {2}};
vector<bool> visited(5, false);

void dfs(int node) {
    visited[node] = true;
    cout << "visit " << node << endl;
    for (int nei : adj[node]) {
        if (!visited[nei]) {
            dfs(nei);
        }
    }
}

int main() {
    dfs(0);
    return 0;
}
`,
  },
  {
    id: "climb",
    title: "Climbing Stairs (1D DP)",
    tag: "DP",
    code: `#include <bits/stdc++.h>
using namespace std;

int main() {
    int n = 6;
    vector<int> dp(n + 1, 0);
    dp[0] = 1;
    dp[1] = 1;
    for (int i = 2; i <= n; i++) {
        dp[i] = dp[i - 1] + dp[i - 2];
    }
    cout << "Ways to climb " << n << " stairs: " << dp[n] << endl;
    return 0;
}
`,
  },
  {
    id: "lcs",
    title: "Longest Common Subsequence (2D DP)",
    tag: "DP",
    code: `#include <bits/stdc++.h>
using namespace std;

int main() {
    string a = "ABCB", b = "BDCB";
    int m = a.size(), n = b.size();
    vector<vector<int>> dp(m + 1, vector<int>(n + 1, 0));

    for (int i = 1; i <= m; i++) {
        for (int j = 1; j <= n; j++) {
            if (a[i - 1] == b[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1] + 1;
            } else {
                dp[i][j] = max(dp[i - 1][j], dp[i][j - 1]);
            }
        }
    }
    cout << "LCS length: " << dp[m][n] << endl;
    return 0;
}
`,
  },
  {
    id: "heap",
    title: "K-th Largest (priority_queue)",
    tag: "Heap",
    code: `#include <bits/stdc++.h>
using namespace std;

int main() {
    vector<int> nums = {7, 2, 9, 4, 1, 8};
    int k = 3;
    priority_queue<int, vector<int>, greater<int>> minHeap;
    for (int x : nums) {
        minHeap.push(x);
        if (minHeap.size() > k) {
            minHeap.pop();
        }
    }
    cout << k << "rd largest: " << minHeap.top() << endl;
    return 0;
}
`,
  },
  {
    id: "input",
    title: "Average of N numbers (cin)",
    tag: "Input",
    stdin: "4\n10 20 30 40",
    code: `#include <bits/stdc++.h>
using namespace std;

int main() {
    int n;
    cin >> n;
    vector<int> nums(n);
    int total = 0;
    for (int i = 0; i < n; i++) {
        cin >> nums[i];
        total += nums[i];
    }
    cout << "Average: " << (double) total / n << endl;
    return 0;
}
`,
  },
];

const C: Example[] = [
  {
    id: "bubble",
    title: "Bubble Sort (with pointers)",
    tag: "Sorting",
    code: `#include <stdio.h>

void swap(int *a, int *b) {
    int temp = *a;
    *a = *b;
    *b = temp;
}

int main() {
    int arr[] = {5, 2, 9, 1, 6};
    int n = sizeof(arr) / sizeof(arr[0]);

    for (int i = 0; i < n - 1; i++) {
        for (int j = 0; j < n - i - 1; j++) {
            if (arr[j] > arr[j + 1]) {
                swap(&arr[j], &arr[j + 1]);
            }
        }
    }

    printf("Sorted: ");
    for (int i = 0; i < n; i++) printf("%d ", arr[i]);
    printf("\\n");
    return 0;
}
`,
  },
  {
    id: "binary",
    title: "Binary Search",
    tag: "Searching",
    code: `#include <stdio.h>

int binarySearch(int arr[], int n, int target) {
    int low = 0, high = n - 1;
    while (low <= high) {
        int mid = (low + high) / 2;
        if (arr[mid] == target) {
            return mid;
        } else if (arr[mid] < target) {
            low = mid + 1;
        } else {
            high = mid - 1;
        }
    }
    return -1;
}

int main() {
    int nums[] = {2, 5, 8, 12, 16, 23, 38, 56};
    printf("Found at index %d\\n", binarySearch(nums, 8, 23));
    return 0;
}
`,
  },
  {
    id: "fib",
    title: "Fibonacci (Recursion)",
    tag: "Recursion",
    code: `#include <stdio.h>

int fib(int n) {
    if (n <= 1) {
        return n;
    }
    return fib(n - 1) + fib(n - 2);
}

int main() {
    int result = fib(4);
    printf("%d\\n", result);
    return 0;
}
`,
  },
  {
    id: "twosum",
    title: "Two Sum (brute force)",
    tag: "Arrays",
    code: `#include <stdio.h>

int main() {
    int nums[] = {2, 7, 11, 15};
    int n = 4, target = 9;

    for (int i = 0; i < n; i++) {
        for (int j = i + 1; j < n; j++) {
            if (nums[i] + nums[j] == target) {
                printf("%d, %d\\n", i, j);
                return 0;
            }
        }
    }
    printf("No pair found\\n");
    return 0;
}
`,
  },
  {
    id: "stack",
    title: "Valid Parentheses (array stack)",
    tag: "Stack",
    code: `#include <stdio.h>
#include <string.h>

int isValid(char s[]) {
    char stack[100];
    int top = -1;
    for (int i = 0; i < strlen(s); i++) {
        char ch = s[i];
        if (ch == '(' || ch == '[' || ch == '{') {
            stack[++top] = ch;
        } else {
            if (top == -1) return 0;
            char open = stack[top--];
            if ((ch == ')' && open != '(') || (ch == ']' && open != '[') || (ch == '}' && open != '{')) {
                return 0;
            }
        }
    }
    return top == -1;
}

int main() {
    printf("%s\\n", isValid("{[()]}") ? "valid" : "invalid");
    return 0;
}
`,
  },
  {
    id: "linked",
    title: "Reverse a Linked List (malloc)",
    tag: "Linked List",
    code: `#include <stdio.h>
#include <stdlib.h>

struct Node {
    int data;
    struct Node* next;
};

struct Node* createNode(int data) {
    struct Node* node = (struct Node*)malloc(sizeof(struct Node));
    node->data = data;
    node->next = NULL;
    return node;
}

struct Node* reverse(struct Node* head) {
    struct Node* prev = NULL;
    struct Node* curr = head;
    while (curr != NULL) {
        struct Node* next = curr->next;
        curr->next = prev;
        prev = curr;
        curr = next;
    }
    return prev;
}

int main() {
    struct Node* head = createNode(1);
    head->next = createNode(2);
    head->next->next = createNode(3);
    head->next->next->next = createNode(4);

    head = reverse(head);
    for (struct Node* p = head; p != NULL; p = p->next) {
        printf("%d ", p->data);
    }
    return 0;
}
`,
  },
  {
    id: "bst",
    title: "Binary Search Tree (malloc)",
    tag: "Tree",
    code: `#include <stdio.h>
#include <stdlib.h>

struct TreeNode {
    int val;
    struct TreeNode* left;
    struct TreeNode* right;
};

struct TreeNode* newNode(int val) {
    struct TreeNode* node = (struct TreeNode*)malloc(sizeof(struct TreeNode));
    node->val = val;
    node->left = NULL;
    node->right = NULL;
    return node;
}

struct TreeNode* insert(struct TreeNode* root, int val) {
    if (root == NULL) return newNode(val);
    if (val < root->val) {
        root->left = insert(root->left, val);
    } else {
        root->right = insert(root->right, val);
    }
    return root;
}

void inorder(struct TreeNode* root) {
    if (root == NULL) return;
    inorder(root->left);
    printf("%d ", root->val);
    inorder(root->right);
}

int main() {
    struct TreeNode* root = NULL;
    int values[] = {50, 30, 70, 20, 40, 60};
    for (int i = 0; i < 6; i++) {
        root = insert(root, values[i]);
    }
    printf("Inorder: ");
    inorder(root);
    return 0;
}
`,
  },
  {
    id: "bfs",
    title: "BFS (adjacency matrix + array queue)",
    tag: "Graph",
    code: `#include <stdio.h>

int main() {
    int n = 6;
    int adj[6][6] = {
        {0, 1, 1, 0, 0, 0},
        {1, 0, 0, 1, 1, 0},
        {1, 0, 0, 0, 1, 0},
        {0, 1, 0, 0, 0, 1},
        {0, 1, 1, 0, 0, 1},
        {0, 0, 0, 1, 1, 0},
    };
    int visited[6] = {0};
    int queue[6];
    int front = 0, rear = 0;

    queue[rear++] = 0;
    visited[0] = 1;
    while (front < rear) {
        int node = queue[front++];
        printf("%d ", node);
        for (int nei = 0; nei < n; nei++) {
            if (adj[node][nei] == 1 && !visited[nei]) {
                visited[nei] = 1;
                queue[rear++] = nei;
            }
        }
    }
    return 0;
}
`,
  },
  {
    id: "dfs",
    title: "DFS (adjacency matrix + recursion)",
    tag: "Graph",
    code: `#include <stdio.h>

int adj[5][5] = {
    {0, 1, 1, 0, 0},
    {1, 0, 0, 1, 0},
    {1, 0, 0, 0, 1},
    {0, 1, 0, 0, 0},
    {0, 0, 1, 0, 0},
};
int visited[5];

void dfs(int node) {
    visited[node] = 1;
    printf("visit %d\\n", node);
    for (int nei = 0; nei < 5; nei++) {
        if (adj[node][nei] && !visited[nei]) {
            dfs(nei);
        }
    }
}

int main() {
    dfs(0);
    return 0;
}
`,
  },
  {
    id: "climb",
    title: "Climbing Stairs (1D DP)",
    tag: "DP",
    code: `#include <stdio.h>

int main() {
    int n = 6;
    int dp[7];
    dp[0] = 1;
    dp[1] = 1;
    for (int i = 2; i <= n; i++) {
        dp[i] = dp[i - 1] + dp[i - 2];
    }
    printf("Ways to climb %d stairs: %d\\n", n, dp[n]);
    return 0;
}
`,
  },
  {
    id: "lcs",
    title: "Longest Common Subsequence (2D DP)",
    tag: "DP",
    code: `#include <stdio.h>
#include <string.h>

int max(int a, int b) {
    return a > b ? a : b;
}

int main() {
    char a[] = "ABCB";
    char b[] = "BDCB";
    int m = strlen(a), n = strlen(b);
    int dp[5][5] = {0};

    for (int i = 1; i <= m; i++) {
        for (int j = 1; j <= n; j++) {
            if (a[i - 1] == b[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1] + 1;
            } else {
                dp[i][j] = max(dp[i - 1][j], dp[i][j - 1]);
            }
        }
    }
    printf("LCS length: %d\\n", dp[m][n]);
    return 0;
}
`,
  },
  {
    id: "input",
    title: "Average of N numbers (scanf)",
    tag: "Input",
    stdin: "4\n10 20 30 40",
    code: `#include <stdio.h>

int main() {
    int n;
    scanf("%d", &n);
    int nums[100];
    int total = 0;
    for (int i = 0; i < n; i++) {
        scanf("%d", &nums[i]);
        total += nums[i];
    }
    printf("Average: %.2f\\n", (double) total / n);
    return 0;
}
`,
  },
];

export const EXAMPLES: Record<Language, Example[]> = { python: PYTHON, java: JAVA, cpp: CPP, c: C };

/** Kept for older imports. */
export const PYTHON_EXAMPLES = PYTHON;
