# Deploy Commands

Deploy the API to Fly.io and the admin dashboard to Vercel.

---

## Production URLs

| Service | URL |
|---|---|
| API | https://secureassess-api.fly.dev |
| Admin dashboard | https://admin-delta-ecru.vercel.app |

---

## Deploy Both at Once

```bash
make deploy
```

Runs `fly-deploy` then `vercel-deploy` in sequence.

| Command | What it does |
|---|---|
| `make deploy` | Deploy API (Fly.io) + admin (Vercel) |
| `make deploy-trigger` | Trigger deploy via GitHub Actions workflow |
| `make deploy-status` | Show last 5 deploy workflow runs |
| `make production-health` | Check all production services: API + admin + Judge0 |

---

## Fly.io — FastAPI API

### First-time setup (run once)

```bash
make fly-install   # install fly CLI
# then add to shell: export PATH="$HOME/.fly/bin:$PATH"
make fly-login     # authenticate
make fly-setup     # create the app on Fly.io
make fly-secrets   # push secrets from apps/api/.env
make fly-deploy    # deploy
```

### Day-to-day

| Command | What it does |
|---|---|
| `make fly-install` | Install fly CLI via official installer |
| `make fly-login` | Authenticate with Fly.io |
| `make fly-setup` | First-time app creation (run once) |
| `make fly-secrets` | Push all vars from `apps/api/.env` to Fly.io |
| `make fly-secrets-set KEY=X VALUE=Y` | Set a single secret |
| `make fly-secrets-list` | List all secrets (values hidden) |
| `make fly-deploy` | Deploy latest code (remote build) |
| `make fly-status` | Show machine count and health |
| `make fly-logs` | Tail live logs |
| `make fly-logs-error` | Tail logs filtered to errors only |
| `make fly-health` | HTTP GET `/health` on the live API |
| `make fly-ssh` | SSH into the running machine |
| `make fly-scale-down` | Scale to 0 machines (saves credits) |
| `make fly-scale-up` | Scale back to 1 machine |

---

## Vercel — Next.js Admin Dashboard

### First-time setup (run once)

```bash
make vercel-setup   # link admin app to Vercel project
make vercel-env     # push .env.local vars to Vercel production
make vercel-deploy  # deploy
```

### Day-to-day

| Command | What it does |
|---|---|
| `make vercel-setup` | Link admin app to Vercel project (run once) |
| `make vercel-env` | Push `.env.local` vars to Vercel production |
| `make vercel-env-set KEY=X VALUE=Y` | Set a single Vercel env var |
| `make vercel-deploy` | Deploy admin to Vercel production |
| `make vercel-preview` | Deploy a preview (non-production) build |
| `make vercel-logs` | Show latest deployment logs |

---

## Health Check

```bash
make production-health
```

Checks all three services and prints a one-line status for each:
- **API (Fly.io)** — GET `/health`
- **Admin (Vercel)** — HTTP status code
- **Judge0 (ngrok)** — GET `/about` (fails if ASUS machine is offline)
