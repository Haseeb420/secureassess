use std::time::Duration;

use chrono::Utc;
use log::{info, warn};
use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager};

use crate::db::DbPool;
use super::queue::{get_pending, mark_failed, mark_synced};

const POLL_INTERVAL: Duration = Duration::from_secs(30);
const HTTP_TIMEOUT: Duration = Duration::from_secs(5);

#[derive(Serialize, Clone)]
pub struct SyncStatus {
    pub online: bool,
    pub pending_count: usize,
    pub last_sync_at: Option<String>,
}

pub async fn start_sync_worker(app_handle: AppHandle) {
    let api_base = std::env::var("VITE_API_BASE_URL")
        .unwrap_or_else(|_| "http://localhost:8000".to_string());
    let health_url = format!("{api_base}/health");
    let ingest_url = format!("{api_base}/sync/ingest");

    let client = reqwest::Client::builder()
        .timeout(HTTP_TIMEOUT)
        .build()
        .expect("failed to build HTTP client");

    loop {
        tokio::time::sleep(POLL_INTERVAL).await;

        let pool = {
            let state = app_handle.state::<DbPool>();
            state.0.clone()
        };

        // Health check
        let online = client.get(&health_url).send().await.map_or(false, |r| r.status().is_success());

        if !online {
            let pending = get_pending(&pool).await.unwrap_or_default();
            let _ = app_handle.emit(
                "sync:status",
                SyncStatus {
                    online: false,
                    pending_count: pending.len(),
                    last_sync_at: None,
                },
            );
            warn!("Sync worker: API offline, {} items pending", pending.len());
            continue;
        }

        // Flush pending rows
        let rows = match get_pending(&pool).await {
            Ok(r) => r,
            Err(e) => {
                warn!("Sync worker: DB error fetching pending: {e}");
                continue;
            }
        };

        let total = rows.len();
        let mut remaining = total;

        for row in rows {
            let result = client
                .post(&ingest_url)
                .json(&row)
                .send()
                .await;

            match result {
                Ok(resp) if resp.status().is_success() => {
                    let _ = mark_synced(&pool, &row.id).await;
                    remaining = remaining.saturating_sub(1);
                    info!("Sync worker: synced item {}", row.id);
                }
                Ok(resp) => {
                    warn!("Sync worker: server rejected {} — status {}", row.id, resp.status());
                    let _ = mark_failed(&pool, &row.id).await;
                }
                Err(e) => {
                    warn!("Sync worker: request failed for {}: {e}", row.id);
                    let _ = mark_failed(&pool, &row.id).await;
                }
            }
        }

        let now = Utc::now().to_rfc3339();
        let _ = app_handle.emit(
            "sync:status",
            SyncStatus {
                online: true,
                pending_count: remaining,
                last_sync_at: Some(now),
            },
        );
        info!("Sync worker: flush complete. {remaining} items still pending.");
    }
}
