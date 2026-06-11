import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status

from core.dependencies import get_current_admin
from core.supabase import get_supabase
from schemas.attempts import (
    CompleteAttemptResponse,
    ManualScoreRequest,
    ManualScoreResponse,
    QuestionForCandidate,
    StartAttemptRequest,
    StartAttemptResponse,
    SubmitAnswerRequest,
    SubmitAnswerResponse,
)
from services import scoring

router = APIRouter(prefix="/attempts", tags=["attempts"])


def _sync_session_progress(supabase, assessment_id: str, candidate_email: str, questions_done: int) -> None:
    res = (
        supabase.table("assessment_sessions")
        .select("id")
        .eq("assessment_id", assessment_id)
        .eq("candidate_email", candidate_email)
        .limit(1)
        .execute()
    )
    if res.data:
        supabase.table("assessment_sessions").update({"questions_done": questions_done}).eq("id", res.data[0]["id"]).execute()


def _assessment_schedule_status(assessment: dict) -> str:
    now = datetime.now(tz=timezone.utc)
    atype = assessment.get("assessment_type") or assessment.get("type", "open")

    if atype == "deadline":
        deadline_str = assessment.get("deadline_at")
        if deadline_str:
            deadline = datetime.fromisoformat(deadline_str.replace("Z", "+00:00"))
            return "active" if now < deadline else "closed"
        return "active"

    if atype == "window":
        ws_str = assessment.get("window_start")
        we_str = assessment.get("window_end")
        if ws_str and we_str:
            ws = datetime.fromisoformat(ws_str.replace("Z", "+00:00"))
            we = datetime.fromisoformat(we_str.replace("Z", "+00:00"))
            if now < ws:
                return "upcoming"
            if ws <= now <= we:
                return "active"
            return "closed"
        return "active"

    return "active"  # open type


def _strip_options(options: list) -> list:
    """Remove is_correct/isCorrect from MCQ options before sending to candidate."""
    return [
        {k: v for k, v in opt.items() if k not in ("is_correct", "isCorrect")}
        for opt in options
    ]


# ── Public endpoints ──────────────────────────────────────────────────────────

@router.post("/start", response_model=StartAttemptResponse)
async def start_attempt(body: StartAttemptRequest):
    supabase = get_supabase()
    now = datetime.now(tz=timezone.utc)

    # 1. Validate token
    t_result = (
        supabase.table("tokens")
        .select("*")
        .eq("token_value", body.token_value)
        .execute()
    )
    if not t_result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Token not found")

    token = t_result.data[0]

    if token.get("is_revoked"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Token has been revoked")

    expiry_str = token.get("expiry_at", "")
    if expiry_str:
        expiry = datetime.fromisoformat(expiry_str.replace("Z", "+00:00"))
        if now > expiry:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Token has expired")

    # 2. Check usage limit (None = unlimited)
    usage_limit = token.get("usage_limit")
    if usage_limit is not None and token.get("used_count", 0) >= usage_limit:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Token usage limit reached")

    # 3. Fetch assessment and check it is active
    a_result = (
        supabase.table("assessments")
        .select("*")
        .eq("id", token["assessment_id"])
        .execute()
    )
    if not a_result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assessment not found")

    assessment = a_result.data[0]
    if assessment.get("is_mock"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Use /mock-attempts/start for practice rounds")
    if assessment.get("status") not in ("active", "published"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Assessment is not active")

    # 4. Enforce schedule
    sched = _assessment_schedule_status(assessment)
    if sched != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Assessment is {sched}",
        )

    # 5. Create assessment_attempts row
    attempt_id = str(uuid.uuid4())
    supabase.table("assessment_attempts").insert({
        "id": attempt_id,
        "token_id": token["id"],
        "assessment_id": assessment["id"],
        "candidate_email": token.get("candidate_email", ""),
        "candidate_name": token.get("candidate_name", ""),
        "status": "in_progress",
        "started_at": now.isoformat(),
        "attempt_number": 1,
    }).execute()

    # 6. Fetch questions via assessment_questions ordered by order_index
    # NOTE: token.used_count is NOT incremented here — /tokens/validate owns that.
    # Incrementing in both places would double-burn the usage limit per session.
    aq_result = (
        supabase.table("assessment_questions")
        .select("*")
        .eq("assessment_id", assessment["id"])
        .order("order_index")
        .execute()
    )
    aq_rows = aq_result.data or []
    if not aq_rows:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assessment has no questions")

    q_ids = [aq["question_id"] for aq in aq_rows]
    q_result = supabase.table("questions").select("*").in_("id", q_ids).execute()
    q_map = {q["id"]: q for q in (q_result.data or [])}

    # Fetch visible (non-hidden) test cases for coding questions
    tc_result = (
        supabase.table("test_cases")
        .select("id, input, expected_output, is_hidden, question_id")
        .in_("question_id", q_ids)
        .execute()
    )
    tc_by_qid: dict[str, list] = {}
    for tc in tc_result.data or []:
        tc_by_qid.setdefault(tc["question_id"], []).append(tc)

    questions: list[QuestionForCandidate] = []
    for aq in aq_rows:
        q = q_map.get(aq["question_id"])
        if not q:
            continue

        qtype = q.get("type", "coding")

        sample_tests: Optional[list] = None
        if qtype == "coding":
            sample_tests = [
                {
                    "id": tc["id"],
                    "input": tc["input"],
                    "expected_output": tc["expected_output"],
                    "is_hidden": tc["is_hidden"],
                }
                for tc in tc_by_qid.get(q["id"], [])
                if not tc.get("is_hidden")
            ]

        options: Optional[list] = None
        if qtype == "mcq" and q.get("options"):
            options = _strip_options(q["options"])

        questions.append(QuestionForCandidate(
            id=q["id"],
            title=q["title"],
            description=q.get("description", ""),
            type=qtype,
            weightage=float(aq["weightage"]),
            order_index=aq["order_index"],
            time_limit_ms=q.get("time_limit_ms") or 5000,
            memory_limit_mb=q.get("memory_limit_mb") or 256,
            options=options,
            sample_tests=sample_tests,
        ))

    return StartAttemptResponse(attempt_id=attempt_id, questions=questions)


@router.post("/{attempt_id}/answers", response_model=SubmitAnswerResponse)
async def submit_answer(attempt_id: str, body: SubmitAnswerRequest):
    supabase = get_supabase()

    # 1. Verify attempt is in_progress
    a_result = (
        supabase.table("assessment_attempts")
        .select("*")
        .eq("id", attempt_id)
        .execute()
    )
    if not a_result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attempt not found")

    attempt = a_result.data[0]
    if attempt["status"] != "in_progress":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Attempt is not in progress",
        )

    # 2. Verify question belongs to this assessment
    aq_result = (
        supabase.table("assessment_questions")
        .select("*")
        .eq("assessment_id", attempt["assessment_id"])
        .eq("question_id", body.question_id)
        .execute()
    )
    if not aq_result.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Question is not part of this assessment",
        )

    weightage = float(aq_result.data[0]["weightage"])

    # 3. Verify question not already submitted
    existing = (
        supabase.table("question_answers")
        .select("id")
        .eq("attempt_id", attempt_id)
        .eq("question_id", body.question_id)
        .execute()
    )
    if existing.data:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Question already submitted for this attempt",
        )

    # 4. Score automatically
    auto_score: Optional[float] = None
    weighted_score: Optional[float] = None
    is_correct: Optional[bool] = None

    if body.question_type == "mcq" and body.selected_option:
        q_result = (
            supabase.table("questions")
            .select("*")
            .eq("id", body.question_id)
            .execute()
        )
        if q_result.data:
            q = dict(q_result.data[0])
            q["weightage"] = weightage
            score_data = scoring.score_mcq_answer(q, body.selected_option)
            auto_score = score_data["auto_score"]
            weighted_score = score_data["weighted_score"]
            is_correct = score_data["is_correct"]

    elif body.question_type == "coding" and body.test_results:
        q_stub = {"id": body.question_id, "weightage": weightage}
        score_data = scoring.score_coding_answer(q_stub, body.test_results)
        auto_score = score_data["auto_score"]
        weighted_score = score_data["weighted_score"]

    # text: no auto-score — manual_score stays null until admin reviews

    # 5. Insert question_answers row
    now = datetime.now(tz=timezone.utc)
    answer_row: dict = {
        "attempt_id": attempt_id,
        "question_id": body.question_id,
        "question_type": body.question_type,
        "submitted_at": now.isoformat(),
    }
    if body.answer_text is not None:
        answer_row["answer_text"] = body.answer_text
    if body.selected_option is not None:
        answer_row["selected_option"] = body.selected_option
    if body.source_code is not None:
        answer_row["source_code"] = body.source_code
    if body.language is not None:
        answer_row["language"] = body.language
    if body.test_results is not None:
        answer_row["test_results"] = body.test_results
    if auto_score is not None:
        answer_row["auto_score"] = auto_score
    if weighted_score is not None:
        answer_row["weighted_score"] = weighted_score
    if is_correct is not None:
        answer_row["is_correct"] = is_correct

    supabase.table("question_answers").insert(answer_row).execute()

    # 6. Determine if more questions remain
    total_count = (
        supabase.table("assessment_questions")
        .select("id", count="exact")
        .eq("assessment_id", attempt["assessment_id"])
        .execute()
    )
    total = total_count.count or 0

    submitted_count = (
        supabase.table("question_answers")
        .select("id", count="exact")
        .eq("attempt_id", attempt_id)
        .execute()
    )
    submitted = submitted_count.count or 0

    # 7. Keep session progress in sync so the live monitor shows real progress
    _sync_session_progress(supabase, attempt["assessment_id"], attempt.get("candidate_email", ""), submitted)

    return SubmitAnswerResponse(
        question_id=body.question_id,
        accepted=True,
        next_question_available=submitted < total,
    )


@router.post("/{attempt_id}/complete", response_model=CompleteAttemptResponse)
async def complete_attempt(attempt_id: str):
    supabase = get_supabase()

    a_result = (
        supabase.table("assessment_attempts")
        .select("*")
        .eq("id", attempt_id)
        .execute()
    )
    if not a_result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attempt not found")

    attempt = a_result.data[0]

    # Verify all questions answered
    total_count = (
        supabase.table("assessment_questions")
        .select("id", count="exact")
        .eq("assessment_id", attempt["assessment_id"])
        .execute()
    )
    total = total_count.count or 0

    answers_result = (
        supabase.table("question_answers")
        .select("weighted_score")
        .eq("attempt_id", attempt_id)
        .execute()
    )
    answers = answers_result.data or []

    if len(answers) < total:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Not all questions answered ({len(answers)}/{total})",
        )

    # Compute final score — text questions with no manual score contribute 0
    final_score = round(
        sum(a["weighted_score"] for a in answers if a.get("weighted_score") is not None),
        2,
    )

    now = datetime.now(tz=timezone.utc)
    started_at = datetime.fromisoformat(attempt["started_at"].replace("Z", "+00:00"))
    total_time_secs = int((now - started_at).total_seconds())

    supabase.table("assessment_attempts").update({
        "status": "completed",
        "completed_at": now.isoformat(),
        "final_score": final_score,
        "total_time_secs": total_time_secs,
    }).eq("id", attempt_id).execute()

    # Mark the associated session as completed so the live monitor reflects reality
    session_res = (
        supabase.table("assessment_sessions")
        .select("id")
        .eq("assessment_id", attempt["assessment_id"])
        .eq("candidate_email", attempt.get("candidate_email", ""))
        .limit(1)
        .execute()
    )
    if session_res.data:
        supabase.table("assessment_sessions").update({
            "status": "completed",
            "final_score": final_score,
            "questions_done": total,
        }).eq("id", session_res.data[0]["id"]).execute()

    return CompleteAttemptResponse(final_score=final_score, total_time_secs=total_time_secs)


# ── Admin endpoints ───────────────────────────────────────────────────────────

@router.get("")
async def list_attempts(
    assessment_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    _admin: dict = Depends(get_current_admin),
):
    supabase = get_supabase()

    query = (
        supabase.table("assessment_attempts")
        .select("*")
        .order("completed_at", desc=True)
    )
    if assessment_id:
        query = query.eq("assessment_id", assessment_id)
    if status:
        query = query.eq("status", status)
    if date_from:
        query = query.gte("started_at", date_from)
    if date_to:
        query = query.lte("started_at", date_to)

    result = query.execute()
    attempts = result.data or []

    if not attempts:
        return []

    # Bulk-fetch assessment titles and duration
    a_ids = list({a["assessment_id"] for a in attempts})
    a_result = supabase.table("assessments").select("id, title, duration_minutes").in_("id", a_ids).execute()
    assessment_map = {row["id"]: row["title"] for row in (a_result.data or [])}
    assessment_details: dict[str, dict] = {row["id"]: row for row in (a_result.data or [])}

    # Bulk-fetch token usage limits
    token_ids = list({a["token_id"] for a in attempts if a.get("token_id")})
    if token_ids:
        t_result = supabase.table("tokens").select("id, usage_limit").in_("id", token_ids).execute()
        token_map = {row["id"]: row["usage_limit"] for row in (t_result.data or [])}
    else:
        token_map: dict = {}

    # Bulk-fetch pending-review flags: text answers with null manual_score
    attempt_ids = [a["id"] for a in attempts]
    pending_result = (
        supabase.table("question_answers")
        .select("attempt_id")
        .in_("attempt_id", attempt_ids)
        .eq("question_type", "text")
        .is_("manual_score", "null")
        .execute()
    )
    pending_set = {row["attempt_id"] for row in (pending_result.data or [])}

    # Bulk-fetch question_answers counts per attempt
    qa_result = (
        supabase.table("question_answers")
        .select("attempt_id")
        .in_("attempt_id", attempt_ids)
        .execute()
    )
    answers_per_attempt: dict[str, int] = {}
    for row in (qa_result.data or []):
        aid = row["attempt_id"]
        answers_per_attempt[aid] = answers_per_attempt.get(aid, 0) + 1


    aq_count_result = (
        supabase.table("assessment_questions")
        .select("assessment_id")
        .in_("assessment_id", a_ids)
        .execute()
    )
    questions_per_assessment: dict[str, int] = {}
    for row in (aq_count_result.data or []):
        aid = row["assessment_id"]
        questions_per_assessment[aid] = questions_per_assessment.get(aid, 0) + 1

    enriched = []
    for a in attempts:
        asmt_id = a["assessment_id"]
        asmt_detail = assessment_details.get(asmt_id, {})
        enriched.append({
            **a,
            "assessment_title": assessment_map.get(asmt_id),
            "usage_limit": token_map.get(a.get("token_id", "")) if a.get("token_id") else None,
            "has_pending_review": a["id"] in pending_set and a.get("status") == "completed",
            "questions_answered": answers_per_attempt.get(a["id"], 0),
            "total_questions": questions_per_assessment.get(asmt_id, 0),
            "duration_minutes": asmt_detail.get("duration_minutes"),
        })

    return enriched


@router.get("/{attempt_id}")
async def get_attempt(
    attempt_id: str,
    _admin: dict = Depends(get_current_admin),
):
    supabase = get_supabase()

    a_result = (
        supabase.table("assessment_attempts")
        .select("*")
        .eq("id", attempt_id)
        .execute()
    )
    if not a_result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attempt not found")

    attempt = dict(a_result.data[0])

    # Enrich with assessment title
    assmt = (
        supabase.table("assessments")
        .select("title")
        .eq("id", attempt["assessment_id"])
        .execute()
    )
    if assmt.data:
        attempt["assessment_title"] = assmt.data[0]["title"]

    # Enrich with token usage limit
    if attempt.get("token_id"):
        tok = (
            supabase.table("tokens")
            .select("usage_limit")
            .eq("id", attempt["token_id"])
            .execute()
        )
        if tok.data:
            attempt["usage_limit"] = tok.data[0]["usage_limit"]

    # Fetch answers
    answers_result = (
        supabase.table("question_answers")
        .select("*")
        .eq("attempt_id", attempt_id)
        .order("submitted_at")
        .execute()
    )
    answers = list(answers_result.data or [])

    if answers:
        q_ids = [ans["question_id"] for ans in answers]

        # Bulk-fetch question details
        qs = supabase.table("questions").select("id, title, options").in_("id", q_ids).execute()
        q_map = {q["id"]: q for q in (qs.data or [])}

        # Bulk-fetch weightages + order from assessment_questions
        aqs = (
            supabase.table("assessment_questions")
            .select("question_id, weightage, order_index")
            .eq("assessment_id", attempt["assessment_id"])
            .in_("question_id", q_ids)
            .execute()
        )
        aq_map = {aq["question_id"]: aq for aq in (aqs.data or [])}

        for ans in answers:
            qid = ans["question_id"]
            q = q_map.get(qid, {})
            aq = aq_map.get(qid, {})
            ans["question_title"] = q.get("title")
            ans["question_weightage"] = float(aq.get("weightage", 0))
            ans["order_index"] = aq.get("order_index", 0)
            if ans.get("question_type") == "mcq" and q.get("options"):
                ans["question_options"] = q["options"]

        answers.sort(key=lambda a: a.get("order_index", 0))

    attempt["answers"] = answers
    return attempt


@router.patch("/{attempt_id}/answers/{answer_id}/score", response_model=ManualScoreResponse)
async def score_answer(
    attempt_id: str,
    answer_id: str,
    body: ManualScoreRequest,
    _admin: dict = Depends(get_current_admin),
):
    supabase = get_supabase()

    # 1. Fetch the answer
    ans_result = (
        supabase.table("question_answers")
        .select("*")
        .eq("id", answer_id)
        .eq("attempt_id", attempt_id)
        .execute()
    )
    if not ans_result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Answer not found")

    answer = ans_result.data[0]
    if answer["question_type"] != "text":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Manual scoring only applies to text questions",
        )

    # 2. Fetch attempt to get assessment_id
    attempt_result = (
        supabase.table("assessment_attempts")
        .select("assessment_id")
        .eq("id", attempt_id)
        .execute()
    )
    if not attempt_result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attempt not found")

    assessment_id = attempt_result.data[0]["assessment_id"]

    # 3. Fetch weightage from assessment_questions
    aq_result = (
        supabase.table("assessment_questions")
        .select("weightage")
        .eq("assessment_id", assessment_id)
        .eq("question_id", answer["question_id"])
        .execute()
    )
    if not aq_result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not in assessment")

    weightage = float(aq_result.data[0]["weightage"])

    # 4. Update the answer
    weighted_score = body.manual_score * weightage / 100
    supabase.table("question_answers").update({
        "manual_score": body.manual_score,
        "weighted_score": weighted_score,
    }).eq("id", answer_id).execute()

    # 5. Recompute attempt final_score
    all_ans = (
        supabase.table("question_answers")
        .select("weighted_score")
        .eq("attempt_id", attempt_id)
        .execute()
    )
    new_final_score = round(
        sum(a["weighted_score"] for a in (all_ans.data or []) if a.get("weighted_score") is not None),
        2,
    )

    supabase.table("assessment_attempts").update({
        "final_score": new_final_score,
    }).eq("id", attempt_id).execute()

    return ManualScoreResponse(
        answer_id=answer_id,
        manual_score=body.manual_score,
        weighted_score=weighted_score,
        new_final_score=new_final_score,
    )
