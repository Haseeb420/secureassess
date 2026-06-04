from typing import Any, Optional

from pydantic import BaseModel, Field


class QuestionForCandidate(BaseModel):
    id: str
    title: str
    description: str
    type: str  # coding | mcq | text
    weightage: float
    order_index: int
    time_limit_ms: int
    memory_limit_mb: int
    options: Optional[list[dict[str, Any]]] = None   # MCQ only — isCorrect stripped
    sample_tests: Optional[list[dict[str, Any]]] = None  # coding only — hidden tests excluded


class StartAttemptRequest(BaseModel):
    token_value: str


class StartAttemptResponse(BaseModel):
    attempt_id: str
    questions: list[QuestionForCandidate]


class SubmitAnswerRequest(BaseModel):
    attempt_id: str
    question_id: str
    question_type: str
    answer_text: Optional[str] = None
    selected_option: Optional[str] = None
    source_code: Optional[str] = None
    language: Optional[str] = None
    test_results: Optional[list[dict[str, Any]]] = None


class SubmitAnswerResponse(BaseModel):
    question_id: str
    accepted: bool
    next_question_available: bool


class CompleteAttemptResponse(BaseModel):
    final_score: float
    total_time_secs: int


class ManualScoreRequest(BaseModel):
    manual_score: float = Field(ge=0, le=100)


class ManualScoreResponse(BaseModel):
    answer_id: str
    manual_score: float
    weighted_score: float
    new_final_score: float
