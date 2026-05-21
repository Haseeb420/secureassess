# 09 — Live Monitoring Flow

## Overview

Admins can watch all active candidates in real time from the Monitor page in the Next.js dashboard. Each candidate is represented as a card showing their progress, violation count, and connectivity state. The dashboard subscribes to Supabase Realtime channels for the `security_events` and `assessment_sessions` tables. When a violation fires on a candidate's machine, the synced event propagates through the API to Supabase, and the admin sees the card update within seconds — no page refresh required. Admins can drill into any candidate's full event log or terminate their session remotely.

## Actors

- **Admin** — watches the monitor page, investigates violations, terminates sessions
- **Admin Dashboard (Next.js)** — renders candidate cards, manages Supabase Realtime subscriptions
- **Supabase Realtime** — broadcasts row-level changes on security_events and assessment_sessions tables
- **API (FastAPI)** — receives session termination commands, updates session state in Supabase
- **Desktop App (React/Tauri)** — receives assessment:locked Tauri event when admin terminates

## Flow Steps

1. [Admin] → navigates to /admin/monitor → [MonitorPage mounts]
2. [Admin Dashboard] → calls API GET /sessions?assessment_id={id}&status=active → [loads current active sessions list]
3. [Admin Dashboard] → renders one CandidateCard per session: { candidate_name, progress_percentage, violation_count, last_seen_at, connectivity_status } → [initial state displayed]
4. [Admin Dashboard] → subscribes to Supabase Realtime channel `assessment_sessions` with filter assessment_id=eq.{id} → [realtime session updates active]
5. [Admin Dashboard] → subscribes to Supabase Realtime channel `security_events` with filter assessment_id=eq.{id} → [realtime violation updates active]
6. [Candidate's Desktop App] → security violation occurs → [ViolationType emitted, event synced to API via sync queue]
7. [API] → receives security event via POST /sync/ingest → [writes security_event row to Supabase]
8. [Supabase Realtime] → broadcasts INSERT event on security_events → [admin dashboard receives event payload]
9. [Admin Dashboard] → finds matching CandidateCard by session_id → [increments violation_count, flashes card border red briefly]
10. [Admin] → clicks CandidateCard → [ViolationDrawer slides open]
11. [ViolationDrawer] → calls API GET /sessions/{session_id}/events → [loads full event log for this candidate]
12. [ViolationDrawer] → renders chronological event list with: timestamp, violation type, metadata, severity → [admin reviews history]
13. [Admin] → clicks "Terminate Session" in drawer → [confirmation dialog shown]
14. [Admin] → confirms → [Dashboard calls API POST /sessions/{session_id}/terminate]
15. [API] → sets session status=terminated in Supabase → [Supabase Realtime broadcasts UPDATE on assessment_sessions]
16. [API] → writes system_event { type=session_terminated, initiated_by=admin_id } to security_events → [audit trail created]
17. [Desktop App (candidate)] → Tauri sync worker receives next sync response with { action: terminate, session_id } OR Supabase Realtime (if desktop has direct Supabase subscription) → [termination signal received]
18. [Desktop App] → emits `assessment:locked` internal event → [AssessmentPage receives]
19. [Desktop App] → saves final snapshot to SQLite → [last state persisted]
20. [Desktop App] → exits kiosk mode, navigates to /completion with message "Your assessment has been terminated by the proctor." → [candidate sees termination notice]
21. [Supabase Realtime] → broadcasts UPDATE on assessment_sessions (status=terminated) → [admin card updates to show terminated state]

## Error Cases

- **Supabase Realtime connection drops** — Next.js client attempts auto-reconnect with exponential backoff; a "Disconnected — reconnecting…" banner shows in the monitor header. Events received during the gap are loaded via a full refresh call on reconnect.
- **Termination command fails (network error)** — API call to /sessions/{id}/terminate returns error; dashboard shows toast "Failed to terminate session. Try again."; session is not terminated.
- **Candidate device offline when termination sent** — termination is written to Supabase; when candidate's sync worker next comes online, it will receive the terminate action in the sync response and lock the assessment.
- **Admin sends duplicate terminate** — API is idempotent on terminate: if session is already terminated, returns 200 without side effects.
- **Multiple admins monitoring same assessment** — all subscribers receive the same Realtime events independently; no conflict or double-counting.
- **Monitor page opened with no active sessions** — empty state rendered: "No candidates are currently active."

## Offline Behavior

The admin dashboard has no offline mode. The monitor page requires an active connection to Supabase Realtime; without it, cards show stale data. The "Disconnected" banner makes this state visible. Candidate-side events continue to accumulate locally on the candidate's machine and will sync when they reconnect; admins will see those events appear in bulk once the candidate's sync worker flushes.

## Related Files

- `apps/admin/app/monitor/` — MonitorPage, CandidateCard, ViolationDrawer
- `apps/api/routers/` — sessions router (GET sessions, POST terminate)
- `apps/desktop/src-tauri/src/sync/` — termination signal handling in sync worker
