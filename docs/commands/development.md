# Development Commands

Start and work with local dev servers.

---

## Setup

| Command | What it does |
|---|---|
| `make install` | Install Node deps (pnpm) + Python deps (pip) |
| `make setup-python` | Create `apps/api/.venv` and install from `requirements.txt` |
| `make setup-rust` | Add Rust cross-compilation targets via `rustup` |
| `make check-deps` | Verify `pnpm`, `cargo`, `python3`, `node` are on PATH |

---

## Running Apps

### All apps at once

```bash
make dev
```

Runs Turborepo's dev pipeline: admin (`:3000`), desktop Vite (`:5173`), and API (`:8000`) in parallel.

### Individual apps

| Command | App | Port |
|---|---|---|
| `make dev-admin` | Admin dashboard (Next.js) | 3000 |
| `make dev-desktop` | Desktop Tauri app (Rust + Vite) | 5173 |
| `make dev-desktop-vite` | Desktop frontend only (no Rust) | 5173 |
| `make dev-api` | FastAPI backend | 8000 |

> Use `make dev-desktop-vite` when you're only working on the React UI and don't need Tauri native features. It starts in seconds vs. several minutes for the full Tauri compile.

### Desktop app with native Tauri window

Two terminals required:

```bash
# Terminal 1 — start Vite dev server first
pnpm --filter desktop dev
# wait for "ready in Xms" before continuing

# Terminal 2 — launch Tauri shell
pnpm --filter desktop tauri dev
```

First Rust compile takes 3–5 minutes. Subsequent runs are fast (incremental).

### API with hot reload

```bash
make dev-api
# or directly:
cd apps/api && source .venv/bin/activate && uvicorn main:app --reload --port 8000
```

Interactive API docs available at `http://localhost:8000/docs`.

---

## Dev + ngrok (for testing the desktop app from a different device)

| Command | What it does |
|---|---|
| `make serve` | Start API + admin + ngrok together (no tmux required) |
| `make dev-ngrok` | Start all three in separate tmux panes (requires tmux) |

These expose your local API over ngrok so you can install the desktop app on another machine and point it at your dev server.
