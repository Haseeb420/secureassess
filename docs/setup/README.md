# Local Setup — SecureAssess

Pick your OS and follow the guide. Both guides use the same `.env` files and the same `make` commands — the only difference is how you install system dependencies.

## Guides

| OS | Guide |
|---|---|
| macOS (Apple Silicon M1/M2/M3) | [mac.md](mac.md) |
| Linux (Ubuntu / Debian / Linux Mint) | [linux.md](linux.md) |

---

## What you actually need

To run the project locally, you need exactly these things:

| Tool | Required? | Why |
|---|---|---|
| Node.js 20+ | **Yes** | JS/TS tooling, pnpm, Vite, Next.js |
| pnpm 9 | **Yes** | Monorepo package manager |
| Python 3.12 | **Yes** | FastAPI backend |
| Rust (stable) | **Yes** | Tauri desktop app |
| Tauri CLI v2 | **Yes** | Build/run the Tauri window |
| Git | **Yes** | Version control |
| PostgreSQL 16 | **Optional** | Only if you want a local DB. You can use the shared Supabase cloud project instead. |
| Docker | **Optional** | Alternative way to run local PostgreSQL. Not needed otherwise. |
| Language runtimes (Java, Go, g++) | **Optional** | Only if `EXECUTION_BACKEND=local`. In production, Judge0 on the ASUS machine handles all code execution. |
| fly CLI | **No** | Only for deploying the API to Fly.io |
| Vercel CLI | **No** | Only for deploying the admin dashboard |
| GitHub CLI (gh) | **No** | Only for syncing secrets and triggering releases |
| ngrok | **No** | Runs on the ASUS TUF F17 (Linux Mint), not your dev machine |
| Judge0 | **No** | Runs on the ASUS machine via Docker. Apple Silicon cannot run it anyway. |

---

## Production URLs (for reference)

| Service | URL | Host |
|---|---|---|
| API | https://secureassess-api.fly.dev | Fly.io |
| Admin dashboard | https://admin-delta-ecru.vercel.app | Vercel |
| Judge0 | https://unkind-freeware-unmoved.ngrok-free.dev | ASUS TUF F17 (Linux Mint) via ngrok |

---

## Port map (local dev)

| Service | Port |
|---|---|
| Admin dashboard (Next.js) | 3000 |
| Desktop Vite dev server | 5173 |
| FastAPI backend | 8000 |
| Judge0 (remote via ngrok) | 443 |
