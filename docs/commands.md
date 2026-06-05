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

## Remote Development (ngrok + desktop testing)

Use this workflow when you need a built `.dmg` / `.exe` to talk to your local API, or when testing on a separate device.

### Port Map

```
FastAPI   :8000  ←  local dev, Rust sync worker
Next.js   :3000  ←  admin dashboard + API proxy for desktop app
ngrok     :443   →  :3000  (the static domain used in desktop .env)
```

All desktop API traffic flows:

```
Desktop app  →  https://<static-domain>/api/backend/*
             →  ngrok  →  Next.js :3000
             →  /api/backend/[...path] proxy  →  FastAPI :8000
```

### One-command startup (no tmux)

```bash
make serve
```

Starts FastAPI (:8000), Next.js admin (:3000), and ngrok together.  
Press `Ctrl+C` to stop everything.

**Requirements before running:**
1. `NGROK_STATIC_DOMAIN` set in `apps/api/.env`
2. `VITE_API_BASE_URL=https://<your-domain>/api/backend` set in `apps/desktop/.env`
3. ngrok authenticated: `ngrok config add-authtoken <token>`

### tmux variant (separate panes)

```bash
make dev-ngrok   # requires: brew install tmux
```

Opens three tmux windows (`api`, `admin`, `ngrok`) — easier to read individual service logs.

### ngrok only (services already running)

```bash
make ngrok          # start ngrok tunnel using ngrok.yml
make ngrok-urls     # show live tunnel URL
make ngrok-inspect  # open http://localhost:4040 inspector
```

### First-time ngrok setup

```bash
# 1. Install ngrok
brew install ngrok/ngrok/ngrok

# 2. Authenticate (once per machine)
ngrok config add-authtoken YOUR_TOKEN_HERE
# Get token at: https://dashboard.ngrok.com/authtokens

# 3. Get your free static domain (once)
# Go to: https://dashboard.ngrok.com/domains → New Domain
# Example output: unkind-freeware-unmoved.ngrok-free.dev

# 4. Add to apps/api/.env
echo "NGROK_STATIC_DOMAIN=unkind-freeware-unmoved.ngrok-free.dev" >> apps/api/.env

# 5. Add to apps/desktop/.env
echo "VITE_API_BASE_URL=https://unkind-freeware-unmoved.ngrok-free.dev/api/backend" >> apps/desktop/.env
```

### Building the desktop app for remote testing

```bash
# Build macOS .dmg (reads VITE_API_BASE_URL from apps/desktop/.env at build time)
make build-mac

# Build with a prompted URL (if you want to override without editing .env)
make build-mac-url
```

The built app has the ngrok URL baked in — the same static domain works every time ngrok restarts.

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

Both ARM and Intel targets ship with Xcode. Just run:

```bash
make setup-rust       # adds the two Apple targets
make desktop-mac-universal
```

### macOS → Windows (cross-compilation)

Building a Windows binary from macOS requires a MSVC-compatible linker. The recommended approach is [`xwin`](https://github.com/Jake-Shadle/xwin) + the LLVM linker:

```bash
# Install toolchain
brew install llvm
cargo install xwin
xwin --accept-license splat --output ~/.xwin

# Install the target
rustup target add x86_64-pc-windows-msvc

# Add to ~/.cargo/config.toml:
# [target.x86_64-pc-windows-msvc]
# linker = "lld-link"
# rustflags = ["-C", "link-arg=/defaultlib:msvcrt"]
```

> **Alternative:** Use the [Tauri GitHub Actions workflow](https://tauri.app/distribute/sign/windows/) to build Windows artifacts in CI without local setup.

### macOS → Linux (cross-compilation)

```bash
# Install cross-linker
brew install filosottile/musl-cross/musl-cross

# Or use the `cross` tool (Docker-based, easiest):
cargo install cross --git https://github.com/cross-rs/cross
cd apps/desktop/src-tauri
cross build --release --target x86_64-unknown-linux-gnu
```

> **Recommended for Linux:** Build in CI (GitHub Actions Ubuntu runner) rather than cross-compiling from macOS, since Linux builds need GTK/WebKit2GTK system libraries that are difficult to replicate locally.

### CI Recommendation

For production releases, run platform builds natively on the matching runner:

```yaml
# .github/workflows/release.yml (example matrix)
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

## Cleanup

| Command | Removes |
|---|---|
| `make clean` | Everything: node_modules, .next, dist, .turbo, Rust target |
| `make clean-node` | node_modules, .next, dist directories |
| `make clean-rust` | `apps/desktop/src-tauri/target` (can be several GB) |

> `make clean-rust` frees the most disk space. Rust will recompile everything on the next build.

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
