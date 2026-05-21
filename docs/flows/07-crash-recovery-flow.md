# 07 — Crash Recovery Flow

## Overview

If the desktop app crashes or is force-quit during an active assessment, the candidate's work is not lost. On every subsequent launch, the app checks SQLite for any session that was not cleanly completed. If found, a CrashRecoveryModal is shown with the assessment name and remaining time. The candidate can choose to resume — restoring their latest code snapshot and timer state — or abandon the session. On resume, kiosk mode and security monitoring restart immediately, exactly as if the assessment had never been interrupted.

## Actors

- **Candidate** — decides to resume or abandon the interrupted session
- **Desktop App (React)** — checks for orphaned sessions on mount, renders CrashRecoveryModal
- **Rust Layer (Tauri)** — queries SQLite for incomplete sessions; restores state on resume command
- **SQLite (local)** — stores sessions (with status), snapshots, and timer state
- **Security Monitor (Rust)** — restarts on resume to enforce continuous monitoring

## Flow Steps

1. [Desktop App] → app launches (fresh start or after crash) → [App.tsx mounts, useCrashRecovery hook runs]
2. [Rust Layer] → `check_for_incomplete_session` Tauri command queries SQLite: SELECT * FROM sessions WHERE status NOT IN ('completed', 'abandoned') → [returns session row or null]
3. [Rust Layer] → no incomplete session found → [normal launch; navigate to /login]
4. [Rust Layer] → incomplete session found → [returns { session_id, assessment_name, remaining_seconds, last_snapshot_at }]
5. [Desktop App] → shows CrashRecoveryModal with: assessment name, remaining time formatted, last saved timestamp → [candidate sees recovery options]
6. [Candidate] → clicks "Resume Assessment" → [Desktop App calls `restore_session` Tauri command with session_id]
7. [Rust Layer] → fetches latest snapshot per question from SQLite snapshots table → [most recent code per question retrieved]
8. [Rust Layer] → reads remaining_seconds from SQLite sessions table → [timer value retrieved]
9. [Rust Layer] → loads assessment data from SQLite (cached on first load) → [questions available offline]
10. [Rust Layer] → returns { code_by_question, remaining_seconds, assessment_data } → [Desktop App receives]
11. [Desktop App] → populates Zustand store with restored code and timer → [state hydrated]
12. [Desktop App] → calls `enter_kiosk_mode` → [fullscreen kiosk re-engaged]
13. [Desktop App] → navigates to /assessment → [AssessmentPage mounts with restored state]
14. [Security Monitor] → restarts background monitoring immediately → [no gap in violation detection]
15. [Desktop App] → emits `sync:status` check → [sync worker resumes if online]
16. [Candidate] → clicks "Abandon Session" → [Desktop App calls `abandon_session` Tauri command with session_id]
17. [Rust Layer] → marks session status=abandoned in SQLite → [session closed]
18. [Rust Layer] → enqueues abandoned_session event in sync_queue → [admin will see abandonment]
19. [Desktop App] → navigates to /login → [candidate can log in fresh]

## Error Cases

- **SQLite unavailable on launch** — `check_for_incomplete_session` returns Err; app shows error dialog "Unable to read local session data. Please restart." Recovery is not possible without SQLite.
- **Snapshot data corrupted** — `restore_session` reads corrupted snapshot; falls back to empty editor for that question with warning "Code for this question could not be recovered." Timer is still restored.
- **Assessment data not cached locally** — if the app crashed before full assessment data was written to SQLite, recovery requires a network call to reload questions. If offline: CrashRecoveryModal shows "Assessment content needs to be reloaded. Connect to internet to resume."
- **Multiple incomplete sessions** — if (pathologically) multiple sessions exist: the most recently active one (MAX last_activity_at) is presented. Older ones are auto-abandoned on next launch.
- **Candidate force-quits during recovery modal** — session remains as status=incomplete; modal will show again on next launch. No data is lost.
- **Time already expired when recovering** — if remaining_seconds <= 0 at restore time: auto-submit the latest snapshots immediately without re-entering kiosk mode; navigate to CompletionPage.

## Offline Behavior

Crash recovery is fully offline. All session state, snapshots, and timer data are stored in SQLite. The recovery check, state restoration, and kiosk re-entry require no network access. Any pending sync_queue items from before the crash continue to accumulate and will flush when connectivity returns. The security event log for the session gap (from crash to resume) will include a gap that admins can see.

## Related Files

- `apps/desktop/src/features/auth/` — CrashRecoveryModal component, useCrashRecovery hook
- `apps/desktop/src-tauri/src/db/` — session and snapshot queries
- `apps/desktop/src-tauri/src/kiosk/` — kiosk re-entry on resume
- `apps/desktop/src-tauri/src/monitor/` — security monitor restart on resume
