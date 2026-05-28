from fastapi import APIRouter, Depends, HTTPException, status
from supabase_auth.errors import AuthApiError

from core.dependencies import bearer_scheme, get_current_candidate
from core.supabase import get_supabase
from schemas.auth import (
    InviteLoginRequest,
    LoginRequest,
    LoginResponse,
    MeResponse,
    RefreshRequest,
    CandidateInfo,
)

router = APIRouter(prefix="/auth", tags=["auth"])


def _build_login_response(session) -> LoginResponse:
    user = session.user
    metadata = user.user_metadata or {}
    return LoginResponse(
        access_token=session.access_token,
        refresh_token=session.refresh_token,
        expires_at=session.expires_at,
        candidate=CandidateInfo(
            id=user.id,
            email=user.email,
            name=metadata.get("name", ""),
        ),
    )


@router.post("/candidate/login", response_model=LoginResponse)
async def candidate_login(body: LoginRequest):
    supabase = get_supabase()
    try:
        response = supabase.auth.sign_in_with_password(
            {"email": body.email, "password": body.password}
        )
    except AuthApiError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
        )
    if not response.session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )
    return _build_login_response(response.session)


@router.post("/candidate/verify-invite")
async def verify_invite(body: InviteLoginRequest):
    supabase = get_supabase()
    result = (
        supabase.table("assessment_invites")
        .select("*")
        .eq("token", body.token)
        .single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invite not found")

    invite = result.data
    import time

    if invite.get("used_at") or invite.get("expires_at", 0) < int(time.time()):
        raise HTTPException(status_code=status.HTTP_410_GONE, detail="Invite has expired")

    # Auto-sign-in with the linked candidate credentials via magic link exchange
    # Return invite details so the desktop can proceed with assessment load
    return {
        "assessment_id": invite["assessment_id"],
        "candidate_email": invite["candidate_email"],
        "expires_at": invite["expires_at"],
    }


@router.post("/refresh", response_model=LoginResponse)
async def refresh_token(body: RefreshRequest):
    supabase = get_supabase()
    try:
        response = supabase.auth.refresh_session(body.refresh_token)
    except AuthApiError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
        )
    if not response.session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not refresh session",
        )
    return _build_login_response(response.session)


@router.get("/me", response_model=MeResponse)
async def me(payload: dict = Depends(get_current_candidate)):
    return MeResponse(
        id=payload.get("sub", ""),
        email=payload.get("email", ""),
        name=payload.get("user_metadata", {}).get("name"),
        role=payload.get("user_metadata", {}).get("role"),
    )
