#!/usr/bin/env python3
"""
Create an admin user in Better Auth (used by the admin dashboard).

This is separate from seed_admin.py which targets Supabase Auth (desktop/candidate flow).
Better Auth stores users in its own tables in the PostgreSQL database.

Usage:
    python scripts/seed_better_auth_admin.py \
        --email admin@example.com \
        --password YourPassword123! \
        --name "Admin User"

Reads DATABASE_URL from apps/admin/.env.local (defaults to local Supabase on :54322).
Does NOT require the admin dashboard to be running.

Dependencies: bcrypt, psycopg2  (already in apps/api/requirements.txt)
    pip install bcrypt psycopg2-binary
"""

from __future__ import annotations

import argparse
import datetime
import os
import secrets
import sys
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


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed a Better Auth admin user for the admin dashboard")
    parser.add_argument("--email",    required=True)
    parser.add_argument("--password", required=True)
    parser.add_argument("--name",     default="Admin")
    args = parser.parse_args()

    try:
        import bcrypt
        import psycopg2
    except ImportError:
        print("Missing dependencies. Run: pip install bcrypt psycopg2-binary", file=sys.stderr)
        sys.exit(1)

    repo_root = Path(__file__).parent.parent
    env = load_env(repo_root / "apps" / "admin" / ".env.local")

    db_url = (
        env.get("DATABASE_URL")
        or os.environ.get("DATABASE_URL", "postgresql://postgres:postgres@127.0.0.1:54322/postgres")
    )

    print(f"Connecting to: {db_url}")

    try:
        conn = psycopg2.connect(db_url)
    except Exception as e:
        print(f"DB connection failed: {e}", file=sys.stderr)
        print("Make sure local Supabase is running: make supabase-start", file=sys.stderr)
        sys.exit(1)

    cur = conn.cursor()

    cur.execute('SELECT id, role FROM "user" WHERE email = %s', (args.email,))
    existing = cur.fetchone()
    if existing:
        print(f"User already exists (id={existing[0]}, role={existing[1]})")
        if existing[1] != "admin":
            cur.execute('UPDATE "user" SET role = %s WHERE email = %s', ("admin", args.email))
            conn.commit()
            print("  → Role updated to admin")
        conn.close()
        return

    pw_hash    = bcrypt.hashpw(args.password.encode(), bcrypt.gensalt(rounds=10)).decode()
    now        = datetime.datetime.now(datetime.timezone.utc)
    user_id    = secrets.token_urlsafe(24)
    account_id = secrets.token_urlsafe(24)

    cur.execute(
        '''INSERT INTO "user" (id, name, email, "emailVerified", "createdAt", "updatedAt", role)
           VALUES (%s, %s, %s, TRUE, %s, %s, %s)''',
        (user_id, args.name, args.email, now, now, "admin"),
    )
    cur.execute(
        '''INSERT INTO account (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt")
           VALUES (%s, %s, %s, %s, %s, %s, %s)''',
        (account_id, args.email, "credential", user_id, pw_hash, now, now),
    )
    conn.commit()
    conn.close()

    print(f"✓ Admin user created")
    print(f"  email:    {args.email}")
    print(f"  password: {args.password}")
    print(f"  role:     admin")
    print(f"\nLog in at: http://localhost:3000/login")


if __name__ == "__main__":
    main()
