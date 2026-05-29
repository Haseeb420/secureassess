from fastapi import APIRouter, Depends, HTTPException, status

from core.dependencies import get_current_admin
from core.supabase import get_supabase

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/{session_id}")
async def get_report(
    session_id: str,
    _admin: dict = Depends(get_current_admin),
):
    supabase = get_supabase()

    session_result = (
        supabase.table("assessment_sessions")
        .select("candidate_name, candidate_email, assessment_title, final_score, status")
        .eq("id", session_id)
        .maybe_single()
        .execute()
    )
    if not session_result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    session = session_result.data

    submissions_result = (
        supabase.table("question_submissions")
        .select("question_id, question_title, submitted_at, score, passed_tests, total_tests")
        .eq("session_id", session_id)
        .order("submitted_at")
        .execute()
    )

    events_result = (
        supabase.table("security_events")
        .select("type, created_at")
        .eq("session_id", session_id)
        .order("created_at")
        .execute()
    )

    # Aggregate violations by type
    violation_map: dict[str, dict] = {}
    for ev in events_result.data or []:
        t = ev["type"]
        if t not in violation_map:
            violation_map[t] = {"type": t, "count": 0, "first_occurrence": ev["created_at"]}
        violation_map[t]["count"] += 1

    return {
        "session_id": session_id,
        "candidate_name": session.get("candidate_name", ""),
        "candidate_email": session.get("candidate_email", ""),
        "assessment_title": session.get("assessment_title", ""),
        "final_score": session.get("final_score") or 0,
        "submissions": submissions_result.data or [],
        "violations": list(violation_map.values()),
    }
