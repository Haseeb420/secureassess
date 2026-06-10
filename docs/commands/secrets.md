# Secrets Management

How secrets flow from local `.env` files to GitHub Actions, Fly.io, and Vercel.

---

## Overview

```
Local .env files
    │
    ├─ make secrets-sync ──→ GitHub Secrets  (used by CI/CD)
    ├─ make fly-secrets  ──→ Fly.io Secrets  (used by API in production)
    └─ make vercel-env   ──→ Vercel Env Vars (used by admin in production)
```

---

## GitHub Secrets

GitHub secrets are used by CI/CD workflows to inject values at build time.

```bash
# Sync all secrets from local .env files to GitHub
make secrets-sync

# List current secrets (names only — values are always hidden)
gh secret list

# Set a single secret
gh secret set MY_SECRET --body "value"
```

### Current secrets

| Secret name | Used by | Production value |
|---|---|---|
| `VITE_SUPABASE_URL` | Desktop (CI build) | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Desktop (CI build) | Supabase anon key |
| `VITE_API_BASE_URL` | Desktop (CI build) | `https://secureassess-api.fly.dev` |
| `VITE_BETTER_AUTH_URL` | Desktop (CI build) | `https://admin-delta-ecru.vercel.app` |
| `VITE_JUDGE0_URL` | Desktop (CI build) | `https://unkind-freeware-unmoved.ngrok-free.dev` |
| `VITE_EXECUTION_BACKEND` | Desktop (CI build) | `judge0` |
| `SUPABASE_URL` | API (Fly.io) | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | API (Fly.io) | Supabase service_role key |
| `SUPABASE_JWT_SECRET` | API (Fly.io) | Supabase JWT secret |
| `JUDGE0_URL` | API (Fly.io) | `https://unkind-freeware-unmoved.ngrok-free.dev` |
| `EXECUTION_BACKEND` | API (Fly.io) | `judge0` |
| `BETTER_AUTH_SECRET` | API + Admin | Better Auth secret |
| `FLY_API_TOKEN` | CI deploy | Fly.io deploy token |
| `VERCEL_TOKEN` | CI deploy | Vercel deploy token |
| `VERCEL_ORG_ID` | CI deploy | Vercel org ID |
| `VERCEL_PROJECT_ID` | CI deploy | Vercel project ID |

---

## Fly.io Secrets

Secrets set on Fly.io are injected as environment variables into the running API container.

```bash
# Push all required secrets from apps/api/.env
make fly-secrets

# Set a single secret
make fly-secrets-set KEY=JUDGE0_URL VALUE=https://...

# List all secrets (values always hidden)
make fly-secrets-list
# or: fly secrets list --app secureassess-api
```

---

## Vercel Env Vars

Vercel env vars are set per environment (production / preview / development).

```bash
# Push all vars from apps/admin/.env.local to Vercel production
make vercel-env

# Set a single var
make vercel-env-set KEY=BETTER_AUTH_SECRET VALUE=your-secret

# List all vars (values partially hidden)
cd apps/admin && npx vercel env ls
```

---

## Rotating a Secret

1. Generate a new value locally
2. Update the relevant `.env` file
3. Push to all destinations:

```bash
gh secret set SECRET_NAME --body "new-value"              # GitHub
make fly-secrets-set KEY=SECRET_NAME VALUE="new-value"    # Fly.io (if API secret)
make vercel-env-set KEY=SECRET_NAME VALUE="new-value"     # Vercel (if admin secret)
```

4. Redeploy:

```bash
make deploy   # redeploys both API and admin with new values
```
