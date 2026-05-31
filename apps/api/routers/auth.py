import hashlib
import time

from fastapi import APIRouter, Depends, HTTPException, status
from supabase_auth.errors import AuthApiError

from core.dependencies import get_current_candidate
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
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invite not found")

    invite = result.data[0]

    if invite.get("used_at") or invite.get("expires_at", 0) < int(time.time()):
        raise HTTPException(status_code=status.HTTP_410_GONE, detail="Invite has expired")

    email = invite["candidate_email"]
    name = invite.get("candidate_name") or email.split("@")[0]
    # Stable credential: SHA-256 of the token — token IS the authentication secret
    password = hashlib.sha256(body.token.encode()).hexdigest()

    try:
        auth_response = supabase.auth.sign_in_with_password({"email": email, "password": password})
    except AuthApiError:
        # Candidate account doesn't exist yet — create it then sign in
        supabase.auth.admin.create_user({
            "email": email,
            "password": password,
            "email_confirm": True,
            "user_metadata": {"name": name, "assessment_id": invite["assessment_id"]},
        })
        auth_response = supabase.auth.sign_in_with_password({"email": email, "password": password})

    if not auth_response.session:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create session")

    supabase.table("assessment_invites").update({"used_at": int(time.time())}).eq("token", body.token).execute()

    return _build_login_response(auth_response.session)


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
