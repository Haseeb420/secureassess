from fastapi import APIRouter, Depends, HTTPException, Query, status

from core.dependencies import get_current_admin
from core.supabase import get_supabase

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/assessments")
async def get_assessments_report(
    pass_threshold: float = Query(50.0, ge=0, le=100),
    _admin: dict = Depends(get_current_admin),
):
    supabase = get_supabase()

    assessments = (
        supabase.table("assessments")
        .select("id, title, created_at, duration_minutes, status, is_mock")
        .order("created_at", desc=True)
        .execute()
    ).data or []

    if not assessments:
        return []

    # Only real assessments (not mock practice rounds)
    assessments = [a for a in assessments if not a.get("is_mock")]
    if not assessments:
        return []

    a_ids = [a["id"] for a in assessments]

    attempts = (
        supabase.table("assessment_attempts")
        .select("assessment_id, status, final_score")
        .in_("assessment_id", a_ids)
        .execute()
    ).data or []

    stats: dict[str, dict] = {}
    for a in assessments:
        stats[a["id"]] = {
            "assessment_id": a["id"],
            "assessment_title": a["title"],
            "assessment_status": a.get("status", "active"),
            "created_at": a.get("created_at"),
            "total_appeared": 0,
            "total_completed": 0,
            "passed": 0,
            "failed": 0,
            "in_progress": 0,
            "abandoned": 0,
            "scores": [],
        }

    for attempt in attempts:
        aid = attempt["assessment_id"]
        if aid not in stats:
            continue
        s = stats[aid]
        s["total_appeared"] += 1

        att_status = attempt.get("status", "")
        score = attempt.get("final_score")

        if att_status == "completed":
            s["total_completed"] += 1
            if score is not None:
                s["scores"].append(score)
                if score >= pass_threshold:
                    s["passed"] += 1
                else:
                    s["failed"] += 1
            else:
                s["failed"] += 1
        elif att_status == "in_progress":
            s["in_progress"] += 1
        else:
            s["abandoned"] += 1

    result = []
    for s in stats.values():
        scores = s.pop("scores")
        avg_score = round(sum(scores) / len(scores), 1) if scores else None
        pass_rate = (
            round(s["passed"] / s["total_completed"] * 100, 1)
            if s["total_completed"] > 0
            else None
        )
        result.append({**s, "avg_score": avg_score, "pass_rate": pass_rate})

    return result


@router.get("/{session_id}")
async def get_report(
    session_id: str,
    _admin: dict = Depends(get_current_admin),
):
    supabase = get_supabase()

    session_rows = (
        supabase.table("assessment_sessions")
        .select("candidate_name, candidate_email, assessment_title, final_score, status")
        .eq("id", session_id)
        .execute()
    ).data or []

    if not session_rows:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    session = session_rows[0]

    submissions = (
        supabase.table("question_submissions")
        .select("question_id, question_title, submitted_at, score, passed_tests, total_tests")
        .eq("session_id", session_id)
        .order("submitted_at")
        .execute()
    ).data or []

    events = (
        supabase.table("security_events")
        .select("type, created_at")
        .eq("session_id", session_id)
        .order("created_at")
        .execute()
    ).data or []

    violation_map: dict[str, dict] = {}
    for ev in events:
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
        "submissions": submissions,
        "violations": list(violation_map.values()),
    }
