from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, EmailStr, Field


class CreateTokenRequest(BaseModel):
    candidate_email: EmailStr
    candidate_name: str
    assessment_id: str
    mock_ids: list[str] = []
    expiry_at: datetime
    usage_limit: int = Field(default=1, ge=1, le=100)
    notes: Optional[str] = None


class PatchTokenRequest(BaseModel):
    expiry_at: Optional[datetime] = None
    usage_limit: Optional[int] = Field(default=None, ge=1, le=100)
    mock_ids: Optional[list[str]] = None
    notes: Optional[str] = None


class ValidateTokenRequest(BaseModel):
    token_value: str


class ValidateTokenResponse(BaseModel):
    valid: bool
    reason: Optional[str] = None
    token: Optional[dict[str, Any]] = None
    assessment: Optional[dict[str, Any]] = None
    mocks: Optional[list[dict[str, Any]]] = None
    assessment_status: Optional[str] = None
    countdown_to_ms: Optional[int] = None
