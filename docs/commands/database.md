# Database Commands

Local PostgreSQL setup and management. Only needed if you want a local database instead of the shared Supabase cloud project.

---

## Do you need a local database?

**No**, if you're just developing features — `apps/api/.env` already points to the shared Supabase cloud project, which works out of the box.

**Yes**, if you want to:
- Run migrations without touching the shared dev data
- Test destructive schema changes in isolation
- Work fully offline

---

## Setup (pick one)

### Option A — Native psql (recommended on macOS/Linux)

```bash
make db-setup
```

What it does:
1. Starts PostgreSQL if it's not running
2. Creates a `secureassess` role with password `secureassess`
3. Creates a `secureassess` database owned by that role
4. Runs all migrations in `apps/api/migrations/`

Prerequisites:
- macOS: `brew install postgresql@16` + `brew services start postgresql@16`
- Linux: `sudo apt install postgresql && sudo systemctl start postgresql`

### Option B — Docker

```bash
make db-setup-docker
```

What it does:
1. Pulls `postgres:16` and starts a container via `docker compose`
2. Waits for the container to be healthy
3. Runs all migrations

Prerequisites: Docker Desktop (macOS) or `docker.io` + `docker compose` (Linux) installed and running.

---

## Day-to-Day Commands

| Command | What it does |
|---|---|
| `make db-start` | Start existing Docker postgres container |
| `make db-stop` | Stop Docker postgres container (data preserved) |
| `make db-status` | Check whether the local DB is reachable |
| `make db-migrate` | Run all `.sql` files in `apps/api/migrations/` in order |
| `make db-seed` | Insert dev seed data (10 questions, 3 assessments) |
| `make db-shell` | Open a `psql` prompt to the local `secureassess` DB |
| `make db-reset` | Drop + recreate DB + re-run all migrations **(destructive)** |

---

## Connection details

All local DB commands use these credentials (matching `DATABASE_URL` in the `.env` files):

```
Host:     localhost
Port:     5432
Database: secureassess
User:     secureassess
Password: secureassess
URL:      postgresql://secureassess:secureassess@localhost:5432/secureassess
```

---

## Migrations

Migrations live in `apps/api/migrations/` as numbered `.sql` files. `make db-migrate` runs them in alphabetical order.

```bash
# Run pending migrations
make db-migrate

# For Supabase cloud (production schema push)
make api-migrate
# equivalent to: cd apps/api && supabase db push
```

---

## Seed Data

```bash
make db-seed
```

Inserts dev data defined in `apps/api/seeds/seed_dev.sql`:
- 10 sample questions (MCQ + coding + text)
- 3 assessments with different configurations
- Test cases for coding questions

Seed is idempotent — safe to run multiple times.
