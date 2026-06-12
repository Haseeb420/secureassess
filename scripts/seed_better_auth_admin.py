#!/usr/bin/env python3
"""
Create an admin user in Better Auth (used by the admin dashboard).

This is separate from seed_admin.py which creates Supabase Auth users
(used by the desktop app / candidate flow).

Usage:
    python scripts/seed_better_auth_admin.py \
        --email admin@example.com \
        --password YourPassword123! \
        --name "Admin User"

Reads BETTER_AUTH_URL from apps/admin/.env.local (defaults to http://localhost:3000).
The admin dashboard must be running before you call this script.

How it works:
    1. POST /api/auth/sign-up/email  → creates the user in Better Auth's DB
    2. PATCH /api/auth/admin/set-role → promotes the user to role=admin
       (uses Better Auth admin plugin endpoint)
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.request
import urllib.error
from pathlib import Path


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


def post(url: str, payload: dict, headers: dict | None = None) -> dict:
    data = json.dumps(payload).encode()
    req = urllib.request.Request(
        url,
        data=data,
        headers={"Content-Type": "application/json", **(headers or {})},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        print(f"HTTP {e.code}: {body}", file=sys.stderr)
        sys.exit(1)


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed a Better Auth admin user for the admin dashboard")
    parser.add_argument("--email", required=True)
    parser.add_argument("--password", required=True)
    parser.add_argument("--name", default="Admin")
    args = parser.parse_args()

    repo_root = Path(__file__).parent.parent
    env = load_env(repo_root / "apps" / "admin" / ".env.local")

    base_url = (
        env.get("BETTER_AUTH_URL")
        or env.get("NEXT_PUBLIC_BETTER_AUTH_URL")
        or os.environ.get("BETTER_AUTH_URL", "http://localhost:3000")
    ).rstrip("/")

    print(f"Creating Better Auth admin user: {args.email}")
    print(f"Target: {base_url}")

    # Step 1: sign up
    result = post(
        f"{base_url}/api/auth/sign-up/email",
        {"email": args.email, "password": args.password, "name": args.name},
    )
    user_id = result.get("user", {}).get("id") or result.get("id")
    if not user_id:
        print(f"Unexpected response: {result}", file=sys.stderr)
        sys.exit(1)

    print(f"✓ User created: {user_id}")

    # Step 2: promote to admin via Better Auth admin plugin
    # Requires BETTER_AUTH_SECRET — set as Authorization header
    secret = env.get("BETTER_AUTH_SECRET") or os.environ.get("BETTER_AUTH_SECRET", "")
    result2 = post(
        f"{base_url}/api/auth/admin/set-role",
        {"userId": user_id, "role": "admin"},
        headers={"Authorization": f"Bearer {secret}"} if secret else {},
    )
    print(f"✓ Role set to admin")
    print(f"\nAdmin user ready. Log in at {base_url}/login")
    print(f"  Email:    {args.email}")
    print(f"  Password: {args.password}")


if __name__ == "__main__":
    main()
