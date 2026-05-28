from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status

from core.dependencies import get_current_admin
from core.supabase import get_supabase

router = APIRouter(prefix="/sessions", tags=["sessions"])


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
        .single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    session = result.data

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
