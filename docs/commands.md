# SecureAssess — Commands Reference

All day-to-day operations are available through the root `Makefile`. Run `make help` at the repo root to see a formatted list.

---

## Quick Start

```bash
# 1. Verify all required tools
make check-deps

# 2. Install all dependencies
make install

# 3. Start everything in dev mode
make dev
```

---

## Setup Commands

| Command | What it does |
|---|---|
| `make install` | Installs Node deps via pnpm and Python deps from `requirements.txt` |
| `make setup-rust` | Adds all Rust cross-compilation targets via `rustup` |
| `make setup-python` | Creates a Python `venv` under `apps/api/.venv` and installs deps |
| `make check-deps` | Verifies `pnpm`, `cargo`, `python3`, and `node` are on your PATH |

---

## Development

| Command | App | Port |
|---|---|---|
| `make dev` | All apps (turbo parallel) | — |
| `make dev-admin` | Admin dashboard (Next.js) | 3000 |
| `make dev-desktop` | Desktop Tauri app (Rust + Vite) | 5173 |
| `make dev-desktop-vite` | Desktop frontend only (no Rust) | 5173 |
| `make dev-api` | FastAPI backend | 8000 |

> **Tip:** Use `make dev-desktop-vite` when you only need to work on the React UI and don't need Tauri native features. It's much faster to start.

---

## Production URLs

| Service | URL | Host |
|---|---|---|
| API | https://secureassess-api.fly.dev | Fly.io |
| Admin dashboard | https://admin-delta-ecru.vercel.app | Vercel |
| Judge0 | https://unkind-freeware-unmoved.ngrok-free.dev | ASUS TUF F17 (Linux Mint) via ngrok |

---

## Deploy — Fly.io (API)

The FastAPI backend runs on Fly.io at `https://secureassess-api.fly.dev`.

### First-time setup

```bash
# Install fly CLI (Linux/macOS)
make fly-install
# then add to shell: export PATH="$HOME/.fly/bin:$PATH"

# Log in
make fly-login

# Create app (run once)
make fly-setup

# Push all secrets from apps/api/.env
make fly-secrets

# Deploy
make fly-deploy
```

### Day-to-day

| Command | What it does |
|---|---|
| `make fly-install` | Install fly CLI via official installer |
| `make fly-login` | Authenticate with Fly.io |
| `make fly-secrets` | Push all env vars from `apps/api/.env` to Fly.io |
| `make fly-secrets-set KEY=X VALUE=Y` | Set a single secret |
| `make fly-secrets-list` | List all secrets on Fly.io (values hidden) |
| `make fly-deploy` | Deploy latest code to Fly.io (remote build) |
| `make fly-status` | Show machine count and health |
| `make fly-logs` | Tail live logs |
| `make fly-logs-error` | Tail logs filtered to errors only |
| `make fly-health` | HTTP GET `/health` on the live API |
| `make fly-ssh` | SSH into the running machine |
| `make fly-scale-down` | Scale to 0 machines (saves credits) |
| `make fly-scale-up` | Scale back to 1 machine |

---

## Deploy — Vercel (Admin Dashboard)

The Next.js admin dashboard deploys to Vercel at `https://admin-delta-ecru.vercel.app`.

| Command | What it does |
|---|---|
| `make vercel-setup` | Link admin app to Vercel project (run once) |
| `make vercel-env` | Push `.env.local` vars to Vercel production |
| `make vercel-env-set KEY=X VALUE=Y` | Set a single Vercel env var |
| `make vercel-deploy` | Deploy admin to Vercel production |
| `make vercel-preview` | Deploy a preview (non-production) build |
| `make vercel-logs` | Show latest deployment logs |

---

## Deploy — Combined

| Command | What it does |
|---|---|
| `make deploy` | Deploy both API (Fly.io) and admin (Vercel) |
| `make deploy-trigger` | Trigger deploy via GitHub Actions (no release) |
| `make deploy-status` | Show recent deploy workflow runs |
| `make production-health` | Check all production services: API + Admin + Judge0 |
| `make secrets-sync` | Sync all GitHub secrets from local `.env` files |

### Health check

```bash
make production-health
```

Checks three services and prints a one-line status for each:
- **API (Fly.io)** — GET `/health`
- **Admin (Vercel)** — HTTP status code
- **Judge0 (ngrok)** — GET `/about` (returns Judge0 version; fails if ASUS machine is offline)

---

## Judge0 / ngrok

Judge0 runs on an ASUS TUF F17 (Linux Mint) and is exposed via ngrok static domain.

```
https://unkind-freeware-unmoved.ngrok-free.dev → localhost:2358 on ASUS
```

### Start the tunnel (run on ASUS machine)

```bash
make judge0-tunnel
# equivalent to: ngrok start --config ngrok.yml judge0
```

Or print instructions for manual start:

```bash
make ngrok
```

### ngrok utilities

| Command | What it does |
|---|---|
| `make judge0-tunnel` | Start ngrok tunnel for Judge0 (run on ASUS) |
| `make ngrok` | Print start instructions |
| `make ngrok-urls` | Show live tunnel URLs from running ngrok |
| `make ngrok-inspect` | Open http://localhost:4040 inspector |

### ngrok.yml

The `ngrok.yml` at repo root configures one tunnel only:

```yaml
version: "3"
agent:
  authtoken: ${NGROK_AUTHTOKEN}

tunnels:
  judge0:
    proto: http
    addr: 2358
    domain: unkind-freeware-unmoved.ngrok-free.dev
    inspect: true
```

Set `NGROK_AUTHTOKEN` in your environment or shell profile on the ASUS machine.

---

## Secrets Management

### GitHub Secrets

Sync all secrets from local `.env` files to GitHub Actions:

```bash
make secrets-sync
```

Or set them individually:

```bash
gh secret set KEY --body "value"
gh secret list
```

### Fly.io Secrets

```bash
make fly-secrets           # push all from apps/api/.env
make fly-secrets-set KEY=JUDGE0_URL VALUE=https://...   # single secret
make fly-secrets-list      # list all (values hidden)
```

---

## Building

### All Apps

```bash
make build
```

Runs `turbo build` — builds admin dashboard and desktop frontend in parallel.

### Individual Apps

```bash
make build-admin      # Next.js production build
make build-desktop    # Tauri build for the current host platform
```

---

## Desktop Cross-Platform Builds

Tauri compiles native binaries for each target OS. These commands produce release-ready installers.

### Single Command — All Platforms

```bash
make desktop-all
```

Builds in sequence: **macOS Universal → Windows x64 → Linux x64**.
Artifacts land in `apps/desktop/src-tauri/target/<triple>/release/bundle/`.

### Platform-Specific Commands

| Command | Target | Output format |
|---|---|---|
| `make desktop-mac` | macOS ARM64 (Apple Silicon) | `.app` + `.dmg` |
| `make desktop-mac-intel` | macOS x86_64 (Intel) | `.app` + `.dmg` |
| `make desktop-mac-universal` | macOS Universal (ARM + Intel) | `.app` + `.dmg` |
| `make desktop-windows` | Windows x64 | `.exe` NSIS installer + `.msi` |
| `make desktop-linux` | Linux x86_64 | `.AppImage` + `.deb` |

---

## Cross-Compilation Prerequisites

### macOS → macOS Universal (no extra setup needed)

```bash
make setup-rust
make desktop-mac-universal
```

### macOS → Windows (cross-compilation)

Building a Windows binary from macOS requires a MSVC-compatible linker. The recommended approach is [`xwin`](https://github.com/Jake-Shadle/xwin) + the LLVM linker:

```bash
brew install llvm
cargo install xwin
xwin --accept-license splat --output ~/.xwin
rustup target add x86_64-pc-windows-msvc
```

> **Alternative:** Use the [Tauri GitHub Actions workflow](https://tauri.app/distribute/sign/windows/) to build Windows artifacts in CI without local setup.

### macOS → Linux (cross-compilation)

```bash
brew install filosottile/musl-cross/musl-cross
# Or use cross (Docker-based):
cargo install cross --git https://github.com/cross-rs/cross
cd apps/desktop/src-tauri
cross build --release --target x86_64-unknown-linux-gnu
```

> **Recommended for Linux:** Build in CI on an Ubuntu runner — Linux builds need GTK/WebKit2GTK system libraries.

### CI Matrix

```yaml
strategy:
  matrix:
    include:
      - os: macos-14       # Apple Silicon — make desktop-mac-universal
      - os: windows-latest # make desktop-windows
      - os: ubuntu-22.04   # make desktop-linux
```

---

## Testing

| Command | Runs |
|---|---|
| `make test` | All: Vitest (admin + desktop) + Rust + Pytest |
| `make test-admin` | Admin Vitest suite |
| `make test-desktop` | Desktop Vitest suite |
| `make test-rust` | `cargo test` in `apps/desktop/src-tauri` |
| `make test-api` | `pytest tests/` in `apps/api` |

---

## Lint & Type-Check

| Command | Runs |
|---|---|
| `make lint` | ESLint (all TS apps) + ruff + black check (API) |
| `make lint-admin` | ESLint on admin dashboard |
| `make lint-desktop` | ESLint on desktop frontend |
| `make lint-api` | `ruff check` + `black --check` on `apps/api` |
| `make type-check` | `tsc --noEmit` across all TypeScript apps |

---

## API Utilities

```bash
make api-dev        # Hot-reload uvicorn server on 0.0.0.0:8000
make api-migrate    # Push Supabase schema migrations
```

---

## Database — Local Dev

| Command | What it does |
|---|---|
| `make db-setup` | Create local PostgreSQL role + database (native psql) |
| `make db-setup-docker` | Create local PostgreSQL via Docker |
| `make db-start` | Start existing Docker postgres container |
| `make db-stop` | Stop Docker postgres container (data preserved) |
| `make db-status` | Check whether the local DB is reachable |
| `make db-migrate` | Run all SQL migrations in `apps/api/migrations/` |
| `make db-seed` | Insert dev seed data (10 questions, 3 assessments) |
| `make db-shell` | Open psql prompt to local DB |
| `make db-reset` | Drop and recreate DB, then re-migrate (destructive) |

---

## Release Management

| Command | What it does |
|---|---|
| `make version` | Show current version from `VERSION` file |
| `make release-patch` | Trigger patch release via GitHub Actions |
| `make release-minor` | Trigger minor release via GitHub Actions |
| `make release-major` | Trigger major release via GitHub Actions |
| `make release-status` | Show last 5 release workflow runs |
| `make release-watch` | Watch the latest release run live |
| `make releases-list` | List all GitHub releases |
| `make release-open` | Open latest release page in browser |
| `make release-delete-old` | Delete releases beyond the 10 most recent |

---

## Cleanup

| Command | Removes |
|---|---|
| `make clean` | node_modules, .next, dist, .turbo, Rust target |
| `make clean-node` | node_modules, .next, dist directories |
| `make clean-rust` | `apps/desktop/src-tauri/target` (can be several GB) |
| `make clean-all` | Full reset including .venv |
| `make clean-sessions` | Kill all project tmux sessions |

> `make clean-rust` frees the most disk space.

---

## Utilities

| Command | What it does |
|---|---|
| `make ip` | Show your LAN IP addresses |
| `make ports` | Show which project ports are in use |
| `make env-check` | Verify all required env vars are set |
| `make format` | Format code (prettier + ruff + rustfmt) |

---

## Build Artifact Locations

```
apps/desktop/src-tauri/target/
├── aarch64-apple-darwin/release/bundle/
│   ├── macos/          → SecureAssess.app
│   └── dmg/            → SecureAssess_*.dmg
├── x86_64-apple-darwin/release/bundle/
├── universal-apple-darwin/release/bundle/
├── x86_64-pc-windows-msvc/release/bundle/
│   ├── nsis/           → SecureAssess_*_x64-setup.exe
│   └── msi/            → SecureAssess_*_x64_en-US.msi
└── x86_64-unknown-linux-gnu/release/bundle/
    ├── appimage/       → SecureAssess_*.AppImage
    └── deb/            → SecureAssess_*.deb
```
