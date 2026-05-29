#!/usr/bin/env python3
"""
Seed a sample question, test cases, and assessment into Supabase.

Usage:
    python scripts/seed_data.py

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
import time


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


def _request(url: str, service_key: str, method: str, path: str, data: dict | None = None) -> dict | list:
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
# Data
# ---------------------------------------------------------------------------

QUESTION_DESCRIPTION = """\
## Problem Statement

To **ENCODE** a string with a given number of rows `R`:

- Write the characters diagonally in a **zigzag** pattern across `R` rows — going **DOWN** from row `0` to row `R-1`, then bouncing **UP** from row `R-1` to row `0`, and repeating.
- After placing all characters, read row 0 left-to-right, then row 1, then row 2 … and so on.
- Concatenate all rows to get the encoded string.

To **DECODE**: work out which row each position belongs to, then place characters back in the original zigzag order.

**Verify:** `decode(encode(s, R), R) == s`

---

## Input / Output Format

```
ENCODE    ← or DECODE
<string>  ← the string s
<R>       ← number of rows (integer, R ≥ 1)
```

Output: the encoded or decoded string (same length as input).

---

## Examples

**ENCODE `PAYPALISHIRING` with R=3:**

```
Row 0:  P . . A . . H . . N
Row 1:  . A . P . L . S . I . I . G
Row 2:  . . Y . . I . . R
```

Read row by row: `PAHN` + `APLSIIG` + `YIR` = **`PAHNAPLSIIGYIR`**

**ENCODE `ABCDE` with R=2:**

```
Row 0: A . C . E  →  ACE
Row 1: . B . D .  →  BD
```

Encoded: **`ACEBD`**

**DECODE `ACEBD` with R=2 → `ABCDE`** ✓

**ENCODE `Hello` with R=1:** one row — output equals input: **`Hello`**

---

## Constraints

- `1 ≤ len(s) ≤ 1 000`
- `1 ≤ R ≤ 1 000`
- `s` contains printable ASCII characters
"""

# (input, expected_output, is_hidden)
TEST_CASES = [
    # --- visible sample tests ---
    ("ENCODE\nPAYPALISHIRING\n3",  "PAHNAPLSIIGYIR", False),
    ("ENCODE\nABCDE\n2",            "ACEBD",          False),
    ("DECODE\nACEBD\n2",            "ABCDE",          False),
    # --- hidden tests ---
    ("DECODE\nPAHNAPLSIIGYIR\n3",  "PAYPALISHIRING", True),
    ("ENCODE\nPAYPALISHIRING\n4",  "PINALSIGYAHRPI", True),
    ("ENCODE\nHello\n1",            "Hello",          True),   # R=1 edge case
    ("ENCODE\nA\n2",                "A",              True),   # single char
    ("ENCODE\nABCDEFGH\n3",        "AEBDFHCG",       True),
    ("DECODE\nAEBDFHCG\n3",        "ABCDEFGH",       True),
    ("ENCODE\nABCDE\n3",            "AEBDC",          True),
    ("DECODE\nAEBDC\n3",            "ABCDE",          True),
    ("ENCODE\nAB\n5",               "AB",             True),   # R >= len(s)
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
        print("Error: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in apps/api/.env", file=sys.stderr)
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

    # 1. Insert question
    print("Creating question…")
    question = post(supabase_url, service_key, f"{rest}/questions", {
        "title":           "Zigzag Encoding",
        "description":     QUESTION_DESCRIPTION,
        "type":            "coding",
        "difficulty":      "medium",
        "time_limit_ms":   3000,
        "memory_limit_mb": 256,
        "tags":            ["strings", "simulation"],
    })
    question_id = question["id"]
    print(f"  id: {question_id}")

    # 2. Insert test cases
    print(f"Creating {len(TEST_CASES)} test cases…")
    for inp, expected, hidden in TEST_CASES:
        post(supabase_url, service_key, f"{rest}/test_cases", {
            "question_id":     question_id,
            "input":           inp,
            "expected_output": expected,
            "is_hidden":       hidden,
        })
        label = "hidden" if hidden else "sample"
        parts = inp.split("\n")
        snippet = repr(parts[1])[:20]
        print(f"  [{label}] {parts[0]} {snippet} → {expected!r}")

    # 3. Insert assessment
    print("Creating assessment…")
    assessment = post(supabase_url, service_key, f"{rest}/assessments", {
        "title":             "Backend Engineering Challenge",
        "status":            "active",
        "duration_minutes":  60,
        "allowed_languages": ["python", "javascript", "java", "cpp", "go"],
        "security_level":    "standard",
        "question_ids":      [question_id],
    })
    assessment_id = assessment["id"]
    print(f"  id: {assessment_id}")

    # 4. Generate a 7-day invite token
    print("Creating 7-day invite token…")
    import hashlib, secrets
    token = secrets.token_urlsafe(32)
    expires_at = int(time.time()) + 7 * 24 * 3600  # unix timestamp, 7 days
    invite = post(supabase_url, service_key, f"{rest}/assessment_invites", {
        "assessment_id":   assessment_id,
        "candidate_email": "candidate@example.com",
        "token":           token,
        "expires_at":      expires_at,
    })
    print(f"  token: {token}")

    print()
    print("Done. Summary:")
    print(f"  Question:   {question_id}  (Zigzag Encoding, medium)")
    print(f"  Assessment: {assessment_id}  (Backend Engineering Challenge, 60 min)")
    print(f"  Invite token (7 days): {token}")
    print()
    print("Next steps:")
    print("  1. Log in to http://localhost:3000")
    print("  2. The assessment appears in Dashboard → Assessments")
    print("  3. Paste the invite token in the desktop app login (Invite Token tab)")


if __name__ == "__main__":
    main()
