#!/usr/bin/env python3
"""
Seed the "Technical Assessment Wamo Labs" assessment into Supabase.

Questions:
  1. Reverse a Number        — easy    — 30%
  2. Most Occurring Character — easy    — 30%
  3. Two Sum                 — medium  — 40%

Each question includes language-specific input/output guidelines for:
  Python, C++, JavaScript (Node.js), Java, TypeScript (Node.js)

Usage:
    python scripts/seed_technical_assessment_wamolabs.py

Reads SUPABASE_URL and SUPABASE_SERVICE_KEY from apps/api/.env.
Requires the service_role key (not the anon key).
"""

from __future__ import annotations

import json
import os
import sys
import urllib.request
import urllib.error
from pathlib import Path


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def load_env(path: Path) -> dict[str, str]:
    env: dict[str, str] = {}
    if not path.exists():
        return env
    for line in path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, _, v = line.partition("=")
        env[k.strip()] = v.strip()
    return env


def _request(
    url: str, service_key: str, method: str, path: str, data: dict | None = None
) -> dict | list:
    payload = json.dumps(data).encode() if data else None
    headers = {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }
    req = urllib.request.Request(
        f"{url.rstrip('/')}{path}",
        data=payload,
        headers=headers,
        method=method,
    )
    try:
        with urllib.request.urlopen(req) as resp:
            body = resp.read()
            return json.loads(body) if body else {}
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        print(f"HTTP {e.code} {method} {path}: {body}", file=sys.stderr)
        sys.exit(1)


def post(url: str, key: str, path: str, data: dict) -> dict:
    result = _request(url, key, "POST", path, data)
    return result[0] if isinstance(result, list) else result


# ---------------------------------------------------------------------------
# Reusable input-guide blocks (only the 5 languages requested)
# ---------------------------------------------------------------------------

INPUT_GUIDE_INTEGER = """\
---

## How to Use This Template

> **Judge rules:** Your program reads from **standard input** (`stdin`) and writes to
> **standard output** (`stdout`). A single integer is piped in on one line.
> **No prompts** — just read and print. Write your solution where indicated by the comment.

### Python
```python
n = int(input())

# ── WRITE YOUR SOLUTION HERE ──────────────────────────────────────────────────


# ─────────────────────────────────────────────────────────────────────────────

print(result)
```

### C++
```cpp
#include <iostream>
using namespace std;

int main() {
    long long n;
    cin >> n;

    // ── WRITE YOUR SOLUTION HERE ──────────────────────────────────────────────


    // ─────────────────────────────────────────────────────────────────────────

    cout << result << endl;
    return 0;
}
```

### JavaScript (Node.js)
```javascript
process.stdin.resume();
process.stdin.setEncoding('utf8');
let _data = '';
process.stdin.on('data', d => _data += d);
process.stdin.on('end', () => {
  const n = parseInt(_data.trim(), 10);

  // ── WRITE YOUR SOLUTION HERE ────────────────────────────────────────────────


  // ───────────────────────────────────────────────────────────────────────────

  console.log(result);
});
```

### TypeScript (Node.js)
```typescript
declare function require(m: string): any;
declare const process: any;
const rl = require('readline').createInterface({ input: process.stdin, terminal: false });
const lines: string[] = [];
rl.on('line', (l: string) => lines.push(l));
rl.on('close', () => {
  const n: number = parseInt(lines[0].trim(), 10);

  // ── WRITE YOUR SOLUTION HERE ────────────────────────────────────────────────


  // ───────────────────────────────────────────────────────────────────────────

  console.log(result);
});
```

### Java
```java
import java.util.Scanner;
public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        long n = sc.nextLong();

        // ── WRITE YOUR SOLUTION HERE ──────────────────────────────────────────


        // ─────────────────────────────────────────────────────────────────────

        System.out.println(result);
        sc.close();
    }
}
```

> **Requirement:** You **must** use the template for your chosen language above.
> Replace only the section between the two comment lines with your code.
> Do not remove the `print` / `cout` / `console.log` / `System.out.println` call — the judge reads stdout.
"""

INPUT_GUIDE_STRING = """\
---

## How to Use This Template

> **Judge rules:** Your program reads from **standard input** (`stdin`) and writes to
> **standard output** (`stdout`). A single string is piped in on one line.
> **No prompts** — just read and print. Write your solution where indicated by the comment.

### Python
```python
s = input().strip()

# ── WRITE YOUR SOLUTION HERE ──────────────────────────────────────────────────


# ─────────────────────────────────────────────────────────────────────────────

print(result)
```

### C++
```cpp
#include <iostream>
#include <string>
using namespace std;

int main() {
    string s;
    getline(cin, s);

    // ── WRITE YOUR SOLUTION HERE ──────────────────────────────────────────────


    // ─────────────────────────────────────────────────────────────────────────

    cout << result << endl;
    return 0;
}
```

### JavaScript (Node.js)
```javascript
process.stdin.resume();
process.stdin.setEncoding('utf8');
let _data = '';
process.stdin.on('data', d => _data += d);
process.stdin.on('end', () => {
  const s = _data.trim();

  // ── WRITE YOUR SOLUTION HERE ────────────────────────────────────────────────


  // ───────────────────────────────────────────────────────────────────────────

  console.log(result);
});
```

### TypeScript (Node.js)
```typescript
declare function require(m: string): any;
declare const process: any;
const rl = require('readline').createInterface({ input: process.stdin, terminal: false });
const lines: string[] = [];
rl.on('line', (l: string) => lines.push(l));
rl.on('close', () => {
  const s: string = lines[0].trim();

  // ── WRITE YOUR SOLUTION HERE ────────────────────────────────────────────────


  // ───────────────────────────────────────────────────────────────────────────

  console.log(result);
});
```

### Java
```java
import java.util.Scanner;
public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        String s = sc.nextLine().trim();

        // ── WRITE YOUR SOLUTION HERE ──────────────────────────────────────────


        // ─────────────────────────────────────────────────────────────────────

        System.out.println(result);
        sc.close();
    }
}
```

> **Requirement:** You **must** use the template for your chosen language above.
> Replace only the section between the two comment lines with your code.
> Do not remove the `print` / `cout` / `console.log` / `System.out.println` call — the judge reads stdout.
"""

INPUT_GUIDE_TWO_SUM = """\
---

## How to Use This Template

> **Judge rules:** Your program reads from **standard input** (`stdin`) and writes to
> **standard output** (`stdout`).
>
> **Input format — 2 lines:**
> - Line 1: space-separated integers (the array `nums`)
> - Line 2: the target integer
>
> **Output format:** Two space-separated integers — the 0-based indices of the two
> numbers that add up to `target` (smaller index first).
>
> Write your solution where indicated by the comment.

### Python
```python
nums = list(map(int, input().split()))
target = int(input())

# ── WRITE YOUR SOLUTION HERE ──────────────────────────────────────────────────
# Store the two indices in variables i and j (smaller index first).


# ─────────────────────────────────────────────────────────────────────────────

print(i, j)
```

### C++
```cpp
#include <iostream>
#include <vector>
#include <sstream>
using namespace std;

int main() {
    string line;
    getline(cin, line);
    istringstream iss(line);
    vector<int> nums;
    int x;
    while (iss >> x) nums.push_back(x);

    int target;
    cin >> target;

    // ── WRITE YOUR SOLUTION HERE ──────────────────────────────────────────────
    // Store the two indices in variables i and j (smaller index first).


    // ─────────────────────────────────────────────────────────────────────────

    cout << i << " " << j << endl;
    return 0;
}
```

### JavaScript (Node.js)
```javascript
process.stdin.resume();
process.stdin.setEncoding('utf8');
let _data = '';
process.stdin.on('data', d => _data += d);
process.stdin.on('end', () => {
  const lines = _data.trim().split('\\n');
  const nums = lines[0].trim().split(/\\s+/).map(Number);
  const target = parseInt(lines[1].trim(), 10);

  // ── WRITE YOUR SOLUTION HERE ────────────────────────────────────────────────
  // Store the two indices in variables i and j (smaller index first).


  // ───────────────────────────────────────────────────────────────────────────

  console.log(i + ' ' + j);
});
```

### TypeScript (Node.js)
```typescript
declare function require(m: string): any;
declare const process: any;
const rl = require('readline').createInterface({ input: process.stdin, terminal: false });
const lines: string[] = [];
rl.on('line', (l: string) => lines.push(l));
rl.on('close', () => {
  const nums: number[] = lines[0].trim().split(/\s+/).map(Number);
  const target: number = parseInt(lines[1].trim(), 10);

  // ── WRITE YOUR SOLUTION HERE ────────────────────────────────────────────────
  // Store the two indices in variables i and j (smaller index first).


  // ───────────────────────────────────────────────────────────────────────────

  console.log(i + ' ' + j);
});
```

### Java
```java
import java.util.Scanner;
public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        String[] parts = sc.nextLine().trim().split("\\\\s+");
        int[] nums = new int[parts.length];
        for (int k = 0; k < parts.length; k++) nums[k] = Integer.parseInt(parts[k]);
        int target = sc.nextInt();

        // ── WRITE YOUR SOLUTION HERE ──────────────────────────────────────────
        // Store the two indices in variables i and j (smaller index first).


        // ─────────────────────────────────────────────────────────────────────

        System.out.println(i + " " + j);
        sc.close();
    }
}
```

> **Requirement:** You **must** use the template for your chosen language above.
> Replace only the section between the two comment lines with your code.
> Do not remove the output statement at the bottom — the judge reads stdout.
"""


# ---------------------------------------------------------------------------
# Question 1 — Reverse a Number
# ---------------------------------------------------------------------------

Q1_TITLE = "Reverse a Number"

Q1_DESCRIPTION = """\
## Problem Statement

Given a **32-bit signed integer** `n`, return the integer with its digits reversed.

**Rules:**
- You **must not** convert the number to a string at any point.
- Use only **arithmetic** (modulo `%`, integer division `//` or `/`, multiplication `*`).
- If the reversed number overflows the 32-bit signed integer range `[−2³¹, 2³¹ − 1]`, return `0`.
- The sign is preserved automatically by arithmetic: reversing `−123` yields `−321`.
- Leading zeros after reversal are dropped naturally (e.g. `1000` → `1`).

---

## Input / Output Format

```
<n>
```

One line containing a single integer `n`.
Output the reversed integer, or `0` on overflow.

---

## Examples

| Input         | Output    | Notes                              |
|---------------|-----------|------------------------------------|
| `12345`       | `54321`   | straightforward reverse            |
| `−12345`      | `−54321`  | sign preserved                     |
| `1000`        | `1`       | trailing zeros become leading      |
| `0`           | `0`       | zero stays zero                    |
| `1534236469`  | `0`       | reversed value overflows 2³¹ − 1   |

---

## Constraints

- `−2³¹ ≤ n ≤ 2³¹ − 1`
- **Do not** use string conversion, casting to string, or any string operations.

""" + INPUT_GUIDE_INTEGER

Q1_CASES = [
    # visible samples
    ("12345",        "54321",      False),
    ("-12345",       "-54321",     False),
    ("1000",         "1",          False),
    # hidden tests
    ("0",            "0",          True),
    ("1",            "1",          True),
    ("-1",           "-1",         True),
    ("9",            "9",          True),
    ("100",          "1",          True),
    ("-100",         "-1",         True),
    ("120",          "21",         True),
    ("123456789",    "987654321",  True),
    ("-987654321",   "-123456789", True),
    ("1534236469",   "0",          True),
]


# ---------------------------------------------------------------------------
# Question 2 — Most Occurring Character
# ---------------------------------------------------------------------------

Q2_TITLE = "Most Occurring Character"

Q2_DESCRIPTION = """\
## Problem Statement

Given a non-empty string `s`, find the character that appears **most frequently** in the
entire string (total count, not consecutive runs).

- If two or more characters are tied for the highest frequency, return the one that
  **appears first** in the string.
- Every character counts, including spaces, digits, and punctuation.

---

## Input / Output Format

```
<s>
```

One line containing the string `s`.
Output a **single character** — the one with the highest frequency.

---

## Examples

| Input              | Output | Explanation                                              |
|--------------------|--------|----------------------------------------------------------|
| `abracadabra`      | `a`    | `a` appears 5 times — the most                          |
| `aabbcc`           | `a`    | `a`, `b`, `c` each appear 2 times → first in string is `a` |
| `hello world`      | `l`    | `l` appears 3 times (beats every other character)        |
| `mississippi`      | `i`    | `i` appears 4 times (tied with `s` at 4) → `i` first in string |
| `z`                | `z`    | single character                                         |

---

## Constraints

- `1 ≤ len(s) ≤ 100 000`
- `s` contains printable ASCII characters.

""" + INPUT_GUIDE_STRING

Q2_CASES = [
    # visible samples
    ("abracadabra",  "a",  False),
    ("aabbcc",       "a",  False),
    ("hello world",  "l",  False),
    # hidden tests
    ("z",            "z",  True),
    ("mississippi",  "i",  True),
    ("aaabbc",       "a",  True),
    ("xyzxyz",       "x",  True),
    ("aabbbbcc",     "b",  True),
    ("programming",  "g",  True),
    ("abcdefg",      "a",  True),
    ("zzzzaaaa",     "z",  True),
    ("banana",       "a",  True),
    ("racecar",      "r",  True),
]


# ---------------------------------------------------------------------------
# Question 3 — Two Sum
# ---------------------------------------------------------------------------

Q3_TITLE = "Two Sum"

Q3_DESCRIPTION = """\
## Problem Statement

Given an array of integers `nums` and an integer `target`, return the **indices** of the
two numbers that add up to `target`.

**Rules:**
- Each input has **exactly one solution**.
- You may not use the same element twice.
- Output the two indices separated by a space, **smaller index first**.

---

## Input / Output Format

```
<space-separated integers>
<target>
```

Line 1 contains the array elements separated by spaces.
Line 2 contains the target integer.
Output two space-separated integers (0-based indices, smaller first).

---

## Examples

| Input                  | Output | Explanation                              |
|------------------------|--------|------------------------------------------|
| `2 7 11 15`<br>`9`     | `0 1`  | nums[0] + nums[1] = 2 + 7 = 9            |
| `3 2 4`<br>`6`         | `1 2`  | nums[1] + nums[2] = 2 + 4 = 6            |
| `3 3`<br>`6`           | `0 1`  | nums[0] + nums[1] = 3 + 3 = 6            |
| `1 5 3 7 2`<br>`9`     | `1 3`  | nums[1] + nums[3] = 5 + 7 = 9            |

---

## Constraints

- `2 ≤ len(nums) ≤ 10 000`
- `-10⁹ ≤ nums[i] ≤ 10⁹`
- `-10⁹ ≤ target ≤ 10⁹`
- Exactly one valid answer exists.

""" + INPUT_GUIDE_TWO_SUM

Q3_CASES = [
    # visible samples
    ("2 7 11 15\n9",   "0 1", False),
    ("3 2 4\n6",       "1 2", False),
    ("3 3\n6",         "0 1", False),
    # hidden tests
    ("1 5 3 7 2\n9",   "1 3", True),
    ("0 4 3 0\n0",     "0 3", True),
    ("-1 -2 -3 -4 -5\n-8", "2 4", True),
    ("1 2 3 4 5\n9",   "3 4", True),
    ("5 75 25\n100",   "1 2", True),
    ("1 3 5 7 9\n12",  "2 4", True),
    ("10 20 30 40\n50","0 4", True),
    ("100 200 300\n500","1 2", True),
    ("-3 4 3 90\n0",   "0 2", True),
]


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    repo_root = Path(__file__).parent.parent
    env = load_env(repo_root / "apps" / "api" / ".env")

    supabase_url = env.get("SUPABASE_URL") or os.environ.get("SUPABASE_URL", "")
    service_key  = env.get("SUPABASE_SERVICE_KEY") or os.environ.get("SUPABASE_SERVICE_KEY", "")

    if not supabase_url or not service_key:
        print(
            "Error: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in apps/api/.env",
            file=sys.stderr,
        )
        sys.exit(1)

    # Warn if anon key used instead of service_role
    try:
        import base64 as _b64
        part = service_key.split(".")[1]
        part += "=" * (4 - len(part) % 4)
        claims = json.loads(_b64.b64decode(part))
        if claims.get("role") != "service_role":
            print(
                "Warning: SUPABASE_SERVICE_KEY looks like the anon key, not service_role.\n"
                "Get the service_role key from: Supabase dashboard → Project Settings → API\n",
                file=sys.stderr,
            )
    except Exception:
        pass

    rest = "/rest/v1"
    question_ids: list[str] = []

    # ------------------------------------------------------------------
    # Insert 3 questions + their test cases
    # ------------------------------------------------------------------
    questions_meta = [
        (Q1_TITLE, Q1_DESCRIPTION, "easy",   Q1_CASES, ["math", "arithmetic"]),
        (Q2_TITLE, Q2_DESCRIPTION, "easy",   Q2_CASES, ["strings", "hash-map"]),
        (Q3_TITLE, Q3_DESCRIPTION, "medium", Q3_CASES, ["arrays", "hash-map"]),
    ]

    for title, description, difficulty, cases, tags in questions_meta:
        print(f"Creating question: {title}…")
        question = post(supabase_url, service_key, f"{rest}/questions", {
            "title":           title,
            "description":     description,
            "type":            "coding",
            "difficulty":      difficulty,
            "time_limit_ms":   2000,
            "memory_limit_mb": 256,
            "tags":            tags,
        })
        qid = question["id"]
        question_ids.append(qid)
        print(f"  id: {qid}")

        visible_n = sum(1 for _, _, h in cases if not h)
        hidden_n  = sum(1 for _, _, h in cases if h)
        print(f"  Creating {len(cases)} test cases ({visible_n} visible, {hidden_n} hidden)…")
        for inp, expected, hidden in cases:
            post(supabase_url, service_key, f"{rest}/test_cases", {
                "question_id":     qid,
                "input":           inp,
                "expected_output": expected,
                "is_hidden":       hidden,
            })

    # ------------------------------------------------------------------
    # Insert assessment
    # ------------------------------------------------------------------
    print("\nCreating assessment…")
    assessment = post(supabase_url, service_key, f"{rest}/assessments", {
        "title":             "Technical Assessment Wamo Labs",
        "status":            "active",
        "duration_minutes":  60,
        "allowed_languages": ["python", "javascript", "typescript", "cpp", "java"],
        "security_level":    "standard",
        "question_ids":      question_ids,
        "assessment_type":   "open",
        "is_mock":           False,
    })
    assessment_id = assessment["id"]
    print(f"  id: {assessment_id}")

    # ------------------------------------------------------------------
    # Link questions via assessment_questions
    # Weightages: 30% + 30% + 40% = 100%
    # ------------------------------------------------------------------
    weightages = [30.00, 30.00, 40.00]
    print("\nLinking questions to assessment (30% / 30% / 40%)…")
    for order, (qid, w) in enumerate(zip(question_ids, weightages)):
        post(supabase_url, service_key, f"{rest}/assessment_questions", {
            "assessment_id": assessment_id,
            "question_id":   qid,
            "weightage":     w,
            "order_index":   order,
        })
        label = questions_meta[order][0]
        print(f"  [{order + 1}] {label:35s}  {w:.0f}%")

    # ------------------------------------------------------------------
    # Summary
    # ------------------------------------------------------------------
    print()
    print("=" * 66)
    print("Done.")
    print(f"  Assessment:  Technical Assessment Wamo Labs")
    print(f"  Duration:    60 minutes")
    print(f"  ID:          {assessment_id}")
    print(f"  Languages:   Python, JavaScript, TypeScript, C++, Java")
    print()
    rows = [
        ("Reverse a Number",        "easy",   "30%", Q1_CASES),
        ("Most Occurring Character", "easy",   "30%", Q2_CASES),
        ("Two Sum",                  "medium", "40%", Q3_CASES),
    ]
    for i, (qid, (title, diff, weight, cases)) in enumerate(
        zip(question_ids, rows), start=1
    ):
        visible_n = sum(1 for _, _, h in cases if not h)
        hidden_n  = sum(1 for _, _, h in cases if h)
        print(f"  Q{i}: {title}")
        print(f"       difficulty: {diff:<6}  weight: {weight}  "
              f"tests: {visible_n} visible + {hidden_n} hidden")
        print(f"       id: {qid}")
    print()
    print("Next steps:")
    print("  1. Open the admin dashboard → Assessments")
    print("  2. Open 'Technical Assessment Wamo Labs' → Invites tab")
    print("  3. Click '+ Invite Candidate' to generate a token")
    print("  4. Paste the token into the desktop app to begin")
    print("=" * 66)


if __name__ == "__main__":
    main()
