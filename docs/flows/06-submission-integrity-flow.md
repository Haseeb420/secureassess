# 06 — Submission Integrity Flow

## Overview

When a candidate submits their assessment (manually or via timer expiry), the Rust layer constructs a cryptographically signed payload before anything is sent to the API. The payload includes all answers, a SHA-256 checksum of the content, an HMAC signature using a session-derived key, a machine fingerprint, and a timestamp. The API verifies all of these before accepting the submission, rejecting tampered or replayed payloads with a logged reason. Idempotency is enforced by hashing the submission content — duplicate syncs of the same submission do not create duplicate records.

## Actors

- **Candidate** — triggers submission (click or timer expiry)
- **Desktop App (React)** — initiates submission flow, shows SubmissionModal, navigates to CompletionPage
- **Rust Layer (Tauri)** — collects answers, builds machine fingerprint, computes checksum and HMAC, enqueues payload
- **SQLite (local)** — stores signed payload in sync_queue; enforces deduplication via submission_hash column
- **API (FastAPI)** — verifies integrity, checks replay, stores valid submission to Supabase
- **Supabase** — final storage for verified submissions

## Flow Steps

1. [Candidate] → clicks "Submit" or timer reaches 0 → [Desktop App shows SubmissionModal with confirmation]
2. [Candidate] → confirms submission → [Desktop App calls `build_submission_payload` Tauri command]
3. [Rust Layer] → collects all code snapshots for this session from SQLite (latest per question) → [final answers assembled]
4. [Rust Layer] → generates machine fingerprint: SHA-256 hash of (MAC address + CPU model + hostname) → [fingerprint string produced]
5. [Rust Layer] → builds raw payload: { session_id, candidate_id, assessment_id, answers: [...], machine_fingerprint, submitted_at: ISO8601 } → [data structure formed]
6. [Rust Layer] → computes SHA-256 checksum of JSON-serialized payload → [checksum hex string]
7. [Rust Layer] → computes HMAC-SHA256 of checksum using session-derived key (KDF from session_id + ENCRYPTION_SECRET) → [signature hex string]
8. [Rust Layer] → builds SignedPayload: { data: payload, checksum, signature, timestamp: submitted_at } → [signed envelope ready]
9. [Rust Layer] → computes submission_hash = SHA-256 of (session_id + checksum) → [dedup key]
10. [Rust Layer] → inserts into sync_queue: { type=submission, payload=SignedPayload, submission_hash } — ON CONFLICT submission_hash DO NOTHING → [idempotent enqueue]
11. [Rust Layer] → marks SQLite session as status=submitted → [local session state updated]
12. [Desktop App] → dismisses SubmissionModal, navigates to /completion → [CompletionPage renders; back navigation disabled]
13. [Sync Worker] → flushes sync_queue including submission item → [API POST /sync/ingest called]
14. [API] → receives submission item → [integrity verification begins]
15. [API] → recomputes SHA-256 of data field → [checks against provided checksum]
16. [API] → recomputes HMAC of checksum → [checks against provided signature]
17. [API] → checks submitted_at timestamp is within ±5 minutes of server time → [replay window check]
18. [API] → queries Supabase for existing record with same submission_hash → [duplicate check]
19. [API] → all checks pass → inserts submission to Supabase question_submissions table → [submission stored]
20. [API] → marks sync_queue item as synced → [Rust layer informed]
21. [API] → emits Supabase Realtime event → [Admin monitor updates in real time]

## Error Cases

- **Checksum mismatch** — payload was modified in transit or in SQLite; API returns 400 with `reason: checksum_invalid`; submission rejected and logged as integrity_violation. Not retried.
- **Signature mismatch** — HMAC verification fails; same outcome as checksum mismatch; suggests attempted tampering.
- **Timestamp too old (replay attack)** — submitted_at is > 5 minutes from server clock; API returns 400 with `reason: replay_detected`; rejected and logged.
- **Duplicate submission_hash** — API silently accepts (returns 200) but does not insert a duplicate record; idempotent behavior means sync retries are safe.
- **Machine fingerprint missing** — API rejects with 400 if fingerprint field is absent or empty; this is a required field.
- **Sync worker fails before submission sent** — submission remains in sync_queue as pending; retries on next connectivity cycle; CompletionPage does not require sync confirmation, only local session status.
- **Timer expiry with no internet** — submission is built and enqueued locally; candidate sees CompletionPage; submission syncs when connectivity returns; no data is lost.

## Offline Behavior

Submission building and signing happens entirely offline in the Rust layer. The signed payload is persisted to SQLite immediately, so even if the device loses power after submission, the payload survives and will sync on next launch. The CompletionPage is shown based on local session status, not API confirmation. The API will eventually receive and verify the payload via the sync queue regardless of when connectivity returns.

## Related Files

- `apps/desktop/src-tauri/src/security/` — machine fingerprint, HMAC, checksum logic
- `apps/desktop/src-tauri/src/sync/` — sync queue, submission enqueue
- `apps/desktop/src-tauri/src/db/` — SQLite session status update
- `apps/api/routers/sync.py` — /sync/ingest with integrity verification
