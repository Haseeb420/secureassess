import secrets
import time
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr

from core.dependencies import get_current_admin
from core.supabase import get_supabase

router = APIRouter(prefix="/assessments", tags=["assessments"])


class AssessmentCreate(BaseModel):
    title: str
    duration_minutes: int
    allowed_languages: list[str]
    security_level: str
    question_ids: list[str]


class AssessmentPatch(BaseModel):
    title: Optional[str] = None
    duration_minutes: Optional[int] = None
    allowed_languages: Optional[list[str]] = None
    security_level: Optional[str] = None
    question_ids: Optional[list[str]] = None
    status: Optional[str] = None


@router.get("")
async def list_assessments(_admin: dict = Depends(get_current_admin)):
    supabase = get_supabase()
    result = (
        supabase.table("assessments")
        .select("id, title, status, duration_minutes, allowed_languages, security_level, created_at")
        .order("created_at", desc=True)
        .execute()
    )
    rows = result.data or []
    # Attach candidate_count for each assessment
    for row in rows:
        count_result = (
            supabase.table("assessment_sessions")
            .select("id", count="exact")
            .eq("assessment_id", row["id"])
            .execute()
        )
        row["candidate_count"] = count_result.count or 0
    return rows


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_assessment(
    body: AssessmentCreate,
    _admin: dict = Depends(get_current_admin),
):
    supabase = get_supabase()
    result = (
        supabase.table("assessments")
        .insert(
            {
                "title": body.title,
                "duration_minutes": body.duration_minutes,
                "allowed_languages": body.allowed_languages,
                "security_level": body.security_level,
                "question_ids": body.question_ids,
                "status": "active",
            }
        )
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create assessment")
    row = result.data[0]
    row["candidate_count"] = 0
    return row


@router.get("/{assessment_id}")
async def get_assessment(
    assessment_id: str,
    _admin: dict = Depends(get_current_admin),
):
    supabase = get_supabase()
    result = (
        supabase.table("assessments")
        .select("*")
        .eq("id", assessment_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assessment not found")

    assessment = result.data[0]

    # Fetch candidates for this assessment
    sessions_result = (
        supabase.table("assessment_sessions")
        .select("id, candidate_id, candidate_name, candidate_email, status, final_score")
        .eq("assessment_id", assessment_id)
        .execute()
    )
    candidates = [
        {
            "id": s["candidate_id"],
            "session_id": s["id"],
            "name": s.get("candidate_name", ""),
            "email": s.get("candidate_email", ""),
            "status": s.get("status", "not_started"),
            "score": s.get("final_score"),
        }
        for s in (sessions_result.data or [])
    ]
    assessment["candidate_count"] = len(candidates)
    assessment["candidates"] = candidates
    return assessment


@router.patch("/{assessment_id}")
async def patch_assessment(
    assessment_id: str,
    body: AssessmentPatch,
    _admin: dict = Depends(get_current_admin),
):
    supabase = get_supabase()
    updates = body.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No fields to update")

    result = (
        supabase.table("assessments")
        .update(updates)
        .eq("id", assessment_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assessment not found")
    return result.data[0]


@router.delete("/{assessment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_assessment(
    assessment_id: str,
    _admin: dict = Depends(get_current_admin),
):
    supabase = get_supabase()
    supabase.table("assessments").delete().eq("id", assessment_id).execute()


# ── Invites ───────────────────────────────────────────────────────────────────

class InviteCreate(BaseModel):
    candidate_email: EmailStr
    candidate_name: str = ""
    expires_in_hours: int = 48


@router.get("/{assessment_id}/invites")
async def list_invites(
    assessment_id: str,
    _admin: dict = Depends(get_current_admin),
):
    supabase = get_supabase()
    result = (
        supabase.table("assessment_invites")
        .select("id, token, candidate_email, candidate_name, expires_at, used_at, created_at")
        .eq("assessment_id", assessment_id)
        .order("created_at", desc=True)
        .execute()
    )
    return result.data or []


@router.post("/{assessment_id}/invites", status_code=status.HTTP_201_CREATED)
async def create_invite(
    assessment_id: str,
    body: InviteCreate,
    _admin: dict = Depends(get_current_admin),
):
    supabase = get_supabase()

    check = supabase.table("assessments").select("id").eq("id", assessment_id).execute()
    if not check.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assessment not found")

    token = secrets.token_urlsafe(32)
    expires_at = int(time.time()) + body.expires_in_hours * 3600

    result = (
        supabase.table("assessment_invites")
        .insert({
            "assessment_id": assessment_id,
            "token": token,
            "candidate_email": str(body.candidate_email),
            "candidate_name": body.candidate_name,
            "expires_at": expires_at,
        })
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create invite")
    return result.data[0]
