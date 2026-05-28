import json
from typing import Optional

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from core.supabase import get_supabase
from services.integrity import verify_submission

router = APIRouter(prefix="/sync", tags=["sync"])


class SyncItem(BaseModel):
    id: str
    payload_type: str
    payload: str
    submission_hash: Optional[str] = None
    created_at: str
    attempts: int
    last_attempt_at: Optional[str] = None
    status: str


@router.post("/ingest")
async def ingest(item: SyncItem):
    supabase = get_supabase()

    try:
        payload_data = json.loads(item.payload)
    except json.JSONDecodeError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="invalid_payload_json")

    if item.payload_type == "submission":
        # Integrity verification
        ok, reason = verify_submission(payload_data)
        if not ok:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"error": "integrity_check_failed", "reason": reason},
            )

        # Idempotency: skip if already stored
        if item.submission_hash:
            existing = (
                supabase.table("question_submissions")
                .select("id")
                .eq("submission_hash", item.submission_hash)
                .execute()
            )
            if existing.data:
                return {"status": "already_processed"}

        # Extract inner data from SignedPayload
        inner = payload_data.get("data", payload_data)
        supabase.table("question_submissions").insert(
            {
                "session_id": inner.get("session_id"),
                "question_id": inner.get("question_id"),
                "language": inner.get("language"),
                "source_code": inner.get("source_code"),
                "score": inner.get("score"),
                "passed_tests": inner.get("passed_tests"),
                "total_tests": inner.get("total_tests"),
                "submitted_at": inner.get("submitted_at"),
                "submission_hash": item.submission_hash,
            }
        ).execute()

    elif item.payload_type == "snapshot":
        supabase.table("code_snapshots").upsert(
            {
                "id": payload_data.get("id"),
                "session_id": payload_data.get("session_id"),
                "question_id": payload_data.get("question_id"),
                "language": payload_data.get("language"),
                "code": payload_data.get("code"),
                "saved_at": payload_data.get("saved_at"),
            }
        ).execute()

    elif item.payload_type == "security_event":
        supabase.table("security_events").upsert(
            {
                "id": payload_data.get("id"),
                "session_id": payload_data.get("session_id"),
                "type": payload_data.get("event_type"),
                "metadata": payload_data.get("metadata", {}),
                "created_at": payload_data.get("occurred_at"),
            }
        ).execute()

    return {"status": "ok"}
