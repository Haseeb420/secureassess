# Local Development Setup — SecureAssess

For developers setting up the monorepo for the first time.

---

## Production URLs (for reference)

| Service | URL | Host |
|---|---|---|
| API | https://secureassess-api.fly.dev | Fly.io |
| Admin dashboard | https://admin-delta-ecru.vercel.app | Vercel |
| Judge0 | https://unkind-freeware-unmoved.ngrok-free.dev | ASUS TUF F17 (Linux Mint) via ngrok |

Local dev uses `http://localhost:8000` for the API and `http://localhost:3000` for the admin dashboard. Judge0 always uses the ngrok URL — it runs on the ASUS machine, not locally.

---

## 1. Prerequisites

Install everything below before cloning the repo.

### Homebrew (macOS)
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
brew --version   # Homebrew 4.x or later
```

### Xcode Command Line Tools (macOS)
```bash
xcode-select --install
xcode-select -p   # should print /Library/Developer/CommandLineTools
```

### Git
```bash
brew install git     # macOS
sudo apt install git # Linux
git --version        # 2.x or later
```

### Node.js 20+
```bash
brew install node     # macOS
node --version        # v20.x or later
```

### pnpm 9
```bash
npm install -g pnpm@9.15.0
pnpm --version   # 9.15.0
```

### Python 3.11+
```bash
brew install python@3.12   # macOS
sudo apt install python3.12 python3.12-venv   # Linux
python3.12 --version
```

> If you use pyenv: `pyenv install 3.12 && cd apps/api && pyenv local 3.12`

### Rust (stable, 1.77+)
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env
rustc --version   # 1.77.x or later
```

### Tauri CLI v2
```bash
cargo install tauri-cli --version "^2.0"
cargo tauri --version   # tauri-cli 2.x
```

### fly CLI (for Fly.io deploys)
```bash
make fly-install
# then add to ~/.bashrc or ~/.zshrc:
export FLYCTL_INSTALL="$HOME/.fly"
export PATH="$FLYCTL_INSTALL/bin:$PATH"
```

### Language runtimes (for LocalExecutor in dev)

Only needed when running `EXECUTION_BACKEND=local` on your dev machine. In production, Judge0 handles all execution.

```bash
brew install openjdk go   # macOS — Java, Go
# C++ comes with Xcode Command Line Tools
java --version && go version && g++ --version && python3 --version && node --version
```

---

## 2. Environment Variables

Each app reads from its own `.env` file. The values below reflect the production setup. For local dev, swap the URLs as noted.

### Supabase credentials

All three apps share the same Supabase project. Find values at:
**Supabase dashboard → your project → Project Settings → API**

- **Project URL** → `SUPABASE_URL` / `VITE_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_URL`
- **anon / public key** → `VITE_SUPABASE_ANON_KEY` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **service_role key** → `SUPABASE_SERVICE_KEY` (never expose in frontend)
- **JWT secret** → **Project Settings → API → JWT Settings** → `SUPABASE_JWT_SECRET`

---

### `apps/api/.env`

| Variable | Local dev value | Notes |
|---|---|---|
| `ENVIRONMENT` | `development` | `production` on Fly.io (set by fly.toml) |
| `SUPABASE_URL` | Supabase project URL | Required |
| `SUPABASE_ANON_KEY` | Supabase anon key | Required |
| `SUPABASE_SERVICE_KEY` | service_role JWT | Required — never expose in frontend |
| `SUPABASE_JWT_SECRET` | JWT secret | Required |
| `DATABASE_URL` | `postgresql://secureassess:secureassess@localhost:5432/secureassess` | Local postgres; Supabase pooler URL in prod |
| `BETTER_AUTH_URL` | `http://localhost:3000` | `https://admin-delta-ecru.vercel.app` in prod |
| `BETTER_AUTH_SECRET` | random string ≥32 chars | Must match `apps/admin/.env.local` |
| `ADMIN_URL` | `http://localhost:3000` | CORS trusted origin |
| `ENCRYPTION_SECRET` | 64-char hex string | Submission HMAC signing |
| `JWT_SECRET` | Same as `SUPABASE_JWT_SECRET` | JWT verification |
| `GMAIL_ADDRESS` | _(empty for local)_ | Gmail address; set in Fly.io secrets for prod |
| `GMAIL_APP_PASSWORD` | _(empty for local)_ | Gmail App Password; set in Fly.io secrets for prod |
| `LOG_LEVEL` | `INFO` | `DEBUG` useful during development |
| `NGROK_STATIC_DOMAIN` | `unkind-freeware-unmoved.ngrok-free.dev` | Only needed if you operate the Judge0 machine |
| `EXECUTION_BACKEND` | `local` | Reserved for future API-level execution routing; unused by API today |
| `JUDGE0_URL` | `http://localhost:2358` | Reserved for future API-level execution routing; unused by API today |

---

### `apps/desktop/.env`

| Variable | Local dev value | Notes |
|---|---|---|
| `VITE_API_BASE_URL` | `http://localhost:8000` | `https://secureassess-api.fly.dev` in prod |
| `VITE_ADMIN_URL` | `http://localhost:3000` | `https://admin-delta-ecru.vercel.app` in prod |
| `VITE_BETTER_AUTH_URL` | `http://localhost:3000` | `https://admin-delta-ecru.vercel.app` in prod |
| `VITE_SUPABASE_URL` | Supabase project URL | Same for dev and prod |
| `VITE_SUPABASE_ANON_KEY` | anon/public key | Same for dev and prod; public, safe to embed |
| `VITE_JUDGE0_URL` | _(empty)_ | `https://unkind-freeware-unmoved.ngrok-free.dev` in prod |
| `VITE_EXECUTION_BACKEND` | `local` | `judge0` in prod builds (injected by GitHub Actions) |

---

### `apps/admin/.env.local`

| Variable | Local dev value | Notes |
|---|---|---|
| `ENVIRONMENT` | `development` | |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Same for dev and prod |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon/public key | Same for dev and prod |
| `API_BASE_URL` | `http://localhost:8000` | `https://secureassess-api.fly.dev` in prod; server-side only |
| `BETTER_AUTH_URL` | `http://localhost:3000` | `https://admin-delta-ecru.vercel.app` in prod |
| `NEXT_PUBLIC_BETTER_AUTH_URL` | `http://localhost:3000` | `https://admin-delta-ecru.vercel.app` in prod |
| `BETTER_AUTH_SECRET` | random string ≥32 chars | Must match `apps/api/.env` |
| `DATABASE_URL` | `postgresql://secureassess:secureassess@localhost:5432/secureassess` | Supabase pooler URL in prod |

---

## 3. First Time Setup

```bash
# Clone
git clone https://github.com/Haseeb420/secureassess.git
cd secureassess

# Install all JS dependencies
pnpm install

# Install Python dependencies
cd apps/api
python3.12 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cd ../..

# Copy and fill in env files
cp apps/desktop/.env.example apps/desktop/.env
cp apps/api/.env.example apps/api/.env
cp apps/admin/.env.local.example apps/admin/.env.local
# Edit each file and fill in the Supabase values

# Set up the local PostgreSQL database (choose one path):
make db-setup          # native psql — requires: brew install postgresql@16
# make db-setup-docker # Docker alternative — requires Docker Desktop

# Verify everything builds
pnpm build --filter=!@secureassess/desktop
```

---

## 4. Running the Applications

### All JS apps at once

```bash
pnpm dev
# or: make dev
```

Starts desktop Vite server (`:5173`) and admin Next.js server (`:3000`) concurrently.

### Individual apps

```bash
make dev-admin          # Admin: http://localhost:3000
make dev-desktop-vite   # Desktop Vite only: http://localhost:5173
make dev-api            # FastAPI: http://localhost:8000
```

### Desktop app with native Tauri window

```bash
# Terminal 1
pnpm --filter desktop dev   # wait for "ready in Xms"

# Terminal 2
pnpm --filter desktop tauri dev
```

First compile takes 3–5 minutes. Subsequent runs are fast.

### API with hot reload

```bash
cd apps/api
source .venv/bin/activate
uvicorn main:app --reload --port 8000
# or: make dev-api
```

Interactive docs at `http://localhost:8000/docs`.

---

## 5. Code Execution (Judge0)

Judge0 runs permanently on the **ASUS TUF F17 (Linux Mint)** machine and is exposed via the ngrok static domain. You do not need to run Judge0 locally.

```
https://unkind-freeware-unmoved.ngrok-free.dev → Judge0 :2358 on ASUS
```

To check if Judge0 is online:
```bash
curl https://unkind-freeware-unmoved.ngrok-free.dev/about
# or: make production-health
```

If you need to start the ngrok tunnel on the ASUS machine:
```bash
# On ASUS machine:
ngrok start --config ngrok.yml judge0
# or: make judge0-tunnel
```

To run with `LocalExecutor` instead (candidate's own machine executes code, no Judge0 needed):
```bash
# In apps/api/.env:
EXECUTION_BACKEND=local

# In apps/desktop/.env:
VITE_EXECUTION_BACKEND=local
```

> Note: `LocalExecutor` requires Python, Node, Java, Go, and g++ installed locally.

---

## 6. Running Tests

```bash
# Rust unit tests
cd apps/desktop/src-tauri && cargo test

# React tests (Vitest)
pnpm --filter desktop test

# Python tests (pytest)
cd apps/api && source .venv/bin/activate && pytest tests/ -v

# All at once
make test
```

---

## 7. Port Reference

| Service | Port | URL |
|---|---|---|
| Desktop Vite dev server | 5173 | http://localhost:5173 |
| Admin dashboard (Next.js) | 3000 | http://localhost:3000 |
| FastAPI backend | 8000 | http://localhost:8000 |
| FastAPI interactive docs | 8000 | http://localhost:8000/docs |
| Judge0 CE API (ASUS via ngrok) | 443 | https://unkind-freeware-unmoved.ngrok-free.dev |

---

## 8. Creating Test Data

**1. Create an admin user.**

```bash
python scripts/seed_admin.py --email admin@example.com --password YourPassword123!
```

Or: Supabase dashboard → Authentication → Users → Invite user → set `{ "role": "admin" }` in user metadata.

**2. Log in to the admin dashboard** at `http://localhost:3000`.

**3. Create a question.** Dashboard → Questions → New Question. Add title, prompt, sample test cases, and hidden test cases.

**4. Create an assessment.** Dashboard → Assessments → New Assessment. Set title, duration, languages, and select the question.

**5. Generate an invite.** Open assessment → Invites tab → Invite Candidate. Copy the token.

**6. Log in to the desktop app** with the token. Complete the security checklist, write code, and submit.

**7. View results** in Dashboard → Reports.

---

## 9. Common Errors

**`cargo tauri: command not found`**
```bash
cargo install tauri-cli --version "^2.0"
```

**`pnpm install` fails with lockfile errors**
```bash
pnpm --version   # must be 9.x
npm install -g pnpm@9.15.0 && pnpm install
```

**Rust compilation: "linker `cc` not found"**
```bash
xcode-select --install   # macOS
sudo apt install build-essential   # Linux
```

**`pip install` fails: "No matching distribution found for fastapi"**
```bash
python3.12 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

**`ModuleNotFoundError` when running the API**
```bash
cd apps/api && source .venv/bin/activate
```

**`ValueError: Missing required environment variables`**

Check `apps/api/.env` has non-empty values for `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, and `SUPABASE_JWT_SECRET`. No trailing slash on `SUPABASE_URL`.

**Desktop app shows blank screen**

Vite dev server must be running first:
```bash
pnpm --filter desktop dev   # terminal 1 — wait for "ready in Xms"
cargo tauri dev              # terminal 2
```

**fly CLI not found**
```bash
make fly-install
export PATH="$HOME/.fly/bin:$PATH"
```

---

## 10. Useful Dev Commands

| Task | Command |
|---|---|
| Install JS dependencies | `pnpm install` |
| Build all (no desktop) | `pnpm build --filter=!@secureassess/desktop` |
| Lint everything | `pnpm lint` or `make lint` |
| Type check | `pnpm type-check` or `make type-check` |
| Run desktop (native) | `pnpm --filter desktop tauri dev` |
| Run admin only | `make dev-admin` |
| Run API | `make dev-api` |
| Run Rust tests | `cd apps/desktop/src-tauri && cargo test` |
| Run React tests | `pnpm --filter desktop test` |
| Run Python tests | `cd apps/api && pytest tests/ -v` |
| Check Judge0 health | `curl https://unkind-freeware-unmoved.ngrok-free.dev/about` |
| Check all production | `make production-health` |
| Deploy API | `make fly-deploy` |
| Deploy admin | `make vercel-deploy` |
| Sync GitHub secrets | `make secrets-sync` |
| Inspect SQLite DB | Open `apps/desktop/src-tauri/*.db` with DB Browser for SQLite |
| View recent commits | `git log --oneline --all` |
