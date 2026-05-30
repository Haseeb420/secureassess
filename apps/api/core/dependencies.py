from fastapi import Request

from .better_auth import get_session_user, require_admin


def get_current_candidate(request: Request) -> dict:
    """Validate any authenticated user (admin, proctor, or candidate)."""
    return get_session_user(request)


def get_current_admin(request: Request) -> dict:
    """Validate admin or proctor session."""
    return require_admin(request)
