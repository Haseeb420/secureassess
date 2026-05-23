from pydantic import BaseModel, EmailStr


class CandidateInfo(BaseModel):
    id: str
    email: str
    name: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class InviteLoginRequest(BaseModel):
    token: str


class LoginResponse(BaseModel):
    access_token: str
    refresh_token: str
    expires_at: int
    candidate: CandidateInfo


class RefreshRequest(BaseModel):
    refresh_token: str


class MeResponse(BaseModel):
    id: str
    email: str
    name: str | None = None
    role: str | None = None
