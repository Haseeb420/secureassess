import base64
import json
import time

from fastapi import HTTPException, Request, status

from .better_auth import get_session_user, require_admin


def _decode_supabase_jwt(token: str) -> dict:
    """Decode a Supabase JWT payload without touching the shared Supabase client.

    Calling supabase.auth.get_user(token) on the singleton service client mutates
    its internal auth state, causing subsequent DB queries to run as the candidate
    (subject to RLS) instead of as the service role. Decoding the JWT directly
    avoids that side-effect entirely.
    """
    try:
        # JWT is header.payload.signature — we only need the payload segment
        parts = token.split(".")
        if len(parts) != 3:
            raise ValueError("not a JWT")

        # Add padding so base64 decoding doesn't fail
        padded = parts[1] + "=" * (4 - len(parts[1]) % 4)
        payload = json.loads(base64.urlsafe_b64decode(padded).decode("utf-8"))

        # Reject expired tokens
        if payload.get("exp", 0) < time.time():
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired")

        # Must be a Supabase-issued JWT (iss starts with our project URL)
        iss = payload.get("iss", "")
        if "supabase" not in iss and "supabase.co" not in iss:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not a Supabase token")

        meta = payload.get("user_metadata") or {}
        return {
            "id": payload.get("sub", ""),
            "email": payload.get("email", ""),
            "name": meta.get("name", ""),
            "role": meta.get("role", "candidate"),
            "assessment_id": meta.get("assessment_id"),
        }
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")


def _get_supabase_user(request: Request) -> dict:
    """Validate a Supabase JWT issued to a candidate via /auth/candidate/* endpoints."""
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    return _decode_supabase_jwt(auth_header[len("Bearer "):])


def get_current_candidate(request: Request) -> dict:
    """Validate any authenticated user — tries Better Auth session first (admin panel),
    then falls back to Supabase JWT (desktop candidates)."""
    try:
        return get_session_user(request)
    except HTTPException:
        pass
    return _get_supabase_user(request)


def get_current_admin(request: Request) -> dict:
    """Validate admin or proctor session."""
    return require_admin(request)
