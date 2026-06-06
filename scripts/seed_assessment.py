#!/usr/bin/env python3
"""
Seed a 3-question coding assessment (60 min) into Supabase.

Questions:
  1. Reverse a Number (without string conversion)  — 30%
  2. Most Occurring Character                       — 30%
  3. Two Sum                                        — 40%

Usage:
    python scripts/seed_assessment.py

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
# Question 1 — Reverse a Number (no string conversion)
# ---------------------------------------------------------------------------

Q1_TITLE = "Reverse a Number"

Q1_DESCRIPTION = """\
## Problem Statement

Given a **32-bit signed integer** `n`, return the integer with its digits reversed.

**Rules:**
- You **must not** convert the number to a string at any point.
- Use only **arithmetic** (division, modulo, multiplication, addition).
- If the reversed number overflows the 32-bit signed integer range `[-2³¹, 2³¹ − 1]`, return `0`.
- The sign must be preserved: reversing `-123` gives `-321`.
- Leading zeros after reversal are dropped naturally (e.g. `1000` → `1`).

---

## Input / Output Format

```
<n>   ← a single integer
```

Output: the reversed integer (or `0` on overflow).

---

## Examples

| Input  | Output  | Notes                         |
|--------|---------|-------------------------------|
| 12345  | 54321   | straightforward reverse       |
| -12345 | -54321  | negative — sign preserved     |
| 1000   | 1       | trailing zeros become leading |
| 0      | 0       | zero stays zero               |

---

## Constraints

- `-2³¹ ≤ n ≤ 2³¹ − 1`
- Do **not** use string conversion or casting to string in your solution.
"""

# (input, expected_output, is_hidden)
Q1_CASES = [
    # visible samples (3)
    ("12345",       "54321",    False),
    ("-12345",      "-54321",   False),
    ("1000",        "1",        False),
    # hidden tests (10)
    ("0",           "0",        True),
    ("1",           "1",        True),
    ("-1",          "-1",       True),
    ("9",           "9",        True),
    ("100",         "1",        True),
    ("-100",        "-1",       True),
    ("120",         "21",       True),
    ("123456789",   "987654321",True),
    ("-987654321",  "-123456789", True),
    ("1534236469",  "0",        True),  # reversed = 9646324351 > 2^31-1, overflows
]


# ---------------------------------------------------------------------------
# Question 2 — Most Occurring Character
# ---------------------------------------------------------------------------

Q2_TITLE = "Most Occurring Character"

Q2_DESCRIPTION = """\
## Problem Statement

Given a non-empty string `s`, find the character that appears **most frequently**.

**Tie-breaking rule:** if two or more characters share the highest frequency, return the one with the **smallest ASCII value** (i.e. the one that comes first alphabetically).

---

## Input / Output Format

```
<s>   ← a single non-empty string (printable ASCII, no spaces)
```

Output: a single character — the most frequently occurring one.

---

## Examples

| Input                | Output | Explanation                          |
|----------------------|--------|--------------------------------------|
| abbaaabbbaaaaacbbb   | a      | a×9, b×8, c×1 → `a` wins            |
| hello                | l      | l×2, others ×1 → `l` wins           |
| aabb                 | a      | a×2, b×2 → tie → `a` < `b` wins     |
| aabbcc               | a      | all ×2 → `a` has smallest ASCII      |

---

## Constraints

- `1 ≤ len(s) ≤ 10 000`
- `s` contains only printable ASCII characters (no spaces).
"""

# Character frequency verification (hidden cases):
#   mississippi → m:1 i:4 s:4 p:2   — tie i & s → 'i' wins
#   programming → p:1 r:2 o:1 g:2 a:1 m:2 i:1 n:1 — tie g,m,r → 'g' wins
#   aaabbbcccc  → a:3 b:3 c:4       — 'c' wins
#   abcde       → all ×1            — 'a' wins
#   zzzaaa      → z:3 a:3           — tie → 'a' wins
Q2_CASES = [
    # visible samples (3)
    ("abbaaabbbaaaaacbbb", "a",  False),  # a×9, b×8, c×1
    ("hello",              "l",  False),  # l×2
    ("aabb",               "a",  False),  # tie a & b → 'a'
    # hidden tests (9)
    ("z",                  "z",  True),
    ("aabbcc",             "a",  True),   # all ×2 → 'a'
    ("xxyyzz",             "x",  True),   # all ×2 → 'x'
    ("mississippi",        "i",  True),   # i:4 s:4 → 'i'
    ("programming",        "g",  True),   # g:2 m:2 r:2 → 'g'
    ("aaabbbcccc",         "c",  True),   # c:4
    ("abcde",              "a",  True),   # all ×1 → 'a'
    ("zzzaaa",             "a",  True),   # z:3 a:3 → 'a'
    ("aaaaaaaaaa",         "a",  True),
]


# ---------------------------------------------------------------------------
# Question 3 — Two Sum
# ---------------------------------------------------------------------------

Q3_TITLE = "Two Sum"

Q3_DESCRIPTION = """\
## Problem Statement

Given an array of integers `nums` and a target integer `target`, return the **0-based indices** of the two numbers that add up to `target`.

**Guarantees:**
- Exactly one valid solution exists.
- You may not use the same element twice (unless it appears at two distinct indices).

Return the two indices separated by a space, **smaller index first**.

---

## Input / Output Format

```
<n>                ← number of elements
<a1> <a2> … <an>   ← space-separated integers
<target>           ← target sum
```

Output: two space-separated 0-based indices `i j` where `i < j`.

---

## Examples

| nums            | target | Output | Notes          |
|-----------------|--------|--------|----------------|
| [2, 7, 11, 15]  | 9      | 0 1    | 2 + 7 = 9      |
| [3, 2, 4]       | 6      | 1 2    | 2 + 4 = 6      |
| [3, 3]          | 6      | 0 1    | 3 + 3 = 6      |

---

## Constraints

- `2 ≤ n ≤ 10 000`
- `-10⁹ ≤ nums[i] ≤ 10⁹`
- `-10⁹ ≤ target ≤ 10⁹`
- Exactly one solution exists.
"""

# Each case verified to have exactly one unique pair of indices.
#   [2,7,11,15] t=9    → (0,1)  2+7=9   ✓ only pair
#   [3,2,4]     t=6    → (1,2)  2+4=6   ✓
#   [3,3]       t=6    → (0,1)  3+3=6   ✓
#   [1,2,3,4,5] t=9    → (3,4)  4+5=9   ✓
#   [0,4,3,0]   t=0    → (0,3)  0+0=0   ✓
#   [-1,-2,-3,-4,-5] t=-8 → (2,4) -3+-5=-8 ✓
#   [1,5,3,2,9] t=12   → (2,4)  3+9=12  ✓
#   [2,5,5,11]  t=10   → (1,2)  5+5=10  ✓
#   [100,200,300,400] t=700 → (2,3) 300+400=700 ✓
#   [-3,4,3,90] t=0    → (0,2)  -3+3=0  ✓
#   [1,4,6,7,10] t=14  → (1,4)  4+10=14 ✓ (6+8? 8 not present)
#   [4,1,9,7,5] t=11   → (0,3)  4+7=11  ✓
Q3_CASES = [
    # visible samples (3)
    ("4\n2 7 11 15\n9",          "0 1", False),
    ("3\n3 2 4\n6",              "1 2", False),
    ("2\n3 3\n6",                "0 1", False),
    # hidden tests (9)
    ("5\n1 2 3 4 5\n9",          "3 4", True),
    ("4\n0 4 3 0\n0",            "0 3", True),
    ("5\n-1 -2 -3 -4 -5\n-8",   "2 4", True),
    ("5\n1 5 3 2 9\n12",         "2 4", True),
    ("4\n2 5 5 11\n10",          "1 2", True),
    ("4\n100 200 300 400\n700",  "2 3", True),
    ("4\n-3 4 3 90\n0",          "0 2", True),
    ("5\n1 4 6 7 10\n14",        "1 4", True),
    ("5\n4 1 9 7 5\n11",         "0 3", True),
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
    # Insert the 3 questions + their test cases
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
    # Insert assessment (60 minutes, all 3 questions)
    # ------------------------------------------------------------------
    print("\nCreating assessment…")
    assessment = post(supabase_url, service_key, f"{rest}/assessments", {
        "title":             "Coding Skills Assessment",
        "status":            "active",
        "duration_minutes":  60,
        "allowed_languages": ["python", "javascript", "java", "cpp", "go", "rust"],
        "security_level":    "standard",
        "question_ids":      question_ids,
    })
    assessment_id = assessment["id"]
    print(f"  id: {assessment_id}")

    # ------------------------------------------------------------------
    # Link questions via assessment_questions
    # Weightages: Q1 30% + Q2 30% + Q3 40% = 100%
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
        print(f"  [{order + 1}] {label:30s}  {w:.0f}%")

    # ------------------------------------------------------------------
    # Summary
    # ------------------------------------------------------------------
    print()
    print("=" * 62)
    print("Done.")
    print(f"  Assessment:  Coding Skills Assessment")
    print(f"  Duration:    60 minutes")
    print(f"  ID:          {assessment_id}")
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
    print("  2. Open 'Coding Skills Assessment' → Invites tab")
    print("  3. Click '+ Invite Candidate' to generate a token")
    print("  4. Paste the token into the desktop app to begin")
    print("=" * 62)


if __name__ == "__main__":
    main()
