from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel

from core.dependencies import get_current_admin, get_current_candidate
from core.supabase import get_supabase

router = APIRouter(prefix="/questions", tags=["questions"])


class TestCaseIn(BaseModel):
    input: str
    expected_output: str
    is_hidden: bool


class McqOptionIn(BaseModel):
    id: str
    text: str
    is_correct: bool


class QuestionCreate(BaseModel):
    title: str
    description: str
    type: str
    difficulty: str
    weightage: float = 0.0
    time_limit_ms: Optional[int] = 2000
    memory_limit_mb: Optional[int] = 256
    tags: Optional[list[str]] = []
    test_cases: Optional[list[TestCaseIn]] = []
    options: Optional[list[McqOptionIn]] = None


class QuestionPatch(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    type: Optional[str] = None
    difficulty: Optional[str] = None
    weightage: Optional[float] = None
    time_limit_ms: Optional[int] = None
    memory_limit_mb: Optional[int] = None
    tags: Optional[list[str]] = None
    options: Optional[list[McqOptionIn]] = None


@router.get("")
async def list_questions(
    type: Optional[str] = Query(None),
    difficulty: Optional[str] = Query(None),
    tags: Optional[str] = Query(None),
    _auth: dict = Depends(get_current_candidate),
):
    supabase = get_supabase()
    query = supabase.table("questions").select(
        "id, title, type, difficulty, tags, time_limit_ms, memory_limit_mb, created_at"
    )
    if type:
        query = query.eq("type", type)
    if difficulty:
        query = query.eq("difficulty", difficulty)
    if tags:
        query = query.contains("tags", [tags])

    result = query.order("created_at", desc=True).execute()
    return result.data or []


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_question(
    body: QuestionCreate,
    _admin: dict = Depends(get_current_admin),
):
    supabase = get_supabase()

    options_json: Any = None
    if body.type == "mcq" and body.options:
        options_json = [o.model_dump() for o in body.options]

    question_result = (
        supabase.table("questions")
        .insert(
            {
                "title": body.title,
                "description": body.description,
                "type": body.type,
                "difficulty": body.difficulty,
                "weightage": body.weightage,
                "time_limit_ms": body.time_limit_ms,
                "memory_limit_mb": body.memory_limit_mb,
                "tags": body.tags or [],
                "options": options_json,
            }
        )
        .execute()
    )
    if not question_result.data:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create question")

    question = question_result.data[0]
    question_id = question["id"]

    if body.test_cases:
        cases = [
            {
                "question_id": question_id,
                "input": tc.input,
                "expected_output": tc.expected_output,
                "is_hidden": tc.is_hidden,
            }
            for tc in body.test_cases
        ]
        supabase.table("test_cases").insert(cases).execute()

    return question


@router.get("/{question_id}")
async def get_question(
    question_id: str,
    _auth: dict = Depends(get_current_candidate),
):
    supabase = get_supabase()
    result = (
        supabase.table("questions")
        .select("*")
        .eq("id", question_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found")
    question = result.data[0]

    cases = (
        supabase.table("test_cases")
        .select("id, input, expected_output, is_hidden")
        .eq("question_id", question_id)
        .execute()
    ).data or []
    question["test_cases"] = cases

    # Strip is_correct from MCQ options before sending to candidates
    if question.get("type") == "mcq" and question.get("options"):
        question["options"] = [
            {k: v for k, v in opt.items() if k != "is_correct"}
            for opt in question["options"]
        ]

    return question


@router.put("/{question_id}")
async def update_question(
    question_id: str,
    body: QuestionCreate,
    _admin: dict = Depends(get_current_admin),
):
    supabase = get_supabase()

    options_json: Any = None
    if body.type == "mcq" and body.options:
        options_json = [o.model_dump() for o in body.options]

    result = (
        supabase.table("questions")
        .update({
            "title": body.title,
            "description": body.description,
            "type": body.type,
            "difficulty": body.difficulty,
            "weightage": body.weightage,
            "time_limit_ms": body.time_limit_ms,
            "memory_limit_mb": body.memory_limit_mb,
            "tags": body.tags or [],
            "options": options_json,
        })
        .eq("id", question_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found")

    # Replace test cases: delete all then re-insert
    supabase.table("test_cases").delete().eq("question_id", question_id).execute()
    if body.test_cases:
        supabase.table("test_cases").insert([
            {
                "question_id": question_id,
                "input": tc.input,
                "expected_output": tc.expected_output,
                "is_hidden": tc.is_hidden,
            }
            for tc in body.test_cases
        ]).execute()

    return result.data[0]


@router.patch("/{question_id}")
async def patch_question(
    question_id: str,
    body: QuestionPatch,
    _admin: dict = Depends(get_current_admin),
):
    supabase = get_supabase()
    updates = body.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No fields to update")

    # Serialize McqOption objects to plain dicts for Supabase
    if "options" in updates and updates["options"] is not None:
        updates["options"] = [o if isinstance(o, dict) else o.model_dump() for o in updates["options"]]

    result = (
        supabase.table("questions")
        .update(updates)
        .eq("id", question_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found")
    return result.data[0]
