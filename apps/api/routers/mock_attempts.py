import uuid
from datetime import datetime, timezone
from typing import Any, Optional

from fastapi import APIRouter, HTTPException, status

from core.supabase import get_supabase
from schemas.attempts import QuestionForCandidate
from schemas.mock_attempts import (
    CompleteMockResponse,
    MockAnswerRequest,
    MockAnswerResponse,
    MockQuestionResult,
    MockTestOutcome,
    StartMockRequest,
    StartMockResponse,
)

router = APIRouter(prefix="/mock-attempts", tags=["mock-attempts"])


def _strip_options(options: list) -> list:
    return [
        {k: v for k, v in opt.items() if k not in ("is_correct", "isCorrect")}
        for opt in options
    ]


@router.post("/start", response_model=StartMockResponse)
async def start_mock(body: StartMockRequest):
    supabase = get_supabase()
    now = datetime.now(tz=timezone.utc)

    # Validate token
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

    # Verify mock_id is assigned to this token
    mock_ids: list = token.get("mock_ids") or []
    if body.mock_id not in mock_ids:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Practice round not assigned to this token",
        )

    # Fetch and verify the assessment is a mock
    a_result = (
        supabase.table("assessments")
        .select("*")
        .eq("id", body.mock_id)
        .execute()
    )
    if not a_result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Practice round not found")

    assessment = a_result.data[0]
    if not assessment.get("is_mock"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Assessment is not a practice round")

    # Create mock_attempts row — no used_count increment (unlimited attempts)
    attempt_id = str(uuid.uuid4())
    supabase.table("mock_attempts").insert({
        "id": attempt_id,
        "token_id": token["id"],
        "mock_id": body.mock_id,
        "candidate_email": token.get("candidate_email", ""),
        "status": "in_progress",
        "started_at": now.isoformat(),
        "answers": [],
    }).execute()

    # Fetch questions ordered by order_index
    aq_result = (
        supabase.table("assessment_questions")
        .select("*")
        .eq("assessment_id", body.mock_id)
        .order("order_index")
        .execute()
    )
    aq_rows = aq_result.data or []
    if not aq_rows:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Practice round has no questions")

    q_ids = [aq["question_id"] for aq in aq_rows]
    q_result = supabase.table("questions").select("*").in_("id", q_ids).execute()
    q_map = {q["id"]: q for q in (q_result.data or [])}

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

    return StartMockResponse(attempt_id=attempt_id, questions=questions)


@router.post("/{attempt_id}/answers", response_model=MockAnswerResponse)
async def submit_mock_answer(attempt_id: str, body: MockAnswerRequest):
    supabase = get_supabase()

    a_result = (
        supabase.table("mock_attempts")
        .select("*")
        .eq("id", attempt_id)
        .execute()
    )
    if not a_result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Mock attempt not found")

    attempt = a_result.data[0]
    if attempt["status"] != "in_progress":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Mock attempt is not in progress")

    # Count total questions for this mock
    total_count = (
        supabase.table("assessment_questions")
        .select("id", count="exact")
        .eq("assessment_id", attempt["mock_id"])
        .execute()
    )
    total = total_count.count or 0

    current_answers: list[dict[str, Any]] = attempt.get("answers") or []

    # Idempotent — return early if already answered
    if any(a.get("question_id") == body.question_id for a in current_answers):
        return MockAnswerResponse(accepted=True, next_question_available=len(current_answers) < total)

    answer_entry: dict[str, Any] = {
        "question_id": body.question_id,
        "question_type": body.question_type,
    }
    if body.answer_text is not None:
        answer_entry["answer_text"] = body.answer_text
    if body.selected_option is not None:
        answer_entry["selected_option"] = body.selected_option
    if body.source_code is not None:
        answer_entry["source_code"] = body.source_code
    if body.language is not None:
        answer_entry["language"] = body.language
    if body.test_results is not None:
        answer_entry["test_results"] = body.test_results
    if body.test_outcomes is not None:
        answer_entry["test_outcomes"] = body.test_outcomes

    updated_answers = current_answers + [answer_entry]
    supabase.table("mock_attempts").update({"answers": updated_answers}).eq("id", attempt_id).execute()

    submitted = len(updated_answers)
    return MockAnswerResponse(accepted=True, next_question_available=submitted < total)


@router.post("/{attempt_id}/complete", response_model=CompleteMockResponse)
async def complete_mock(attempt_id: str):
    supabase = get_supabase()

    a_result = (
        supabase.table("mock_attempts")
        .select("*")
        .eq("id", attempt_id)
        .execute()
    )
    if not a_result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Mock attempt not found")

    attempt = a_result.data[0]
    stored_answers: list[dict[str, Any]] = attempt.get("answers") or []

    now = datetime.now(tz=timezone.utc)
    supabase.table("mock_attempts").update({
        "status": "completed",
        "completed_at": now.isoformat(),
    }).eq("id", attempt_id).execute()

    if not stored_answers:
        return CompleteMockResponse(question_results=[])

    question_ids = [a["question_id"] for a in stored_answers]
    q_result = supabase.table("questions").select("*").in_("id", question_ids).execute()
    q_map = {q["id"]: q for q in (q_result.data or [])}

    # Fetch all test cases for coding questions (including hidden — reveal on complete)
    coding_q_ids = [a["question_id"] for a in stored_answers if a.get("question_type") == "coding"]
    tc_map: dict[str, list] = {}
    if coding_q_ids:
        tc_result = (
            supabase.table("test_cases")
            .select("*")
            .in_("question_id", coding_q_ids)
            .execute()
        )
        for tc in tc_result.data or []:
            tc_map.setdefault(tc["question_id"], []).append(tc)

    # Sort answers by order_index from assessment_questions
    aq_result = (
        supabase.table("assessment_questions")
        .select("question_id, order_index")
        .eq("assessment_id", attempt["mock_id"])
        .order("order_index")
        .execute()
    )
    order_map = {aq["question_id"]: aq["order_index"] for aq in (aq_result.data or [])}
    sorted_answers = sorted(stored_answers, key=lambda a: order_map.get(a["question_id"], 999))

    results: list[MockQuestionResult] = []
    for ans in sorted_answers:
        q = q_map.get(ans["question_id"])
        if not q:
            continue

        qtype = ans["question_type"]
        your_answer: dict[str, Any] = {}
        is_correct: Optional[bool] = None
        correct_option: Optional[dict[str, str]] = None
        test_outcomes: Optional[list[MockTestOutcome]] = None
        explanation: Optional[str] = q.get("explanation")

        if qtype == "mcq":
            selected = ans.get("selected_option")
            your_answer["selected_option"] = selected
            options: list = q.get("options") or []
            correct_opt = next(
                (o for o in options if o.get("is_correct") or o.get("isCorrect")), None
            )
            if correct_opt:
                is_correct = selected == correct_opt.get("id") if selected else False
                correct_option = {"id": correct_opt["id"], "text": correct_opt.get("text", "")}

        elif qtype == "coding":
            your_answer["source_code"] = ans.get("source_code", "")
            your_answer["language"] = ans.get("language", "")

            stored_outcomes: list[dict[str, Any]] = ans.get("test_outcomes") or []
            all_test_cases = tc_map.get(ans["question_id"], [])
            tc_id_map = {tc["id"]: tc for tc in all_test_cases}

            test_outcomes = []
            for i, outcome in enumerate(stored_outcomes):
                tc_id = outcome.get("testCaseId") or outcome.get("test_case_id", "")
                tc = tc_id_map.get(tc_id, {})
                test_outcomes.append(MockTestOutcome(
                    index=i + 1,
                    passed=outcome.get("passed", False),
                    time_msec=outcome.get("timeMsec") or outcome.get("time_msec") or 0,
                    input=tc.get("input", ""),
                    expected_output=tc.get("expected_output", ""),
                    actual_output=outcome.get("stdout") or "",
                ))

        elif qtype == "text":
            your_answer["answer_text"] = ans.get("answer_text", "")

        results.append(MockQuestionResult(
            question_id=ans["question_id"],
            question_title=q.get("title", ""),
            question_type=qtype,
            your_answer=your_answer,
            is_correct=is_correct,
            correct_option=correct_option,
            test_outcomes=test_outcomes if test_outcomes else None,
            explanation=explanation,
        ))

    return CompleteMockResponse(question_results=results)
