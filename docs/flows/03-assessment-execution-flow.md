# 03 — Assessment Execution Flow

## Overview

The assessment execution flow is the core candidate experience. After passing pre-assessment validation, the candidate enters a locked kiosk environment and begins coding. The Monaco editor captures all keystrokes; a debounced auto-save writes code snapshots to SQLite every 3 seconds after activity and unconditionally every 30 seconds. A countdown timer ticks in the background and persists to SQLite every 10 seconds to survive crashes. The Rust security monitor runs continuously throughout the session, emitting violation events if the candidate attempts to leave the secure environment.

## Actors

- **Candidate** — writes code, reads questions, runs tests
- **Desktop App (React)** — renders IDE layout, manages timer, triggers saves
- **Rust Layer (Tauri)** — enforces kiosk mode, monitors security, persists snapshots
- **SQLite (local)** — stores code snapshots, timer state, security events, sync queue entries
- **API (FastAPI)** — receives synced snapshots and events when online (background)

## Flow Steps

1. [Candidate] → clicks "Start Assessment" on PreAssessmentPage → [Desktop App calls `enter_kiosk_mode` Tauri command]
2. [Rust Layer] → sets window to fullscreen, disables window decorations, prevents resize/minimize → [kiosk mode active]
3. [Desktop App] → navigates to /assessment → [AssessmentPage mounts]
4. [Desktop App] → loads assessment data (questions, time limit) from Zustand / API → [questions rendered in QuestionPanel]
5. [Desktop App] → checks SQLite for existing session with matching assessment_id → [if resuming: restores code + remaining time; if new: initializes timer to full duration]
6. [Desktop App] → starts countdown timer → [TopBar shows ticking clock]
7. [Rust Layer] → background security monitor starts polling → [focus, process, display checks run on interval]
8. [Candidate] → types code in Monaco editor → [onChange fires]
9. [Desktop App (useAutoSave)] → debounce 3s after last keystroke → [calls `save_snapshot` Tauri command]
10. [Rust Layer] → writes snapshot { session_id, question_id, code, language, timestamp } to SQLite snapshots table → [snapshot persisted]
11. [Rust Layer] → enqueues snapshot in sync_queue with type=snapshot → [queued for background sync]
12. [Desktop App (useTimerPersistence)] → every 10s writes { session_id, remaining_seconds } to SQLite sessions table → [timer crash-safe]
13. [Desktop App] → every 30s unconditional save fires even if no keystroke since last save → [ensures no more than 30s of work lost]
14. [Candidate] → clicks "Run Tests" → [triggers Code Execution Flow]
15. [Rust Layer (security monitor)] → detects violation → [triggers Security Violation Flow]
16. [Timer] → reaches 0 → [Desktop App calls auto-submit → triggers Submission Integrity Flow]
17. [Candidate] → manually clicks "Submit" → [triggers Submission Integrity Flow]

## Error Cases

- **Monaco editor fails to load** — React ErrorBoundary catches; shows "Editor failed to load. Refresh the page." Assessment session is not lost (SQLite still has latest snapshot).
- **`save_snapshot` Tauri command fails** — useAutoSave logs the error; retries on next save interval. If 3 consecutive failures: shows persistent warning banner "Auto-save is not working. Contact support."
- **`enter_kiosk_mode` fails** — assessed as a security risk; PreAssessmentPage shows error and prevents navigation to assessment.
- **Timer desync (local clock drift)** — timer is calculated as (start_timestamp + duration) - now, not accumulated ticks, so clock drift is self-correcting each tick.
- **Assessment data fails to load from API** — if cached in Zustand/SQLite, use cached version. If not cached: show error "Unable to load assessment. Check your connection." and block start.
- **App goes to background (macOS)** — Rust focus monitor detects loss of focus and emits a security violation event (see Security Violation Flow).

## Offline Behavior

The entire assessment execution flow is designed to work offline. Once the assessment data is loaded, no network calls are required to write code, save snapshots, or tick the timer. All state is SQLite-backed. The sync queue accumulates snapshot and event entries that flush to the API when connectivity returns. The UI shows a SyncIndicator component that reflects connectivity state without blocking the candidate from working.

## Related Files

- `apps/desktop/src/features/ide/` — Monaco editor, toolbar, console, test runner
- `apps/desktop/src-tauri/src/kiosk/` — fullscreen enforcement
- `apps/desktop/src-tauri/src/monitor/` — background security monitor
- `apps/desktop/src-tauri/src/db/` — snapshot and session persistence
- `apps/desktop/src-tauri/src/sync/` — sync queue
