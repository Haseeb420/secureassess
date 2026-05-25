use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct AssessmentSession {
    pub id: String,
    pub assessment_id: String,
    pub candidate_id: String,
    pub status: String,
    pub started_at: String,
    pub timer_remaining_secs: i64,
    pub last_saved_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct CodeSnapshot {
    pub id: String,
    pub session_id: String,
    pub question_id: String,
    pub language: String,
    pub code: String,
    pub saved_at: String,
    pub synced: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct SecurityEventRow {
    pub id: String,
    pub session_id: String,
    pub event_type: String,
    pub metadata: String,
    pub occurred_at: String,
    pub synced: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct SyncQueueItem {
    pub id: String,
    pub payload_type: String,
    pub payload: String,
    pub submission_hash: Option<String>,
    pub created_at: String,
    pub attempts: i64,
    pub last_attempt_at: Option<String>,
    pub status: String,
}
