# 10 — Security Violation Flow

## Overview

The Rust security monitor runs continuously during an active assessment and detects any attempt to leave or circumvent the secure environment. Detectable events include focus loss (switching to another window), forbidden process launch, new display connection, and fullscreen exit. Each detection emits a Tauri event to the React layer, which logs the event locally, updates violation state, and shows a transient banner to the candidate. Violations accumulate in a Zustand counter. If the count exceeds a configurable threshold, the assessment is automatically terminated. All events are enqueued for sync to the backend so admins see them in the live monitor.

## Actors

- **Rust Layer (monitor)** — detects OS-level violations, emits Tauri events
- **Desktop App (React)** — receives violation events, updates UI, calls SQLite save
- **Zustand Store** — holds violation count and violation history in memory
- **SQLite (local)** — persists security events durably; feeds sync queue
- **Sync Worker (Rust)** — flushes security events to API
- **API (FastAPI)** — receives events via /sync/ingest, writes to Supabase
- **Admin Dashboard (Next.js)** — sees violation counts and events update live via Supabase Realtime

## Flow Steps

1. [Rust Layer] → background monitor polls OS for: active window focus, running process list, connected display count, fullscreen state → [poll runs every 1-2s]
2. [Rust Layer] → detects violation condition (e.g., focused window is not SecureAssess) → [violation identified]
3. [Rust Layer] → emits Tauri event `security:violation` with payload: { violation_type: FocusLoss | ForbiddenProcess | ExtraDisplay | FullscreenExit, metadata: { process_name?, display_count?, timestamp } } → [event delivered to React]
4. [Desktop App (useSecurityMonitor)] → receives `security:violation` event → [handler fires]
5. [Desktop App] → calls Tauri command `save_security_event` with violation payload → [SQLite security_events row inserted; sync_queue entry created with type=security_event]
6. [Desktop App] → increments violation_count in Zustand store → [counter updated]
7. [Desktop App] → appends event to violation_history array in Zustand → [full history in memory]
8. [Desktop App] → shows ViolationBanner component: "Warning: [violation description]. This has been recorded." → [banner visible for 5 seconds, then auto-dismisses]
9. [Desktop App] → checks violation_count against threshold (from assessment config, default 3 for FocusLoss, 1 for ForbiddenProcess) → [threshold comparison]
10. [Desktop App] → count below threshold → [assessment continues; monitor keeps running]
11. [Desktop App] → count at or above threshold → [calls `begin_auto_termination` flow]
12. [Desktop App] → shows TerminationModal: "Maximum violations exceeded. Your assessment will be submitted now." → [countdown 5s]
13. [Desktop App] → after countdown: triggers Submission Integrity Flow (auto-submit) → [final snapshot submitted]
14. [Desktop App] → exits kiosk mode, navigates to /completion → [assessment ends]
15. [Sync Worker] → flushes security_event from sync_queue to API → [event delivered]
16. [API] → writes security_event to Supabase → [Supabase Realtime broadcasts]
17. [Admin Dashboard] → receives Realtime event → [candidate card violation count increments; card flashes]

## Error Cases

- **`save_security_event` SQLite write fails** — violation is still counted in Zustand and the banner is shown; the event is not persisted or synced, meaning this specific violation will not appear in admin logs. This is treated as a best-effort: the candidate is still penalized locally, but the event may be lost if the app crashes before another save succeeds.
- **Tauri event channel drops** — if the React listener deregisters (e.g., component unmount without cleanup), violations will not reach the UI but the Rust monitor still logs them to SQLite directly via a separate save path.
- **Rust monitor crashes mid-assessment** — Tauri plugin crash is logged to stderr; React will not receive further events. This would be a significant security gap. The Rust monitor must be resilient and tested against panic conditions.
- **Fullscreen exit on macOS (Mission Control gesture)** — detected within one poll cycle (1-2s); kiosk module attempts to re-enter fullscreen immediately while also logging a FullscreenExit violation.
- **Forbidden process launched and immediately closed** — the scanner may or may not catch it depending on poll timing. This is a known limitation of polling-based detection; the violation threshold is tuned conservatively to account for this.
- **ViolationBanner spam (rapid repeat violations)** — banner deduplicates by type within a 5-second window; rapid repeat FocusLoss events (e.g., rapid window switching) count individually in Zustand but only show one banner at a time.
- **Assessment threshold set to 0** — first violation immediately triggers auto-termination. Admins configure this per assessment security level.

## Offline Behavior

The violation detection, local logging, Zustand counter, UI banner, and auto-termination logic all work entirely offline. Events are stored in SQLite sync_queue and will reach the API when connectivity returns. The admin will see a delayed burst of violation events when the candidate reconnects, but all events are timestamped at detection time so the timeline is accurate.

## Related Files

- `apps/desktop/src-tauri/src/monitor/` — focus, process, display, fullscreen detection
- `apps/desktop/src-tauri/src/processes/` — forbidden process scanner
- `apps/desktop/src-tauri/src/security/` — ViolationType definitions, security event saving
- `apps/desktop/src-tauri/src/db/` — security_events table
- `apps/desktop/src-tauri/src/sync/` — sync queue for security events
- `apps/admin/app/monitor/` — admin live violation view
