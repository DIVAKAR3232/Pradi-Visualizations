import type { Method } from "./types";

// Array techniques. Every template is a complete, runnable program so it can be opened in the visualizer.

export const twoPointers: Method = {
  id: "two-pointers",
  name: "Two Pointers (opposite ends)",
  idea: "Start one pointer at each end and move them toward each other, using the sorted order or symmetry to discard options.",
  when: ["Array or string is sorted (or can be sorted)", "Find a pair / triplet with a target sum", "Palindrome checks, reversing in place", "Maximize area / distance between two ends"],
  brute: "O(n²) — try every pair",
  optimal: "O(n) time, O(1) space (plus O(n log n) if you sort first)",
  steps: [
    "Put left at index 0 and right at the last index.",
    "Look at the pair (left, right) and compute what you need (sum, area, match).",
    "If the answer is found, stop. If the value is too small, move left forward; if too big, move right backward.",
    "Stop when the pointers meet.",
  ],
  code: {
    python: `def two_sum_sorted(nums, target):
    left, right = 0, len(nums) - 1
    while left < right:
        s = nums[left] + nums[right]
        if s == target:
            return [left, right]
        if s < target:
            left += 1      # need a bigger sum
        else:
            right -= 1     # need a smaller sum
    return []

print(two_sum_sorted([1, 3, 4, 6, 9], 10))
`,
    java: `public class Main {
    static int[] twoSumSorted(int[] nums, int target) {
        int left = 0, right = nums.length - 1;
        while (left < right) {
            int sum = nums[left] + nums[right];
            if (sum == target) return new int[]{left, right};
            if (sum < target) left++;
            else right--;
        }
        return new int[]{-1, -1};
    }

    public static void main(String[] args) {
        int[] ans = twoSumSorted(new int[]{1, 3, 4, 6, 9}, 10);
        System.out.println(ans[0] + " " + ans[1]);
    }
}
`,
    cpp: `#include <bits/stdc++.h>
using namespace std;

vector<int> twoSumSorted(vector<int>& nums, int target) {
    int left = 0, right = nums.size() - 1;
    while (left < right) {
        int sum = nums[left] + nums[right];
        if (sum == target) return {left, right};
        if (sum < target) left++;
        else right--;
    }
    return {-1, -1};
}

int main() {
    vector<int> nums = {1, 3, 4, 6, 9};
    vector<int> ans = twoSumSorted(nums, 10);
    cout << ans[0] << " " << ans[1] << endl;
    return 0;
}
`,
    c: `#include <stdio.h>

int main() {
    int nums[] = {1, 3, 4, 6, 9};
    int n = 5, target = 10;
    int left = 0, right = n - 1;
    while (left < right) {
        int sum = nums[left] + nums[right];
        if (sum == target) {
            printf("%d %d", left, right);
            return 0;
        }
        if (sum < target) left++;
        else right--;
    }
    printf("not found");
    return 0;
}
`,
  },
  problems: [125, 344, 345, 680, 977, 167, 15, 16, 18, 11, 31, 881, 42],
};

export const readWrite: Method = {
  id: "read-write-pointers",
  name: "Read / Write Pointers (in-place)",
  idea: "One pointer reads every element, a slower pointer marks where the next kept element should be written.",
  when: ["Remove elements or duplicates in place", "Move zeroes / keep relative order", "Merge two sorted arrays", "\"Do it with O(1) extra space\""],
  brute: "O(n) extra space — build a new array",
  optimal: "O(n) time, O(1) space",
  steps: ["write = 0.", "For each read index, decide whether nums[read] should be kept.", "If kept, copy it to nums[write] and move write forward.", "The first `write` elements are the answer."],
  code: {
    python: `def remove_duplicates(nums):
    if not nums:
        return 0
    write = 1
    for read in range(1, len(nums)):
        if nums[read] != nums[write - 1]:
            nums[write] = nums[read]
            write += 1
    return write

nums = [1, 1, 2, 3, 3, 3, 4]
k = remove_duplicates(nums)
print(k, nums[:k])
`,
    java: `public class Main {
    static int removeDuplicates(int[] nums) {
        int write = 1;
        for (int read = 1; read < nums.length; read++) {
            if (nums[read] != nums[write - 1]) {
                nums[write] = nums[read];
                write++;
            }
        }
        return write;
    }

    public static void main(String[] args) {
        int[] nums = {1, 1, 2, 3, 3, 3, 4};
        int k = removeDuplicates(nums);
        System.out.println(k);
    }
}
`,
    cpp: `#include <bits/stdc++.h>
using namespace std;

int removeDuplicates(vector<int>& nums) {
    int write = 1;
    for (int read = 1; read < nums.size(); read++) {
        if (nums[read] != nums[write - 1]) {
            nums[write] = nums[read];
            write++;
        }
    }
    return write;
}

int main() {
    vector<int> nums = {1, 1, 2, 3, 3, 3, 4};
    cout << removeDuplicates(nums) << endl;
    return 0;
}
`,
  },
  problems: [26, 27, 283, 88, 80],
};

export const slidingFixed: Method = {
  id: "sliding-window-fixed",
  name: "Sliding Window (fixed size k)",
  idea: "Keep a window of exactly k elements; when it slides, add the new element and remove the one that left.",
  when: ["\"Subarray / substring of size k\"", "Average, sum, or count over every window of length k", "Anagram / permutation of a pattern inside a string"],
  brute: "O(n·k) — recompute every window",
  optimal: "O(n) time",
  steps: ["Build the first window of k elements.", "Slide: add nums[i], remove nums[i - k].", "Update the answer after each slide."],
  code: {
    python: `def max_sum_k(nums, k):
    window = sum(nums[:k])
    best = window
    for i in range(k, len(nums)):
        window += nums[i] - nums[i - k]   # add new, drop old
        best = max(best, window)
    return best

print(max_sum_k([2, 1, 5, 1, 3, 2], 3))
`,
    java: `public class Main {
    static int maxSumK(int[] nums, int k) {
        int window = 0;
        for (int i = 0; i < k; i++) window += nums[i];
        int best = window;
        for (int i = k; i < nums.length; i++) {
            window += nums[i] - nums[i - k];
            best = Math.max(best, window);
        }
        return best;
    }

    public static void main(String[] args) {
        System.out.println(maxSumK(new int[]{2, 1, 5, 1, 3, 2}, 3));
    }
}
`,
    cpp: `#include <bits/stdc++.h>
using namespace std;

int maxSumK(vector<int>& nums, int k) {
    int window = 0;
    for (int i = 0; i < k; i++) window += nums[i];
    int best = window;
    for (int i = k; i < nums.size(); i++) {
        window += nums[i] - nums[i - k];
        best = max(best, window);
    }
    return best;
}

int main() {
    vector<int> nums = {2, 1, 5, 1, 3, 2};
    cout << maxSumK(nums, 3) << endl;
    return 0;
}
`,
    c: `#include <stdio.h>

int main() {
    int nums[] = {2, 1, 5, 1, 3, 2};
    int n = 6, k = 3;
    int window = 0;
    for (int i = 0; i < k; i++) window += nums[i];
    int best = window;
    for (int i = k; i < n; i++) {
        window += nums[i] - nums[i - k];
        if (window > best) best = window;
    }
    printf("%d", best);
    return 0;
}
`,
  },
  problems: [643, 1876, 219, 438, 567, 1423, 2461, 1052, 239, 480],
};

export const slidingVar: Method = {
  id: "sliding-window-variable",
  name: "Sliding Window (variable size)",
  idea: "Grow the window with the right pointer; shrink it from the left while it breaks the rule. Every element enters and leaves once.",
  when: ["Longest / shortest subarray or substring that satisfies a condition", "\"At most k distinct\", \"no repeating characters\"", "Sum ≥ target with positive numbers", "Count subarrays with exactly k = atMost(k) − atMost(k−1)"],
  brute: "O(n²) — check every subarray",
  optimal: "O(n) time",
  steps: ["left = 0. For each right, add nums[right] to the window state.", "While the window is invalid, remove nums[left] and move left.", "Record the answer for the valid window [left, right]."],
  code: {
    python: `def min_subarray_len(target, nums):
    left, total = 0, 0
    best = len(nums) + 1
    for right in range(len(nums)):
        total += nums[right]          # grow the window
        while total >= target:        # shrink while it is valid
            best = min(best, right - left + 1)
            total -= nums[left]
            left += 1
    return 0 if best > len(nums) else best

print(min_subarray_len(7, [2, 3, 1, 2, 4, 3]))
`,
    java: `public class Main {
    static int minSubArrayLen(int target, int[] nums) {
        int left = 0, total = 0, best = Integer.MAX_VALUE;
        for (int right = 0; right < nums.length; right++) {
            total += nums[right];
            while (total >= target) {
                best = Math.min(best, right - left + 1);
                total -= nums[left];
                left++;
            }
        }
        return best == Integer.MAX_VALUE ? 0 : best;
    }

    public static void main(String[] args) {
        System.out.println(minSubArrayLen(7, new int[]{2, 3, 1, 2, 4, 3}));
    }
}
`,
    cpp: `#include <bits/stdc++.h>
using namespace std;

int minSubArrayLen(int target, vector<int>& nums) {
    int left = 0, total = 0, best = INT_MAX;
    for (int right = 0; right < nums.size(); right++) {
        total += nums[right];
        while (total >= target) {
            best = min(best, right - left + 1);
            total -= nums[left];
            left++;
        }
    }
    return best == INT_MAX ? 0 : best;
}

int main() {
    vector<int> nums = {2, 3, 1, 2, 4, 3};
    cout << minSubArrayLen(7, nums) << endl;
    return 0;
}
`,
  },
  problems: [3, 209, 424, 1004, 904, 713, 930, 1248, 1358, 76, 992],
};

export const prefixSum: Method = {
  id: "prefix-sum",
  name: "Prefix Sum",
  idea: "prefix[i] = sum of the first i elements, so any range sum is prefix[r + 1] − prefix[l] in O(1).",
  when: ["Many range-sum queries", "Running totals, pivot / balance index", "Product of everything except self (prefix × suffix)"],
  brute: "O(n) per query",
  optimal: "O(n) to build, O(1) per query",
  steps: ["prefix[0] = 0.", "prefix[i + 1] = prefix[i] + nums[i].", "Sum of nums[l..r] = prefix[r + 1] − prefix[l]."],
  code: {
    python: `nums = [3, 1, 4, 1, 5, 9]
prefix = [0] * (len(nums) + 1)
for i in range(len(nums)):
    prefix[i + 1] = prefix[i] + nums[i]

def range_sum(l, r):
    return prefix[r + 1] - prefix[l]

print(range_sum(1, 3))   # 1 + 4 + 1
print(range_sum(2, 5))   # 4 + 1 + 5 + 9
`,
    java: `public class Main {
    public static void main(String[] args) {
        int[] nums = {3, 1, 4, 1, 5, 9};
        int[] prefix = new int[nums.length + 1];
        for (int i = 0; i < nums.length; i++) {
            prefix[i + 1] = prefix[i] + nums[i];
        }
        System.out.println(prefix[4] - prefix[1]);
        System.out.println(prefix[6] - prefix[2]);
    }
}
`,
    cpp: `#include <bits/stdc++.h>
using namespace std;

int main() {
    vector<int> nums = {3, 1, 4, 1, 5, 9};
    vector<int> prefix(nums.size() + 1, 0);
    for (int i = 0; i < nums.size(); i++) {
        prefix[i + 1] = prefix[i] + nums[i];
    }
    cout << prefix[4] - prefix[1] << endl;
    cout << prefix[6] - prefix[2] << endl;
    return 0;
}
`,
    c: `#include <stdio.h>

int main() {
    int nums[] = {3, 1, 4, 1, 5, 9};
    int prefix[7] = {0};
    for (int i = 0; i < 6; i++) {
        prefix[i + 1] = prefix[i] + nums[i];
    }
    printf("%d %d", prefix[4] - prefix[1], prefix[6] - prefix[2]);
    return 0;
}
`,
  },
  problems: [1480, 303, 724, 238, 304, 1314],
};

export const prefixHash: Method = {
  id: "prefix-sum-hashmap",
  name: "Prefix Sum + HashMap",
  idea: "A subarray (l, r] sums to k when prefix[r] − prefix[l] = k, so count how many earlier prefixes equal prefix − k.",
  when: ["Count subarrays with sum = k (negatives allowed)", "Longest subarray with equal 0s and 1s", "Sum divisible by k (store prefix % k)"],
  brute: "O(n²) — every subarray",
  optimal: "O(n) time, O(n) space",
  steps: ["count = {0: 1}, prefix = 0.", "For each number: prefix += x.", "answer += count[prefix − k].", "count[prefix] += 1."],
  code: {
    python: `def subarray_sum(nums, k):
    count = {0: 1}
    prefix = 0
    answer = 0
    for x in nums:
        prefix += x
        answer += count.get(prefix - k, 0)
        count[prefix] = count.get(prefix, 0) + 1
    return answer

print(subarray_sum([1, 2, 1, 2, 1], 3))
`,
    java: `import java.util.*;

public class Main {
    static int subarraySum(int[] nums, int k) {
        Map<Integer, Integer> count = new HashMap<>();
        count.put(0, 1);
        int prefix = 0, answer = 0;
        for (int x : nums) {
            prefix += x;
            answer += count.getOrDefault(prefix - k, 0);
            count.put(prefix, count.getOrDefault(prefix, 0) + 1);
        }
        return answer;
    }

    public static void main(String[] args) {
        System.out.println(subarraySum(new int[]{1, 2, 1, 2, 1}, 3));
    }
}
`,
    cpp: `#include <bits/stdc++.h>
using namespace std;

int subarraySum(vector<int>& nums, int k) {
    unordered_map<int, int> count;
    count[0] = 1;
    int prefix = 0, answer = 0;
    for (int x : nums) {
        prefix += x;
        if (count.count(prefix - k)) answer += count[prefix - k];
        count[prefix]++;
    }
    return answer;
}

int main() {
    vector<int> nums = {1, 2, 1, 2, 1};
    cout << subarraySum(nums, 3) << endl;
    return 0;
}
`,
  },
  problems: [560, 525, 974, 523, 930, 1248],
};

export const kadane: Method = {
  id: "kadane",
  name: "Kadane's Algorithm",
  idea: "At each index, either extend the best subarray ending at the previous index or start fresh here.",
  when: ["Maximum (or minimum) sum of a contiguous subarray", "Best single buy/sell (max difference)", "Circular or \"one deletion allowed\" variants"],
  brute: "O(n²)",
  optimal: "O(n) time, O(1) space",
  steps: ["current = best = nums[0].", "For each x after that: current = max(x, current + x).", "best = max(best, current)."],
  code: {
    python: `def max_subarray(nums):
    current = best = nums[0]
    for x in nums[1:]:
        current = max(x, current + x)   # extend or restart
        best = max(best, current)
    return best

print(max_subarray([-2, 1, -3, 4, -1, 2, 1, -5, 4]))
`,
    java: `public class Main {
    static int maxSubArray(int[] nums) {
        int current = nums[0], best = nums[0];
        for (int i = 1; i < nums.length; i++) {
            current = Math.max(nums[i], current + nums[i]);
            best = Math.max(best, current);
        }
        return best;
    }

    public static void main(String[] args) {
        System.out.println(maxSubArray(new int[]{-2, 1, -3, 4, -1, 2, 1, -5, 4}));
    }
}
`,
    cpp: `#include <bits/stdc++.h>
using namespace std;

int maxSubArray(vector<int>& nums) {
    int current = nums[0], best = nums[0];
    for (int i = 1; i < nums.size(); i++) {
        current = max(nums[i], current + nums[i]);
        best = max(best, current);
    }
    return best;
}

int main() {
    vector<int> nums = {-2, 1, -3, 4, -1, 2, 1, -5, 4};
    cout << maxSubArray(nums) << endl;
    return 0;
}
`,
    c: `#include <stdio.h>

int main() {
    int nums[] = {-2, 1, -3, 4, -1, 2, 1, -5, 4};
    int n = 9;
    int current = nums[0], best = nums[0];
    for (int i = 1; i < n; i++) {
        current = current + nums[i] > nums[i] ? current + nums[i] : nums[i];
        if (current > best) best = current;
    }
    printf("%d", best);
    return 0;
}
`,
  },
  problems: [121, 53, 152, 918, 1749, 1186, 363],
};

export const hashLookup: Method = {
  id: "hashing",
  name: "Hashing (seen-before lookup)",
  idea: "Store what you have seen in a hash set / map so each \"have I seen x?\" check is O(1).",
  when: ["Find a complement (two sum)", "Detect duplicates", "Longest consecutive sequence", "Need O(1) membership checks"],
  brute: "O(n²) — nested loops",
  optimal: "O(n) time, O(n) space",
  steps: ["Create an empty map.", "For each element, check the map for what you need.", "If found, answer. Otherwise store the current element."],
  code: {
    python: `def two_sum(nums, target):
    seen = {}
    for i, x in enumerate(nums):
        need = target - x
        if need in seen:
            return [seen[need], i]
        seen[x] = i
    return []

print(two_sum([2, 7, 11, 15], 9))
`,
    java: `import java.util.*;

public class Main {
    static int[] twoSum(int[] nums, int target) {
        Map<Integer, Integer> seen = new HashMap<>();
        for (int i = 0; i < nums.length; i++) {
            int need = target - nums[i];
            if (seen.containsKey(need)) return new int[]{seen.get(need), i};
            seen.put(nums[i], i);
        }
        return new int[]{};
    }

    public static void main(String[] args) {
        int[] ans = twoSum(new int[]{2, 7, 11, 15}, 9);
        System.out.println(ans[0] + " " + ans[1]);
    }
}
`,
    cpp: `#include <bits/stdc++.h>
using namespace std;

vector<int> twoSum(vector<int>& nums, int target) {
    unordered_map<int, int> seen;
    for (int i = 0; i < nums.size(); i++) {
        int need = target - nums[i];
        if (seen.count(need)) return {seen[need], i};
        seen[nums[i]] = i;
    }
    return {};
}

int main() {
    vector<int> nums = {2, 7, 11, 15};
    vector<int> ans = twoSum(nums, 9);
    cout << ans[0] << " " << ans[1] << endl;
    return 0;
}
`,
  },
  problems: [1, 217, 219, 202, 1207, 128, 454, 138, 149, 30],
};

export const sortGreedy: Method = {
  id: "sort-greedy",
  name: "Sort + Greedy",
  idea: "Sort first so the locally best choice (smallest, largest, earliest) becomes obvious, then take it greedily.",
  when: ["Match / pair items (cookies, boats, people)", "Maximize or minimize a count with a simple rule", "Order does not matter in the input"],
  brute: "Try all assignments (exponential)",
  optimal: "O(n log n) for sorting + O(n) scan",
  steps: ["Sort the input(s).", "Walk through in order, making the greedy choice.", "Prove (or check small cases) that the greedy choice is never worse."],
  code: {
    python: `def find_content_children(greed, cookies):
    greed.sort()
    cookies.sort()
    child = 0
    for c in cookies:
        if child < len(greed) and c >= greed[child]:
            child += 1        # smallest cookie that satisfies this child
    return child

print(find_content_children([1, 2, 3], [1, 1, 3]))
`,
    java: `import java.util.*;

public class Main {
    static int findContentChildren(int[] greed, int[] cookies) {
        Arrays.sort(greed);
        Arrays.sort(cookies);
        int child = 0;
        for (int c : cookies) {
            if (child < greed.length && c >= greed[child]) child++;
        }
        return child;
    }

    public static void main(String[] args) {
        System.out.println(findContentChildren(new int[]{1, 2, 3}, new int[]{1, 1, 3}));
    }
}
`,
    cpp: `#include <bits/stdc++.h>
using namespace std;

int findContentChildren(vector<int>& greed, vector<int>& cookies) {
    sort(greed.begin(), greed.end());
    sort(cookies.begin(), cookies.end());
    int child = 0;
    for (int c : cookies) {
        if (child < greed.size() && c >= greed[child]) child++;
    }
    return child;
}

int main() {
    vector<int> greed = {1, 2, 3};
    vector<int> cookies = {1, 1, 3};
    cout << findContentChildren(greed, cookies) << endl;
    return 0;
}
`,
  },
  problems: [455, 976, 1005, 881, 1029, 274, 135, 330],
};

export const bsSorted: Method = {
  id: "binary-search",
  name: "Binary Search (sorted array)",
  idea: "Compare with the middle element and throw away the half that cannot contain the answer.",
  when: ["Input is sorted", "Find a target, first / last position, insert position", "\"O(log n)\" is required"],
  brute: "O(n) linear scan",
  optimal: "O(log n) time",
  steps: ["low = 0, high = n − 1.", "mid = (low + high) / 2.", "If nums[mid] is the target, done. If smaller, low = mid + 1; else high = mid − 1.", "For first / last occurrence, keep searching after a match."],
  code: {
    python: `def binary_search(nums, target):
    low, high = 0, len(nums) - 1
    while low <= high:
        mid = (low + high) // 2
        if nums[mid] == target:
            return mid
        if nums[mid] < target:
            low = mid + 1
        else:
            high = mid - 1
    return -1

print(binary_search([2, 5, 8, 12, 16, 23, 38], 23))
`,
    java: `public class Main {
    static int binarySearch(int[] nums, int target) {
        int low = 0, high = nums.length - 1;
        while (low <= high) {
            int mid = low + (high - low) / 2;
            if (nums[mid] == target) return mid;
            if (nums[mid] < target) low = mid + 1;
            else high = mid - 1;
        }
        return -1;
    }

    public static void main(String[] args) {
        System.out.println(binarySearch(new int[]{2, 5, 8, 12, 16, 23, 38}, 23));
    }
}
`,
    cpp: `#include <bits/stdc++.h>
using namespace std;

int binarySearch(vector<int>& nums, int target) {
    int low = 0, high = nums.size() - 1;
    while (low <= high) {
        int mid = low + (high - low) / 2;
        if (nums[mid] == target) return mid;
        if (nums[mid] < target) low = mid + 1;
        else high = mid - 1;
    }
    return -1;
}

int main() {
    vector<int> nums = {2, 5, 8, 12, 16, 23, 38};
    cout << binarySearch(nums, 23) << endl;
    return 0;
}
`,
    c: `#include <stdio.h>

int main() {
    int nums[] = {2, 5, 8, 12, 16, 23, 38};
    int target = 23;
    int low = 0, high = 6, found = -1;
    while (low <= high) {
        int mid = low + (high - low) / 2;
        if (nums[mid] == target) {
            found = mid;
            break;
        }
        if (nums[mid] < target) low = mid + 1;
        else high = mid - 1;
    }
    printf("%d", found);
    return 0;
}
`,
  },
  problems: [704, 35, 278, 69, 374, 34, 540, 4],
};

export const bsAnswer: Method = {
  id: "binary-search-on-answer",
  name: "Binary Search on the Answer",
  idea: "The answer lies in a range and \"is X enough?\" is monotonic, so binary search the smallest X that works.",
  when: ["\"Minimum speed / capacity / days so that …\"", "\"Minimize the maximum\" or \"maximize the minimum\"", "Checking one guess is easy, finding the best is hard"],
  brute: "Try every possible answer: O(range · n)",
  optimal: "O(n · log range)",
  steps: ["low = smallest possible answer, high = largest.", "mid = (low + high) / 2; check if mid works.", "If it works, high = mid (try smaller); else low = mid + 1.", "Answer is low."],
  code: {
    python: `def min_eating_speed(piles, h):
    def hours(speed):
        return sum((p + speed - 1) // speed for p in piles)

    low, high = 1, max(piles)
    while low < high:
        mid = (low + high) // 2
        if hours(mid) <= h:
            high = mid        # mid is fast enough, try slower
        else:
            low = mid + 1
    return low

print(min_eating_speed([3, 6, 7, 11], 8))
`,
    java: `public class Main {
    static int hours(int[] piles, int speed) {
        int total = 0;
        for (int p : piles) total += (p + speed - 1) / speed;
        return total;
    }

    static int minEatingSpeed(int[] piles, int h) {
        int low = 1, high = 0;
        for (int p : piles) high = Math.max(high, p);
        while (low < high) {
            int mid = (low + high) / 2;
            if (hours(piles, mid) <= h) high = mid;
            else low = mid + 1;
        }
        return low;
    }

    public static void main(String[] args) {
        System.out.println(minEatingSpeed(new int[]{3, 6, 7, 11}, 8));
    }
}
`,
    cpp: `#include <bits/stdc++.h>
using namespace std;

int hours(vector<int>& piles, int speed) {
    int total = 0;
    for (int p : piles) total += (p + speed - 1) / speed;
    return total;
}

int minEatingSpeed(vector<int>& piles, int h) {
    int low = 1, high = *max_element(piles.begin(), piles.end());
    while (low < high) {
        int mid = (low + high) / 2;
        if (hours(piles, mid) <= h) high = mid;
        else low = mid + 1;
    }
    return low;
}

int main() {
    vector<int> piles = {3, 6, 7, 11};
    cout << minEatingSpeed(piles, 8) << endl;
    return 0;
}
`,
  },
  problems: [875, 1011, 1283, 1482, 2187, 410, 719],
};

export const dutchFlag: Method = {
  id: "dutch-national-flag",
  name: "Dutch National Flag / Partitioning",
  idea: "Partition the array into groups (e.g. < pivot, = pivot, > pivot) in one pass with swap pointers.",
  when: ["Sort an array with only 2–3 distinct values", "Move all evens / zeroes / negatives to one side", "Quickselect partition step"],
  brute: "Sort: O(n log n), or count and rewrite",
  optimal: "O(n) time, O(1) space, single pass",
  steps: ["low = 0, mid = 0, high = n − 1.", "If nums[mid] is 0: swap with low, move low and mid.", "If 1: move mid.", "If 2: swap with high, move high (do not move mid)."],
  code: {
    python: `def sort_colors(nums):
    low, mid, high = 0, 0, len(nums) - 1
    while mid <= high:
        if nums[mid] == 0:
            nums[low], nums[mid] = nums[mid], nums[low]
            low += 1
            mid += 1
        elif nums[mid] == 1:
            mid += 1
        else:
            nums[mid], nums[high] = nums[high], nums[mid]
            high -= 1

nums = [2, 0, 2, 1, 1, 0]
sort_colors(nums)
print(nums)
`,
    java: `import java.util.*;

public class Main {
    static void sortColors(int[] nums) {
        int low = 0, mid = 0, high = nums.length - 1;
        while (mid <= high) {
            if (nums[mid] == 0) {
                int t = nums[low]; nums[low] = nums[mid]; nums[mid] = t;
                low++;
                mid++;
            } else if (nums[mid] == 1) {
                mid++;
            } else {
                int t = nums[mid]; nums[mid] = nums[high]; nums[high] = t;
                high--;
            }
        }
    }

    public static void main(String[] args) {
        int[] nums = {2, 0, 2, 1, 1, 0};
        sortColors(nums);
        System.out.println(Arrays.toString(nums));
    }
}
`,
    cpp: `#include <bits/stdc++.h>
using namespace std;

void sortColors(vector<int>& nums) {
    int low = 0, mid = 0, high = nums.size() - 1;
    while (mid <= high) {
        if (nums[mid] == 0) {
            swap(nums[low], nums[mid]);
            low++;
            mid++;
        } else if (nums[mid] == 1) {
            mid++;
        } else {
            swap(nums[mid], nums[high]);
            high--;
        }
    }
}

int main() {
    vector<int> nums = {2, 0, 2, 1, 1, 0};
    sortColors(nums);
    for (int x : nums) cout << x << " ";
    return 0;
}
`,
  },
  problems: [283, 905, 922, 27, 75, 2149, 215],
};

export const cyclicSort: Method = {
  id: "cyclic-sort",
  name: "Cyclic Sort / Index Marking",
  idea: "When values are in the range 1..n, put each value at index value − 1 (or mark that index) to find missing / duplicate numbers in O(1) space.",
  when: ["Numbers are in the range [0, n] or [1, n]", "Find missing / duplicate / first missing positive", "O(1) extra space required"],
  brute: "Sort O(n log n) or use a hash set O(n) space",
  optimal: "O(n) time, O(1) space",
  steps: ["i = 0. While i < n: correct = nums[i] − 1.", "If nums[i] is in range and not at its correct spot, swap it there.", "Otherwise i += 1.", "Scan: the first index i where nums[i] ≠ i + 1 gives the answer."],
  code: {
    python: `def find_disappeared(nums):
    i = 0
    while i < len(nums):
        correct = nums[i] - 1
        if nums[i] != nums[correct]:
            nums[i], nums[correct] = nums[correct], nums[i]
        else:
            i += 1
    return [i + 1 for i in range(len(nums)) if nums[i] != i + 1]

print(find_disappeared([4, 3, 2, 7, 8, 2, 3, 1]))
`,
    java: `import java.util.*;

public class Main {
    static List<Integer> findDisappeared(int[] nums) {
        int i = 0;
        while (i < nums.length) {
            int correct = nums[i] - 1;
            if (nums[i] != nums[correct]) {
                int t = nums[i]; nums[i] = nums[correct]; nums[correct] = t;
            } else {
                i++;
            }
        }
        List<Integer> missing = new ArrayList<>();
        for (int j = 0; j < nums.length; j++) {
            if (nums[j] != j + 1) missing.add(j + 1);
        }
        return missing;
    }

    public static void main(String[] args) {
        System.out.println(findDisappeared(new int[]{4, 3, 2, 7, 8, 2, 3, 1}));
    }
}
`,
    cpp: `#include <bits/stdc++.h>
using namespace std;

vector<int> findDisappeared(vector<int>& nums) {
    int i = 0;
    while (i < nums.size()) {
        int correct = nums[i] - 1;
        if (nums[i] != nums[correct]) swap(nums[i], nums[correct]);
        else i++;
    }
    vector<int> missing;
    for (int j = 0; j < nums.size(); j++) {
        if (nums[j] != j + 1) missing.push_back(j + 1);
    }
    return missing;
}

int main() {
    vector<int> nums = {4, 3, 2, 7, 8, 2, 3, 1};
    vector<int> missing = findDisappeared(nums);
    for (int x : missing) cout << x << " ";
    return 0;
}
`,
  },
  problems: [268, 448, 645, 1539, 442, 287, 41],
};

export const monoStack: Method = {
  id: "monotonic-stack",
  name: "Monotonic Stack",
  idea: "Keep a stack of indices whose values stay increasing (or decreasing); popping tells you the next greater / smaller element.",
  when: ["Next greater / next smaller element", "\"How many days until a warmer temperature\"", "Largest rectangle in a histogram, trapping water", "Remove digits to make the smallest number"],
  brute: "O(n²) — scan right from every index",
  optimal: "O(n) — each index is pushed and popped once",
  steps: ["Loop through indices.", "While the stack top is smaller than the current value, pop it: the current index is its answer.", "Push the current index.", "Indices left on the stack have no answer."],
  code: {
    python: `def daily_temperatures(temps):
    answer = [0] * len(temps)
    stack = []   # indices with no warmer day yet
    for i, t in enumerate(temps):
        while stack and temps[stack[-1]] < t:
            j = stack.pop()
            answer[j] = i - j
        stack.append(i)
    return answer

print(daily_temperatures([73, 74, 75, 71, 69, 72, 76, 73]))
`,
    java: `import java.util.*;

public class Main {
    static int[] dailyTemperatures(int[] temps) {
        int[] answer = new int[temps.length];
        Stack<Integer> stack = new Stack<>();
        for (int i = 0; i < temps.length; i++) {
            while (!stack.isEmpty() && temps[stack.peek()] < temps[i]) {
                int j = stack.pop();
                answer[j] = i - j;
            }
            stack.push(i);
        }
        return answer;
    }

    public static void main(String[] args) {
        int[] ans = dailyTemperatures(new int[]{73, 74, 75, 71, 69, 72, 76, 73});
        System.out.println(Arrays.toString(ans));
    }
}
`,
    cpp: `#include <bits/stdc++.h>
using namespace std;

vector<int> dailyTemperatures(vector<int>& temps) {
    vector<int> answer(temps.size(), 0);
    stack<int> st;
    for (int i = 0; i < temps.size(); i++) {
        while (!st.empty() && temps[st.top()] < temps[i]) {
            int j = st.top();
            st.pop();
            answer[j] = i - j;
        }
        st.push(i);
    }
    return answer;
}

int main() {
    vector<int> temps = {73, 74, 75, 71, 69, 72, 76, 73};
    vector<int> ans = dailyTemperatures(temps);
    for (int x : ans) cout << x << " ";
    return 0;
}
`,
  },
  problems: [496, 1475, 739, 503, 901, 907, 2104, 402, 316, 1019, 84, 42, 85],
};

export const mergeIntervals: Method = {
  id: "merge-intervals",
  name: "Merge Intervals",
  idea: "Sort intervals by start; each interval either overlaps the last merged one (extend it) or starts a new one.",
  when: ["Overlapping ranges, meetings, bookings", "Insert a new interval", "Intersections of two interval lists"],
  brute: "Compare every pair: O(n²)",
  optimal: "O(n log n) for sorting",
  steps: ["Sort by start.", "Take the first interval as current.", "If the next start ≤ current end, set end = max(end, next end).", "Otherwise save current and start a new one."],
  code: {
    python: `def merge(intervals):
    intervals.sort(key=lambda x: x[0])
    merged = [intervals[0]]
    for start, end in intervals[1:]:
        if start <= merged[-1][1]:
            merged[-1][1] = max(merged[-1][1], end)   # overlap: extend
        else:
            merged.append([start, end])
    return merged

print(merge([[1, 3], [8, 10], [2, 6], [15, 18]]))
`,
    java: `import java.util.*;

public class Main {
    static List<int[]> merge(int[][] intervals) {
        Arrays.sort(intervals, (a, b) -> a[0] - b[0]);
        List<int[]> merged = new ArrayList<>();
        for (int[] cur : intervals) {
            if (!merged.isEmpty() && cur[0] <= merged.get(merged.size() - 1)[1]) {
                int[] last = merged.get(merged.size() - 1);
                last[1] = Math.max(last[1], cur[1]);
            } else {
                merged.add(cur);
            }
        }
        return merged;
    }

    public static void main(String[] args) {
        List<int[]> res = merge(new int[][]{{1, 3}, {8, 10}, {2, 6}, {15, 18}});
        for (int[] r : res) System.out.print(Arrays.toString(r) + " ");
    }
}
`,
    cpp: `#include <bits/stdc++.h>
using namespace std;

vector<vector<int>> merge(vector<vector<int>>& intervals) {
    sort(intervals.begin(), intervals.end());
    vector<vector<int>> merged;
    for (auto& cur : intervals) {
        if (!merged.empty() && cur[0] <= merged.back()[1]) {
            merged.back()[1] = max(merged.back()[1], cur[1]);
        } else {
            merged.push_back(cur);
        }
    }
    return merged;
}

int main() {
    vector<vector<int>> intervals = {{1, 3}, {8, 10}, {2, 6}, {15, 18}};
    vector<vector<int>> res = merge(intervals);
    for (auto& r : res) cout << "[" << r[0] << "," << r[1] << "] ";
    return 0;
}
`,
  },
  problems: [228, 56, 57, 986, 1288, 352],
};

export const boyerMoore: Method = {
  id: "boyer-moore",
  name: "Boyer–Moore Voting",
  idea: "Pair off different elements and cancel them; the majority element survives with a positive count.",
  when: ["Element appearing more than n/2 (or n/3) times", "O(1) space required"],
  brute: "Count with a hash map: O(n) space",
  optimal: "O(n) time, O(1) space",
  steps: ["candidate = none, count = 0.", "For each x: if count is 0, candidate = x.", "count += 1 if x == candidate else −1.", "candidate is the majority (verify if not guaranteed)."],
  code: {
    python: `def majority_element(nums):
    candidate, count = None, 0
    for x in nums:
        if count == 0:
            candidate = x
        count += 1 if x == candidate else -1
    return candidate

print(majority_element([2, 2, 1, 1, 1, 2, 2]))
`,
    java: `public class Main {
    static int majorityElement(int[] nums) {
        int candidate = 0, count = 0;
        for (int x : nums) {
            if (count == 0) candidate = x;
            count += (x == candidate) ? 1 : -1;
        }
        return candidate;
    }

    public static void main(String[] args) {
        System.out.println(majorityElement(new int[]{2, 2, 1, 1, 1, 2, 2}));
    }
}
`,
    cpp: `#include <bits/stdc++.h>
using namespace std;

int majorityElement(vector<int>& nums) {
    int candidate = 0, count = 0;
    for (int x : nums) {
        if (count == 0) candidate = x;
        count += (x == candidate) ? 1 : -1;
    }
    return candidate;
}

int main() {
    vector<int> nums = {2, 2, 1, 1, 1, 2, 2};
    cout << majorityElement(nums) << endl;
    return 0;
}
`,
    c: `#include <stdio.h>

int main() {
    int nums[] = {2, 2, 1, 1, 1, 2, 2};
    int candidate = 0, count = 0;
    for (int i = 0; i < 7; i++) {
        if (count == 0) candidate = nums[i];
        count += (nums[i] == candidate) ? 1 : -1;
    }
    printf("%d", candidate);
    return 0;
}
`,
  },
  problems: [169, 229],
};

export const diffArray: Method = {
  id: "difference-array",
  name: "Difference Array / Sweep Line",
  idea: "To add v to a whole range [l, r], do diff[l] += v and diff[r + 1] −= v; one prefix sum at the end applies all updates.",
  when: ["Many range updates, then read the final array", "Bookings, car pooling, population / overlap counts", "Events that start and end"],
  brute: "O(n) per update",
  optimal: "O(1) per update + O(n) once",
  steps: ["diff = zeros of size n + 1.", "For each update (l, r, v): diff[l] += v, diff[r + 1] −= v.", "Prefix-sum diff to get the final values."],
  code: {
    python: `def apply_updates(n, updates):
    diff = [0] * (n + 1)
    for l, r, v in updates:
        diff[l] += v
        diff[r + 1] -= v
    result = [0] * n
    running = 0
    for i in range(n):
        running += diff[i]
        result[i] = running
    return result

print(apply_updates(5, [[1, 3, 2], [2, 4, 3], [0, 2, -2]]))
`,
    java: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        int n = 5;
        int[][] updates = {{1, 3, 2}, {2, 4, 3}, {0, 2, -2}};
        int[] diff = new int[n + 1];
        for (int[] u : updates) {
            diff[u[0]] += u[2];
            diff[u[1] + 1] -= u[2];
        }
        int[] result = new int[n];
        int running = 0;
        for (int i = 0; i < n; i++) {
            running += diff[i];
            result[i] = running;
        }
        System.out.println(Arrays.toString(result));
    }
}
`,
    cpp: `#include <bits/stdc++.h>
using namespace std;

int main() {
    int n = 5;
    vector<vector<int>> updates = {{1, 3, 2}, {2, 4, 3}, {0, 2, -2}};
    vector<int> diff(n + 1, 0);
    for (auto& u : updates) {
        diff[u[0]] += u[2];
        diff[u[1] + 1] -= u[2];
    }
    vector<int> result(n, 0);
    int running = 0;
    for (int i = 0; i < n; i++) {
        running += diff[i];
        result[i] = running;
    }
    for (int x : result) cout << x << " ";
    return 0;
}
`,
  },
  problems: [1854, 1109, 1094, 2381, 2251],
};

export const matrixTraversal: Method = {
  id: "matrix-traversal",
  name: "Matrix Traversal (spiral / diagonal / layers)",
  idea: "Walk a 2D grid with explicit boundaries (top, bottom, left, right) or index rules (i + j for diagonals).",
  when: ["Spiral order, diagonal order", "Transpose, diagonal sums", "Generate a matrix in a pattern"],
  brute: "—",
  optimal: "O(rows · cols)",
  steps: ["Set top = 0, bottom = rows − 1, left = 0, right = cols − 1.", "Go right along top, down along right, left along bottom, up along left.", "Shrink the boundaries after each side.", "Stop when top > bottom or left > right."],
  code: {
    python: `def spiral(matrix):
    result = []
    top, bottom = 0, len(matrix) - 1
    left, right = 0, len(matrix[0]) - 1
    while top <= bottom and left <= right:
        for j in range(left, right + 1):
            result.append(matrix[top][j])
        top += 1
        for i in range(top, bottom + 1):
            result.append(matrix[i][right])
        right -= 1
        if top <= bottom:
            for j in range(right, left - 1, -1):
                result.append(matrix[bottom][j])
            bottom -= 1
        if left <= right:
            for i in range(bottom, top - 1, -1):
                result.append(matrix[i][left])
            left += 1
    return result

print(spiral([[1, 2, 3], [4, 5, 6], [7, 8, 9]]))
`,
    java: `import java.util.*;

public class Main {
    static List<Integer> spiral(int[][] m) {
        List<Integer> result = new ArrayList<>();
        int top = 0, bottom = m.length - 1, left = 0, right = m[0].length - 1;
        while (top <= bottom && left <= right) {
            for (int j = left; j <= right; j++) result.add(m[top][j]);
            top++;
            for (int i = top; i <= bottom; i++) result.add(m[i][right]);
            right--;
            if (top <= bottom) {
                for (int j = right; j >= left; j--) result.add(m[bottom][j]);
                bottom--;
            }
            if (left <= right) {
                for (int i = bottom; i >= top; i--) result.add(m[i][left]);
                left++;
            }
        }
        return result;
    }

    public static void main(String[] args) {
        System.out.println(spiral(new int[][]{{1, 2, 3}, {4, 5, 6}, {7, 8, 9}}));
    }
}
`,
    cpp: `#include <bits/stdc++.h>
using namespace std;

vector<int> spiral(vector<vector<int>>& m) {
    vector<int> result;
    int top = 0, bottom = m.size() - 1, left = 0, right = m[0].size() - 1;
    while (top <= bottom && left <= right) {
        for (int j = left; j <= right; j++) result.push_back(m[top][j]);
        top++;
        for (int i = top; i <= bottom; i++) result.push_back(m[i][right]);
        right--;
        if (top <= bottom) {
            for (int j = right; j >= left; j--) result.push_back(m[bottom][j]);
            bottom--;
        }
        if (left <= right) {
            for (int i = bottom; i >= top; i--) result.push_back(m[i][left]);
            left++;
        }
    }
    return result;
}

int main() {
    vector<vector<int>> m = {{1, 2, 3}, {4, 5, 6}, {7, 8, 9}};
    vector<int> res = spiral(m);
    for (int x : res) cout << x << " ";
    return 0;
}
`,
  },
  problems: [867, 1572, 566, 1672, 118, 54, 59, 498],
};
