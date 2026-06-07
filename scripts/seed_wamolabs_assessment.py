#!/usr/bin/env python3
"""
Seed the "Wamolabs-Interview Drive-6pm" assessment into Supabase.

Questions:
  1. Reverse a Number (no string conversion)  — 33%
  2. Parenthesis Match                        — 34%
  3. Most Repeated Consecutive Character      — 33%

Usage:
    python scripts/seed_wamolabs_assessment.py

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
# Shared Input Guide sections (embedded in every question description)
# ---------------------------------------------------------------------------

INPUT_GUIDE_INTEGER = """\
---

## Input Guide — All Languages

> **How the judge works:** Your program reads from **standard input** (`stdin`) and writes
> to **standard output** (`stdout`). Each test case pipes one line containing the integer
> directly into your program. No prompts — just read and print.

### Python
```python
n = int(input())

# ... your solution ...

print(result)
```

### JavaScript (Node.js)
```javascript
process.stdin.resume();
process.stdin.setEncoding('utf8');
let data = '';
process.stdin.on('data', d => data += d);
process.stdin.on('end', () => {
  const n = parseInt(data.trim(), 10);
  // ... your solution ...
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
  // ... your solution ...
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
        // ... your solution ...
        System.out.println(result);
        sc.close();
    }
}
```

### C++
```cpp
#include <iostream>
using namespace std;
int main() {
    long long n;
    cin >> n;
    // ... your solution ...
    cout << result << endl;
    return 0;
}
```

### C
```c
#include <stdio.h>
int main() {
    long long n;
    scanf("%lld", &n);
    // ... your solution ...
    printf("%lld\\n", result);
    return 0;
}
```

### C#
```csharp
using System;
class Main {
    static void Main() {
        long n = long.Parse(Console.ReadLine()!.Trim());
        // ... your solution ...
        Console.WriteLine(result);
    }
}
```

### Go
```go
package main

import (
    "bufio"
    "fmt"
    "os"
)

func main() {
    reader := bufio.NewReader(os.Stdin)
    var n int64
    fmt.Fscan(reader, &n)
    // ... your solution ...
    fmt.Println(result)
}
```

### Rust
```rust
use std::io::{self, BufRead};

fn main() {
    let stdin = io::stdin();
    let line = stdin.lock().lines().next().unwrap().unwrap();
    let n: i64 = line.trim().parse().unwrap();
    // ... your solution ...
    println!("{}", result);
}
```

### Ruby
```ruby
n = gets.chomp.to_i
# ... your solution ...
puts result
```

### Kotlin
```kotlin
fun main() {
    val n = readLine()!!.trim().toLong()
    // ... your solution ...
    println(result)
}
```

### Swift
```swift
import Foundation
let n = Int(readLine()!.trimmingCharacters(in: .whitespaces))!
// ... your solution ...
print(result)
```

### PHP
```php
<?php
$n = intval(trim(fgets(STDIN)));
// ... your solution ...
echo $result . "\\n";
```

### R
```r
n <- as.integer(readLines("stdin", n = 1))
# ... your solution ...
cat(result, "\\n")
```

### Scala
```scala
import scala.io.StdIn
object Main {
  def main(args: Array[String]): Unit = {
    val n = StdIn.readLine().trim.toLong
    // ... your solution ...
    println(result)
  }
}
```

### Bash
```bash
#!/bin/bash
read -r n
# ... your solution ...
echo "$result"
```

### Haskell
```haskell
main :: IO ()
main = do
    line <- getLine
    let n = read line :: Integer
    -- ... your solution ...
    print result
```

### Lua
```lua
local n = tonumber(io.read())
-- ... your solution ...
print(result)
```

### Perl
```perl
use strict;
use warnings;
my $n = int(<STDIN>);
# ... your solution ...
print "$result\\n";
```

### Elixir
```elixir
n = IO.gets("") |> String.trim() |> String.to_integer()
# ... your solution ...
IO.puts(result)
```
"""

INPUT_GUIDE_STRING = """\
---

## Input Guide — All Languages

> **How the judge works:** Your program reads from **standard input** (`stdin`) and writes
> to **standard output** (`stdout`). Each test case pipes one line containing the input
> string directly into your program. No prompts — just read and print.

### Python
```python
s = input().strip()

# ... your solution ...

print(result)
```

### JavaScript (Node.js)
```javascript
process.stdin.resume();
process.stdin.setEncoding('utf8');
let data = '';
process.stdin.on('data', d => data += d);
process.stdin.on('end', () => {
  const s = data.trim();
  // ... your solution ...
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
  // ... your solution ...
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
        // ... your solution ...
        System.out.println(result);
        sc.close();
    }
}
```

### C++
```cpp
#include <iostream>
#include <string>
using namespace std;
int main() {
    string s;
    getline(cin, s);
    // ... your solution ...
    cout << result << endl;
    return 0;
}
```

### C
```c
#include <stdio.h>
#include <string.h>
int main() {
    char s[100001];
    fgets(s, sizeof(s), stdin);
    s[strcspn(s, "\\n")] = 0;  /* strip trailing newline */
    /* ... your solution ... */
    printf("%s\\n", result);
    return 0;
}
```

### C#
```csharp
using System;
class Main {
    static void Main() {
        string s = Console.ReadLine()!.Trim();
        // ... your solution ...
        Console.WriteLine(result);
    }
}
```

### Go
```go
package main

import (
    "bufio"
    "fmt"
    "os"
    "strings"
)

func main() {
    reader := bufio.NewReader(os.Stdin)
    s, _ := reader.ReadString('\\n')
    s = strings.TrimSpace(s)
    // ... your solution ...
    fmt.Println(result)
}
```

### Rust
```rust
use std::io::{self, BufRead};

fn main() {
    let stdin = io::stdin();
    let s = stdin.lock().lines().next().unwrap().unwrap();
    let s = s.trim().to_string();
    // ... your solution ...
    println!("{}", result);
}
```

### Ruby
```ruby
s = gets.chomp
# ... your solution ...
puts result
```

### Kotlin
```kotlin
fun main() {
    val s = readLine()!!.trim()
    // ... your solution ...
    println(result)
}
```

### Swift
```swift
import Foundation
let s = readLine()!.trimmingCharacters(in: .whitespaces)
// ... your solution ...
print(result)
```

### PHP
```php
<?php
$s = trim(fgets(STDIN));
// ... your solution ...
echo $result . "\\n";
```

### R
```r
s <- trimws(readLines("stdin", n = 1))
# ... your solution ...
cat(result, "\\n")
```

### Scala
```scala
import scala.io.StdIn
object Main {
  def main(args: Array[String]): Unit = {
    val s = StdIn.readLine().trim
    // ... your solution ...
    println(result)
  }
}
```

### Bash
```bash
#!/bin/bash
read -r s
# ... your solution ...
echo "$result"
```

### Haskell
```haskell
main :: IO ()
main = do
    s <- fmap (filter (/= '\\n')) getLine
    -- ... your solution ...
    putStrLn result
```

### Lua
```lua
local s = io.read():gsub("%s+$", "")
-- ... your solution ...
print(result)
```

### Perl
```perl
use strict;
use warnings;
my $s = <STDIN>;
chomp $s;
# ... your solution ...
print "$result\\n";
```

### Elixir
```elixir
s = IO.gets("") |> String.trim()
# ... your solution ...
IO.puts(result)
```
"""


# ---------------------------------------------------------------------------
# Question 1 — Reverse a Number (no string conversion)
# ---------------------------------------------------------------------------

Q1_TITLE = "Reverse a Number"

Q1_DESCRIPTION = """\
## Problem Statement

Given a **32-bit signed integer** `n`, return the integer with its digits reversed.

**Rules:**
- You **must not** convert the number to a string at any point.
- Use only **arithmetic** (modulo `%`, integer division `//`, multiplication `*`).
- If the reversed number overflows the 32-bit signed integer range `[-2³¹, 2³¹ − 1]`, return `0`.
- The sign is preserved automatically by arithmetic: reversing `-123` yields `-321`.
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

| Input        | Output   | Notes                          |
|--------------|----------|--------------------------------|
| `12345`      | `54321`  | straightforward reverse        |
| `-12345`     | `-54321` | sign preserved                 |
| `1000`       | `1`      | trailing zeros become leading  |
| `0`          | `0`      | zero stays zero                |
| `1534236469` | `0`      | reversed value overflows 2³¹−1 |

---

## Constraints

- `-2³¹ ≤ n ≤ 2³¹ − 1`
- Do **not** use string conversion, casting to string, or any string operations.

""" + INPUT_GUIDE_INTEGER

# (input, expected_output, is_hidden)
Q1_CASES = [
    # visible samples (3)
    ("12345",        "54321",      False),
    ("-12345",       "-54321",     False),
    ("1000",         "1",          False),
    # hidden tests (10)
    ("0",            "0",          True),
    ("1",            "1",          True),
    ("-1",           "-1",         True),
    ("9",            "9",          True),
    ("100",          "1",          True),
    ("-100",         "-1",         True),
    ("120",          "21",         True),
    ("123456789",    "987654321",  True),
    ("-987654321",   "-123456789", True),
    ("1534236469",   "0",          True),  # reversed 9646324351 > 2^31-1, overflows
]


# ---------------------------------------------------------------------------
# Question 2 — Parenthesis Match
# ---------------------------------------------------------------------------

Q2_TITLE = "Parenthesis Match"

Q2_DESCRIPTION = """\
## Problem Statement

Given a string `s` consisting of bracket characters `(`, `)`, `[`, `]`, `{`, `}`,
determine whether every opening bracket has a corresponding closing bracket in the
correct order and nesting.

Output `true` if the string is **valid** (all brackets are matched and properly nested),
otherwise output `false`.

**Rules:**
- Every opening bracket `(`, `[`, or `{` must be closed by the **same type** of bracket.
- Opening brackets must be closed **in the correct order** — no interleaving allowed.
- An empty string is considered valid.

---

## Input / Output Format

```
<s>
```

One line containing the bracket string.
Output exactly `true` or `false`.

---

## Examples

| Input      | Output  | Notes                              |
|------------|---------|------------------------------------|
| `(())`     | `true`  | nested parens, both matched        |
| `()[]{}`   | `true`  | three pairs, sequential            |
| `(]`       | `false` | mismatched types                   |
| `([)]`     | `false` | correct types but wrong order      |
| `{[]}`     | `true`  | properly nested mixed brackets     |
| *(empty)*  | `true`  | empty string is valid              |

---

## Constraints

- `0 ≤ len(s) ≤ 10 000`
- `s` contains only the characters `(`, `)`, `[`, `]`, `{`, `}`.

""" + INPUT_GUIDE_STRING

# (input, expected_output, is_hidden)
Q2_CASES = [
    # visible samples (3)
    ("(())",      "true",  False),
    ("()[]{}", "true",  False),
    ("(]",        "false", False),
    # hidden tests (9)
    ("",            "true",  True),   # empty is valid
    ("{[]}",        "true",  True),
    ("([)]",        "false", True),
    ("(((", "false", True),
    ("}}}",         "false", True),   # only closers
    ("{{}[]()}",    "true",  True),
    ("([{}])",      "true",  True),
    ("(([]))[]{}", "true",  True),
    ("([)][]",      "false", True),
]


# ---------------------------------------------------------------------------
# Question 3 — Most Repeated Consecutive Character
# ---------------------------------------------------------------------------

Q3_TITLE = "Most Repeated Consecutive Character"

Q3_DESCRIPTION = """\
## Problem Statement

Given a non-empty string `s`, find the character that appears in the **longest
unbroken consecutive run** of identical characters anywhere in the string.

- If two or more characters are tied for the longest run, return the one with
  the **smallest ASCII value** (i.e. the one that comes first alphabetically /
  numerically — `'a'` beats `'b'`, `'A'` beats `'a'`, etc.).
- Every character in the string is counted, including digits, spaces, and symbols.

---

## Input / Output Format

```
<s>
```

One line containing the string `s`.
Output a **single character** — the one with the longest consecutive run.

---

## Examples

| Input              | Output | Explanation                                              |
|--------------------|--------|----------------------------------------------------------|
| `abbaabbbaaaaac`   | `a`    | `aaaa` is a run of 4 — the longest                      |
| `aabbcc`           | `a`    | `aa`, `bb`, `cc` all tie at 2 → `a` has smallest ASCII  |
| `zzzbbbaaaa`       | `a`    | `aaaa` run of 4 beats `zzz` and `bbb` (run of 3 each)   |
| `aabbbcc`          | `b`    | `bbb` run of 3 — only character with a run > 2           |
| `abc`              | `a`    | all single characters → `a` has smallest ASCII           |

---

## Constraints

- `1 ≤ len(s) ≤ 100 000`
- `s` contains printable ASCII characters.

""" + INPUT_GUIDE_STRING

# (input, expected_output, is_hidden)
Q3_CASES = [
    # visible samples (3)
    ("abbaabbbaaaaac", "a", False),  # aaaa = run of 4
    ("aabbcc",         "a", False),  # all run 2 → 'a' smallest
    ("zzzbbbaaaa",     "a", False),  # aaaa=4 beats zzz/bbb=3
    # hidden tests (9)
    ("a",              "a", True),   # single char
    ("abc",            "a", True),   # all single → 'a' smallest
    ("aabbbcc",        "b", True),   # bbb = run of 3
    ("xxxxxyyy",       "x", True),   # xxxxx=5 > yyy=3
    ("mmmnnnppp",      "m", True),   # all run 3 → 'm' smallest
    ("aaabbbccc",      "a", True),   # all run 3 → 'a' smallest
    ("zzzzzaaa",       "z", True),   # zzzzz=5 > aaa=3
    ("aabbbaaa",       "a", True),   # 'a' max run=3, 'b' run=3 → 'a' smallest
    ("xxyyyzz",        "y", True),   # yyy=3 > xx=2, zz=2
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
        (Q2_TITLE, Q2_DESCRIPTION, "medium", Q2_CASES, ["strings", "stack"]),
        (Q3_TITLE, Q3_DESCRIPTION, "medium", Q3_CASES, ["strings", "two-pointers"]),
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
        "title":             "Wamolabs-Interview Drive-6pm",
        "status":            "active",
        "duration_minutes":  60,
        "allowed_languages": [
            "python", "javascript", "typescript", "java", "cpp", "c",
            "csharp", "go", "rust", "ruby", "kotlin", "swift", "php",
            "r", "scala", "bash", "haskell", "lua", "perl", "elixir",
        ],
        "security_level":    "standard",
        "question_ids":      question_ids,
    })
    assessment_id = assessment["id"]
    print(f"  id: {assessment_id}")

    # ------------------------------------------------------------------
    # Link questions via assessment_questions
    # Weightages: 33% + 34% + 33% = 100%
    # ------------------------------------------------------------------
    weightages = [33.00, 34.00, 33.00]
    print("\nLinking questions to assessment (33% / 34% / 33%)…")
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
    print(f"  Assessment:  Wamolabs-Interview Drive-6pm")
    print(f"  Duration:    60 minutes")
    print(f"  ID:          {assessment_id}")
    print(f"  Languages:   20 (Python, JS, TS, Java, C++, C, C#, Go, Rust,")
    print(f"               Ruby, Kotlin, Swift, PHP, R, Scala, Bash,")
    print(f"               Haskell, Lua, Perl, Elixir)")
    print()
    rows = [
        ("Reverse a Number",                 "easy",   "33%", Q1_CASES),
        ("Parenthesis Match",                "medium", "34%", Q2_CASES),
        ("Most Repeated Consecutive Character", "medium", "33%", Q3_CASES),
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
    print("  2. Open 'Wamolabs-Interview Drive-6pm' → Invites tab")
    print("  3. Click '+ Invite Candidate' to generate a token")
    print("  4. Paste the token into the desktop app to begin")
    print("=" * 66)


if __name__ == "__main__":
    main()
