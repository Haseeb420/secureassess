from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status

from core.dependencies import get_current_admin
from core.supabase import get_supabase
from schemas.tokens import (
    BulkTokenIdsRequest,
    PatchTokenRequest,
    ValidateTokenRequest,
    ValidateTokenResponse,
)
from services.token_generator import generate_token_value

router = APIRouter(prefix="/tokens", tags=["tokens"])


def _compute_assessment_status(assessment: dict) -> tuple[str, Optional[int]]:
    """Return (status, countdown_to_ms). countdown_to_ms is set when status='upcoming'."""
    now = datetime.now(tz=timezone.utc)
    atype = assessment.get("type", "open")

    if atype == "deadline":
        deadline_str = assessment.get("deadline_at")
        if deadline_str:
            deadline = datetime.fromisoformat(deadline_str.replace("Z", "+00:00"))
            return ("active" if now < deadline else "closed"), None
        return "active", None

    if atype == "window":
        ws_str = assessment.get("window_start")
        we_str = assessment.get("window_end")
        if ws_str and we_str:
            ws = datetime.fromisoformat(ws_str.replace("Z", "+00:00"))
            we = datetime.fromisoformat(we_str.replace("Z", "+00:00"))
            if now < ws:
                countdown_ms = int((ws - now).total_seconds() * 1000)
                return "upcoming", countdown_ms
            if ws <= now <= we:
                return "active", None
            return "closed", None
        return "active", None

    return "active", None  # open type


def _strip_hidden_data(question: dict) -> dict:
    """Remove hidden test cases and isCorrect flags before sending to candidate."""
    q = dict(question)

    if "test_cases" in q:
        q["test_cases"] = [tc for tc in (q["test_cases"] or []) if not tc.get("is_hidden")]

    if "hidden_tests" in q:
        del q["hidden_tests"]

    if q.get("type") == "mcq" and "options" in q:
        q["options"] = [
            {k: v for k, v in opt.items() if k != "is_correct"}
            for opt in (q["options"] or [])
        ]

    return q


# ── Admin endpoints ───────────────────────────────────────────────────────────

@router.get("/{token_id}")
async def get_token(
    token_id: str,
    _admin: dict = Depends(get_current_admin),
):
    supabase = get_supabase()
    result = supabase.table("tokens").select("*").eq("id", token_id).execute()
    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Token not found")

    token = result.data[0]

    a_result = (
        supabase.table("assessments")
        .select("id, title")
        .eq("id", token["assessment_id"])
        .execute()
    )
    token["assessment_title"] = a_result.data[0]["title"] if a_result.data else ""

    log_result = (
        supabase.table("token_usage_log")
        .select("id, used_at, ip_address")
        .eq("token_id", token_id)
        .order("used_at", desc=True)
        .execute()
    )
    token["usage_log"] = log_result.data or []

    sessions_result = (
        supabase.table("assessment_sessions")
        .select("id, candidate_name, candidate_email, status, started_at, final_score")
        .eq("token_id", token_id)
        .order("started_at", desc=True)
        .execute()
    )
    token["sessions"] = sessions_result.data or []

    return token


@router.patch("/{token_id}")
async def patch_token(
    token_id: str,
    body: PatchTokenRequest,
    _admin: dict = Depends(get_current_admin),
):
    supabase = get_supabase()
    updates: dict = {}
    if body.clear_expiry:
        updates["expiry_at"] = None
    elif body.expiry_at is not None:
        updates["expiry_at"] = body.expiry_at.isoformat()
    if body.usage_limit is not None:
        updates["usage_limit"] = body.usage_limit
    if body.mock_ids is not None:
        updates["mock_ids"] = body.mock_ids
    if body.notes is not None:
        updates["notes"] = body.notes

    if not updates:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No fields to update")

    result = supabase.table("tokens").update(updates).eq("id", token_id).execute()
    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Token not found")
    return result.data[0]


@router.delete("/{token_id}", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_token(
    token_id: str,
    _admin: dict = Depends(get_current_admin),
):
    supabase = get_supabase()
    result = supabase.table("tokens").update({"is_revoked": True}).eq("id", token_id).execute()
    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Token not found")


@router.post("/bulk-revoke")
async def bulk_revoke_tokens(
    body: BulkTokenIdsRequest,
    _admin: dict = Depends(get_current_admin),
):
    if not body.token_ids:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No token IDs provided")
    supabase = get_supabase()
    supabase.table("tokens").update({"is_revoked": True}).in_("id", body.token_ids).execute()
    return {"revoked": len(body.token_ids)}


@router.post("/bulk-delete")
async def bulk_delete_tokens(
    body: BulkTokenIdsRequest,
    _admin: dict = Depends(get_current_admin),
):
    if not body.token_ids:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No token IDs provided")
    supabase = get_supabase()
    # FK constraints handle cleanup automatically (migration 012):
    #   token_usage_log  → ON DELETE CASCADE (rows deleted with token)
    #   assessment_attempts → ON DELETE SET NULL (attempt history preserved, token_id nulled)
    supabase.table("tokens").delete().in_("id", body.token_ids).execute()
    return {"deleted": len(body.token_ids)}


# ── Public endpoint ───────────────────────────────────────────────────────────

@router.post("/validate", response_model=ValidateTokenResponse)
async def validate_token(body: ValidateTokenRequest, request: Request):
    supabase = get_supabase()

    result = (
        supabase.table("tokens")
        .select("*")
        .eq("token_value", body.token_value)
        .execute()
    )
    if not result.data:
        return ValidateTokenResponse(valid=False, reason="not_found")

    token = result.data[0]

    if token.get("is_revoked"):
        return ValidateTokenResponse(valid=False, reason="not_found")

    expiry_str = token.get("expiry_at", "")
    if expiry_str:
        expiry = datetime.fromisoformat(expiry_str.replace("Z", "+00:00"))
        if datetime.now(tz=timezone.utc) > expiry:
            return ValidateTokenResponse(valid=False, reason="expired")

    usage_limit = token.get("usage_limit")
    if usage_limit is not None and token.get("used_count", 0) >= usage_limit:
        return ValidateTokenResponse(valid=False, reason="usage_limit_reached")

    a_result = (
        supabase.table("assessments")
        .select("*")
        .eq("id", token["assessment_id"])
        .execute()
    )
    if not a_result.data:
        return ValidateTokenResponse(valid=False, reason="not_found")

    assessment = a_result.data[0]
    if assessment.get("status") not in ("active", "published"):
        return ValidateTokenResponse(valid=False, reason="assessment_closed")

    question_ids = assessment.get("question_ids") or []
    questions: list[dict] = []
    if question_ids:
        q_result = (
            supabase.table("questions")
            .select("*")
            .in_("id", question_ids)
            .execute()
        )
        raw_questions = q_result.data or []

        for q in raw_questions:
            tc_result = (
                supabase.table("test_cases")
                .select("id, input, expected_output, is_hidden")
                .eq("question_id", q["id"])
                .execute()
            )
            q["test_cases"] = tc_result.data or []
            questions.append(_strip_hidden_data(q))

    assessment["questions"] = questions

    mocks: list[dict] = []
    mock_ids = token.get("mock_ids") or []
    if mock_ids:
        m_result = (
            supabase.table("assessments")
            .select("id, title, duration_minutes, allowed_languages")
            .in_("id", mock_ids)
            .execute()
        )
        mocks = m_result.data or []

    assessment_status, countdown_to_ms = _compute_assessment_status(assessment)

    # Log usage and increment counter
    supabase.table("token_usage_log").insert({
        "token_id": token["id"],
        "used_at": datetime.now(tz=timezone.utc).isoformat(),
        "ip_address": request.client.host if request.client else None,
    }).execute()

    supabase.table("tokens").update({
        "used_count": token.get("used_count", 0) + 1
    }).eq("id", token["id"]).execute()

    return ValidateTokenResponse(
        valid=True,
        token=token,
        assessment=assessment,
        mocks=mocks,
        assessment_status=assessment_status,
        countdown_to_ms=countdown_to_ms,
    )
