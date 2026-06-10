# macOS Local Setup — SecureAssess

For Apple Silicon (M1/M2/M3) Macs. Intel Mac steps are identical except where noted.

---

## 1. Required Tools

Install these before touching the repo. Everything else is optional.

### Homebrew

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

After install, follow the "Next steps" it prints to add brew to your PATH.

```bash
brew --version   # 4.x or later
```

### Xcode Command Line Tools

```bash
xcode-select --install
xcode-select -p   # → /Library/Developer/CommandLineTools
```

This gives you `git`, `clang`, `make`, and `g++` — all needed.

### Node.js 20+

```bash
brew install node
node --version   # v20.x or later
```

### pnpm 9

```bash
npm install -g pnpm@9.15.0
pnpm --version   # 9.15.0
```

### Python 3.12

```bash
brew install python@3.12
python3.12 --version   # 3.12.x
```

> If you use pyenv: `pyenv install 3.12.x && cd apps/api && pyenv local 3.12.x`

### Rust (stable)

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

This takes a few minutes on first install.

---

## 2. Clone and Install

```bash
git clone https://github.com/Haseeb420/secureassess.git
cd secureassess

# Install all JS/TS dependencies
pnpm install

# Set up the Python virtual environment
make setup-python
# or manually:
cd apps/api
python3.12 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cd ../..
```

---

## 3. Environment Files

The `.env` files are already populated with local dev values. You do not need to change anything to get started — the Supabase project is shared, so local dev and production point at the same database.

```bash
# Verify all required vars are set
make env-check
```

If you cloned fresh and `.env` files don't exist yet:
```bash
cp apps/desktop/.env.example apps/desktop/.env
cp apps/api/.env.example      apps/api/.env
cp apps/admin/.env.local.example apps/admin/.env.local
```

Then fill in the Supabase values from **Supabase dashboard → Project Settings → API**.

---

## 4. Run the Apps

### Quickest path — all apps at once

```bash
make dev
```

Starts admin (`:3000`) and desktop Vite (`:5173`) via Turborepo, plus the API (`:8000`).

### Individual apps

```bash
make dev-admin          # Admin dashboard → http://localhost:3000
make dev-api            # FastAPI → http://localhost:8000 (docs at /docs)
make dev-desktop-vite   # Desktop React only → http://localhost:5173 (no Rust)
```

### Desktop app with native Tauri window

```bash
# Terminal 1 — wait for "ready in Xms"
pnpm --filter desktop dev

# Terminal 2
pnpm --filter desktop tauri dev
```

First compile takes 3–5 minutes. Subsequent runs are fast (incremental).

---

## 5. Code Execution

**You do not need Judge0 locally.**

Judge0 runs on the **ASUS TUF F17 (Linux Mint)** machine and is exposed permanently at:
```
https://unkind-freeware-unmoved.ngrok-free.dev
```

> Judge0 uses a `linux/amd64` Docker image. On Apple Silicon, Rosetta 2 nested emulation causes `isolate`'s `mmap` calls to fault — it cannot run on M1/M2/M3 Macs.

**For local dev, use `LocalExecutor` instead** (already the default in the `.env` files):
```
# apps/api/.env
EXECUTION_BACKEND=local

# apps/desktop/.env
VITE_EXECUTION_BACKEND=local
```

`LocalExecutor` runs candidate code directly on your Mac using whatever runtimes you have installed. See [Optional: Language Runtimes](#optional-language-runtimes) below.

To check if Judge0 is online:
```bash
make production-health
# or: curl https://unkind-freeware-unmoved.ngrok-free.dev/about
```

---

## 6. Optional Tools

These are only needed for specific workflows. Skip unless you need them.

### Optional: Local PostgreSQL

By default, the API connects to the shared Supabase cloud database (same as production). A local PostgreSQL is only needed if you want to run migrations in isolation or avoid polluting the shared dev data.

**Option A — Homebrew (recommended on Mac):**
```bash
brew install postgresql@16
brew services start postgresql@16
# add to PATH: export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"
make db-setup   # creates role + database + runs migrations
```

**Option B — Docker:**
```bash
# Docker Desktop must be running
make db-setup-docker
```

Update `DATABASE_URL` in `apps/api/.env` to the local value:
```
DATABASE_URL=postgresql://secureassess:secureassess@localhost:5432/secureassess
```

### Optional: Language Runtimes (for LocalExecutor)

Only install these if you're testing code execution with `EXECUTION_BACKEND=local` and need languages beyond Python and Node (which are already installed).

```bash
brew install openjdk go   # Java 21+, Go 1.22+
# C/C++ — already provided by Xcode Command Line Tools
```

Verify:
```bash
java --version && go version && g++ --version && python3 --version && node --version
```

### Optional: GitHub CLI

Only needed for syncing secrets, triggering releases, or working with PRs from the terminal.

```bash
brew install gh
gh auth login
```

### Optional: fly CLI

Only needed to deploy the API to Fly.io or manage the production server.

```bash
make fly-install
# then add to ~/.zshrc or ~/.bashrc:
export FLYCTL_INSTALL="$HOME/.fly"
export PATH="$FLYCTL_INSTALL/bin:$PATH"
make fly-login
```

---

## 7. Verify Everything Works

```bash
make check-deps    # pnpm, cargo, python, node all found
make env-check     # all required env vars set
make dev-api       # FastAPI starts on :8000 — visit http://localhost:8000/docs
make dev-admin     # Admin dashboard starts on :3000
```

---

## 8. Create Test Data

```bash
# 1. Create an admin user
python scripts/seed_admin.py --email admin@example.com --password YourPassword123!

# 2. Log into the admin dashboard at http://localhost:3000

# 3. Create a question → assessment → invite
#    (Dashboard → Questions → New Question, then Assessments → New → add question → Invites tab)

# 4. Open the desktop app with the invite token
```

---

## 9. Common Errors on macOS

**`cargo tauri: command not found`**
```bash
cargo install tauri-cli --version "^2.0"
```

**Rust build: "linker `cc` not found"**
```bash
xcode-select --install
```

**`pnpm install` lockfile error**
```bash
pnpm --version   # must be 9.x
npm install -g pnpm@9.15.0
pnpm install
```

**`pip install` fails with Python version mismatch**
```bash
python3.12 -m venv apps/api/.venv   # force correct Python
source apps/api/.venv/bin/activate
pip install -r apps/api/requirements.txt
```

**`ModuleNotFoundError` when running the API**
```bash
source apps/api/.venv/bin/activate   # venv must be active
```

**`ValueError: Missing required environment variables`**

Check `apps/api/.env` has non-empty `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, and `SUPABASE_JWT_SECRET`. No trailing slash on `SUPABASE_URL`.

**Desktop app shows blank screen**
```bash
# Vite dev server must be running first — open two terminals:
pnpm --filter desktop dev      # terminal 1, wait for "ready in Xms"
cargo tauri dev                 # terminal 2
```

**PostgreSQL: "role does not exist"**
```bash
# The Homebrew postgres runs as your macOS username, not 'postgres'
# make db-setup handles this — it uses $(whoami) as the superuser
make db-setup
```

**`brew services start postgresql@16` fails**
```bash
# Check for stale lock file
ls /opt/homebrew/var/postgresql@16/postmaster.pid
rm /opt/homebrew/var/postgresql@16/postmaster.pid   # if it exists
brew services start postgresql@16
```
