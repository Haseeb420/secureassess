# 02 — Pre-Assessment Validation Flow

## Overview

Before a candidate can start an assessment, the desktop app runs a mandatory security validation pass using the Rust native layer. This ensures the environment meets integrity requirements: no extra displays are connected, no forbidden applications are running, the app is not executing inside a virtual machine, and the system is ready for kiosk lockdown. Each check produces a pass/fail result with a human-readable reason. All checks must pass before the "Start Assessment" button is enabled. Any failure is logged as a security event in the local SQLite database.

## Actors

- **Candidate** — views validation checklist, resolves any failures before proceeding
- **Desktop App (React)** — renders PreAssessmentPage, calls security commands, updates UI state
- **Rust Layer (Tauri)** — executes each system check natively, returns ValidationResult structs
- **SQLite (local)** — receives security event logs for any failed checks

## Flow Steps

1. [Desktop App] → candidate arrives at /pre-assessment after successful login → [PreAssessmentPage mounts]
2. [Desktop App] → calls Tauri command `run_pre_assessment_checks` → [Rust layer begins validation]
3. [Rust Layer] → runs display count check via OS display API → [returns pass if exactly 1 display, fail with count if more]
4. [Rust Layer] → runs forbidden process scan via sysinfo → [returns pass if none found, fail with process names if found]
5. [Rust Layer] → runs VM detection (hypervisor flag, vendor strings, known VM process names) → [returns pass if bare metal detected]
6. [Rust Layer] → returns Vec<ValidationResult> to React → [each item: { check_name, passed, reason }]
7. [Desktop App] → renders checklist with green checkmark or red X per check → [candidate sees validation state]
8. [Desktop App] → if any check fails: disables "Start Assessment" button, shows resolution hint per failed check → [candidate prompted to fix]
9. [Candidate] → closes forbidden app / disconnects display → [takes corrective action]
10. [Desktop App] → candidate clicks "Re-run Checks" → [returns to step 2]
11. [Desktop App] → all checks pass → enables "Start Assessment" button → [candidate can proceed]
12. [Desktop App] → for each failed check: calls Tauri command `save_security_event` with ViolationType and metadata → [SQLite stores event]
13. [Candidate] → clicks "Start Assessment" → [triggers Assessment Execution Flow]

## Error Cases

- **Display check fails (multiple monitors)** — checklist item shows "Disconnect additional displays (N detected)." Button remains disabled until re-run with 1 display.
- **Forbidden process found** — checklist shows the process name(s) detected. Hint: "Close the following applications: [list]."
- **VM detected** — checklist shows "Virtual machine environment detected. This assessment must be taken on physical hardware." Cannot be resolved by candidate; they must contact admin.
- **Rust command panics / crashes** — Tauri command returns an Err; React shows "Security validation failed. Please restart the application." Error is logged to console and local SQLite.
- **sysinfo fails to enumerate processes** — treated as a failed check with reason "Unable to scan processes. Ensure the app has necessary permissions." On macOS this may require granting Full Disk Access or Accessibility permissions.
- **Check takes too long (> 10s timeout)** — Rust layer enforces timeout per check; times out as a failed check with reason "Check timed out."

## Offline Behavior

This flow runs entirely on the local machine using the Rust layer — no network access is required. The validation checks query local OS APIs only. Security event logs for failed checks are written to SQLite synchronously. These events will be synced to the API when connectivity is restored (via the Offline Sync Flow). The "Start Assessment" decision is made locally and does not require API confirmation.

## Related Files

- `apps/desktop/src-tauri/src/security/` — Rust validation logic (display, processes, VM detection)
- `apps/desktop/src-tauri/src/kiosk/` — kiosk fullscreen preparation
- `apps/desktop/src/features/auth/` — PreAssessmentPage component
- `apps/desktop/src-tauri/src/db/` — security event storage
