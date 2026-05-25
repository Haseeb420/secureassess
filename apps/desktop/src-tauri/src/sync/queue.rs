use chrono::Utc;
use sqlx::SqlitePool;
use uuid::Uuid;

use crate::db::models::SyncQueueItem;

pub async fn enqueue(
    db: &SqlitePool,
    payload_type: &str,
    payload_json: &str,
    submission_hash: Option<&str>,
) -> Result<(), sqlx::Error> {
    // Dedup: if submission_hash provided and a pending/synced row already exists, skip
    if let Some(hash) = submission_hash {
        let existing: Option<(String,)> = sqlx::query_as(
            "SELECT id FROM sync_queue WHERE submission_hash = ?1 AND status != 'failed' LIMIT 1",
        )
        .bind(hash)
        .fetch_optional(db)
        .await?;
        if existing.is_some() {
            return Ok(());
        }
    }

    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    sqlx::query(
        "INSERT INTO sync_queue
           (id, payload_type, payload, submission_hash, created_at, attempts, status)
         VALUES (?1, ?2, ?3, ?4, ?5, 0, 'pending')",
    )
    .bind(&id)
    .bind(payload_type)
    .bind(payload_json)
    .bind(submission_hash)
    .bind(&now)
    .execute(db)
    .await?;

    Ok(())
}

pub async fn get_pending(db: &SqlitePool) -> Result<Vec<SyncQueueItem>, sqlx::Error> {
    sqlx::query_as::<_, SyncQueueItem>(
        "SELECT id, payload_type, payload, submission_hash, created_at,
                attempts, last_attempt_at, status
         FROM sync_queue
         WHERE status = 'pending' AND attempts < 5
         ORDER BY created_at ASC",
    )
    .fetch_all(db)
    .await
}

pub async fn mark_synced(db: &SqlitePool, id: &str) -> Result<(), sqlx::Error> {
    sqlx::query("UPDATE sync_queue SET status = 'synced' WHERE id = ?1")
        .bind(id)
        .execute(db)
        .await?;
    Ok(())
}

pub async fn mark_failed(db: &SqlitePool, id: &str) -> Result<(), sqlx::Error> {
    let now = Utc::now().to_rfc3339();
    sqlx::query(
        "UPDATE sync_queue
         SET attempts = attempts + 1, last_attempt_at = ?1
         WHERE id = ?2",
    )
    .bind(&now)
    .bind(id)
    .execute(db)
    .await?;
    Ok(())
}
