from fastapi import HTTPException, Request, status

from .better_auth import get_session_user, require_admin
from .supabase import get_supabase


def _get_supabase_user(request: Request) -> dict:
    """Validate a Supabase JWT issued to a candidate via /auth/candidate/* endpoints."""
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    token = auth_header[len("Bearer "):]
    supabase = get_supabase()
    try:
        resp = supabase.auth.get_user(token)
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    if not resp or not resp.user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    user = resp.user
    meta = user.user_metadata or {}
    return {
        "id": user.id,
        "email": user.email or "",
        "name": meta.get("name", ""),
        "role": meta.get("role", "candidate"),
        "assessment_id": meta.get("assessment_id"),
    }


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
