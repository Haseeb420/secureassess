#!/usr/bin/env python3
"""
Create an admin user in Supabase.

Usage:
    python scripts/seed_admin.py \
        --email admin@example.com \
        --password YourPassword123!

Reads SUPABASE_URL and SUPABASE_SERVICE_KEY from apps/api/.env.
Requires the actual service_role key (not the anon key).
"""

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


def create_admin_user(url: str, service_key: str, email: str, password: str) -> dict:
    payload = json.dumps({
        "email": email,
        "password": password,
        "email_confirm": True,
        "user_metadata": {"role": "admin"},
    }).encode()

    req = urllib.request.Request(
        f"{url.rstrip('/')}/auth/v1/admin/users",
        data=payload,
        headers={
            "Content-Type": "application/json",
            "apikey": service_key,
            "Authorization": f"Bearer {service_key}",
        },
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
    parser = argparse.ArgumentParser(description="Seed a Supabase admin user")
    parser.add_argument("--email", required=True, help="Admin email address")
    parser.add_argument("--password", required=True, help="Admin password (min 6 chars)")
    args = parser.parse_args()

    repo_root = Path(__file__).parent.parent
    env = load_env(repo_root / "apps" / "api" / ".env")

    supabase_url = env.get("SUPABASE_URL") or os.environ.get("SUPABASE_URL", "")
    service_key = env.get("SUPABASE_SERVICE_KEY") or os.environ.get("SUPABASE_SERVICE_KEY", "")

    if not supabase_url or not service_key:
        print("Error: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in apps/api/.env", file=sys.stderr)
        sys.exit(1)

    # Warn if anon key is used instead of service role key
    try:
        import base64
        header_part = service_key.split(".")[1]
        # Add padding
        header_part += "=" * (4 - len(header_part) % 4)
        claims = json.loads(base64.b64decode(header_part))
        if claims.get("role") != "service_role":
            print(
                "Warning: SUPABASE_SERVICE_KEY appears to be the anon key, not the service_role key.\n"
                "Get the service_role key from: Supabase dashboard → Project Settings → API → service_role",
                file=sys.stderr,
            )
    except Exception:
        pass

    print(f"Creating admin user: {args.email}")
    user = create_admin_user(supabase_url, service_key, args.email, args.password)
    print(f"Created user: {user.get('id')}")
    print(f"Email:        {user.get('email')}")
    print(f"Role:         {user.get('user_metadata', {}).get('role')}")
    print("\nAdmin user ready. Log in at http://localhost:3000/login")


if __name__ == "__main__":
    main()
