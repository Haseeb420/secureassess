"""
Session validation against the Better Auth `session` table in PostgreSQL.
Connects directly via DATABASE_URL — works for both local PG and Supabase
direct-connection strings. Never goes through the Supabase REST API, which
doesn't see the local dev database.
"""

import time
from datetime import datetime

import psycopg2
import psycopg2.extras
from fastapi import HTTPException, Request, status

from .config import settings


def _get_pg_conn():
    if not settings.DATABASE_URL:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="DATABASE_URL is not configured",
        )
    return psycopg2.connect(settings.DATABASE_URL, cursor_factory=psycopg2.extras.RealDictCursor)


def _get_user_from_token(token: str) -> dict:
    """Look up a Better Auth session token and return user data."""
    try:
        conn = _get_pg_conn()
    except psycopg2.OperationalError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Auth database unavailable",
        ) from exc

    try:
        with conn:
            with conn.cursor() as cur:
                cur.execute(
                    '''SELECT id, "expiresAt", "userId" FROM session WHERE token = %s LIMIT 1''',
                    (token,),
                )
                session = cur.fetchone()

                if not session:
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="Invalid session",
                    )

                expires_raw = session.get("expiresAt") or session.get("expires_at")
                if expires_raw:
                    try:
                        if isinstance(expires_raw, (int, float)):
                            expires_ts = float(expires_raw)
                        else:
                            dt = datetime.fromisoformat(str(expires_raw).replace("Z", "+00:00"))
                            expires_ts = dt.timestamp()
                        if expires_ts < time.time():
                            raise HTTPException(
                                status_code=status.HTTP_401_UNAUTHORIZED,
                                detail="Session expired",
                            )
                    except (ValueError, TypeError):
                        pass

                user_id = session.get("userId") or session.get("user_id")
                if not user_id:
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="Invalid session",
                    )

                cur.execute(
                    'SELECT id, email, name, role FROM "user" WHERE id = %s LIMIT 1',
                    (user_id,),
                )
                user = cur.fetchone()

                if not user:
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="User not found",
                    )

                return {
                    "id": user["id"],
                    "email": user.get("email", ""),
                    "name": user.get("name", ""),
                    "role": user.get("role", "candidate"),
                }
    finally:
        conn.close()


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
