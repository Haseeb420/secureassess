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

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct TestCaseRow {
    pub id: String,
    pub question_id: String,
    pub input: String,
    pub expected_output: String,
    pub is_hidden: i64,
    pub time_limit_ms: i64,
    pub memory_limit_mb: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct EvalResultRow {
    pub id: String,
    pub session_id: String,
    pub question_id: String,
    pub language: String,
    pub test_case_id: String,
    pub passed: i64,
    pub status: String,
    pub stdout: String,
    pub stderr: String,
    pub execution_time_ms: i64,
    pub compile_error: Option<String>,
    pub created_at: String,
}
