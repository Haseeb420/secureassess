# Local Development Setup — SecureAssess

For developers setting up the monorepo on macOS M1 for the first time.

---

## 1. Prerequisites

Install everything below before cloning the repo. Each tool lists the install command, minimum version, and how to verify it.

### Homebrew
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```
```bash
brew --version   # Homebrew 4.x or later
```

### Xcode Command Line Tools
Required by Rust and native build tools. Install before Rust.
```bash
xcode-select --install
```
```bash
xcode-select -p   # should print /Library/Developer/CommandLineTools
```

### Git
```bash
brew install git
```
```bash
git --version   # 2.x or later
```

### Node.js 20+
```bash
brew install node
```
```bash
node --version   # v20.x or later
npm --version
```

### pnpm 9
The monorepo is managed with pnpm 9.15. Using a different version will cause lockfile conflicts.
```bash
npm install -g pnpm@9.15.0
```
```bash
pnpm --version   # 9.15.0
```

### Python 3.11+
The API requires Python 3.11 or 3.12.
```bash
brew install python@3.12
```
```bash
python3.12 --version   # Python 3.12.x
```

> If you use pyenv, set the local version inside `apps/api/`:
> ```bash
> pyenv install 3.12
> cd apps/api && pyenv local 3.12
> ```

### Rust (stable, 1.77+)
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env
```
```bash
rustc --version   # rustc 1.77.x or later
cargo --version
```

### Tauri CLI v2
```bash
cargo install tauri-cli --version "^2.0"
```
```bash
cargo tauri --version   # tauri-cli 2.x
```

### Docker Desktop
Required for Judge0 (code execution sandbox).

Download from [https://www.docker.com/products/docker-desktop/](https://www.docker.com/products/docker-desktop/) and install the Apple Silicon build.
```bash
docker --version   # Docker 24.x or later
docker-compose version
```

### Language runtimes for code execution

These are needed on the developer machine only if running the `LocalExecutor` (used in dev when Judge0 is not running). They are required in production inside the Docker sandbox.

```bash
brew install openjdk          # Java
brew install go               # Go
# C++ is provided by Xcode Command Line Tools (g++ is already installed)
```
```bash
java --version
go version
g++ --version
python3 --version
node --version
```

---

## 2. Environment Variables Setup

Each app reads from its own `.env` file. Copy the examples and fill in the values.

### Supabase credentials

All three apps share the same Supabase project. Find the values at:
**Supabase dashboard → your project → Project Settings → API**

- **Project URL** → use as `SUPABASE_URL` / `VITE_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_URL`
- **anon / public key** → use as `VITE_SUPABASE_ANON_KEY` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **service_role key** → use as `SUPABASE_SERVICE_KEY` (never expose in frontend)
- **JWT secret** → **Project Settings → API → JWT Settings → JWT Secret** → use as `SUPABASE_JWT_SECRET`

---

### `apps/desktop/.env`

```bash
cp apps/desktop/.env.example apps/desktop/.env
```

| Variable | Required | Where to get it |
|---|---|---|
| `VITE_API_BASE_URL` | ✓ | `http://localhost:8000` for local dev |
| `VITE_SUPABASE_URL` | ✓ | Supabase dashboard → Project Settings → API |
| `VITE_SUPABASE_ANON_KEY` | ✓ | Supabase dashboard → Project Settings → API (anon key) |
| `VITE_JUDGE0_URL` | ✓ | `http://localhost:2358` for local dev |

---

### `apps/api/.env`

```bash
cp apps/api/.env.example apps/api/.env
```

| Variable | Required | Where to get it |
|---|---|---|
| `SUPABASE_URL` | ✓ | Supabase dashboard → Project Settings → API |
| `SUPABASE_SERVICE_KEY` | ✓ | Supabase dashboard → Project Settings → API (service_role key) |
| `SUPABASE_JWT_SECRET` | ✓ | Supabase dashboard → Project Settings → API → JWT Settings |
| `JUDGE0_URL` | ✓ | `http://localhost:2358` for local dev |
| `JUDGE0_API_KEY` | — | Leave empty for local dev (no auth configured) |
| `ENCRYPTION_SECRET` | — | Any random string; used for submission HMAC signing |
| `JWT_SECRET` | — | Same value as `SUPABASE_JWT_SECRET` |
| `DATABASE_URL` | — | Leave empty; SQLite path is derived from machine fingerprint |

The API will refuse to start if `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, or `SUPABASE_JWT_SECRET` are empty.

---

### `apps/admin/.env.local`

```bash
cp apps/admin/.env.local.example apps/admin/.env.local
```

| Variable | Required | Where to get it |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✓ | Supabase dashboard → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✓ | Supabase dashboard → Project Settings → API (anon key) |
| `NEXT_PUBLIC_API_BASE_URL` | ✓ | `http://localhost:8000` for local dev |

---

## 3. First Time Setup

Run these commands in order from the repo root after cloning.

**Clone the repo.**
```bash
git clone https://github.com/Haseeb420/secureassess.git
cd secureassess
```

**Install all JavaScript dependencies.** Turborepo installs packages for all three apps at once.
```bash
pnpm install
```
> If this fails with workspace errors, check `pnpm --version` is 9.x.

**Install Python dependencies for the API.**
```bash
cd apps/api
python3.12 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cd ../..
```
> The venv keeps API packages isolated from your system Python. Activate it whenever working on the API.

**Copy and fill in all environment files.** See Section 2 for the values.
```bash
cp apps/desktop/.env.example apps/desktop/.env
cp apps/api/.env.example apps/api/.env
cp apps/admin/.env.local.example apps/admin/.env.local
# Edit each file and fill in the values
```

**Apply Supabase migrations.** Run the SQL files in `apps/api/migrations/` against your Supabase project via the Supabase dashboard SQL editor or the CLI.
```bash
# Using the Supabase CLI (install: brew install supabase/tap/supabase)
supabase db push --db-url "postgresql://postgres:[password]@[host]:5432/postgres"

# Or paste each file manually in Supabase dashboard → SQL Editor:
# apps/api/migrations/001_evaluation_results.sql
# apps/api/migrations/002_question_submissions.sql
```
> The local SQLite tables (used by the desktop app) are created automatically on first launch — no manual step needed.

**Start Judge0** (code execution sandbox). Leave this running in its own terminal.
```bash
cd infra/judge0
docker-compose up -d
cd ../..
```
> First start pulls ~1 GB of images and runs DB migrations. Takes 60–90 seconds. Check with `curl http://localhost:2358/system_info`.

**Verify the full build passes.**
```bash
pnpm build --filter=!@secureassess/desktop
```
> The desktop app is excluded from CI builds because it requires native Rust compilation; run it separately via `cargo tauri dev`.

---

## 4. Running the Applications

Each app runs in its own terminal tab. Open four terminals.

### A. All JS apps at once (admin + desktop Vite dev server)

```bash
pnpm dev
```

This uses Turborepo to start both the desktop Vite server (`localhost:5173`) and the admin Next.js server (`localhost:3000`) concurrently.

### B. Individual apps (for debugging one at a time)

**Desktop — Vite dev server only** (React hot reload, no native window):
```bash
pnpm --filter desktop dev
```
Opens at `http://localhost:5173`. Useful for iterating on UI without rebuilding Rust.

**Admin dashboard:**
```bash
pnpm --filter admin dev
```
Opens at `http://localhost:3000`.

### C. Desktop app with native Tauri window

Run this after the Vite dev server is already running on port 5173.
```bash
pnpm --filter desktop tauri dev
# or equivalently:
cd apps/desktop && cargo tauri dev
```
A native macOS window opens. The Vite dev server handles React hot reload; Rust recompiles only when `src-tauri/` files change.

Successful start looks like:
```
INFO tauri::app: Tauri started
```
> The first `cargo tauri dev` takes 3–5 minutes to compile Rust. Subsequent runs are fast.

### D. API with hot reload

```bash
cd apps/api
source .venv/bin/activate
uvicorn main:app --reload --port 8000
```
Successful start looks like:
```
INFO:     Application startup complete.
INFO:     Uvicorn running on http://127.0.0.1:8000
```
Interactive API docs available at `http://localhost:8000/docs`.

---

### Running Tests

**Rust unit tests:**
```bash
cd apps/desktop/src-tauri
cargo test
```
Expected: `13 passed; 0 failed`

**React tests (Vitest):**
```bash
pnpm --filter desktop test
```
Expected: `9 passed`

**Python tests (pytest):**
```bash
cd apps/api
source .venv/bin/activate
pytest tests/ -v
```
Expected: `10 passed`

---

## 5. Port Reference

| Service | Port | URL |
|---|---|---|
| Desktop Vite dev server | 5173 | http://localhost:5173 |
| Admin dashboard (Next.js) | 3000 | http://localhost:3000 |
| FastAPI backend | 8000 | http://localhost:8000 |
| FastAPI interactive docs | 8000 | http://localhost:8000/docs |
| Judge0 CE API | 2358 | http://localhost:2358 |
| Judge0 health check | 2358 | http://localhost:2358/system_info |

---

## 6. Creating Test Data

Follow these steps to run through a complete assessment flow locally.

**1. Create an admin user.**

Option A — seed script (fastest):
```bash
python scripts/seed_admin.py --email admin@example.com --password YourPassword123!
```
> Requires the **service_role** key in `apps/api/.env` (not the anon key). Get it from Supabase dashboard → Project Settings → API → service_role.

Option B — Supabase dashboard:
Go to Authentication → Users → Invite user. After confirming, click the user → Edit → User metadata and set `{ "role": "admin" }`.

**2. Log in to the admin dashboard.**
Navigate to `http://localhost:3000` — it redirects automatically to `/login`. Enter the admin email and password.

**3. Create a question.**
Go to Dashboard → Questions → New Question. Fill in:
- Title: e.g. "Sum of Two Numbers"
- Prompt (Markdown): describe the problem
- Under "Sample Test Cases": add an input/expected output pair visible to candidates
- Under "Hidden Test Cases": add additional pairs used for scoring

Click Save.

**4. Create an assessment.**
Go to Dashboard → Assessments → New Assessment. Fill in title, duration (minutes), allowed languages, and select the question you just created. Click Create.

**5. Generate an invite.**
Open the assessment detail page. Click "Invite Candidate", enter the candidate's email, and copy the generated token.

**6. Log in to the desktop app.**
Start the desktop app (`cargo tauri dev`). On the login screen, switch to the "Invite Token" tab, paste the token, and click Continue. The pre-assessment security checklist appears.

**7. Complete the assessment.**
Pass the security checks (no forbidden apps, single display). Write a solution in the editor and click "Run Sample Tests". When ready, click Submit.

**8. View the result.**
In the admin dashboard, go to Dashboard → Reports and find the candidate session. The score, test results, and any security violations are shown.

---

## 7. Common Errors and Fixes

**`cargo tauri: command not found` or `tauri not found`**
```bash
cargo install tauri-cli --version "^2.0"
```
Then restart your terminal. Verify with `cargo tauri --version`.

---

**`pnpm install` fails with workspace or lockfile errors**
```bash
pnpm --version   # must be 9.x
npm install -g pnpm@9.15.0
pnpm install
```

---

**Rust compilation fails: "linker `cc` not found"**
```bash
xcode-select --install
```
Restart your terminal after the install completes.

---

**`pip install -r requirements.txt` fails: "No matching distribution found for fastapi"**

Your `python` shim is pointing to Python 3.9. Use Python 3.11 or 3.12 explicitly:
```bash
python3.12 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

---

**`ModuleNotFoundError` when running the API**

You are outside the virtual environment. Activate it first:
```bash
cd apps/api && source .venv/bin/activate
uvicorn main:app --reload --port 8000
```

---

**Supabase: `ValueError: Missing required environment variables`**

The API validates env vars on startup. Check `apps/api/.env` has non-empty values for `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, and `SUPABASE_JWT_SECRET`. Make sure there is no trailing slash on `SUPABASE_URL`.

---

**Desktop app opens but shows a blank white screen**

The Vite dev server must be running on port 5173 before `cargo tauri dev` is launched. Open a second terminal:
```bash
pnpm --filter desktop dev   # terminal 1 — wait for "ready in Xms"
cargo tauri dev              # terminal 2
```

---

**`docker-credential-desktop: executable file not found in $PATH`**

Docker Desktop's credential helper is misconfigured. Edit `~/.docker/config.json` and change:
```json
"credsStore": "desktop"
```
to:
```json
"credsStore": ""
```
Then retry `docker-compose up -d`.

---

**`python3 not found` when running code in the assessment**

The local executor calls `python3` directly. Install it and verify:
```bash
brew install python@3.12
python3 --version
```

---

**TypeScript errors after pulling latest code**

New packages may have been added. Re-install and rebuild:
```bash
pnpm install
pnpm build --filter=!@secureassess/desktop
```

---

## 8. Useful Dev Commands

| Task | Command |
|---|---|
| Install all JS dependencies | `pnpm install` |
| Build all packages (no desktop) | `pnpm build --filter=!@secureassess/desktop` |
| Lint everything | `pnpm lint` |
| Type check all packages | `pnpm type-check` |
| Run desktop app (native window) | `pnpm --filter desktop tauri dev` |
| Run admin dashboard only | `pnpm --filter admin dev` |
| Run API with hot reload | `cd apps/api && uvicorn main:app --reload --port 8000` |
| Run Rust tests | `cd apps/desktop/src-tauri && cargo test` |
| Run React tests | `pnpm --filter desktop test` |
| Run Python tests | `cd apps/api && pytest tests/ -v` |
| Start Judge0 | `cd infra/judge0 && docker-compose up -d` |
| Stop Judge0 | `cd infra/judge0 && docker-compose down` |
| Check Judge0 health | `curl http://localhost:2358/system_info` |
| View Rust compilation warnings | `cd apps/desktop/src-tauri && cargo clippy` |
| Format Rust code | `cd apps/desktop/src-tauri && cargo fmt` |
| View recent commits | `git log --oneline --all` |
| Inspect local SQLite DB | Open `apps/desktop/src-tauri/*.db` with DB Browser for SQLite |

---

## 9. Testing on Multiple Devices

### Quick Start

1. Get your ngrok static domain (one time):
   - Sign up at ngrok.com (free)
   - Go to Dashboard → Domains → + New Domain
   - Copy your domain (e.g. `pleased-hedgehog-musical.ngrok-free.app`)
   - Add to `apps/api/.env`: `NGROK_STATIC_DOMAIN=your-domain.ngrok-free.app`
   - Add to `apps/desktop/.env`: `VITE_API_BASE_URL=https://your-domain.ngrok-free.app`

2. Start services + tunnels:
   ```bash
   make dev-ngrok
   ```

3. Build the desktop app with the ngrok URL baked in:
   ```bash
   make build-mac
   ```

4. Share the installer with testers:
   ```bash
   make serve-builds
   ```
   Shows a LAN URL — testers download from their browser.

5. For Windows/Linux testers: push to a release branch and GitHub Actions
   builds the Windows `.msi` and Linux `.AppImage` automatically.

### Windows Build via GitHub Actions

Push to any branch starting with `release/`:
```bash
git checkout -b release/test-build-$(date +%Y%m%d)
git push origin HEAD
```

GitHub Actions will build for Windows and Linux.
Download from the Actions artifacts tab.

### Quick Commands Reference

| Command | What it does |
|---|---|
| `make dev` | Start all services in tmux |
| `make ngrok` | Start ngrok tunnels |
| `make ngrok-urls` | Show live ngrok tunnel URLs |
| `make build-mac` | Build macOS installer |
| `make serve-builds` | Share builds over LAN |
| `make release-draft` | Create GitHub draft release with installer |
| `make env-check` | Verify all env vars are set |
| `make ip` | Show your LAN IP |
| `make ports` | Show which ports are in use |
| `make help` | Show all available commands |
