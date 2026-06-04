from typing import Any, Optional

from pydantic import BaseModel

from schemas.attempts import QuestionForCandidate


class StartMockRequest(BaseModel):
    token_value: str
    mock_id: str


class StartMockResponse(BaseModel):
    attempt_id: str
    questions: list[QuestionForCandidate]


class MockAnswerRequest(BaseModel):
    attempt_id: str
    question_id: str
    question_type: str
    answer_text: Optional[str] = None
    selected_option: Optional[str] = None
    source_code: Optional[str] = None
    language: Optional[str] = None
    test_results: Optional[list[dict[str, Any]]] = None
    test_outcomes: Optional[list[dict[str, Any]]] = None  # full execution results incl. stdout


class MockAnswerResponse(BaseModel):
    accepted: bool
    next_question_available: bool


class MockTestOutcome(BaseModel):
    index: int
    passed: bool
    time_msec: int
    input: str
    expected_output: str
    actual_output: str


class MockQuestionResult(BaseModel):
    question_id: str
    question_title: str
    question_type: str
    your_answer: dict[str, Any]
    is_correct: Optional[bool] = None
    correct_option: Optional[dict[str, str]] = None
    test_outcomes: Optional[list[MockTestOutcome]] = None
    explanation: Optional[str] = None


class CompleteMockResponse(BaseModel):
    question_results: list[MockQuestionResult]
