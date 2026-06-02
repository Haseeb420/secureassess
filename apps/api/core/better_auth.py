"""
Session validation against the Better Auth `session` table in Postgres.
Better Auth stores sessions in a table called `session` with a unique `token`
column. We validate incoming Bearer tokens by looking them up there and joining
with the `user` table to get role information.
"""

import httpx
from fastapi import HTTPException, Request, status

from .supabase import get_supabase


def _get_user_from_token(token: str) -> dict:
    """Look up a Better Auth session token and return user data."""
    supabase = get_supabase()

    # Query the session table; Better Auth uses camelCase column names
    try:
        session_result = (
            supabase.table("session")
            .select('id, "expiresAt", "userId"')
            .eq("token", token)
            .execute()
        )
    except (httpx.RemoteProtocolError, httpx.ConnectError, httpx.TimeoutException) as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Auth service temporarily unavailable",
        ) from exc

    if not session_result.data:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid session")

    session = session_result.data[0]

    import time
    from datetime import datetime

    # Check expiry — expiresAt is an ISO string from Postgres
    expires_raw = session.get("expiresAt") or session.get("expires_at")
    if expires_raw:
        try:
            # Handle both ISO format and unix timestamp
            if isinstance(expires_raw, (int, float)):
                expires_ts = expires_raw
            else:
                dt = datetime.fromisoformat(expires_raw.replace("Z", "+00:00"))
                expires_ts = dt.timestamp()
            if expires_ts < time.time():
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session expired")
        except (ValueError, TypeError):
            pass  # If we can't parse expiry, allow through

    user_id = session.get("userId") or session.get("user_id")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid session")

    try:
        user_result = (
            supabase.table("user")
            .select("id, email, name, role")
            .eq("id", user_id)
            .execute()
        )
    except (httpx.RemoteProtocolError, httpx.ConnectError, httpx.TimeoutException) as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Auth service temporarily unavailable",
        ) from exc

    if not user_result.data:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    user = user_result.data[0]
    return {
        "id": user["id"],
        "email": user.get("email", ""),
        "name": user.get("name", ""),
        "role": user.get("role", "candidate"),
    }


def get_session_user(request: Request) -> dict:
    """FastAPI dependency: extract Better Auth session token from Authorization header."""
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    token = auth_header[len("Bearer "):]
    return _get_user_from_token(token)


def require_admin(request: Request) -> dict:
    """FastAPI dependency: session user must have role admin or proctor."""
    user = get_session_user(request)
    if user["role"] not in ("admin", "proctor"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return user


def require_super_admin(request: Request) -> dict:
    """FastAPI dependency: session user must have role admin (not proctor)."""
    user = get_session_user(request)
    if user["role"] != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return user
