from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel

from core.dependencies import get_current_admin, get_current_candidate
from core.supabase import get_supabase

router = APIRouter(prefix="/questions", tags=["questions"])


class TestCaseIn(BaseModel):
    input: str
    expected_output: str
    is_hidden: bool


class QuestionCreate(BaseModel):
    title: str
    description: str
    type: str
    difficulty: str
    time_limit_ms: int
    memory_limit_mb: int
    tags: list[str]
    test_cases: list[TestCaseIn]


class QuestionPatch(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    type: Optional[str] = None
    difficulty: Optional[str] = None
    time_limit_ms: Optional[int] = None
    memory_limit_mb: Optional[int] = None
    tags: Optional[list[str]] = None


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

    question_result = (
        supabase.table("questions")
        .insert(
            {
                "title": body.title,
                "description": body.description,
                "type": body.type,
                "difficulty": body.difficulty,
                "time_limit_ms": body.time_limit_ms,
                "memory_limit_mb": body.memory_limit_mb,
                "tags": body.tags,
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
        .single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found")
    return result.data


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

    result = (
        supabase.table("questions")
        .update(updates)
        .eq("id", question_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found")
    return result.data[0]
