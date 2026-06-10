# Commands Reference — SecureAssess

All commands are available through the root `Makefile`. Run `make help` at the repo root for a live formatted list.

---

## Index

| Topic | File | Quick summary |
|---|---|---|
| Development | [development.md](development.md) | Start dev servers, run apps locally |
| Building | [building.md](building.md) | Production builds, cross-platform desktop |
| Testing & Quality | [testing.md](testing.md) | Tests, lint, type-check, format |
| Database | [database.md](database.md) | Local DB setup, migrations, seed, shell |
| Deploy | [deploy.md](deploy.md) | Fly.io (API), Vercel (admin), combined |
| Judge0 & ngrok | [judge0-ngrok.md](judge0-ngrok.md) | Tunnel management, health checks |
| Secrets | [secrets.md](secrets.md) | GitHub secrets, Fly secrets, Vercel env |
| Release | [release.md](release.md) | Versioning, GitHub releases, CI triggers |
| Utilities | [utilities.md](utilities.md) | Cleanup, format, ports, env-check |

---

## Quick Start

```bash
make check-deps   # verify all required tools are installed
make install      # install all JS + Python dependencies
make dev          # start all apps (admin :3000, desktop :5173, api :8000)
```

---

## Port Map

| Service | Port | URL |
|---|---|---|
| Admin dashboard (Next.js) | 3000 | http://localhost:3000 |
| Desktop Vite dev server | 5173 | http://localhost:5173 |
| FastAPI backend | 8000 | http://localhost:8000 |
| FastAPI interactive docs | 8000 | http://localhost:8000/docs |
| ngrok inspector | 4040 | http://localhost:4040 |
| Judge0 (remote, ASUS via ngrok) | 443 | https://unkind-freeware-unmoved.ngrok-free.dev |
