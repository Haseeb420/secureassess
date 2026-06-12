# Local Setup — SecureAssess

---

## Prerequisites

| Tool | Version | Install |
|---|---|---|
| Docker Desktop | latest | https://docs.docker.com/desktop/install/mac-install/ |
| Node.js | 20+ | `brew install node` |
| pnpm | 9.x | `npm i -g pnpm@9.15.0` |
| Python | 3.12 | `brew install python@3.12` |
| Rust | 1.77+ | `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \| sh` |
| Tauri CLI | 2.x | `cargo install tauri-cli --version "^2.0"` |

> Docker is required for local Supabase (auth + database). Start Docker Desktop before running `make supabase-start`.

---

## First-Time Setup

Run these commands once after cloning:

```bash
# 1. Install dependencies
pnpm install
cd apps/api && python3.12 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt && cd ../..

# 2. Copy env files (defaults work out of the box — no editing needed)
cp apps/api/.env.example        apps/api/.env
cp apps/admin/.env.local.example apps/admin/.env.local
cp apps/desktop/.env.example    apps/desktop/.env

# 3. Start local Supabase (auth + PostgreSQL)
make supabase-start

# 4. Apply schema migrations
make supabase-migrate

# 5. Create the admin dashboard user
python scripts/seed_better_auth_admin.py --email admin@example.com --password YourPassword123!
```

Done. Move on to Running the Apps.

---

## Running the Apps

Open **three terminals**:

```bash
# Terminal 1 — API
make dev-api

# Terminal 2 — Admin dashboard
make dev-admin

# Terminal 3 — Desktop (Vite dev server only)
make dev-desktop-vite
```

To open the full native Tauri window instead of the browser:

```bash
# Terminal 3A — Vite server (wait for "ready in Xms")
pnpm --filter desktop dev

# Terminal 3B — Tauri window
pnpm --filter desktop tauri dev
```

---

## Auth — Two Separate Systems

This project has two independent auth systems. Do not confuse them.

| System | Used by | Seed script |
|---|---|---|
| **Better Auth** | Admin dashboard (`localhost:3000`) | `scripts/seed_better_auth_admin.py` |
| **Supabase Auth** | Desktop app (candidate login) | `scripts/seed_admin.py` |

**Create an admin dashboard user:**
```bash
python scripts/seed_better_auth_admin.py --email admin@example.com --password YourPassword123!
```

**Create a candidate user (for desktop app testing):**
```bash
python scripts/seed_admin.py --email candidate@example.com --password YourPassword123!
```

---

## Full End-to-End Test Flow

1. Log in to admin dashboard at `http://localhost:3000` with your Better Auth user
2. Create a question → Assessments → New Assessment
3. Open the assessment → Invites tab → Invite Candidate → copy the token
4. Log in to the desktop app with the candidate credentials + token
5. Complete the assessment and submit
6. View results in Dashboard → Reports

---

## Ports

| Service | URL |
|---|---|
| Admin dashboard | http://localhost:3000 |
| FastAPI + docs | http://localhost:8000 / http://localhost:8000/docs |
| Desktop Vite | http://localhost:5173 |
| Supabase Auth | http://localhost:54321 |
| Supabase PostgreSQL | postgresql://postgres:postgres@localhost:54322/postgres |
| Supabase Studio | http://localhost:54323 |
| Supabase Inbucket (email) | http://localhost:54324 |
| Judge0 (remote, ngrok) | https://unkind-freeware-unmoved.ngrok-free.dev |

---

## Supabase Commands

```bash
make supabase-start    # start local stack (requires Docker)
make supabase-stop     # stop (data preserved)
make supabase-status   # show URLs and keys
make supabase-migrate  # apply all SQL migrations
make supabase-seed     # load sample questions and assessments
make supabase-studio   # open database UI in browser
make supabase-reset    # wipe and re-migrate (destructive)
```

---

## Code Execution

In local dev, `VITE_EXECUTION_BACKEND=local` — code runs on your machine via `LocalExecutor`. No Judge0 setup needed.

For `LocalExecutor` to work, install the language runtimes:
```bash
brew install openjdk go   # Java, Go (C++ comes with Xcode CLT)
```

Judge0 runs on a remote machine and is only used in production builds.

---

## Common Errors

**Port already in use (e.g. 8000)**
```bash
kill $(lsof -ti :8000)
```

**Better Auth "User not found" on login**
— The user doesn't exist in Better Auth's database. Run:
```bash
python scripts/seed_better_auth_admin.py --email your@email.com --password YourPassword123!
```

**Better Auth "Invalid password hash"**
— User was inserted with the wrong hash format. Re-run the seed script to overwrite it (the script detects existing users and updates them).

**`ValueError: Missing required environment variables`**
— Check `apps/api/.env` has `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, and `SUPABASE_JWT_SECRET` set.

**`cargo tauri: command not found`**
```bash
cargo install tauri-cli --version "^2.0"
```

**Desktop app shows blank screen**
— Vite server must be running before Tauri. Wait for "ready in Xms" in terminal 3A before running 3B.

**`pnpm install` lockfile errors**
```bash
npm install -g pnpm@9.15.0 && pnpm install
```

---

## Production URLs (reference only)

| Service | URL |
|---|---|
| API | https://secureassess-api.fly.dev |
| Admin dashboard | https://admin-delta-ecru.vercel.app |
| Judge0 | https://unkind-freeware-unmoved.ngrok-free.dev |

Production secrets live in Fly.io and Vercel — never in files. See `.env.production.example` in each app for the full variable list.
