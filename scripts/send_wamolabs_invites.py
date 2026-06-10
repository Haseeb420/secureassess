#!/usr/bin/env python3
"""
Send Wamolabs-Interview Drive-6pm invitations to candidates via EmailJS.

For each candidate in the CSV this script will:
  1. Read their pre-created token from wamolabs_invites_sent.csv
  2. Send an invitation email via EmailJS REST API
  3. Update wamolabs_invites_sent.csv with sent status

EmailJS credentials live in apps/api/.env:
  EMAILJS_SERVICE_ID
  EMAILJS_TEMPLATE_ID
  EMAILJS_PUBLIC_KEY
  EMAILJS_PRIVATE_KEY

Usage:
    python scripts/send_wamolabs_invites.py               # send all pending
    python scripts/send_wamolabs_invites.py --dry-run     # preview, no sending
    python scripts/send_wamolabs_invites.py --tokens-only # create tokens only, skip email
"""

from __future__ import annotations

import csv
import json
import os
import secrets
import string
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

ASSESSMENT_TITLE    = "Wamolabs-Interview Drive-6pm"
ASSESSMENT_DURATION = 90      # minutes (1.5 h)
USAGE_LIMIT         = 5       # attempts per token
EXPIRY_DAYS         = 14      # token valid for N days

EMAILJS_API         = "https://api.emailjs.com/api/v1.0/email/send"

REPO_ROOT   = Path(__file__).parent.parent
CSV_INPUT   = REPO_ROOT / "June_Recruitment_Drive - don't touch.csv"
CSV_OUTPUT  = REPO_ROOT / "scripts" / "wamolabs_invites_sent.csv"

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


def _http(url: str, key: str, method: str, path: str, data: dict | None = None) -> dict | list:
    payload = json.dumps(data).encode() if data else None
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }
    req = urllib.request.Request(
        f"{url.rstrip('/')}{path}", data=payload, headers=headers, method=method
    )
    try:
        with urllib.request.urlopen(req) as resp:
            body = resp.read()
            return json.loads(body) if body else {}
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        print(f"  HTTP {e.code} {method} {path}: {body}", file=sys.stderr)
        raise


def db_get(url: str, key: str, path: str) -> list:
    result = _http(url, key, "GET", path)
    return result if isinstance(result, list) else [result]


def db_post(url: str, key: str, path: str, data: dict) -> dict:
    result = _http(url, key, "POST", path, data)
    return result[0] if isinstance(result, list) else result


def db_patch(url: str, key: str, path: str, data: dict) -> dict:
    result = _http(url, key, "PATCH", path, data)
    return result[0] if isinstance(result, list) else result


def generate_token() -> str:
    chars = string.ascii_uppercase + string.digits
    groups = ["".join(secrets.choice(chars) for _ in range(4)) for _ in range(3)]
    return "-".join(groups)


# ---------------------------------------------------------------------------
# EmailJS sender
# ---------------------------------------------------------------------------

def send_via_emailjs(
    service_id: str,
    template_id: str,
    public_key: str,
    private_key: str,
    to_name: str,
    to_email: str,
    token: str,
    duration_h: str,
    expiry: str,
) -> None:
    payload = json.dumps({
        "service_id":   service_id,
        "template_id":  template_id,
        "user_id":      public_key,
        "accessToken":  private_key,
        "template_params": {
            "to_name":    to_name,
            "to_email":   to_email,
            "email":      to_email,
            "token":      token,
            "assessment": ASSESSMENT_TITLE,
            "duration":   duration_h,
            "attempts":   str(USAGE_LIMIT),
            "expiry":     expiry,
        },
    }).encode()

    req = urllib.request.Request(
        EMAILJS_API,
        data=payload,
        headers={
            "Content-Type": "application/json",
            "Origin": "https://dashboard.emailjs.com",
            "Referer": "https://dashboard.emailjs.com/",
            "User-Agent": (
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            ),
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req) as resp:
            resp.read()
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        raise RuntimeError(f"EmailJS {e.code}: {body}") from e


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main(dry_run: bool = False, tokens_only: bool = False) -> None:
    env = load_env(REPO_ROOT / "apps" / "api" / ".env")

    supabase_url  = env.get("SUPABASE_URL")        or os.environ.get("SUPABASE_URL", "")
    service_key   = env.get("SUPABASE_SERVICE_KEY") or os.environ.get("SUPABASE_SERVICE_KEY", "")
    ej_service    = env.get("EMAILJS_SERVICE_ID")   or os.environ.get("EMAILJS_SERVICE_ID", "")
    ej_template   = env.get("EMAILJS_TEMPLATE_ID")  or os.environ.get("EMAILJS_TEMPLATE_ID", "")
    ej_public     = env.get("EMAILJS_PUBLIC_KEY")   or os.environ.get("EMAILJS_PUBLIC_KEY", "")
    ej_private    = env.get("EMAILJS_PRIVATE_KEY")  or os.environ.get("EMAILJS_PRIVATE_KEY", "")

    if not supabase_url or not service_key:
        print("Error: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set.", file=sys.stderr)
        sys.exit(1)

    if not dry_run and not tokens_only and not all([ej_service, ej_template, ej_public, ej_private]):
        print(
            "Error: EmailJS credentials missing from apps/api/.env\n"
            "  Required: EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, EMAILJS_PUBLIC_KEY, EMAILJS_PRIVATE_KEY",
            file=sys.stderr,
        )
        sys.exit(1)

    duration_h = (
        f"{ASSESSMENT_DURATION // 60}h {ASSESSMENT_DURATION % 60}min"
        if ASSESSMENT_DURATION % 60
        else f"{ASSESSMENT_DURATION // 60}h"
    )
    expiry_dt  = datetime.now(tz=timezone.utc) + timedelta(days=EXPIRY_DAYS)
    expiry_str = expiry_dt.strftime("%d %b %Y, %H:%M UTC")
    expiry_iso = expiry_dt.isoformat()

    rest = "/rest/v1"
    assessment_id = "dry-run-id"

    if not dry_run:
        # ── Find assessment ──────────────────────────────────────────────
        print(f"Looking up: '{ASSESSMENT_TITLE}'…")
        rows = db_get(
            supabase_url, service_key,
            f"{rest}/assessments"
            f"?title=eq.{urllib.request.quote(ASSESSMENT_TITLE)}"
            f"&select=id,title,duration_minutes",
        )
        if not rows:
            print("Error: Assessment not found. Run seed_wamolabs_assessment.py first.", file=sys.stderr)
            sys.exit(1)
        assessment      = rows[0]
        assessment_id   = assessment["id"]
        print(f"  id: {assessment_id}")

        # ── Patch duration if needed ─────────────────────────────────────
        if assessment.get("duration_minutes") != ASSESSMENT_DURATION:
            print(f"  Updating duration → {ASSESSMENT_DURATION} min…")
            db_patch(
                supabase_url, service_key,
                f"{rest}/assessments?id=eq.{assessment_id}",
                {"duration_minutes": ASSESSMENT_DURATION},
            )
    else:
        print(f"[dry-run] Skipping DB lookup for '{ASSESSMENT_TITLE}'")

    # ── Read candidates ──────────────────────────────────────────────────
    if not CSV_INPUT.exists():
        print(f"Error: {CSV_INPUT} not found.", file=sys.stderr)
        sys.exit(1)

    candidates: list[dict] = []
    with CSV_INPUT.open(newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            name  = row.get("Name", "").strip()
            email = row.get("Email", "").strip()
            if name and email:
                candidates.append({"name": name, "email": email})

    print(f"\nCandidates: {len(candidates)}\n")

    # ── Token + email loop ───────────────────────────────────────────────
    results: list[dict] = []
    width = max(len(c["name"]) for c in candidates) + 2

    for i, c in enumerate(candidates, 1):
        name  = c["name"]
        email = c["email"]
        label = f"[{i:>2}/{len(candidates)}] {name:<{width}}"
        token = generate_token()

        # Create token in Supabase
        if not dry_run:
            try:
                db_post(supabase_url, service_key, f"{rest}/tokens", {
                    "candidate_email": email,
                    "candidate_name":  name,
                    "assessment_id":   assessment_id,
                    "mock_ids":        [],
                    "expiry_at":       expiry_iso,
                    "usage_limit":     USAGE_LIMIT,
                    "used_count":      0,
                    "token_value":     token,
                    "created_by":      "seed-script",
                    "notes":           "Auto-invited via send_wamolabs_invites.py",
                })
            except Exception as e:
                print(f"{label} ✗ token failed: {e}")
                results.append({"name": name, "email": email, "token": "", "status": "token_failed"})
                continue

        # Dry-run: just show
        if dry_run:
            print(f"{label} [dry-run] token={token}")
            results.append({"name": name, "email": email, "token": token, "status": "dry-run"})
            continue

        # Tokens-only: skip email
        if tokens_only:
            print(f"{label} ✓  token={token}  (email skipped)")
            results.append({"name": name, "email": email, "token": token, "status": "token_created"})
            continue

        # Send via EmailJS
        try:
            send_via_emailjs(
                ej_service, ej_template, ej_public, ej_private,
                name, email, token, duration_h, expiry_str,
            )
            print(f"{label} ✓  {email}")
            results.append({"name": name, "email": email, "token": token, "status": "sent"})
        except Exception as e:
            print(f"{label} ✗  {e}")
            results.append({"name": name, "email": email, "token": token, "status": f"failed: {e}"})

        # EmailJS free tier: 200 req/day — small delay to avoid bursting
        time.sleep(0.5)

    # ── Write CSV ────────────────────────────────────────────────────────
    CSV_OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with CSV_OUTPUT.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["name", "email", "token", "status"])
        writer.writeheader()
        writer.writerows(results)
    print(f"\nResults → {CSV_OUTPUT.name}")

    # ── Summary ──────────────────────────────────────────────────────────
    sent    = sum(1 for r in results if r["status"] == "sent")
    created = sum(1 for r in results if r["status"] == "token_created")
    failed  = sum(1 for r in results if "failed" in r.get("status", ""))

    print()
    print("=" * 58)
    print(f"  Assessment : {ASSESSMENT_TITLE}")
    print(f"  Duration   : {duration_h}")
    print(f"  Attempts   : {USAGE_LIMIT}  |  Expiry: {expiry_str}")
    print(f"  Candidates : {len(candidates)}")
    if dry_run:
        print(f"  Mode       : DRY RUN — nothing sent or saved")
    elif tokens_only:
        print(f"  Mode       : TOKENS ONLY")
        print(f"  Created    : {created}")
    else:
        print(f"  Sent       : {sent}")
        if failed:
            print(f"  Failed     : {failed}  ← see {CSV_OUTPUT.name}")
    print("=" * 58)


if __name__ == "__main__":
    dry         = "--dry-run"     in sys.argv
    tokens_only = "--tokens-only" in sys.argv
    if dry:
        print("=== DRY RUN — nothing sent or saved ===\n")
    elif tokens_only:
        print("=== TOKENS ONLY — skipping emails ===\n")
    main(dry_run=dry, tokens_only=tokens_only)
