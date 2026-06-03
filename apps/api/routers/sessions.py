from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel

from core.dependencies import get_current_admin, get_current_candidate
from core.supabase import get_supabase

router = APIRouter(prefix="/sessions", tags=["sessions"])


class SessionCreate(BaseModel):
    session_id: str
    assessment_id: str
    assessment_title: Optional[str] = None
    total_questions: Optional[int] = None
    token_id: Optional[str] = None


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_session(
    body: SessionCreate,
    candidate: dict = Depends(get_current_candidate),
):
    supabase = get_supabase()
    now = datetime.now(timezone.utc).isoformat()
    row: dict = {
        "id": body.session_id,
        "assessment_id": body.assessment_id,
        "candidate_id": candidate["id"],
        "candidate_name": candidate.get("name", ""),
        "candidate_email": candidate.get("email", ""),
        "status": "active",
        "started_at": now,
    }
    if body.assessment_title:
        row["assessment_title"] = body.assessment_title
    if body.total_questions is not None:
        row["total_questions"] = body.total_questions
    if body.token_id:
        row["token_id"] = body.token_id

    result = supabase.table("assessment_sessions").upsert(row).execute()
    if not result.data:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create session")
    return result.data[0]


@router.get("")
async def list_sessions(
    status: Optional[str] = Query(None),
    _admin: dict = Depends(get_current_admin),
):
    supabase = get_supabase()
    query = supabase.table("assessment_sessions").select(
        "id, candidate_id, candidate_name, candidate_email, assessment_id, assessment_title, "
        "status, questions_done, total_questions, violation_count, started_at"
    )
    if status:
        query = query.eq("status", status)

    result = query.order("started_at", desc=True).execute()
    return result.data or []


@router.get("/{session_id}")
async def get_session(
    session_id: str,
    _admin: dict = Depends(get_current_admin),
):
    supabase = get_supabase()
    result = (
        supabase.table("assessment_sessions")
        .select("*")
        .eq("id", session_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    session = result.data[0]

    events_result = (
        supabase.table("security_events")
        .select("id, type, metadata, created_at")
        .eq("session_id", session_id)
        .order("created_at")
        .execute()
    )
    session["security_events"] = events_result.data or []
    return session


@router.post("/{session_id}/terminate")
async def terminate_session(
    session_id: str,
    _admin: dict = Depends(get_current_admin),
):
    supabase = get_supabase()
    result = (
        supabase.table("assessment_sessions")
        .update({"status": "terminated"})
        .eq("id", session_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    return {"ok": True}
