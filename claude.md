# CLAUDE.md — Secure Software Engineering Assessment Platform

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
│   └── api/              # FastAPI (Python) — backend services
├── packages/
│   ├── shared-types/     # TypeScript types shared across apps
│   ├── ui/               # Shared React component library
│   └── config/           # Shared ESLint, TS, Tailwind configs
├── CLAUDE.md             # This file
├── turbo.json
├── package.json
└── pnpm-workspace.yaml
```

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Desktop App | Tauri 2.0 | Cross-platform secure shell |
| Desktop Frontend | React 18 + TypeScript | Candidate UI inside Tauri |
| Native Security | Rust (Tauri plugins) | OS-level monitoring, kiosk mode |
| Admin Dashboard | Next.js 14 (App Router) | Admin/proctor web portal |
| Backend API | FastAPI (Python 3.12) | Auth, assessments, sync, evaluation |
| Database | Supabase (PostgreSQL) | Cloud DB + Auth + Realtime |
| Local Storage | SQLite + SQLCipher | Encrypted offline persistence |
| Code Execution | Judge0 CE (self-hosted) | Isolated sandbox execution |
| Styling | Tailwind CSS v3 | All frontends |
| Monorepo | Turborepo + pnpm | Workspace orchestration |
| State (Desktop) | Zustand | Client state |
| State (Admin) | TanStack Query v5 | Server state |
| Auth | Supabase Auth | JWT + SSO support |

---

## Key Constraints & Rules

### Security Rules (Never Violate)
- All code execution runs inside Judge0 Docker sandbox — never execute candidate code directly on host
- Local SQLite DB must always use SQLCipher encryption — never plain SQLite in production paths
- All submissions must include integrity checksum + machine fingerprint before sending to API
- Assessment timer state must persist to local DB every 10 seconds
- Focus loss events must be logged — never silently ignored

### Offline-First Rules
- Desktop app must function fully without internet after assessment loads
- Sync queue in SQLite — flush to backend when connection restores
- Never block candidate from writing code due to connectivity state

### Git Rules
- One branch per milestone: `milestone/m{N}-{slug}`
- **Auto-commit after every logical unit of work** — do not batch everything into one commit at the end
- Conventional commits format: `type(scope): description`
- Types: `feat`, `fix`, `chore`, `refactor`, `test`, `docs`, `build`, `ci`
- Scopes: `desktop`, `admin`, `api`, `shared`, `security`, `ide`, `sync`, `eval`, `auth`
- Never mention AI tools, Claude, or AI assistance in commit messages
- Commit messages must describe what changed, not how it was generated

### Auto-Commit Behavior (ALWAYS follow this)
After completing each logical unit (a file, a feature, a config), immediately run:
```bash
git add <relevant files>
git commit -m "type(scope): description"
```
Do NOT wait until the end of the task to commit.
Commit triggers:
- New file created → commit it
- Existing file meaningfully modified → commit it
- Package installed and working → commit lock files
- Bug fixed → commit immediately
- Config changed → commit immediately

Logical unit examples:
- Created CodeEditor.tsx → `git commit -m "feat(ide): add monaco editor component"`
- Added auth router → `git commit -m "feat(api): add candidate login endpoint"`
- Fixed crash in sync → `git commit -m "fix(sync): handle null session on reconnect"`

Never commit:
- Broken code that doesn't compile/run
- Half-finished features (finish the unit first, then commit)
- `.env` files with real secrets

### TODO.md Auto-Update Rule (ALWAYS follow this)
`docs/TODO.md` is the living task tracker. Update it as you work:
- Before starting a task → change `- [ ]` to `- [~]` (in progress)
- After completing a task → change `- [~]` to `- [x]` (done)
- After updating TODO.md → always commit it alongside the related code commit:
  ```bash
  git add docs/TODO.md <other changed files>
  git commit -m "type(scope): description"
  ```
- Keep the Progress Summary section at bottom of TODO.md updated with counts:
  ```
  - Total tasks: N complete / T total
  ```
- Never leave a task marked `[~]` when the work is actually done

### Code Style
- TypeScript strict mode everywhere in TS packages
- Python: `ruff` for linting, `black` for formatting, `mypy` for types
- Rust: `clippy` + `rustfmt`
- No `any` in TypeScript — use proper types or `unknown`
- All API routes must have request/response Pydantic models
- All Tauri commands must have typed Rust structs

---

## Environment Variables

### Desktop App (`apps/desktop/.env`)
```
VITE_API_BASE_URL=
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_JUDGE0_URL=
```

### API (`apps/api/.env`)
```
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
JUDGE0_URL=
JUDGE0_API_KEY=
ENCRYPTION_SECRET=
JWT_SECRET=
```

### Admin Dashboard (`apps/admin/.env.local`)
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_API_BASE_URL=
```

---

## Docs Structure

```
docs/
├── flows/                          # One doc per system flow
│   ├── 01-candidate-auth-flow.md
│   ├── 02-pre-assessment-validation-flow.md
│   ├── 03-assessment-execution-flow.md
│   ├── 04-offline-sync-flow.md
│   ├── 05-code-execution-flow.md
│   ├── 06-submission-integrity-flow.md
│   ├── 07-crash-recovery-flow.md
│   ├── 08-admin-assessment-creation-flow.md
│   ├── 09-live-monitoring-flow.md
│   └── 10-security-violation-flow.md
├── architecture.md                 # Full system architecture
└── TODO.md                         # Living task tracker — always kept up to date
```

**TODO.md is the source of truth for task status.** Update it before and after every task.

---



| Module | App | Key Files |
|---|---|---|
| Candidate Auth | desktop + api | `apps/desktop/src/features/auth/`, `apps/api/routers/auth.py` |
| Pre-Assessment Validation | desktop | `apps/desktop/src-tauri/src/security/` |
| Secure Fullscreen | desktop (Rust) | `apps/desktop/src-tauri/src/kiosk/` |
| Focus Monitoring | desktop (Rust) | `apps/desktop/src-tauri/src/monitor/` |
| Forbidden App Detection | desktop (Rust) | `apps/desktop/src-tauri/src/processes/` |
| IDE / Code Editor | desktop | `apps/desktop/src/features/ide/` |
| Offline Persistence | desktop (Rust) | `apps/desktop/src-tauri/src/db/` |
| Sync Queue | desktop + api | `apps/desktop/src-tauri/src/sync/`, `apps/api/routers/sync.py` |
| Code Execution | api + Judge0 | `apps/api/services/evaluation.py` |
| Admin Dashboard | admin | `apps/admin/app/` |
| Monitoring View | admin | `apps/admin/app/monitor/` |
| Question Management | admin + api | `apps/admin/app/questions/`, `apps/api/routers/questions.py` |

---

## Milestone Overview

| # | Branch | Description |
|---|---|---|
| M1 | `milestone/m1-monorepo-foundation` | Turborepo setup, all app skeletons, shared configs |
| M2 | `milestone/m2-desktop-shell` | Tauri app, React shell, routing, basic UI |
| M3 | `milestone/m3-auth` | Supabase auth, candidate login, admin login, JWT |
| M4 | `milestone/m4-security-layer` | Rust security plugin, fullscreen, display/process detection |
| M5 | `milestone/m5-ide` | Monaco editor, multi-language, test runner UI |
| M6 | `milestone/m6-offline-persistence` | SQLCipher DB, auto-save, crash recovery, sync queue |
| M7 | `milestone/m7-evaluation-engine` | Judge0 integration, test execution, scoring |
| M8 | `milestone/m8-admin-dashboard` | Next.js admin, assessment CRUD, monitoring view |
| M9 | `milestone/m9-submission-integrity` | Checksums, signatures, machine fingerprint, locking |
| M10 | `milestone/m10-mvp-hardening` | E2E tests, error boundaries, production configs |

---

## Local Dev Setup

```bash
# Prerequisites
brew install rust node python@3.12 pnpm
brew install --cask docker          # For Judge0 local
cargo install tauri-cli

# Clone & install
git clone <repo>
cd secureassess
pnpm install

# Run all apps in dev
pnpm dev

# Run specific app
pnpm --filter desktop dev
pnpm --filter admin dev
pnpm --filter api dev

# Tauri dev (desktop with native layer)
pnpm --filter desktop tauri dev
```

---

## Judge0 Local Setup (Dev Only)

```bash
cd infra/judge0
docker-compose up -d
# Runs on http://localhost:2358
```

---

## Database Migrations

```bash
# Supabase migrations (cloud schema)
cd apps/api
supabase migration new <name>
supabase db push

# Local SQLite schema (desktop)
# Managed via Tauri SQLite plugin migrations in:
# apps/desktop/src-tauri/src/db/migrations/
```

---

## Testing Strategy

| Layer | Tool |
|---|---|
| Rust unit tests | `cargo test` |
| React components | Vitest + Testing Library |
| API | Pytest + HTTPX |
| E2E Desktop | Playwright (Tauri WebDriver) |
| Admin E2E | Playwright |

---

## Commit Message Examples

```
feat(auth): add candidate login with supabase jwt
feat(security): implement display count detection on macos
fix(sync): resolve duplicate submission on reconnect
chore(monorepo): configure turborepo pipeline and pnpm workspaces
refactor(db): extract encryption key derivation into separate module
test(eval): add unit tests for judge0 scoring adapter
docs(api): add openapi descriptions to assessment endpoints
build(desktop): configure tauri bundle for macos arm64
```

---

## Critical Paths (Do Not Break)

1. `Candidate writes code → auto-save to SQLite → sync to API` must never lose data
2. `Assessment timer` must survive app crash and restore on relaunch
3. `Submission` must be idempotent — duplicate sync attempts must not create duplicate records
4. `Security violations` must be logged locally even when offline
5. `Code execution` must never touch host filesystem outside sandbox