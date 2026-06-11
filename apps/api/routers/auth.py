import hashlib
import hmac
import time
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from supabase_auth.errors import AuthApiError

from core.config import settings
from core.dependencies import get_current_candidate
from core.supabase import get_auth_client, get_supabase
from schemas.auth import (
    InviteLoginRequest,
    LoginRequest,
    LoginResponse,
    MeResponse,
    RefreshRequest,
    CandidateInfo,
    TokenLoginRequest,
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
    # Use a fresh auth client so the shared service client's state is never mutated
    auth = get_auth_client()
    try:
        response = auth.auth.sign_in_with_password(
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
    # get_supabase() for DB reads/writes; get_auth_client() for all auth operations
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

    expires_raw = invite.get("expires_at", 0)
    if isinstance(expires_raw, str):
        expires_ts = datetime.fromisoformat(expires_raw.replace("Z", "+00:00")).timestamp()
    else:
        expires_ts = float(expires_raw)
    if invite.get("used_at") or expires_ts < time.time():
        raise HTTPException(status_code=status.HTTP_410_GONE, detail="Invite has expired")

    email = invite["candidate_email"]
    name = invite.get("candidate_name") or email.split("@")[0]
    # Stable credential: SHA-256 of the token — token IS the authentication secret
    password = hashlib.sha256(body.token.encode()).hexdigest()

    auth = get_auth_client()
    try:
        auth_response = auth.auth.sign_in_with_password({"email": email, "password": password})
    except AuthApiError:
        # Candidate account doesn't exist yet — create it via service client (admin), then sign in
        get_supabase().auth.admin.create_user({
            "email": email,
            "password": password,
            "email_confirm": True,
            "user_metadata": {"name": name, "assessment_id": invite["assessment_id"]},
        })
        auth_response = auth.auth.sign_in_with_password({"email": email, "password": password})

    if not auth_response.session:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create session")

    now_iso = datetime.now(timezone.utc).isoformat()
    supabase.table("assessment_invites").update({"used_at": now_iso}).eq("token", body.token).execute()

    return _build_login_response(auth_response.session)


@router.post("/candidate/login-with-token", response_model=LoginResponse)
async def login_with_assessment_token(body: TokenLoginRequest):
    supabase = get_supabase()
    result = (
        supabase.table("tokens")
        .select("id, candidate_email, candidate_name, assessment_id, is_revoked, expiry_at")
        .eq("token_value", body.token_value)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Token not found")

    token = result.data[0]

    if token.get("is_revoked"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Token has been revoked")

    expiry_str = token.get("expiry_at", "")
    if expiry_str:
        expiry = datetime.fromisoformat(expiry_str.replace("Z", "+00:00"))
        if datetime.now(tz=timezone.utc) > expiry:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Token has expired")

    email = token["candidate_email"]
    name = token.get("candidate_name") or email.split("@")[0]
    # Stable per-email password: same candidate can use multiple tokens without conflict.
    # Derived from email + service key so it's unpredictable from the outside.
    password = hmac.new(
        settings.SUPABASE_SERVICE_KEY.encode(),
        email.lower().encode(),
        hashlib.sha256,
    ).hexdigest()

    auth = get_auth_client()
    user_metadata = {"name": name, "role": "candidate", "assessment_id": token["assessment_id"]}
    try:
        auth_response = auth.auth.sign_in_with_password({"email": email, "password": password})
    except AuthApiError:
        try:
            # First time this candidate uses the platform — create their auth account
            get_supabase().auth.admin.create_user({
                "email": email,
                "password": password,
                "email_confirm": True,
                "user_metadata": user_metadata,
            })
        except AuthApiError:
            # Account already exists (created with old per-token password) — migrate to stable password
            users = get_supabase().auth.admin.list_users(page=1, per_page=1000)
            existing = next(
                (u for u in (users or []) if getattr(u, "email", "") == email),
                None,
            )
            if existing is None:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to setup candidate authentication",
                )
            get_supabase().auth.admin.update_user_by_id(
                existing.id,
                {"password": password, "user_metadata": user_metadata},
            )
        auth_response = auth.auth.sign_in_with_password({"email": email, "password": password})

    if not auth_response.session:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create session")

    return _build_login_response(auth_response.session)


@router.post("/refresh", response_model=LoginResponse)
async def refresh_token(body: RefreshRequest):
    auth = get_auth_client()
    try:
        response = auth.auth.refresh_session(body.refresh_token)
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
