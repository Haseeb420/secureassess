use chrono::Utc;
use tauri::State;
use uuid::Uuid;

use super::models::{AssessmentSession, CodeSnapshot, SecurityEventRow};
use super::DbPool;

// ── Session ──────────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn save_session(
    db: State<'_, DbPool>,
    assessment_id: String,
    candidate_id: String,
    timer_remaining_secs: i64,
) -> Result<String, String> {
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();

    sqlx::query(
        "INSERT INTO assessment_sessions
           (id, assessment_id, candidate_id, status, started_at, timer_remaining_secs, last_saved_at)
         VALUES (?1, ?2, ?3, 'active', ?4, ?5, ?4)
         ON CONFLICT(id) DO UPDATE SET
           timer_remaining_secs = excluded.timer_remaining_secs,
           last_saved_at = excluded.last_saved_at",
    )
    .bind(&id)
    .bind(&assessment_id)
    .bind(&candidate_id)
    .bind(&now)
    .bind(timer_remaining_secs)
    .execute(&db.0)
    .await
    .map_err(|e| e.to_string())?;

    Ok(id)
}

#[tauri::command]
pub async fn get_session(
    db: State<'_, DbPool>,
    candidate_id: String,
) -> Result<Option<AssessmentSession>, String> {
    let session = sqlx::query_as::<_, AssessmentSession>(
        "SELECT id, assessment_id, candidate_id, status, started_at,
                timer_remaining_secs, last_saved_at
         FROM assessment_sessions
         WHERE candidate_id = ?1 AND status = 'active'
         ORDER BY started_at DESC
         LIMIT 1",
    )
    .bind(&candidate_id)
    .fetch_optional(&db.0)
    .await
    .map_err(|e| e.to_string())?;

    Ok(session)
}

#[tauri::command]
pub async fn update_timer(
    db: State<'_, DbPool>,
    session_id: String,
    timer_remaining_secs: i64,
) -> Result<(), String> {
    let now = Utc::now().to_rfc3339();
    sqlx::query(
        "UPDATE assessment_sessions
         SET timer_remaining_secs = ?1, last_saved_at = ?2
         WHERE id = ?3",
    )
    .bind(timer_remaining_secs)
    .bind(&now)
    .bind(&session_id)
    .execute(&db.0)
    .await
    .map_err(|e| e.to_string())?;

    Ok(())
}

// ── Snapshot ─────────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn save_snapshot(
    db: State<'_, DbPool>,
    session_id: String,
    question_id: String,
    language: String,
    code: String,
) -> Result<String, String> {
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();

    sqlx::query(
        "INSERT INTO code_snapshots (id, session_id, question_id, language, code, saved_at, synced)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, 0)",
    )
    .bind(&id)
    .bind(&session_id)
    .bind(&question_id)
    .bind(&language)
    .bind(&code)
    .bind(&now)
    .execute(&db.0)
    .await
    .map_err(|e| e.to_string())?;

    Ok(id)
}

#[tauri::command]
pub async fn get_latest_snapshot(
    db: State<'_, DbPool>,
    session_id: String,
    question_id: String,
    language: String,
) -> Result<Option<CodeSnapshot>, String> {
    let snapshot = sqlx::query_as::<_, CodeSnapshot>(
        "SELECT id, session_id, question_id, language, code, saved_at, synced
         FROM code_snapshots
         WHERE session_id = ?1 AND question_id = ?2 AND language = ?3
         ORDER BY saved_at DESC
         LIMIT 1",
    )
    .bind(&session_id)
    .bind(&question_id)
    .bind(&language)
    .fetch_optional(&db.0)
    .await
    .map_err(|e| e.to_string())?;

    Ok(snapshot)
}

// ── Security event ────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn save_security_event(
    db: State<'_, DbPool>,
    session_id: String,
    event_type: String,
    metadata: String,
) -> Result<String, String> {
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();

    sqlx::query(
        "INSERT INTO security_events (id, session_id, event_type, metadata, occurred_at, synced)
         VALUES (?1, ?2, ?3, ?4, ?5, 0)",
    )
    .bind(&id)
    .bind(&session_id)
    .bind(&event_type)
    .bind(&metadata)
    .bind(&now)
    .execute(&db.0)
    .await
    .map_err(|e| e.to_string())?;

    Ok(id)
}

#[tauri::command]
pub async fn get_security_events(
    db: State<'_, DbPool>,
    session_id: String,
) -> Result<Vec<SecurityEventRow>, String> {
    let events = sqlx::query_as::<_, SecurityEventRow>(
        "SELECT id, session_id, event_type, metadata, occurred_at, synced
         FROM security_events
         WHERE session_id = ?1
         ORDER BY occurred_at ASC",
    )
    .bind(&session_id)
    .fetch_all(&db.0)
    .await
    .map_err(|e| e.to_string())?;

    Ok(events)
}
