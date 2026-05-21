# 04 — Offline Sync Flow

## Overview

SecureAssess is offline-first: every write during an assessment lands in the local SQLite sync_queue first, with network delivery happening asynchronously. A background Rust worker checks connectivity every 30 seconds and flushes the queue to the API when online. Each item in the queue is retried up to 5 times with exponential backoff before being marked as failed. The sync status is emitted as a Tauri event so the React UI can show a real-time connectivity and sync indicator without polling from the frontend.

## Actors

- **Desktop App (React)** — enqueues items after each local write; renders sync status indicator
- **Rust Layer (sync worker)** — runs connectivity checks, dequeues items, calls API, handles retries
- **SQLite (local)** — stores the sync_queue table; source of truth for pending items
- **API (FastAPI)** — receives batched sync items at POST /sync/ingest, processes and stores them
- **Supabase** — final destination for all synced data (sessions, snapshots, events, submissions)

## Flow Steps

1. [Rust Layer] → any write operation (snapshot, event, submission) → [item inserted into sync_queue: { id, type, payload_json, retry_count, created_at, status=pending }]
2. [Rust Layer (background worker)] → wakes every 30s → [checks HTTP connectivity via lightweight ping to API /health]
3. [Rust Layer] → connectivity check fails → [emits Tauri event `sync:status` with { online: false, pending_count: N }]
4. [Desktop App (useSyncStatus)] → receives event → [SyncIndicator shows offline state with pending count]
5. [Rust Layer] → connectivity check succeeds → [emits `sync:status` with { online: true }; begins flush]
6. [Rust Layer] → queries sync_queue WHERE status=pending ORDER BY created_at ASC LIMIT 50 → [fetches batch]
7. [Rust Layer] → sends batch to API POST /sync/ingest with items array → [API processes batch]
8. [API] → for each item: validates type, verifies checksum (if submission), deduplicates by item_hash → [stores valid items to Supabase]
9. [API] → returns { processed: [...ids], rejected: [...{ id, reason }] } → [Rust receives result]
10. [Rust Layer] → marks processed items as status=synced in sync_queue → [items cleared from pending]
11. [Rust Layer] → for rejected items: marks status=failed with rejection_reason logged → [not retried if rejected by API logic]
12. [Rust Layer] → for network-failed items (API unreachable mid-flush): increments retry_count → [if retry_count < 5: keeps status=pending; if >= 5: marks status=dead_letter]
13. [Rust Layer] → emits `sync:status` with updated pending_count → [UI updates indicator]
14. [Desktop App] → SyncIndicator shows green checkmark when pending_count=0 and online=true → [candidate sees sync complete]

## Error Cases

- **API returns 5xx on /sync/ingest** — Rust worker treats as transient failure; increments retry_count; item remains pending and retries on next cycle.
- **API returns 4xx (e.g., 400 checksum mismatch)** — item is marked failed; rejection reason stored in sync_queue row; not retried (permanent rejection). Admin can inspect dead-letter items in support tooling.
- **Dead-letter item (retry_count >= 5)** — item is not lost from SQLite; it is marked status=dead_letter. Support tools can re-queue these manually. The candidate is not blocked from continuing.
- **sync_queue grows large (poor connectivity over long assessment)** — no upper bound on queue size in normal operation; SQLite handles thousands of rows without issue. Large queues flush in batches of 50, so even a 5000-item queue will fully sync within a few minutes of connectivity returning.
- **API /health endpoint unreachable but internet is up** — worker treats as offline. Prevents partial syncs when the API is deployed but unhealthy.
- **SQLite corruption** — if sync_queue cannot be read, worker logs error and suspends sync. This does not block the assessment; candidate can continue. Requires manual recovery.

## Offline Behavior

This flow *is* the offline behavior — it exists specifically to decouple local writes from network delivery. While offline: all items accumulate in sync_queue with status=pending, the SyncIndicator shows offline with a pending count, and no writes to the API are attempted. The worker resumes flushing the moment connectivity is detected. There is no user action required to trigger sync on reconnect.

## Related Files

- `apps/desktop/src-tauri/src/sync/` — queue.rs (SQLite queue operations), worker.rs (background flush loop)
- `apps/desktop/src-tauri/src/db/` — sync_queue table schema and migrations
- `apps/api/routers/sync.py` — POST /sync/ingest endpoint
