import secrets
import time
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from postgrest.exceptions import APIError as PostgRESTError
from pydantic import BaseModel, EmailStr

from core.dependencies import get_current_admin, get_current_candidate
from core.supabase import get_supabase
from services.token_generator import generate_token_value

router = APIRouter(prefix="/assessments", tags=["assessments"])


class AssessmentQuestionInput(BaseModel):
    question_id: str
    weightage: float
    order_index: int = 0


class AssessmentCreate(BaseModel):
    title: str
    duration_minutes: int
    allowed_languages: list[str]
    security_level: str
    questions: list[AssessmentQuestionInput] = []
    assessment_type: str = "open"
    deadline_at: Optional[str] = None
    window_start: Optional[str] = None
    window_end: Optional[str] = None
    timezone: str = "Asia/Karachi"
    is_mock: bool = False


class AssessmentPatch(BaseModel):
    title: Optional[str] = None
    duration_minutes: Optional[int] = None
    allowed_languages: Optional[list[str]] = None
    security_level: Optional[str] = None
    questions: Optional[list[AssessmentQuestionInput]] = None
    question_ids: Optional[list[str]] = None
    status: Optional[str] = None
    assessment_type: Optional[str] = None
    deadline_at: Optional[str] = None
    window_start: Optional[str] = None
    window_end: Optional[str] = None
    timezone: Optional[str] = None


@router.get("")
async def list_assessments(_admin: dict = Depends(get_current_admin)):
    supabase = get_supabase()
    result = (
        supabase.table("assessments")
        .select("id, title, status, duration_minutes, allowed_languages, security_level, created_at, assessment_type, is_mock")
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

    if body.questions:
        total_weight = sum(q.weightage for q in body.questions)
        if abs(total_weight - 100) > 0.01:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Question weightages must sum to 100 (got {total_weight:.2f})",
            )

    question_ids = [q.question_id for q in body.questions]

    result = (
        supabase.table("assessments")
        .insert(
            {
                "title": body.title,
                "duration_minutes": body.duration_minutes,
                "allowed_languages": body.allowed_languages,
                "security_level": body.security_level,
                "question_ids": question_ids,
                "status": "active",
                "assessment_type": body.assessment_type,
                "deadline_at": body.deadline_at,
                "window_start": body.window_start,
                "window_end": body.window_end,
                "timezone": body.timezone,
                "is_mock": body.is_mock,
            }
        )
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create assessment")

    assessment_id = result.data[0]["id"]

    if body.questions:
        try:
            aq_rows = [
                {
                    "assessment_id": assessment_id,
                    "question_id": q.question_id,
                    "weightage": q.weightage,
                    "order_index": q.order_index,
                }
                for q in body.questions
            ]
            supabase.table("assessment_questions").insert(aq_rows).execute()
        except PostgRESTError as exc:
            if exc.code != "PGRST205":
                raise

    row = result.data[0]
    row["candidate_count"] = 0
    row["assessment_questions"] = []
    return row


@router.get("/my")
async def get_my_assessment(candidate: dict = Depends(get_current_candidate)):
    """Return the assessment assigned to the currently authenticated candidate."""
    import logging
    log = logging.getLogger(__name__)

    assessment_id = candidate.get("assessment_id")
    log.info("GET /assessments/my — candidate_id=%s assessment_id=%s", candidate.get("id"), assessment_id)

    if not assessment_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No assessment_id in candidate token. Re-invite the candidate.",
        )

    supabase = get_supabase()
    result = (
        supabase.table("assessments")
        .select("id, title, duration_minutes, allowed_languages, question_ids, security_level, status")
        .eq("id", assessment_id)
        .execute()
    )

    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Assessment {assessment_id} not found in database. Create it from the admin panel first.",
        )
    return result.data[0]


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

    # Fetch assessment_questions with joined question data
    # Gracefully falls back to legacy question_ids if the table doesn't exist yet (pre-migration)
    aq_rows: list[dict] = []
    try:
        aq_result = (
            supabase.table("assessment_questions")
            .select("*")
            .eq("assessment_id", assessment_id)
            .order("order_index")
            .execute()
        )
        aq_rows = aq_result.data or []
    except PostgRESTError as exc:
        if exc.code == "PGRST205":
            aq_rows = []
        else:
            raise

    if aq_rows:
        q_ids = [aq["question_id"] for aq in aq_rows]
        q_result = (
            supabase.table("questions")
            .select("*")
            .in_("id", q_ids)
            .execute()
        )
        q_map = {q["id"]: q for q in (q_result.data or [])}
        assessment["assessment_questions"] = [
            {
                "id": aq["id"],
                "question": q_map.get(aq["question_id"], {}),
                "weightage": float(aq["weightage"]),
                "order_index": aq["order_index"],
            }
            for aq in aq_rows
        ]
        assessment["question_ids"] = q_ids
    else:
        # Fallback: use legacy question_ids with zero weightage
        q_ids = assessment.get("question_ids") or []
        if q_ids:
            q_result = (
                supabase.table("questions").select("*").in_("id", q_ids).execute()
            )
            q_map = {q["id"]: q for q in (q_result.data or [])}
            assessment["assessment_questions"] = [
                {"id": None, "question": q_map.get(qid, {}), "weightage": 0.0, "order_index": i}
                for i, qid in enumerate(q_ids)
            ]
        else:
            assessment["assessment_questions"] = []

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

    # Handle new questions format (with weightage)
    questions_input: list[AssessmentQuestionInput] | None = None
    if "questions" in updates:
        questions_input = updates.pop("questions")
        raw = [AssessmentQuestionInput(**q) for q in questions_input]
        if raw:
            total = sum(q.weightage for q in raw)
            if abs(total - 100) > 0.01:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"Question weightages must sum to 100 (got {total:.2f})",
                )
        updates["question_ids"] = [q.question_id for q in raw]
        questions_input = raw

    if not updates:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No fields to update")

    schedule_fields = {"assessment_type", "deadline_at", "window_start", "window_end", "timezone"}
    if schedule_fields & set(updates.keys()):
        attempts = (
            supabase.table("assessment_sessions")
            .select("id", count="exact")
            .eq("assessment_id", assessment_id)
            .execute()
        )
        if (attempts.count or 0) > 0:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Cannot update schedule: this assessment already has active attempts.",
            )

    result = (
        supabase.table("assessments")
        .update(updates)
        .eq("id", assessment_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assessment not found")

    # Sync assessment_questions if questions were updated (skipped pre-migration)
    if questions_input is not None:
        try:
            supabase.table("assessment_questions").delete().eq("assessment_id", assessment_id).execute()
            if questions_input:
                aq_rows = [
                    {
                        "assessment_id": assessment_id,
                        "question_id": q.question_id,
                        "weightage": q.weightage,
                        "order_index": q.order_index,
                    }
                    for q in questions_input
                ]
                supabase.table("assessment_questions").insert(aq_rows).execute()
        except PostgRESTError as exc:
            if exc.code != "PGRST205":
                raise

    return result.data[0]


@router.delete("/{assessment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_assessment(
    assessment_id: str,
    _admin: dict = Depends(get_current_admin),
):
    supabase = get_supabase()
    supabase.table("assessments").delete().eq("id", assessment_id).execute()


# ── Invites ───────────────────────────────────────────────────────────────────

class CreateInviteRequest(BaseModel):
    candidate_email: EmailStr
    candidate_name: str
    mock_ids: list[str] = []
    expiry_at: datetime
    usage_limit: int = 1
    notes: Optional[str] = None


@router.get("/{assessment_id}/invites")
async def list_invites(
    assessment_id: str,
    _admin: dict = Depends(get_current_admin),
):
    supabase = get_supabase()
    result = (
        supabase.table("tokens")
        .select("*")
        .eq("assessment_id", assessment_id)
        .order("created_at", desc=True)
        .execute()
    )
    return result.data or []


@router.post("/{assessment_id}/invites", status_code=status.HTTP_201_CREATED)
async def create_invite(
    assessment_id: str,
    body: CreateInviteRequest,
    admin: dict = Depends(get_current_admin),
):
    supabase = get_supabase()

    check = supabase.table("assessments").select("id, title").eq("id", assessment_id).execute()
    if not check.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assessment not found")

    token_value = generate_token_value()

    row = {
        "candidate_email": str(body.candidate_email),
        "candidate_name": body.candidate_name,
        "assessment_id": assessment_id,
        "mock_ids": body.mock_ids,
        "expiry_at": body.expiry_at.isoformat(),
        "usage_limit": body.usage_limit,
        "used_count": 0,
        "token_value": token_value,
        "created_by": admin.get("id", ""),
        "notes": body.notes,
    }

    result = supabase.table("tokens").insert(row).execute()
    if not result.data:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create invite")

    token = result.data[0]
    token["assessment_title"] = check.data[0]["title"]
    return token
