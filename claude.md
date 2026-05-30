# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Identity

**Name:** SecureAssess
**Type:** Secure desktop-based coding assessment platform
**Monorepo:** Turborepo
**Primary Dev Machine:** macOS M1

---

## Monorepo Structure

```
secureassess/
├── apps/
│   ├── desktop/          # Tauri 2 app (Rust + React/TS) — candidate-facing
│   ├── admin/            # Next.js 14 — admin/proctor web dashboard
│   └── api/              # FastAPI (Python 3.12) — backend services
├── packages/
│   ├── shared-types/     # TypeScript types shared across apps
│   ├── ui/               # Shared React component library
│   └── config/           # Shared ESLint, TS, Tailwind configs
├── turbo.json
└── pnpm-workspace.yaml
```

---

## Development Commands

### Monorepo (root)
```bash
pnpm dev            # run all apps concurrently
pnpm build          # build all packages/apps
pnpm lint           # lint all
pnpm test           # test all
```

### Desktop app
```bash
pnpm --filter desktop dev              # Vite dev server only (no Tauri)
pnpm --filter desktop tauri dev        # full Tauri dev (Rust + React)
cd apps/desktop/src-tauri && cargo test  # Rust unit tests
cd apps/desktop/src-tauri && cargo clippy -- -D warnings
cd apps/desktop/src-tauri && cargo fmt --check
```

### API
```bash
pnpm --filter api dev                  # starts uvicorn via turbo
# or directly:
cd apps/api && uvicorn main:app --reload --port 8000
cd apps/api && ruff check .
cd apps/api && black --check .
cd apps/api && mypy .
cd apps/api && pytest
```

### Admin
```bash
pnpm --filter admin dev
pnpm --filter admin build
```

### Judge0 (required for M7 evaluation)
```bash
cd infra/judge0 && docker-compose up -d
# Runs on http://localhost:2358
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Desktop App | Tauri 2.0 (Rust + React 18 + TypeScript) |
| Native Security | Rust modules: `security/`, `db/`, `sync/` |
| Admin Dashboard | Next.js 14 App Router |
| Backend API | FastAPI + Pydantic v2 |
| Database | Supabase (PostgreSQL) + local SQLite |
| Code Execution | Judge0 CE (self-hosted Docker) |
| Styling | Tailwind CSS v3 |
| State (Desktop) | Zustand (`assessmentStore.ts`) |
| State (Admin) | TanStack Query v5 |
| Auth | Supabase Auth (JWT) |
| Monorepo | Turborepo + pnpm 9 |

---

## Architecture: Key Data Flows

### Desktop Rust modules (`apps/desktop/src-tauri/src/`)
- **`db/`** — SQLite via `sqlx`. Four tables: `assessment_sessions`, `code_snapshots`, `security_events`, `sync_queue`. Encryption key is SHA-256 derived from machine fingerprint (hostname + MAC + CPU) — the `tauri-plugin-sql` crate does **not** expose a SQLCipher cipher feature, so encryption is app-level key derivation only, not at-rest file encryption.
- **`security/`** — `display.rs` (multi-monitor check), `processes.rs` (sysinfo-based forbidden app scan), `focus.rs` (focus loss events), `kiosk.rs` (fullscreen enforcement). All exposed as Tauri commands registered in `lib.rs`.
- **`sync/`** — `queue.rs` (enqueue/dequeue with hash-based deduplication, max 5 retries) + `worker.rs` (30-second poll loop, emits `sync:status` Tauri event, POSTs to `/sync/ingest`).

### React features (`apps/desktop/src/features/`)
- **`auth/`** — `authService.ts` calls FastAPI `/auth/*`; `useAuth.ts` hooks into Zustand.
- **`persistence/`** — `useAutoSave` (3 s debounce + 30 s periodic), `useTimerPersistence` (10 s), `useCrashRecovery` (checks `get_active_session` on mount).
- **`security/`** — `useSecurityMonitor` polls Tauri commands; `ViolationBanner` renders violations.
- **`sync/`** — `useSyncStatus` listens to `sync:status` Tauri event; `SyncIndicator` in `TopBar`.
- **`ide/`** — Monaco editor, 6 languages (Python/JS/TS/Java/C++/Go), `TestRunner.tsx` currently stubbed (wired to real API in M7).

### Route flow
`/login` → `/pre-assessment` (security checklist) → `/assessment` (inside `SecureLayout`) → `/completion`

All routes except `/login` are wrapped in `ProtectedRoute` (checks Zustand `authToken`).

### FastAPI (`apps/api/`)
- `main.py` bootstraps the app and includes routers.
- `routers/auth.py` — `/auth/candidate/login`, `/auth/candidate/verify-invite`, `/auth/refresh`, `/auth/me`.
- `core/dependencies.py` — `get_current_candidate` Bearer-token Supabase JWT dependency.
- M7 will add `services/judge0.py`, `routers/evaluation.py`, and `routers/sync.py`.

---

## Module → Key Files

| Module | App | Key Files |
|---|---|---|
| Candidate Auth | desktop + api | `apps/desktop/src/features/auth/`, `apps/api/routers/auth.py` |
| Pre-Assessment Validation | desktop | `apps/desktop/src-tauri/src/security/` |
| Secure Fullscreen | desktop (Rust) | `apps/desktop/src-tauri/src/security/kiosk.rs` |
| Focus Monitoring | desktop (Rust) | `apps/desktop/src-tauri/src/security/focus.rs` |
| Forbidden App Detection | desktop (Rust) | `apps/desktop/src-tauri/src/security/processes.rs` |
| IDE / Code Editor | desktop | `apps/desktop/src/features/ide/` |
| Offline Persistence | desktop (Rust) | `apps/desktop/src-tauri/src/db/` |
| Sync Queue | desktop | `apps/desktop/src-tauri/src/sync/`, Tauri event: `sync:status` |
| Code Execution | api + Judge0 | `apps/api/services/evaluation.py` (M7) |
| Admin Dashboard | admin | `apps/admin/app/` |

---

## Key Constraints

### Security Rules (Never Violate)
- All code execution runs inside Judge0 Docker sandbox — never execute candidate code directly on host
- All submissions must include integrity checksum + machine fingerprint before sending to API
- Assessment timer state must persist to local DB every 10 seconds
- Focus loss events must be logged — never silently ignored

### Offline-First Rules
- Desktop app must function fully without internet after assessment loads
- Sync queue in SQLite — flush to backend when connection restores
- Never block candidate from writing code due to connectivity state

### Code Style
- TypeScript strict mode, no `any` — use proper types or `unknown`
- All API routes must have request/response Pydantic models
- All Tauri commands must have typed Rust structs
- Python: `ruff` + `black` + `mypy`; Rust: `clippy` + `rustfmt`

---

## Environment Variables

### Desktop (`apps/desktop/.env`)
```
VITE_API_BASE_URL=
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_JUDGE0_URL=
```
Note: the sync worker reads `VITE_API_BASE_URL` directly from the process environment at runtime.

### API (`apps/api/.env`)
```
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
JUDGE0_URL=
JUDGE0_API_KEY=
ENCRYPTION_SECRET=
JWT_SECRET=
```

### Admin (`apps/admin/.env.local`)
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_API_BASE_URL=
```

---

## Git Rules

- One branch per milestone: `milestone/m{N}-{slug}` (currently on `milestone/m7-evaluation-engine`)
- **Auto-commit after every logical unit of work** — do not batch into one end-of-task commit
- Conventional commits: `type(scope): description`
- Types: `feat`, `fix`, `chore`, `refactor`, `test`, `docs`, `build`, `ci`
- Scopes: `desktop`, `admin`, `api`, `shared`, `security`, `ide`, `sync`, `eval`, `auth`
- Never mention AI tools or AI assistance in commit messages

### Commit triggers
New file created → commit it. Existing file meaningfully modified → commit it. Bug fixed → commit immediately. Config changed → commit immediately. Never commit broken code or half-finished features.

---

## TODO.md Rules

`docs/TODO.md` is the living task tracker. Keep it updated:
- Before starting → `- [ ]` → `- [~]`
- After finishing → `- [~]` → `- [x]`
- Commit `docs/TODO.md` alongside the related code change
- Keep the Progress Summary count accurate at the bottom

---

## Critical Paths (Do Not Break)

1. `Candidate writes code → auto-save to SQLite → sync to API` must never lose data
2. `Assessment timer` must survive app crash and restore on relaunch
3. `Submission` must be idempotent — duplicate sync attempts must not create duplicate records (`submission_hash` dedup in `sync_queue`)
4. `Security violations` must be logged locally even when offline
5. `Code execution` must never touch host filesystem outside sandbox

---

## Testing

| Layer | Command |
|---|---|
| Rust | `cd apps/desktop/src-tauri && cargo test` |
| React | `pnpm --filter desktop test` (Vitest) |
| API | `cd apps/api && pytest` |
| E2E Desktop | Playwright + Tauri WebDriver (M10) |
| Admin E2E | Playwright (M10) |

---

## Milestone Overview

| # | Branch | Status |
|---|---|---|
| M1–M6 | done | Monorepo, desktop shell, auth, security, IDE, offline persistence |
| M7 | `milestone/m7-evaluation-engine` | **Current** — Judge0 integration, test execution, scoring |
| M8 | `milestone/m8-admin-dashboard` | Next.js admin CRUD + live monitor |
| M9 | `milestone/m9-submission-integrity` | Checksums, HMAC, assessment locking |
| M10 | `milestone/m10-mvp-hardening` | E2E tests, error boundaries, production bundle |
