# SecureAssess

A secure, desktop-first coding assessment platform that prevents cheating during remote engineering interviews. Candidates work inside a locked-down Tauri desktop application that enforces fullscreen mode, detects forbidden apps, and monitors focus loss — while remaining fully functional offline. All code runs inside isolated Docker containers via Judge0, never on the host machine.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CANDIDATE MACHINE                            │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                    Tauri Desktop App                          │  │
│  │                                                               │  │
│  │  ┌─────────────────────────────────────────────────────────┐  │  │
│  │  │              React Frontend (Vite + TS)                 │  │  │
│  │  │                                                         │  │  │
│  │  │  ┌──────────┐  ┌──────────────┐  ┌───────────────────┐  │  │  │
│  │  │  │ LoginPage│  │PreAssessment │  │  AssessmentPage   │  │  │  │
│  │  │  │          │  │    Page      │  │  ┌─────────────┐  │  │  │  │
│  │  │  └──────────┘  └──────────────┘  │  │MonacoEditor │  │  │  │  │
│  │  │                                  │  ├─────────────┤  │  │  │  │
│  │  │  ┌───────────────────────────┐   │  │QuestionPanel│  │  │  │  │
│  │  │  │     Zustand Store         │   │  ├─────────────┤  │  │  │  │
│  │  │  │ auth | session | editor   │   │  │ TestRunner  │  │  │  │  │
│  │  │  │ violations | syncStatus  │   │  ├─────────────┤  │  │  │  │
│  │  │  └───────────────────────────┘   │  │ConsoleOutput│  │  │  │  │
│  │  │                                  └───────────────────┘  │  │  │
│  │  └─────────────────────────────────────────────────────────┘  │  │
│  │                          │ Tauri IPC                          │  │
│  │  ┌─────────────────────────────────────────────────────────┐  │  │
│  │  │                   Rust Backend Layer                    │  │  │
│  │  │                                                         │  │  │
│  │  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐  │  │  │
│  │  │  │ security/│ │ kiosk/   │ │ monitor/ │ │processes/ │  │  │  │
│  │  │  │ integrity│ │ fullscr. │ │ focus    │ │ forbidden │  │  │  │
│  │  │  └──────────┘ └──────────┘ └──────────┘ └───────────┘  │  │  │
│  │  │                                                         │  │  │
│  │  │  ┌──────────────────────────┐  ┌─────────────────────┐  │  │  │
│  │  │  │       db/ (SQLite)       │  │  sync/              │  │  │  │
│  │  │  │ sessions | snapshots     │  │  queue.rs worker.rs  │  │  │  │
│  │  │  │ events   | sync_queue    │  │                     │  │  │  │
│  │  │  └──────────────────────────┘  └─────────────────────┘  │  │  │
│  │  └─────────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────────┘  │
└──────────────────────────┬──────────────────────────────────────────┘
                           │ HTTPS (async, offline-tolerant)
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         BACKEND SERVICES                            │
│                                                                     │
│  ┌───────────────────────────────────┐  ┌─────────────────────────┐ │
│  │       FastAPI (Python 3.12)       │  │   Judge0 CE (Docker)    │ │
│  │                                   │  │                         │ │
│  │  /auth        /evaluation         │  │  Isolated sandbox per   │ │
│  │  /sync/ingest /sessions           │  │  submission: compile +  │ │
│  │  /assessments /questions          │  │  execute, CPU/mem caps  │ │
│  │  /reports     /monitor            │  │                         │ │
│  └────────────────┬──────────────────┘  └─────────────────────────┘ │
│                   │ Supabase client SDK                             │
│  ┌────────────────▼──────────────────────────────────────────────┐  │
│  │                     Supabase (PostgreSQL)                     │  │
│  │                                                               │  │
│  │  Auth  │  assessments  │  questions  │  sessions              │  │
│  │  snapshots  │  security_events  │  submissions  │  tokens     │  │
│  │                                                               │  │
│  │  ┌─────────────────────────────────────────────────────────┐  │  │
│  │  │              Supabase Realtime                          │  │  │
│  │  │  Broadcasts: security_events INSERT, sessions UPDATE    │  │  │
│  │  └─────────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────────┘  │
└──────────────────────────┬──────────────────────────────────────────┘
                           │ Realtime subscription
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     ADMIN MACHINE (Browser)                         │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                 Next.js 14 Admin Dashboard                    │  │
│  │                                                               │  │
│  │  /dashboard/assessments  → CRUD + publish + invites          │  │
│  │  /dashboard/questions    → question bank management          │  │
│  │  /dashboard/monitor      → live candidate cards (Realtime)   │  │
│  │  /dashboard/reports      → per-candidate score reports       │  │
│  │                                                               │  │
│  │  TanStack Query (server state)  │  TanStack Table (lists)    │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Prerequisites

| Tool | Version |
|---|---|
| macOS | M1 recommended (Tauri native APIs) |
| Rust | 1.77+ (`rustup install stable`) |
| Node.js | 18+ |
| pnpm | 9+ (`npm i -g pnpm`) |
| Python | 3.12 |
| Docker | Required for Judge0 |

---

## Local Setup

```bash
# 1. Clone the repo
git clone https://github.com/your-org/secureassess.git
cd secureassess

# 2. Install JS dependencies
pnpm install

# 3. Install Python dependencies
cd apps/api && pip install -r requirements.txt && cd ../..

# 4. Copy environment files and fill in values (see Environment Variables below)
cp apps/desktop/.env.example apps/desktop/.env
cp apps/api/.env.example apps/api/.env
cp apps/admin/.env.local.example apps/admin/.env.local

# 5. Start Judge0 (required for code execution)
cd infra/judge0 && docker-compose up -d && cd ../..
```

---

## Running the Apps

```bash
# All apps concurrently (Vite dev server only, no Tauri window)
pnpm dev

# Desktop app with native Tauri window (Rust + React)
pnpm --filter desktop tauri dev

# API only
cd apps/api && uvicorn main:app --reload --port 8000

# Admin dashboard only
pnpm --filter admin dev
```

---

## Testing

```bash
# All tests
pnpm test

# Rust unit tests
cd apps/desktop/src-tauri && cargo test

# Python tests
cd apps/api && pytest tests/ -v

# React tests (Vitest)
pnpm --filter desktop test
```

---

## Environment Variables

### `apps/desktop/.env`

| Variable | Description |
|---|---|
| `VITE_API_BASE_URL` | FastAPI base URL (e.g. `http://localhost:8000`) |
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `VITE_JUDGE0_URL` | Judge0 base URL (e.g. `http://localhost:2358`) |

### `apps/api/.env`

| Variable | Description |
|---|---|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Supabase service role key (never expose to frontend) |
| `SUPABASE_JWT_SECRET` | JWT secret from Supabase project settings |
| `JUDGE0_URL` | Judge0 base URL |
| `JUDGE0_API_KEY` | Judge0 API key (leave empty for local) |
| `ENCRYPTION_SECRET` | Secret for submission HMAC signing |
| `LOG_LEVEL` | Log level: `DEBUG`, `INFO`, `WARNING`, `ERROR` (default: `INFO`) |

### `apps/admin/.env.local`

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `NEXT_PUBLIC_API_BASE_URL` | FastAPI base URL |

---

## Milestone Status

| Milestone | Description | Status |
|---|---|---|
| M0 | Docs & TODO Setup | Complete |
| M1 | Monorepo Foundation (Turborepo + pnpm) | Complete |
| M2 | Desktop App Shell (Tauri + React routes) | Complete |
| M3 | Authentication (Supabase Auth, invite flow) | Complete |
| M4 | Native Security Layer (process scan, kiosk, focus) | Complete |
| M5 | IDE & Code Editor (Monaco, 6 languages, timer) | Complete |
| M6 | Offline Persistence & Sync (SQLite + sync queue) | Complete |
| M7 | Evaluation Engine (Judge0, test runner, scoring) | Complete |
| M8 | Admin Dashboard (CRUD, live monitor, reports) | Complete |
| M9 | Submission Integrity (HMAC, fingerprint, locking) | Complete |
| M10 | MVP Hardening (tests, CI, logging, production config) | Complete |

---

## Contributing

**Branch naming:** `milestone/m{N}-{slug}` or `fix/{slug}` for bug fixes.

**Commit format:** [Conventional Commits](https://www.conventionalcommits.org/)

```
type(scope): short description

Types:  feat | fix | chore | refactor | test | docs | build | ci
Scopes: desktop | admin | api | shared | security | ide | sync | eval | auth
```

**PR process:**
1. Branch from `main`
2. Ensure `pnpm lint`, `pnpm type-check`, and `pnpm test` all pass locally
3. Open a PR targeting `main` — CI must be green before merge
