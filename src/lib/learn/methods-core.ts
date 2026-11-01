import type { Method } from "./types";

// Strings, hashing, pointer tricks, searching, sorting and matrix techniques.

export const palindrome: Method = {
  id: "palindrome",
  name: "Palindromes (two pointers / expand around center)",
  idea: "Compare characters from both ends, or grow outward from every center to find palindromic substrings.",
  when: ["\"Is it a palindrome?\" (maybe after deleting one char)", "Longest palindromic substring", "Count palindromic substrings"],
  brute: "O(n³) — check every substring",
  optimal: "O(n) check, O(n²) expand-around-center",
  steps: ["For each center (a char, or the gap between two chars):", "Expand left and right while the characters match.", "Track the longest (or count every) palindrome found."],
  code: {
    python: `def longest_palindrome(s):
    best = ""
    for center in range(len(s)):
        for l, r in ((center, center), (center, center + 1)):
            while l >= 0 and r < len(s) and s[l] == s[r]:
                l -= 1
                r += 1
            if r - l - 1 > len(best):
                best = s[l + 1:r]
    return best

print(longest_palindrome("babad"))
`,
    java: `public class Main {
    static int expand(String s, int l, int r) {
        while (l >= 0 && r < s.length() && s.charAt(l) == s.charAt(r)) {
            l--;
            r++;
        }
        return r - l - 1;
    }

    static String longestPalindrome(String s) {
        int start = 0, best = 0;
        for (int c = 0; c < s.length(); c++) {
            int len = Math.max(expand(s, c, c), expand(s, c, c + 1));
            if (len > best) {
                best = len;
                start = c - (len - 1) / 2;
            }
        }
        return s.substring(start, start + best);
    }

    public static void main(String[] args) {
        System.out.println(longestPalindrome("babad"));
    }
}
`,
    cpp: `#include <bits/stdc++.h>
using namespace std;

int expand(string& s, int l, int r) {
    while (l >= 0 && r < s.size() && s[l] == s[r]) {
        l--;
        r++;
    }
    return r - l - 1;
}

string longestPalindrome(string s) {
    int start = 0, best = 0;
    for (int c = 0; c < s.size(); c++) {
        int len = max(expand(s, c, c), expand(s, c, c + 1));
        if (len > best) {
            best = len;
            start = c - (len - 1) / 2;
        }
    }
    return s.substr(start, best);
}

int main() {
    cout << longestPalindrome("babad") << endl;
    return 0;
}
`,
  },
  problems: [125, 344, 345, 680, 5, 647, 214],
};

export const charFreq: Method = {
  id: "frequency-count",
  name: "Frequency Counting",
  idea: "Count how often each character / value appears (array of 26 or a hash map) and compare or sort by those counts.",
  when: ["Anagrams, ransom note, first unique character", "Group strings by their letter counts", "Map one pattern to another (isomorphic, word pattern)"],
  brute: "O(n²) or sort every string",
  optimal: "O(n) time, O(1) space for a fixed alphabet",
  steps: ["Create count[26] (or a map).", "Add 1 for each char of the first string, subtract for the second.", "All counts zero ⇒ same multiset of characters."],
  code: {
    python: `def is_anagram(s, t):
    if len(s) != len(t):
        return False
    count = [0] * 26
    for a, b in zip(s, t):
        count[ord(a) - ord("a")] += 1
        count[ord(b) - ord("a")] -= 1
    return all(c == 0 for c in count)

print(is_anagram("listen", "silent"))
`,
    java: `public class Main {
    static boolean isAnagram(String s, String t) {
        if (s.length() != t.length()) return false;
        int[] count = new int[26];
        for (int i = 0; i < s.length(); i++) {
            count[s.charAt(i) - 'a']++;
            count[t.charAt(i) - 'a']--;
        }
        for (int c : count) if (c != 0) return false;
        return true;
    }

    public static void main(String[] args) {
        System.out.println(isAnagram("listen", "silent"));
    }
}
`,
    cpp: `#include <bits/stdc++.h>
using namespace std;

bool isAnagram(string s, string t) {
    if (s.size() != t.size()) return false;
    vector<int> count(26, 0);
    for (int i = 0; i < s.size(); i++) {
        count[s[i] - 'a']++;
        count[t[i] - 'a']--;
    }
    for (int c : count) if (c != 0) return false;
    return true;
}

int main() {
    cout << (isAnagram("listen", "silent") ? "true" : "false") << endl;
    return 0;
}
`,
    c: `#include <stdio.h>
#include <string.h>

int main() {
    char s[] = "listen";
    char t[] = "silent";
    int count[26] = {0};
    int n = strlen(s);
    for (int i = 0; i < n; i++) {
        count[s[i] - 'a']++;
        count[t[i] - 'a']--;
    }
    int ok = 1;
    for (int i = 0; i < 26; i++) if (count[i] != 0) ok = 0;
    printf("%s", ok ? "anagram" : "not anagram");
    return 0;
}
`,
  },
  problems: [242, 387, 383, 389, 205, 290, 1207, 49, 451, 438],
};

export const stringBuild: Method = {
  id: "string-parsing",
  name: "String Parsing & Building",
  idea: "Scan the string once, keep a small state (number so far, sign, current word) and build the result with a builder.",
  when: ["Convert between formats (Roman numerals, atoi, binary add)", "Reverse words, simplify a path", "Decode encoded strings"],
  brute: "Repeated string concatenation O(n²)",
  optimal: "O(n) with a StringBuilder / list of parts",
  steps: ["Walk the characters left to right (or right to left for adding numbers).", "Update state for digits, letters, signs, separators.", "Append to a builder; join at the end."],
  code: {
    python: `def roman_to_int(s):
    value = {"I": 1, "V": 5, "X": 10, "L": 50, "C": 100, "D": 500, "M": 1000}
    total = 0
    for i in range(len(s)):
        v = value[s[i]]
        if i + 1 < len(s) and v < value[s[i + 1]]:
            total -= v          # IV = 5 - 1
        else:
            total += v
    return total

print(roman_to_int("MCMXCIV"))
`,
    java: `import java.util.*;

public class Main {
    static int romanToInt(String s) {
        Map<Character, Integer> value = new HashMap<>();
        value.put('I', 1); value.put('V', 5); value.put('X', 10); value.put('L', 50);
        value.put('C', 100); value.put('D', 500); value.put('M', 1000);
        int total = 0;
        for (int i = 0; i < s.length(); i++) {
            int v = value.get(s.charAt(i));
            if (i + 1 < s.length() && v < value.get(s.charAt(i + 1))) total -= v;
            else total += v;
        }
        return total;
    }

    public static void main(String[] args) {
        System.out.println(romanToInt("MCMXCIV"));
    }
}
`,
    cpp: `#include <bits/stdc++.h>
using namespace std;

int romanToInt(string s) {
    unordered_map<char, int> value = {{'I', 1}, {'V', 5}, {'X', 10}, {'L', 50}, {'C', 100}, {'D', 500}, {'M', 1000}};
    int total = 0;
    for (int i = 0; i < s.size(); i++) {
        int v = value[s[i]];
        if (i + 1 < s.size() && v < value[s[i + 1]]) total -= v;
        else total += v;
    }
    return total;
}

int main() {
    cout << romanToInt("MCMXCIV") << endl;
    return 0;
}
`,
  },
  problems: [13, 14, 58, 67, 151, 8, 43, 6, 394, 224],
};

export const kmp: Method = {
  id: "kmp",
  name: "Pattern Matching (KMP / LPS array)",
  idea: "Precompute, for every prefix of the pattern, the longest proper prefix that is also a suffix, so a mismatch never re-scans text.",
  when: ["Find a pattern inside a text", "Repeated substring patterns, rotations", "Longest prefix that is also a suffix"],
  brute: "O(n·m) — try every start",
  optimal: "O(n + m)",
  steps: ["Build lps[]: lps[i] = length of the longest prefix of pattern[0..i] that is also its suffix.", "Scan the text with j = matched length.", "On mismatch, fall back to j = lps[j − 1] instead of restarting.", "When j == pattern length, a match ends here."],
  code: {
    python: `def build_lps(p):
    lps = [0] * len(p)
    length = 0
    for i in range(1, len(p)):
        while length > 0 and p[i] != p[length]:
            length = lps[length - 1]
        if p[i] == p[length]:
            length += 1
        lps[i] = length
    return lps

def kmp_search(text, p):
    lps = build_lps(p)
    j = 0
    for i in range(len(text)):
        while j > 0 and text[i] != p[j]:
            j = lps[j - 1]
        if text[i] == p[j]:
            j += 1
        if j == len(p):
            return i - j + 1
    return -1

print(kmp_search("aabaacaadaabaaba", "aaba"))
`,
    java: `public class Main {
    static int kmpSearch(String text, String p) {
        int[] lps = new int[p.length()];
        int len = 0;
        for (int i = 1; i < p.length(); i++) {
            while (len > 0 && p.charAt(i) != p.charAt(len)) len = lps[len - 1];
            if (p.charAt(i) == p.charAt(len)) len++;
            lps[i] = len;
        }
        int j = 0;
        for (int i = 0; i < text.length(); i++) {
            while (j > 0 && text.charAt(i) != p.charAt(j)) j = lps[j - 1];
            if (text.charAt(i) == p.charAt(j)) j++;
            if (j == p.length()) return i - j + 1;
        }
        return -1;
    }

    public static void main(String[] args) {
        System.out.println(kmpSearch("aabaacaadaabaaba", "aaba"));
    }
}
`,
    cpp: `#include <bits/stdc++.h>
using namespace std;

int kmpSearch(string text, string p) {
    vector<int> lps(p.size(), 0);
    int len = 0;
    for (int i = 1; i < p.size(); i++) {
        while (len > 0 && p[i] != p[len]) len = lps[len - 1];
        if (p[i] == p[len]) len++;
        lps[i] = len;
    }
    int j = 0;
    for (int i = 0; i < text.size(); i++) {
        while (j > 0 && text[i] != p[j]) j = lps[j - 1];
        if (text[i] == p[j]) j++;
        if (j == p.size()) return i - j + 1;
    }
    return -1;
}

int main() {
    cout << kmpSearch("aabaacaadaabaaba", "aaba") << endl;
    return 0;
}
`,
  },
  problems: [28, 459, 796, 686, 1392, 214],
};

export const designHash: Method = {
  id: "design-hashing",
  name: "Design with HashMaps (LRU & co.)",
  idea: "Combine a hash map (O(1) lookup) with a list / array / linked list (O(1) order or random access).",
  when: ["\"Design a data structure\" with O(1) operations", "LRU / LFU caches", "Insert, delete and get-random in O(1)"],
  brute: "O(n) scans per operation",
  optimal: "O(1) average per operation",
  steps: ["Pick the operations you need in O(1).", "A map gives key → position / node.", "A second structure keeps order (doubly linked list) or random access (array).", "Keep both in sync on every update."],
  code: {
    python: `from collections import OrderedDict

class LRUCache:
    def __init__(self, capacity):
        self.capacity = capacity
        self.data = OrderedDict()

    def get(self, key):
        if key not in self.data:
            return -1
        self.data.move_to_end(key)          # most recently used
        return self.data[key]

    def put(self, key, value):
        self.data[key] = value
        self.data.move_to_end(key)
        if len(self.data) > self.capacity:
            self.data.popitem(last=False)   # evict least recently used

cache = LRUCache(2)
cache.put(1, 1)
cache.put(2, 2)
print(cache.get(1))
cache.put(3, 3)
print(cache.get(2))
`,
    java: `import java.util.*;

public class Main {
    static int capacity = 2;
    static Map<Integer, Integer> data = new HashMap<>();
    static List<Integer> order = new ArrayList<>();   // front = least recently used

    static void touch(int key) {
        order.remove((Integer) key);   // remove by value, not by index
        order.add(key);
    }

    static int get(int key) {
        if (!data.containsKey(key)) return -1;
        touch(key);
        return data.get(key);
    }

    static void put(int key, int value) {
        data.put(key, value);
        touch(key);
        if (data.size() > capacity) {
            int old = order.remove(0);
            data.remove(old);
        }
    }

    public static void main(String[] args) {
        put(1, 1);
        put(2, 2);
        System.out.println(get(1));
        put(3, 3);
        System.out.println(get(2));
    }
}
`,
    cpp: `#include <bits/stdc++.h>
using namespace std;

int capacity = 2;
unordered_map<int, int> data;
vector<int> order;   // front = least recently used

void touch(int key) {
    for (int i = 0; i < order.size(); i++) {
        if (order[i] == key) {
            order.erase(order.begin() + i);
            break;
        }
    }
    order.push_back(key);
}

int get(int key) {
    if (!data.count(key)) return -1;
    touch(key);
    return data[key];
}

void put(int key, int value) {
    data[key] = value;
    touch(key);
    if (data.size() > capacity) {
        int old = order[0];
        order.erase(order.begin());
        data.erase(old);
    }
}

int main() {
    put(1, 1);
    put(2, 2);
    cout << get(1) << endl;
    put(3, 3);
    cout << get(2) << endl;
    return 0;
}
`,
  },
  problems: [146, 380, 355, 460],
};

export const fastSlow: Method = {
  id: "fast-slow-pointers",
  name: "Fast & Slow Pointers",
  idea: "Move one pointer 1 step and another 2 steps; they meet inside a cycle, and slow lands on the middle when fast reaches the end.",
  when: ["Detect a cycle (linked list, number sequences)", "Find the middle of a linked list", "Find the start of a cycle / duplicate number"],
  brute: "Hash set of visited nodes: O(n) space",
  optimal: "O(n) time, O(1) space",
  steps: ["slow = fast = head.", "Loop: slow = slow.next, fast = fast.next.next.", "If they meet, there is a cycle.", "If fast reaches the end, slow is at the middle."],
  code: {
    python: `class Node:
    def __init__(self, val):
        self.val = val
        self.next = None

def middle(head):
    slow = fast = head
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
    return slow

head = Node(1)
head.next = Node(2)
head.next.next = Node(3)
head.next.next.next = Node(4)
head.next.next.next.next = Node(5)
print(middle(head).val)
`,
    java: `class Node {
    int val;
    Node next;
    Node(int val) { this.val = val; }
}

public class Main {
    static Node middle(Node head) {
        Node slow = head, fast = head;
        while (fast != null && fast.next != null) {
            slow = slow.next;
            fast = fast.next.next;
        }
        return slow;
    }

    public static void main(String[] args) {
        Node head = new Node(1);
        head.next = new Node(2);
        head.next.next = new Node(3);
        head.next.next.next = new Node(4);
        head.next.next.next.next = new Node(5);
        System.out.println(middle(head).val);
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

Node* middle(Node* head) {
    Node* slow = head;
    Node* fast = head;
    while (fast != nullptr && fast->next != nullptr) {
        slow = slow->next;
        fast = fast->next->next;
    }
    return slow;
}

int main() {
    Node* head = new Node(1);
    head->next = new Node(2);
    head->next->next = new Node(3);
    head->next->next->next = new Node(4);
    head->next->next->next->next = new Node(5);
    cout << middle(head)->val << endl;
    return 0;
}
`,
  },
  problems: [141, 876, 202, 234, 142, 287, 19, 143],
};

export const monoDeque: Method = {
  id: "monotonic-deque",
  name: "Monotonic Deque",
  idea: "Keep window indices in a deque with decreasing values; the front is always the window maximum.",
  when: ["Max / min of every sliding window", "DP where each state takes the best of the last k states", "Shortest subarray with sum ≥ k (with negatives)"],
  brute: "O(n·k)",
  optimal: "O(n)",
  steps: ["For each index i: pop from the back while the back value ≤ nums[i].", "Push i to the back.", "Pop the front if it left the window (front ≤ i − k).", "Front is the max of the current window."],
  code: {
    python: `from collections import deque

def max_sliding_window(nums, k):
    dq = deque()      # indices, values decreasing
    result = []
    for i in range(len(nums)):
        while dq and nums[dq[-1]] <= nums[i]:
            dq.pop()
        dq.append(i)
        if dq[0] <= i - k:
            dq.popleft()
        if i >= k - 1:
            result.append(nums[dq[0]])
    return result

print(max_sliding_window([1, 3, -1, -3, 5, 3, 6, 7], 3))
`,
    java: `import java.util.*;

public class Main {
    static List<Integer> maxSlidingWindow(int[] nums, int k) {
        Deque<Integer> dq = new ArrayDeque<>();
        List<Integer> result = new ArrayList<>();
        for (int i = 0; i < nums.length; i++) {
            while (!dq.isEmpty() && nums[dq.peekLast()] <= nums[i]) dq.pollLast();
            dq.offerLast(i);
            if (dq.peekFirst() <= i - k) dq.pollFirst();
            if (i >= k - 1) result.add(nums[dq.peekFirst()]);
        }
        return result;
    }

    public static void main(String[] args) {
        System.out.println(maxSlidingWindow(new int[]{1, 3, -1, -3, 5, 3, 6, 7}, 3));
    }
}
`,
    cpp: `#include <bits/stdc++.h>
using namespace std;

vector<int> maxSlidingWindow(vector<int>& nums, int k) {
    deque<int> dq;
    vector<int> result;
    for (int i = 0; i < nums.size(); i++) {
        while (!dq.empty() && nums[dq.back()] <= nums[i]) dq.pop_back();
        dq.push_back(i);
        if (dq.front() <= i - k) dq.pop_front();
        if (i >= k - 1) result.push_back(nums[dq.front()]);
    }
    return result;
}

int main() {
    vector<int> nums = {1, 3, -1, -3, 5, 3, 6, 7};
    vector<int> res = maxSlidingWindow(nums, 3);
    for (int x : res) cout << x << " ";
    return 0;
}
`,
  },
  problems: [1438, 1696, 239, 862],
};

export const prefix2d: Method = {
  id: "prefix-sum-2d",
  name: "2D Prefix Sum",
  idea: "P[i][j] = sum of the rectangle from (0,0) to (i−1, j−1); any sub-rectangle sum is 4 lookups.",
  when: ["Many rectangle-sum queries on a grid", "Block / neighborhood sums", "Max-sum sub-rectangle problems"],
  brute: "O(rows·cols) per query",
  optimal: "O(rows·cols) build, O(1) per query",
  steps: ["P has one extra row and column of zeros.", "P[i+1][j+1] = grid[i][j] + P[i][j+1] + P[i+1][j] − P[i][j].", "Sum(r1,c1,r2,c2) = P[r2+1][c2+1] − P[r1][c2+1] − P[r2+1][c1] + P[r1][c1]."],
  code: {
    python: `grid = [[3, 0, 1], [5, 6, 3], [1, 2, 0]]
rows, cols = len(grid), len(grid[0])
P = [[0] * (cols + 1) for _ in range(rows + 1)]
for i in range(rows):
    for j in range(cols):
        P[i + 1][j + 1] = grid[i][j] + P[i][j + 1] + P[i + 1][j] - P[i][j]

def region(r1, c1, r2, c2):
    return P[r2 + 1][c2 + 1] - P[r1][c2 + 1] - P[r2 + 1][c1] + P[r1][c1]

print(region(1, 1, 2, 2))
`,
    java: `public class Main {
    public static void main(String[] args) {
        int[][] grid = {{3, 0, 1}, {5, 6, 3}, {1, 2, 0}};
        int rows = grid.length, cols = grid[0].length;
        int[][] P = new int[rows + 1][cols + 1];
        for (int i = 0; i < rows; i++) {
            for (int j = 0; j < cols; j++) {
                P[i + 1][j + 1] = grid[i][j] + P[i][j + 1] + P[i + 1][j] - P[i][j];
            }
        }
        int r1 = 1, c1 = 1, r2 = 2, c2 = 2;
        System.out.println(P[r2 + 1][c2 + 1] - P[r1][c2 + 1] - P[r2 + 1][c1] + P[r1][c1]);
    }
}
`,
    cpp: `#include <bits/stdc++.h>
using namespace std;

int main() {
    vector<vector<int>> grid = {{3, 0, 1}, {5, 6, 3}, {1, 2, 0}};
    int rows = grid.size(), cols = grid[0].size();
    vector<vector<int>> P(rows + 1, vector<int>(cols + 1, 0));
    for (int i = 0; i < rows; i++) {
        for (int j = 0; j < cols; j++) {
            P[i + 1][j + 1] = grid[i][j] + P[i][j + 1] + P[i + 1][j] - P[i][j];
        }
    }
    int r1 = 1, c1 = 1, r2 = 2, c2 = 2;
    cout << P[r2 + 1][c2 + 1] - P[r1][c2 + 1] - P[r2 + 1][c1] + P[r1][c1] << endl;
    return 0;
}
`,
  },
  problems: [304, 1314, 221, 363],
};

export const bsRotated: Method = {
  id: "binary-search-rotated",
  name: "Binary Search on Rotated / Mountain Arrays",
  idea: "Even if the whole array is not sorted, one half around mid always is — decide which half is sorted and whether the target lies in it.",
  when: ["Sorted array that was rotated", "Find the minimum / pivot", "Peak element, mountain arrays"],
  brute: "O(n) scan",
  optimal: "O(log n)",
  steps: ["mid = (low + high) / 2.", "If nums[low] ≤ nums[mid], the left half is sorted; else the right half is.", "If the target is inside the sorted half, search there; otherwise search the other half."],
  code: {
    python: `def search(nums, target):
    low, high = 0, len(nums) - 1
    while low <= high:
        mid = (low + high) // 2
        if nums[mid] == target:
            return mid
        if nums[low] <= nums[mid]:               # left half sorted
            if nums[low] <= target < nums[mid]:
                high = mid - 1
            else:
                low = mid + 1
        else:                                    # right half sorted
            if nums[mid] < target <= nums[high]:
                low = mid + 1
            else:
                high = mid - 1
    return -1

print(search([4, 5, 6, 7, 0, 1, 2], 0))
`,
    java: `public class Main {
    static int search(int[] nums, int target) {
        int low = 0, high = nums.length - 1;
        while (low <= high) {
            int mid = (low + high) / 2;
            if (nums[mid] == target) return mid;
            if (nums[low] <= nums[mid]) {
                if (nums[low] <= target && target < nums[mid]) high = mid - 1;
                else low = mid + 1;
            } else {
                if (nums[mid] < target && target <= nums[high]) low = mid + 1;
                else high = mid - 1;
            }
        }
        return -1;
    }

    public static void main(String[] args) {
        System.out.println(search(new int[]{4, 5, 6, 7, 0, 1, 2}, 0));
    }
}
`,
    cpp: `#include <bits/stdc++.h>
using namespace std;

int search(vector<int>& nums, int target) {
    int low = 0, high = nums.size() - 1;
    while (low <= high) {
        int mid = (low + high) / 2;
        if (nums[mid] == target) return mid;
        if (nums[low] <= nums[mid]) {
            if (nums[low] <= target && target < nums[mid]) high = mid - 1;
            else low = mid + 1;
        } else {
            if (nums[mid] < target && target <= nums[high]) low = mid + 1;
            else high = mid - 1;
        }
    }
    return -1;
}

int main() {
    vector<int> nums = {4, 5, 6, 7, 0, 1, 2};
    cout << search(nums, 0) << endl;
    return 0;
}
`,
  },
  problems: [33, 81, 153, 162, 1095],
};

export const matrixSearch: Method = {
  id: "matrix-search",
  name: "Searching a Sorted Matrix",
  idea: "Start at the top-right corner: moving left makes values smaller, moving down makes them larger — one step removes a row or column.",
  when: ["Rows and columns are sorted", "Find a target or count values ≤ x in a matrix", "K-th smallest in a sorted matrix"],
  brute: "O(rows · cols)",
  optimal: "O(rows + cols) staircase, or O(log(rows·cols)) for a fully sorted matrix",
  steps: ["row = 0, col = last column.", "If value == target, found.", "If value > target, col −= 1; else row += 1.", "Stop when you leave the matrix."],
  code: {
    python: `def search_matrix(matrix, target):
    row, col = 0, len(matrix[0]) - 1
    while row < len(matrix) and col >= 0:
        value = matrix[row][col]
        if value == target:
            return True
        if value > target:
            col -= 1
        else:
            row += 1
    return False

matrix = [[1, 4, 7, 11], [2, 5, 8, 12], [3, 6, 9, 16], [10, 13, 14, 17]]
print(search_matrix(matrix, 5))
`,
    java: `public class Main {
    static boolean searchMatrix(int[][] matrix, int target) {
        int row = 0, col = matrix[0].length - 1;
        while (row < matrix.length && col >= 0) {
            int value = matrix[row][col];
            if (value == target) return true;
            if (value > target) col--;
            else row++;
        }
        return false;
    }

    public static void main(String[] args) {
        int[][] matrix = {{1, 4, 7, 11}, {2, 5, 8, 12}, {3, 6, 9, 16}, {10, 13, 14, 17}};
        System.out.println(searchMatrix(matrix, 5));
    }
}
`,
    cpp: `#include <bits/stdc++.h>
using namespace std;

bool searchMatrix(vector<vector<int>>& matrix, int target) {
    int row = 0, col = matrix[0].size() - 1;
    while (row < matrix.size() && col >= 0) {
        int value = matrix[row][col];
        if (value == target) return true;
        if (value > target) col--;
        else row++;
    }
    return false;
}

int main() {
    vector<vector<int>> matrix = {{1, 4, 7, 11}, {2, 5, 8, 12}, {3, 6, 9, 16}, {10, 13, 14, 17}};
    cout << (searchMatrix(matrix, 5) ? "true" : "false") << endl;
    return 0;
}
`,
  },
  problems: [74, 240, 378],
};

export const mergeSortCount: Method = {
  id: "merge-sort",
  name: "Merge Sort (and counting while merging)",
  idea: "Split in half, sort each half, merge — and while merging you can count pairs like inversions in O(n log n).",
  when: ["Sort with guaranteed O(n log n) (also on linked lists)", "Count inversions / smaller elements after self / reverse pairs"],
  brute: "O(n²) pair counting",
  optimal: "O(n log n)",
  steps: ["If size ≤ 1, return.", "Sort the left half and the right half recursively.", "Merge with two pointers, always taking the smaller head.", "To count pairs, count during the merge step."],
  code: {
    python: `def merge_sort(a):
    if len(a) <= 1:
        return a
    mid = len(a) // 2
    left = merge_sort(a[:mid])
    right = merge_sort(a[mid:])
    merged = []
    i = j = 0
    while i < len(left) and j < len(right):
        if left[i] <= right[j]:
            merged.append(left[i])
            i += 1
        else:
            merged.append(right[j])
            j += 1
    return merged + left[i:] + right[j:]

print(merge_sort([5, 2, 4, 6, 1, 3]))
`,
    java: `import java.util.*;

public class Main {
    static void mergeSort(int[] a, int lo, int hi) {
        if (hi - lo < 1) return;
        int mid = (lo + hi) / 2;
        mergeSort(a, lo, mid);
        mergeSort(a, mid + 1, hi);
        int[] tmp = new int[hi - lo + 1];
        int i = lo, j = mid + 1, k = 0;
        while (i <= mid && j <= hi) tmp[k++] = a[i] <= a[j] ? a[i++] : a[j++];
        while (i <= mid) tmp[k++] = a[i++];
        while (j <= hi) tmp[k++] = a[j++];
        for (k = 0; k < tmp.length; k++) a[lo + k] = tmp[k];
    }

    public static void main(String[] args) {
        int[] a = {5, 2, 4, 6, 1, 3};
        mergeSort(a, 0, a.length - 1);
        System.out.println(Arrays.toString(a));
    }
}
`,
    cpp: `#include <bits/stdc++.h>
using namespace std;

void mergeSort(vector<int>& a, int lo, int hi) {
    if (hi - lo < 1) return;
    int mid = (lo + hi) / 2;
    mergeSort(a, lo, mid);
    mergeSort(a, mid + 1, hi);
    vector<int> tmp;
    int i = lo, j = mid + 1;
    while (i <= mid && j <= hi) {
        if (a[i] <= a[j]) tmp.push_back(a[i++]);
        else tmp.push_back(a[j++]);
    }
    while (i <= mid) tmp.push_back(a[i++]);
    while (j <= hi) tmp.push_back(a[j++]);
    for (int k = 0; k < tmp.size(); k++) a[lo + k] = tmp[k];
}

int main() {
    vector<int> a = {5, 2, 4, 6, 1, 3};
    mergeSort(a, 0, a.size() - 1);
    for (int x : a) cout << x << " ";
    return 0;
}
`,
  },
  problems: [88, 912, 148, 315, 493],
};

export const quickselect: Method = {
  id: "quickselect",
  name: "Quickselect (k-th element)",
  idea: "Partition around a pivot like quicksort, but recurse only into the side that contains the k-th position.",
  when: ["K-th largest / smallest without fully sorting", "Top-k closest points", "Median finding"],
  brute: "Sort: O(n log n)",
  optimal: "O(n) average (O(n²) worst case), or a heap in O(n log k)",
  steps: ["Pick a pivot (last element).", "Partition: smaller to the left, larger to the right.", "If the pivot lands at index k, done; otherwise continue only on the side holding k."],
  code: {
    python: `def kth_largest(nums, k):
    target = len(nums) - k          # index in sorted order
    lo, hi = 0, len(nums) - 1
    while True:
        pivot = nums[hi]
        store = lo
        for i in range(lo, hi):
            if nums[i] < pivot:
                nums[i], nums[store] = nums[store], nums[i]
                store += 1
        nums[store], nums[hi] = nums[hi], nums[store]
        if store == target:
            return nums[store]
        if store < target:
            lo = store + 1
        else:
            hi = store - 1

print(kth_largest([3, 2, 1, 5, 6, 4], 2))
`,
    java: `public class Main {
    static int kthLargest(int[] nums, int k) {
        int target = nums.length - k, lo = 0, hi = nums.length - 1;
        while (true) {
            int pivot = nums[hi], store = lo;
            for (int i = lo; i < hi; i++) {
                if (nums[i] < pivot) {
                    int t = nums[i]; nums[i] = nums[store]; nums[store] = t;
                    store++;
                }
            }
            int t = nums[store]; nums[store] = nums[hi]; nums[hi] = t;
            if (store == target) return nums[store];
            if (store < target) lo = store + 1;
            else hi = store - 1;
        }
    }

    public static void main(String[] args) {
        System.out.println(kthLargest(new int[]{3, 2, 1, 5, 6, 4}, 2));
    }
}
`,
    cpp: `#include <bits/stdc++.h>
using namespace std;

int kthLargest(vector<int>& nums, int k) {
    int target = nums.size() - k, lo = 0, hi = nums.size() - 1;
    while (true) {
        int pivot = nums[hi], store = lo;
        for (int i = lo; i < hi; i++) {
            if (nums[i] < pivot) {
                swap(nums[i], nums[store]);
                store++;
            }
        }
        swap(nums[store], nums[hi]);
        if (store == target) return nums[store];
        if (store < target) lo = store + 1;
        else hi = store - 1;
    }
}

int main() {
    vector<int> nums = {3, 2, 1, 5, 6, 4};
    cout << kthLargest(nums, 2) << endl;
    return 0;
}
`,
  },
  problems: [215, 973, 347],
};

export const customSort: Method = {
  id: "custom-sort",
  name: "Custom Comparators & Counting Sort",
  idea: "Sort by a custom rule (frequency, concatenation order, a second key) or, for small value ranges, count instead of comparing.",
  when: ["\"Sort by frequency\", \"largest number formed\"", "Values in a small range (0–100, letters)", "Relative order defined by another array"],
  brute: "Ad-hoc swaps O(n²)",
  optimal: "O(n log n) with a comparator, O(n + range) with counting",
  steps: ["Decide the sort key(s).", "Write the comparator (or key function).", "For counting sort: count each value, then rewrite in order."],
  code: {
    python: `from collections import Counter

def frequency_sort(nums):
    count = Counter(nums)
    # lower frequency first; ties: bigger value first
    return sorted(nums, key=lambda x: (count[x], -x))

print(frequency_sort([1, 1, 2, 2, 2, 3]))
`,
    java: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        Integer[] nums = {1, 1, 2, 2, 2, 3};
        Map<Integer, Integer> count = new HashMap<>();
        for (int x : nums) count.put(x, count.getOrDefault(x, 0) + 1);
        Arrays.sort(nums, (a, b) -> count.get(a).equals(count.get(b)) ? b - a : count.get(a) - count.get(b));
        System.out.println(Arrays.toString(nums));
    }
}
`,
    cpp: `#include <bits/stdc++.h>
using namespace std;

int main() {
    vector<int> nums = {1, 1, 2, 2, 2, 3};
    unordered_map<int, int> count;
    for (int x : nums) count[x]++;
    sort(nums.begin(), nums.end(), [&](int a, int b) {
        if (count[a] != count[b]) return count[a] < count[b];
        return a > b;
    });
    for (int x : nums) cout << x << " ";
    return 0;
}
`,
  },
  problems: [1636, 1122, 179, 451, 274],
};

export const matrixInplace: Method = {
  id: "matrix-in-place",
  name: "In-place Matrix Tricks",
  idea: "Reuse the matrix itself as storage: transpose + reverse to rotate, first row/column as markers, extra bits for next state.",
  when: ["Rotate an image by 90°", "Set rows / columns to zero", "Game of Life style simultaneous updates", "O(1) extra space"],
  brute: "Copy the matrix: O(rows·cols) extra space",
  optimal: "O(rows·cols) time, O(1) extra space",
  steps: ["Rotate 90° clockwise = transpose, then reverse every row.", "Zero matrix: mark rows/cols in the first row/column, then fill.", "Simultaneous updates: encode old and new state in the same cell."],
  code: {
    python: `def rotate(matrix):
    n = len(matrix)
    for i in range(n):                 # transpose
        for j in range(i + 1, n):
            matrix[i][j], matrix[j][i] = matrix[j][i], matrix[i][j]
    for row in matrix:                 # reverse each row
        row.reverse()

m = [[1, 2, 3], [4, 5, 6], [7, 8, 9]]
rotate(m)
print(m)
`,
    java: `import java.util.*;

public class Main {
    static void rotate(int[][] m) {
        int n = m.length;
        for (int i = 0; i < n; i++) {
            for (int j = i + 1; j < n; j++) {
                int t = m[i][j]; m[i][j] = m[j][i]; m[j][i] = t;
            }
        }
        for (int i = 0; i < n; i++) {
            for (int l = 0, r = n - 1; l < r; l++, r--) {
                int t = m[i][l]; m[i][l] = m[i][r]; m[i][r] = t;
            }
        }
    }

    public static void main(String[] args) {
        int[][] m = {{1, 2, 3}, {4, 5, 6}, {7, 8, 9}};
        rotate(m);
        System.out.println(Arrays.deepToString(m));
    }
}
`,
    cpp: `#include <bits/stdc++.h>
using namespace std;

void rotate(vector<vector<int>>& m) {
    int n = m.size();
    for (int i = 0; i < n; i++) {
        for (int j = i + 1; j < n; j++) {
            swap(m[i][j], m[j][i]);
        }
    }
    for (int i = 0; i < n; i++) reverse(m[i].begin(), m[i].end());
}

int main() {
    vector<vector<int>> m = {{1, 2, 3}, {4, 5, 6}, {7, 8, 9}};
    rotate(m);
    for (auto& row : m) {
        for (int x : row) cout << x << " ";
        cout << endl;
    }
    return 0;
}
`,
  },
  problems: [48, 73, 289],
};
