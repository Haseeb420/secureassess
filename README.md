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

# 3. Set up Python virtual environment and install API dependencies
cd apps/api && python3.12 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt && cd ../..

# 4. Copy environment files — defaults work out of the box, no editing required
cp apps/desktop/.env.example    apps/desktop/.env
cp apps/api/.env.example        apps/api/.env
cp apps/admin/.env.local.example apps/admin/.env.local

# 5. Start local Supabase (auth + PostgreSQL — requires Docker)
make supabase-start
make supabase-migrate        # apply schema
# make supabase-seed         # optional: load sample data

# 6. Code execution uses LocalExecutor in dev — no Judge0 needed
#    Judge0 runs on a remote machine via ngrok — see docs/LOCAL_SETUP.md#judge0
```

> For production environment templates see each app's `.env.production.example` /
> `.env.production.local.example`. Production secrets live in Fly.io and Vercel — never in files.

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

See each app's `.env.example` for local dev defaults (pre-filled, no editing needed).
For production templates see `.env.production.example` / `.env.production.local.example`.

### `apps/desktop/.env`

| Variable | Local dev value | Description |
|---|---|---|
| `VITE_API_BASE_URL` | `http://localhost:8000` | FastAPI base URL |
| `VITE_ADMIN_URL` | `http://localhost:3000` | Admin dashboard URL |
| `VITE_BETTER_AUTH_URL` | `http://localhost:3000` | Better Auth base URL |
| `VITE_SUPABASE_URL` | `http://localhost:54321` | Local Supabase auth API |
| `VITE_SUPABASE_ANON_KEY` | local default key | Well-known dev key — not a real secret |
| `VITE_JUDGE0_URL` | _(empty)_ | ngrok URL for Judge0 (prod only) |
| `VITE_EXECUTION_BACKEND` | `local` | `local` for dev, `judge0` for prod |

### `apps/api/.env`

| Variable | Local dev value | Description |
|---|---|---|
| `SUPABASE_URL` | `http://localhost:54321` | Local Supabase auth API |
| `SUPABASE_ANON_KEY` | local default key | Well-known dev key — not a real secret |
| `SUPABASE_SERVICE_KEY` | local default key | Well-known dev key — not a real secret |
| `SUPABASE_JWT_SECRET` | local default secret | Real secret required in prod |
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:54322/postgres` | Supabase bundled PostgreSQL |
| `BETTER_AUTH_URL` | `http://localhost:3000` | Admin dashboard URL |
| `BETTER_AUTH_SECRET` | local default | Must match admin `.env.local` |
| `ADMIN_URL` | `http://localhost:3000` | CORS trusted origin |
| `ENCRYPTION_SECRET` | `000...000` | Real 64-char hex string in prod |
| `JWT_SECRET` | same as `SUPABASE_JWT_SECRET` | JWT verification |
| `GMAIL_ADDRESS` | _(empty)_ | Set in Fly.io secrets for prod |
| `GMAIL_APP_PASSWORD` | _(empty)_ | Set in Fly.io secrets for prod |

### `apps/admin/.env.local`

| Variable | Local dev value | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `http://localhost:54321` | Local Supabase auth API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | local default key | Well-known dev key — not a real secret |
| `API_BASE_URL` | `http://localhost:8000` | FastAPI base URL (server-side only) |
| `BETTER_AUTH_URL` | `http://localhost:3000` | Better Auth base URL |
| `NEXT_PUBLIC_BETTER_AUTH_URL` | `http://localhost:3000` | Better Auth URL (client-side) |
| `BETTER_AUTH_SECRET` | local default | Must match API `.env` |
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:54322/postgres` | Supabase bundled PostgreSQL |

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
