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
