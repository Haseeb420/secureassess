# SecureAssess — Makefile
# Run `make help` to see all available commands.

.DEFAULT_GOAL := help
.PHONY: help install dev dev-admin dev-desktop dev-api \
        build build-admin build-desktop \
        desktop-mac desktop-mac-intel desktop-mac-universal \
        desktop-windows desktop-linux desktop-all \
        test test-admin test-desktop test-api test-rust \
        lint lint-admin lint-desktop lint-api \
        type-check type-check-admin type-check-desktop \
        api-start api-dev api-migrate \
        clean clean-rust clean-node \
        setup-rust setup-python check-deps \
        serve \
        version version-next-patch version-next-minor version-next-major \
        release-patch release-minor release-major \
        release-status release-watch release-logs \
        releases-list release-open release-delete-old \
        db-setup db-setup-docker db-start db-stop db-shell db-migrate db-seed db-reset db-status

# ─── Colors ───────────────────────────────────────────────────────────────────
BOLD  := \033[1m
RESET := \033[0m
CYAN  := \033[36m
GREEN := \033[32m
YELLOW := \033[33m
RED   := \033[31m

# ─── Helpers ──────────────────────────────────────────────────────────────────
define log
	@printf "$(CYAN)$(BOLD)▶ $(1)$(RESET)\n"
endef

# ─── Help ─────────────────────────────────────────────────────────────────────
help:
	@printf "\n$(BOLD)SecureAssess — Available Commands$(RESET)\n"
	@printf "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
	@printf "\n$(BOLD)Deploy — Fly.io (FastAPI)$(RESET)\n"
	@printf "  $(CYAN)make fly-setup$(RESET)            First-time Fly.io app creation (run once)\n"
	@printf "  $(CYAN)make fly-secrets$(RESET)          Push all env vars from apps/api/.env to Fly.io\n"
	@printf "  $(CYAN)make fly-deploy$(RESET)           Deploy FastAPI to Fly.io\n"
	@printf "  $(CYAN)make fly-status$(RESET)           Show Fly.io app status\n"
	@printf "  $(CYAN)make fly-logs$(RESET)             Tail live logs from Fly.io\n"
	@printf "  $(CYAN)make fly-health$(RESET)           Check /health on the live API\n"
	@printf "  $(CYAN)make fly-ssh$(RESET)              SSH into the running machine\n"
	@printf "  $(CYAN)make fly-scale-down$(RESET)       Scale to 0 machines (saves credits)\n"
	@printf "  $(CYAN)make fly-scale-up$(RESET)         Scale back to 1 machine\n"
	@printf "\n$(BOLD)Deploy — Vercel (Next.js Admin)$(RESET)\n"
	@printf "  $(CYAN)make vercel-setup$(RESET)         Link admin app to Vercel project (run once)\n"
	@printf "  $(CYAN)make vercel-env$(RESET)           Push .env.local vars to Vercel\n"
	@printf "  $(CYAN)make vercel-deploy$(RESET)        Deploy admin dashboard to Vercel production\n"
	@printf "  $(CYAN)make vercel-preview$(RESET)       Deploy a preview build\n"
	@printf "  $(CYAN)make vercel-logs$(RESET)          Show latest Vercel deployment logs\n"
	@printf "\n$(BOLD)Deploy — Combined$(RESET)\n"
	@printf "  $(CYAN)make deploy$(RESET)               Deploy both API (Fly.io) and admin (Vercel)\n"
	@printf "  $(CYAN)make deploy-trigger$(RESET)       Trigger deploy via GitHub Actions (no release)\n"
	@printf "  $(CYAN)make deploy-status$(RESET)        Show recent deploy workflow runs\n"
	@printf "  $(CYAN)make production-health$(RESET)    Check health of all production services\n"
	@printf "\n$(BOLD)Database — Local Dev$(RESET)\n"
	@printf "  $(CYAN)make db-setup$(RESET)             First-time native psql setup (creates user + db 'secureassess')\n"
	@printf "  $(CYAN)make db-setup-docker$(RESET)      First-time Docker setup (pulls postgres:16, starts container)\n"
	@printf "  $(CYAN)make db-start$(RESET)             Start existing Docker postgres container\n"
	@printf "  $(CYAN)make db-stop$(RESET)              Stop Docker postgres container (data preserved)\n"
	@printf "  $(CYAN)make db-status$(RESET)            Show whether the local DB is reachable\n"
	@printf "  $(CYAN)make db-migrate$(RESET)           Run all SQL migrations against local 'secureassess' DB\n"
	@printf "  $(CYAN)make db-seed$(RESET)              Insert dev seed data (10 questions · 3 assessments · test cases)\n"
	@printf "  $(CYAN)make db-shell$(RESET)             Open a psql prompt to the local 'secureassess' DB\n"
	@printf "  $(CYAN)make db-reset$(RESET)             Drop and recreate 'secureassess' DB, then re-migrate $(RED)(destructive)$(RESET)\n"
	@printf "\n$(BOLD)Setup$(RESET)\n"
	@printf "  $(CYAN)make install$(RESET)              Install all dependencies (pnpm + Python)\n"
	@printf "  $(CYAN)make setup-rust$(RESET)           Install required Rust targets for cross-compilation\n"
	@printf "  $(CYAN)make setup-python$(RESET)         Create venv and install API dependencies\n"
	@printf "  $(CYAN)make check-deps$(RESET)           Verify all required tools are installed\n"
	@printf "\n$(BOLD)Development$(RESET)\n"
	@printf "  $(CYAN)make dev$(RESET)                  Start all apps (admin + desktop frontend + api)\n"
	@printf "  $(CYAN)make dev-admin$(RESET)            Start admin dashboard only (Next.js, port 3000)\n"
	@printf "  $(CYAN)make dev-desktop$(RESET)          Start desktop Tauri app (Vite + Rust)\n"
	@printf "  $(CYAN)make dev-desktop-vite$(RESET)     Start desktop Vite frontend only (port 5173)\n"
	@printf "  $(CYAN)make dev-api$(RESET)              Start FastAPI server (port 8000)\n"
	@printf "\n$(BOLD)Build$(RESET)\n"
	@printf "  $(CYAN)make build$(RESET)                Build all apps\n"
	@printf "  $(CYAN)make build-admin$(RESET)          Build admin dashboard\n"
	@printf "  $(CYAN)make build-desktop$(RESET)        Build desktop app for current platform\n"
	@printf "\n$(BOLD)Desktop — Cross-Platform Builds$(RESET)\n"
	@printf "  $(CYAN)make desktop-mac$(RESET)          Build macOS ARM binary (Apple Silicon)\n"
	@printf "  $(CYAN)make desktop-mac-intel$(RESET)    Build macOS Intel binary (x86_64)\n"
	@printf "  $(CYAN)make desktop-mac-universal$(RESET) Build macOS Universal binary (ARM + Intel)\n"
	@printf "  $(CYAN)make desktop-windows$(RESET)      Build Windows binary (requires cross toolchain)\n"
	@printf "  $(CYAN)make desktop-linux$(RESET)        Build Linux binary (requires cross toolchain)\n"
	@printf "  $(CYAN)make desktop-all$(RESET)          Build for ALL platforms (macOS universal + Win + Linux)\n"
	@printf "\n$(BOLD)Testing$(RESET)\n"
	@printf "  $(CYAN)make test$(RESET)                 Run all tests\n"
	@printf "  $(CYAN)make test-admin$(RESET)           Run admin tests\n"
	@printf "  $(CYAN)make test-desktop$(RESET)         Run desktop Vitest tests\n"
	@printf "  $(CYAN)make test-api$(RESET)             Run API pytest suite\n"
	@printf "  $(CYAN)make test-rust$(RESET)            Run Rust unit tests\n"
	@printf "\n$(BOLD)Lint & Type-Check$(RESET)\n"
	@printf "  $(CYAN)make lint$(RESET)                 Lint all apps\n"
	@printf "  $(CYAN)make lint-admin$(RESET)           Lint admin dashboard\n"
	@printf "  $(CYAN)make lint-desktop$(RESET)         Lint desktop frontend\n"
	@printf "  $(CYAN)make lint-api$(RESET)             Lint API (ruff + black check)\n"
	@printf "  $(CYAN)make type-check$(RESET)           Type-check all TypeScript apps\n"
	@printf "\n$(BOLD)Remote Dev (ngrok + desktop testing)$(RESET)\n"
	@printf "  $(CYAN)make serve$(RESET)                Start API + admin + ngrok together (no tmux needed) ★\n"
	@printf "  $(CYAN)make dev-ngrok$(RESET)            Same as serve but in tmux panes (requires tmux)\n"
	@printf "  $(CYAN)make ngrok$(RESET)                ngrok only — API + admin already running\n"
	@printf "  $(CYAN)make ngrok-urls$(RESET)           Print live tunnel URLs from running ngrok\n"
	@printf "  $(CYAN)make ngrok-inspect$(RESET)        Open ngrok web inspector (localhost:4040)\n"
	@printf "\n$(BOLD)Port map$(RESET)\n"
	@printf "  FastAPI  :8000    ← direct dev / Rust sync worker\n"
	@printf "  Next.js  :3000    ← admin dashboard + desktop proxy\n"
	@printf "  ngrok    :443     → :3000  (static domain used by desktop .env)\n"
	@printf "\n$(BOLD)Device Testing — Build & Share$(RESET)\n"
	@printf "  $(CYAN)make build-mac$(RESET)            Build macOS installer (uses NGROK_STATIC_DOMAIN from .env)\n"
	@printf "  $(CYAN)make build-mac-url$(RESET)        Build macOS installer with a prompted API URL\n"
	@printf "  $(CYAN)make build-mac-local$(RESET)      Build macOS installer pointing to localhost:8000\n"
	@printf "  $(CYAN)make serve-builds$(RESET)         Serve dist/installers over HTTP on your LAN\n"
	@printf "  $(CYAN)make serve-builds-port$(RESET)    Serve builds on custom port (PORT=8080)\n"
	@printf "  $(CYAN)make open-builds$(RESET)          Open dist/installers in Finder\n"
	@printf "  $(CYAN)make release-draft$(RESET)        Build macOS + create GitHub draft release\n"
	@printf "\n$(BOLD)Utilities$(RESET)\n"
	@printf "  $(CYAN)make ip$(RESET)                   Show your LAN IP addresses\n"
	@printf "  $(CYAN)make ports$(RESET)                Show which project ports are in use\n"
	@printf "  $(CYAN)make env-check$(RESET)            Verify all required env vars are set\n"
	@printf "  $(CYAN)make format$(RESET)               Format code (prettier + ruff + rustfmt)\n"
	@printf "\n$(BOLD)API Utilities$(RESET)\n"
	@printf "  $(CYAN)make api-dev$(RESET)              Start API with hot-reload (uvicorn)\n"
	@printf "  $(CYAN)make api-migrate$(RESET)          Run Supabase migrations\n"
	@printf "\n$(BOLD)Cleanup$(RESET)\n"
	@printf "  $(CYAN)make clean$(RESET)                Remove all build artifacts and caches\n"
	@printf "  $(CYAN)make clean-rust$(RESET)           Remove Rust target directory\n"
	@printf "  $(CYAN)make clean-node$(RESET)           Remove node_modules and .next caches\n"
	@printf "  $(CYAN)make clean-all$(RESET)            Full reset (node_modules + .venv + artifacts)\n"
	@printf "  $(CYAN)make clean-sessions$(RESET)       Kill all project tmux sessions\n"
	@printf "\n"

# ─── Database — Local Dev ─────────────────────────────────────────────────────
# Credentials match DATABASE_URL in all .env files:
#   postgresql://secureassess:secureassess@localhost:5432/secureassess

DB_NAME   := secureassess
DB_USER   := secureassess
DB_PASS   := secureassess
DB_HOST   := localhost
DB_PORT   := 5432
DB_URL    := postgresql://$(DB_USER):$(DB_PASS)@$(DB_HOST):$(DB_PORT)/$(DB_NAME)
MIGRATIONS_DIR := apps/api/migrations

db-setup: ## Native psql: create role + database (no Docker required)
	$(call log,Setting up local PostgreSQL database '$(DB_NAME)')
	@command -v psql >/dev/null 2>&1 || { \
		printf "$(RED)✗ psql not found.$(RESET)\n"; \
		printf "  macOS:      brew install postgresql@16 && brew services start postgresql@16\n"; \
		printf "  Linux Mint: sudo apt install postgresql postgresql-contrib && sudo systemctl start postgresql\n"; \
		exit 1; \
	}
	@psql -U postgres -tc "SELECT 1 FROM pg_roles WHERE rolname='$(DB_USER)'" 2>/dev/null \
		| grep -q 1 \
		|| psql -U postgres -c "CREATE ROLE $(DB_USER) WITH LOGIN PASSWORD '$(DB_PASS)';" \
		&& printf "$(GREEN)✓ Role '$(DB_USER)' ready$(RESET)\n"
	@psql -U postgres -tc "SELECT 1 FROM pg_database WHERE datname='$(DB_NAME)'" 2>/dev/null \
		| grep -q 1 \
		|| psql -U postgres -c "CREATE DATABASE $(DB_NAME) OWNER $(DB_USER);" \
		&& printf "$(GREEN)✓ Database '$(DB_NAME)' ready$(RESET)\n"
	@psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE $(DB_NAME) TO $(DB_USER);" 2>/dev/null || true
	$(MAKE) db-migrate
	@printf "$(GREEN)Local DB ready. Run 'make db-seed' to load test data.$(RESET)\n"
	@printf "$(GREEN)DATABASE_URL=$(DB_URL)$(RESET)\n"

db-setup-docker: ## Docker: pull postgres:16, create container, run migrations
	$(call log,Starting local PostgreSQL via Docker)
	@command -v docker >/dev/null 2>&1 || { \
		printf "$(RED)✗ Docker not found.$(RESET)\n"; \
		printf "  macOS:      https://docs.docker.com/desktop/install/mac-install/\n"; \
		printf "  Linux Mint: sudo apt install docker.io && sudo systemctl start docker\n"; \
		exit 1; \
	}
	@docker compose up -d postgres
	@printf "$(YELLOW)Waiting for postgres to be healthy...$(RESET)\n"
	@until docker compose exec postgres pg_isready -U $(DB_USER) -d $(DB_NAME) >/dev/null 2>&1; do \
		sleep 1; \
	done
	@printf "$(GREEN)✓ PostgreSQL container is up$(RESET)\n"
	$(MAKE) db-migrate
	@printf "$(GREEN)Local DB ready. Run 'make db-seed' to load test data.$(RESET)\n"
	@printf "$(GREEN)DATABASE_URL=$(DB_URL)$(RESET)\n"

db-start: ## Start existing Docker postgres container
	$(call log,Starting postgres container)
	@docker compose start postgres
	@printf "$(GREEN)postgres started$(RESET)\n"

db-stop: ## Stop Docker postgres container (data is preserved in the volume)
	$(call log,Stopping postgres container)
	@docker compose stop postgres
	@printf "$(YELLOW)postgres stopped. Data is preserved. Run 'make db-start' to resume.$(RESET)\n"

db-status: ## Check whether the local DB is reachable
	$(call log,Checking local DB connection)
	@psql "$(DB_URL)" -c "SELECT version();" >/dev/null 2>&1 \
		&& printf "$(GREEN)✓ DB reachable at $(DB_URL)$(RESET)\n" \
		|| printf "$(RED)✗ Cannot connect to $(DB_URL)\n  Run: make db-setup  or  make db-setup-docker$(RESET)\n"

db-migrate: ## Run all SQL migrations in apps/api/migrations/ (in order)
	$(call log,Running migrations against '$(DB_NAME)')
	@command -v psql >/dev/null 2>&1 || { printf "$(RED)✗ psql not found$(RESET)\n"; exit 1; }
	@for f in $$(ls $(MIGRATIONS_DIR)/*.sql 2>/dev/null | sort); do \
		printf "  $(CYAN)→ $$f$(RESET)\n"; \
		psql "$(DB_URL)" -f "$$f" || exit 1; \
	done
	@printf "$(GREEN)Migrations complete$(RESET)\n"

db-seed: ## Insert dev seed data: 10 questions, test cases, 3 assessments (idempotent)
	$(call log,Seeding local database with dev data)
	@psql "$(DB_URL)" -f apps/api/seeds/seed_dev.sql
	@printf "$(GREEN)Seed complete. Run 'make db-shell' to inspect.$(RESET)\n"

db-shell: ## Open a psql prompt connected to the local 'secureassess' database
	$(call log,Opening psql shell for '$(DB_NAME)')
	@psql "$(DB_URL)"

db-reset: ## Drop and recreate 'secureassess' DB, then re-run all migrations (DESTRUCTIVE)
	$(call log,Resetting local database '$(DB_NAME)')
	@printf "$(RED)$(BOLD)WARNING: This will destroy all data in '$(DB_NAME)'. Continue? [y/N] $(RESET)"; \
	read ans; [ "$$ans" = "y" ] || { echo "Aborted."; exit 1; }
	@psql -U postgres -c "DROP DATABASE IF EXISTS $(DB_NAME);" 2>/dev/null \
		|| docker compose exec postgres psql -U $(DB_USER) -c "DROP DATABASE IF EXISTS $(DB_NAME);" 2>/dev/null || true
	@psql -U postgres -c "CREATE DATABASE $(DB_NAME) OWNER $(DB_USER);" 2>/dev/null \
		|| docker compose exec postgres psql -U $(DB_USER) -c "CREATE DATABASE $(DB_NAME);" 2>/dev/null
	$(MAKE) db-migrate
	@printf "$(GREEN)Database reset complete$(RESET)\n"

# ─── Setup ────────────────────────────────────────────────────────────────────
install:
	$(call log,Installing Node dependencies via pnpm)
	pnpm install
	$(call log,Installing Python dependencies)
	cd apps/api && pip install -r requirements.txt

setup-rust:
	$(call log,Adding Rust targets for cross-compilation)
	rustup target add aarch64-apple-darwin
	rustup target add x86_64-apple-darwin
	rustup target add x86_64-pc-windows-msvc
	rustup target add x86_64-unknown-linux-gnu
	@printf "$(GREEN)Rust targets installed. Note: Windows/Linux builds also require OS-specific linkers.$(RESET)\n"
	@printf "$(YELLOW)See docs/commands.md for cross-compilation setup instructions.$(RESET)\n"

setup-python:
	$(call log,Setting up Python virtual environment)
	cd apps/api && python3 -m venv .venv && .venv/bin/pip install --upgrade pip && .venv/bin/pip install -r requirements.txt
	@printf "$(GREEN)Python venv ready. Activate with: source apps/api/.venv/bin/activate$(RESET)\n"

check-deps:
	$(call log,Checking required tools)
	@command -v pnpm    >/dev/null 2>&1 || (printf "$(RED)✗ pnpm not found. Install: npm i -g pnpm$(RESET)\n"; exit 1)
	@command -v cargo   >/dev/null 2>&1 || (printf "$(RED)✗ cargo not found. Install Rust: https://rustup.rs$(RESET)\n"; exit 1)
	@command -v python3 >/dev/null 2>&1 || (printf "$(RED)✗ python3 not found. Install: brew install python@3.12$(RESET)\n"; exit 1)
	@command -v node    >/dev/null 2>&1 || (printf "$(RED)✗ node not found$(RESET)\n"; exit 1)
	@printf "$(GREEN)✓ pnpm   $(RESET)$$(pnpm --version)\n"
	@printf "$(GREEN)✓ cargo  $(RESET)$$(cargo --version)\n"
	@printf "$(GREEN)✓ python $(RESET)$$(python3 --version)\n"
	@printf "$(GREEN)✓ node   $(RESET)$$(node --version)\n"
	@printf "$(GREEN)All dependencies present.$(RESET)\n"

# ─── Development ──────────────────────────────────────────────────────────────
dev:
	$(call log,Starting all apps in parallel)
	pnpm dev

dev-admin:
	$(call log,Starting admin dashboard on port 3000)
	pnpm --filter admin dev

dev-desktop:
	$(call log,Starting Tauri desktop app)
	pnpm --filter desktop tauri:dev

dev-desktop-vite:
	$(call log,Starting desktop Vite frontend only on port 5173)
	pnpm --filter desktop dev

dev-api:
	$(call log,Starting FastAPI server on port 8000)
	cd apps/api && uvicorn main:app --reload --port 8000

# ─── Build ────────────────────────────────────────────────────────────────────
build:
	$(call log,Building all apps)
	pnpm build

build-admin:
	$(call log,Building admin dashboard)
	pnpm --filter admin build

build-desktop:
	$(call log,Building desktop app for current platform)
	pnpm --filter desktop tauri:build

# ─── Desktop Cross-Platform Builds ───────────────────────────────────────────
desktop-mac:
	$(call log,Building desktop for macOS ARM64 \(Apple Silicon\))
	cd apps/desktop && pnpm tauri build --target aarch64-apple-darwin

desktop-mac-intel:
	$(call log,Building desktop for macOS x86_64 \(Intel\))
	cd apps/desktop && pnpm tauri build --target x86_64-apple-darwin

desktop-mac-universal:
	$(call log,Building desktop Universal macOS binary \(ARM + Intel\))
	cd apps/desktop && pnpm tauri build --target universal-apple-darwin

desktop-windows:
	$(call log,Building desktop for Windows x64)
	@printf "$(YELLOW)Requires: Windows SDK linker \(xwin\) or a Windows cross-compilation environment.$(RESET)\n"
	@printf "$(YELLOW)See docs/commands.md for full setup instructions.$(RESET)\n"
	cd apps/desktop && pnpm tauri build --target x86_64-pc-windows-msvc

desktop-linux:
	$(call log,Building desktop for Linux x86_64)
	@printf "$(YELLOW)Requires: Linux cross-compilation toolchain. See docs/commands.md.$(RESET)\n"
	cd apps/desktop && pnpm tauri build --target x86_64-unknown-linux-gnu

desktop-all:
	$(call log,Building desktop for ALL platforms)
	@printf "$(YELLOW)macOS Universal → Windows x64 → Linux x64$(RESET)\n"
	$(MAKE) desktop-mac-universal
	$(MAKE) desktop-windows
	$(MAKE) desktop-linux
	@printf "$(GREEN)All platform builds complete. Artifacts in apps/desktop/src-tauri/target/$(RESET)\n"

# ─── Testing ──────────────────────────────────────────────────────────────────
test:
	$(call log,Running all tests)
	pnpm test
	$(MAKE) test-rust
	$(MAKE) test-api

test-admin:
	$(call log,Running admin tests)
	pnpm --filter admin test

test-desktop:
	$(call log,Running desktop Vitest tests)
	pnpm --filter desktop test

test-rust:
	$(call log,Running Rust unit tests)
	cd apps/desktop/src-tauri && cargo test

test-api:
	$(call log,Running API pytest suite)
	cd apps/api && python3 -m pytest tests/ -v

# ─── Lint & Type-Check ────────────────────────────────────────────────────────
lint:
	$(call log,Linting all apps)
	pnpm lint
	$(MAKE) lint-api

lint-admin:
	$(call log,Linting admin dashboard)
	pnpm --filter admin lint

lint-desktop:
	$(call log,Linting desktop frontend)
	pnpm --filter desktop lint

lint-api:
	$(call log,Linting API \(ruff + black\))
	cd apps/api && python3 -m ruff check . && python3 -m black --check .

type-check:
	$(call log,Type-checking all TypeScript apps)
	pnpm type-check

type-check-admin:
	$(call log,Type-checking admin dashboard)
	pnpm --filter admin type-check

type-check-desktop:
	$(call log,Type-checking desktop frontend)
	pnpm --filter desktop type-check

# ─── API Utilities ────────────────────────────────────────────────────────────
api-dev:
	$(call log,Starting API with hot-reload)
	cd apps/api && uvicorn main:app --reload --host 0.0.0.0 --port 8000

api-migrate:
	$(call log,Running Supabase migrations)
	cd apps/api && supabase db push

# ─── Cleanup ──────────────────────────────────────────────────────────────────
clean: clean-node clean-rust
	$(call log,Removing turbo cache)
	rm -rf .turbo
	@printf "$(GREEN)Clean complete.$(RESET)\n"

clean-node:
	$(call log,Removing node_modules and Next.js caches)
	find . -name "node_modules" -not -path "*/target/*" -prune -exec rm -rf {} + 2>/dev/null; true
	find . -name ".next" -prune -exec rm -rf {} + 2>/dev/null; true
	find . -name "dist" -not -path "*/target/*" -prune -exec rm -rf {} + 2>/dev/null; true

clean-rust:
	$(call log,Removing Rust build artifacts)
	cd apps/desktop/src-tauri && cargo clean

# ─────────────────────────────────────────────────────────────────
# SecureAssess Dev Commands
# Run `make help` to see all available commands
# ─────────────────────────────────────────────────────────────────

.PHONY: setup check copy-env \
        ngrok ngrok-api ngrok-admin ngrok-urls ngrok-inspect dev-ngrok \
        build-mac build-mac-url build-mac-local open-builds serve-builds serve-builds-port \
        format \
        clean-all clean-sessions \
        release-draft \
        ip ports env-check \
        fly-login fly-setup fly-secrets fly-secrets-set fly-secrets-list \
        fly-deploy fly-status fly-logs fly-logs-error fly-ssh fly-health \
        fly-open fly-scale-down fly-scale-up fly-destroy \
        vercel-login vercel-setup vercel-env vercel-env-set vercel-env-list \
        vercel-deploy vercel-preview vercel-logs vercel-open \
        deploy deploy-api deploy-admin deploy-trigger deploy-status production-health

# ─── SETUP ────────────────────────────────────────────────────────

setup: check install copy-env ## First-time project setup (check deps, install, copy envs)
	@echo ""
	@echo "Setup complete. Edit the .env files then run: make dev"

check: ## Check all required tools are installed
	@bash scripts/check-deps.sh

copy-env: ## Copy .env.example files to .env (skips if .env already exists)
	@bash scripts/setup-env.sh

# ─── NGROK ────────────────────────────────────────────────────────

ngrok: ## Start ngrok tunnels (API + admin). API uses your static domain.
	@echo "Starting ngrok tunnels..."
	@echo "Make sure apps/api/.env has NGROK_STATIC_DOMAIN set."
	@bash scripts/start-ngrok.sh

ngrok-api: ## Start ngrok tunnel for API only (port 8000)
	@source apps/api/.env 2>/dev/null; \
	if [ -n "$$NGROK_STATIC_DOMAIN" ]; then \
		ngrok http 8000 --domain $$NGROK_STATIC_DOMAIN; \
	else \
		echo "NGROK_STATIC_DOMAIN not set. Using dynamic URL."; \
		ngrok http 8000; \
	fi

ngrok-admin: ## Start ngrok tunnel for admin dashboard only (port 3000)
	@ngrok http 3000

ngrok-urls: ## Show current live ngrok tunnel URLs
	@bash scripts/get-ngrok-urls.sh

ngrok-inspect: ## Open ngrok inspection dashboard in browser
	@open http://localhost:4040 || xdg-open http://localhost:4040

# ─── DEV WITH NGROK ───────────────────────────────────────────────

serve: ## Start API + admin + ngrok together, no tmux required (recommended for desktop testing)
	$(call log,Starting API + admin + ngrok — Ctrl+C stops all)
	@bash scripts/dev-stack.sh

dev-ngrok: ## Start api + admin + ngrok in tmux (three panes, tmux required)
	@command -v tmux >/dev/null 2>&1 || { echo "tmux required — install with: brew install tmux (macOS) or sudo apt install tmux (Linux)  |  or use: make serve"; exit 1; }
	@tmux new-session -d -s secureassess-ngrok -n api   'bash scripts/start-api.sh; read'
	@tmux new-window -t secureassess-ngrok -n admin  'bash scripts/start-admin.sh; read'
	@tmux new-window -t secureassess-ngrok -n ngrok  'bash scripts/start-ngrok.sh; read'
	@tmux attach -t secureassess-ngrok

# ─── BUILD ────────────────────────────────────────────────────────

build-mac: ## Build desktop app for macOS (uses NGROK_STATIC_DOMAIN from .env)
	@bash scripts/build-desktop-mac.sh

build-mac-url: ## Build desktop app for macOS with a custom API URL
	@read -p "Enter API URL (e.g. https://your-domain.ngrok-free.app): " url; \
	bash scripts/build-desktop-mac.sh "$$url"

build-mac-local: ## Build desktop app for macOS pointing to localhost:8000
	@VITE_API_BASE_URL=http://localhost:8000 \
	VITE_SUPABASE_URL=$$(grep VITE_SUPABASE_URL apps/desktop/.env | cut -d= -f2) \
	VITE_SUPABASE_ANON_KEY=$$(grep VITE_SUPABASE_ANON_KEY apps/desktop/.env | cut -d= -f2) \
	cd apps/desktop && pnpm tauri build

open-builds: ## Open the dist/installers folder in Finder
	@mkdir -p dist/installers
	@open dist/installers

serve-builds: ## Serve built installers over HTTP on your local network
	@bash scripts/serve-builds.sh

serve-builds-port: ## Serve builds on a custom port (usage: make serve-builds-port PORT=8080)
	@bash scripts/serve-builds.sh $(PORT)

# ─── CODE QUALITY ─────────────────────────────────────────────────

format: ## Format code (prettier + ruff + rustfmt)
	@pnpm format 2>/dev/null || true
	@cd apps/api && source .venv/bin/activate 2>/dev/null && ruff format . 2>/dev/null || true
	@cd apps/desktop/src-tauri && cargo fmt 2>/dev/null || true

# ─── CLEAN ────────────────────────────────────────────────────────

clean-all: ## Remove everything including node_modules and .venv (full reset)
	$(MAKE) clean
	@rm -rf node_modules apps/*/node_modules packages/*/node_modules
	@rm -rf apps/api/.venv
	@echo "Full clean complete. Run: make setup"

clean-sessions: ## Kill all tmux sessions created by this project
	@tmux kill-session -t secureassess 2>/dev/null || true
	@tmux kill-session -t secureassess-ngrok 2>/dev/null || true
	@echo "tmux sessions closed."

# ─── RELEASE ──────────────────────────────────────────────────────

release-draft: ## Build macOS and create a GitHub draft release with the installer
	@command -v gh >/dev/null 2>&1 || { echo "GitHub CLI not found: brew install gh"; exit 1; }
	$(MAKE) build-mac
	@VERSION=$$(date +%Y%m%d-%H%M); \
	TAG="test-$$VERSION"; \
	echo "Creating draft release $$TAG..."; \
	gh release create "$$TAG" dist/installers/*.dmg \
		--title "Test Build $$VERSION" \
		--notes "Automated test build. Not for production." \
		--draft
	@echo ""
	@echo "Draft release created. Go to GitHub → Releases to share the download link."

# ─── UTILITIES ────────────────────────────────────────────────────

ip: ## Show your laptop's local network IP (for LAN testing)
	@echo "Your LAN IP addresses:"
	@ifconfig | grep "inet " | grep -v "127.0.0.1" | awk '{print "  " $$2}'
	@echo ""
	@echo "Devices on the same WiFi can reach you at these IPs."

ports: ## Show which ports are currently in use by this project
	@echo "SecureAssess ports:"
	@lsof -i :8000 -i :3000 -i :5173 -i :4040 2>/dev/null | grep LISTEN | awk '{print "  " $$1 "\t" $$9}' || echo "No ports in use."

env-check: ## Verify all required env vars are set across all apps
	@echo "Checking environment variables..."
	@echo ""
	@echo "FastAPI (apps/api/.env):"
	@for var in ENVIRONMENT SUPABASE_URL SUPABASE_SERVICE_KEY BETTER_AUTH_SECRET NGROK_STATIC_DOMAIN; do \
		val=$$(grep "^$$var=" apps/api/.env 2>/dev/null | cut -d= -f2); \
		if [ -n "$$val" ]; then \
			echo "  ✓  $$var"; \
		else \
			echo "  ✗  $$var  ← not set"; \
		fi; \
	done
	@echo ""
	@echo "Desktop (apps/desktop/.env):"
	@for var in ENVIRONMENT VITE_API_BASE_URL VITE_SUPABASE_URL VITE_SUPABASE_ANON_KEY; do \
		val=$$(grep "^$$var=" apps/desktop/.env 2>/dev/null | cut -d= -f2); \
		if [ -n "$$val" ]; then \
			echo "  ✓  $$var"; \
		else \
			echo "  ✗  $$var  ← not set"; \
		fi; \
	done
	@echo ""
	@echo "Admin (apps/admin/.env.local):"
	@for var in ENVIRONMENT NEXT_PUBLIC_SUPABASE_URL API_BASE_URL BETTER_AUTH_SECRET; do \
		val=$$(grep "^$$var=" apps/admin/.env.local 2>/dev/null | cut -d= -f2); \
		if [ -n "$$val" ]; then \
			echo "  ✓  $$var"; \
		else \
			echo "  ✗  $$var  ← not set"; \
		fi; \
	done

# ─── RELEASE MANAGEMENT ───────────────────────────────────────────

version: ## Show current version
	@cat VERSION

version-next-patch: ## Preview what next patch version would be
	@V=$$(cat VERSION); IFS='.' read -r MA MI PA <<< "$$V"; echo "Next patch: $$MA.$$MI.$$((PA+1))"

version-next-minor: ## Preview what next minor version would be
	@V=$$(cat VERSION); IFS='.' read -r MA MI PA <<< "$$V"; echo "Next minor: $$MA.$$((MI+1)).0"

version-next-major: ## Preview what next major version would be
	@V=$$(cat VERSION); IFS='.' read -r MA MI PA <<< "$$V"; echo "Next major: $$((MA+1)).0.0"

release-patch: ## Manually trigger a patch release via GitHub Actions
	@command -v gh >/dev/null 2>&1 || { echo "Install GitHub CLI: brew install gh"; exit 1; }
	@gh workflow run release.yml -f bump=patch
	@echo "Patch release triggered. Check: gh run list --workflow=release.yml"

release-minor: ## Manually trigger a minor release via GitHub Actions
	@command -v gh >/dev/null 2>&1 || { echo "Install GitHub CLI: brew install gh"; exit 1; }
	@gh workflow run release.yml -f bump=minor
	@echo "Minor release triggered. Check: gh run list --workflow=release.yml"

release-major: ## Manually trigger a major release via GitHub Actions
	@command -v gh >/dev/null 2>&1 || { echo "Install GitHub CLI: brew install gh"; exit 1; }
	@gh workflow run release.yml -f bump=major
	@echo "Major release triggered. Check: gh run list --workflow=release.yml"

release-status: ## Show status of latest release workflow run
	@command -v gh >/dev/null 2>&1 || { echo "Install GitHub CLI: brew install gh"; exit 1; }
	@gh run list --workflow=release.yml --limit 5

release-watch: ## Watch the latest release workflow run live
	@command -v gh >/dev/null 2>&1 || { echo "Install GitHub CLI: brew install gh"; exit 1; }
	@RUN_ID=$$(gh run list --workflow=release.yml --limit 1 --json databaseId -q '.[0].databaseId'); \
	gh run watch $$RUN_ID

release-logs: ## Show logs from the latest release run
	@command -v gh >/dev/null 2>&1 || { echo "Install GitHub CLI: brew install gh"; exit 1; }
	@RUN_ID=$$(gh run list --workflow=release.yml --limit 1 --json databaseId -q '.[0].databaseId'); \
	gh run view $$RUN_ID --log

releases-list: ## List all GitHub releases
	@command -v gh >/dev/null 2>&1 || { echo "Install GitHub CLI: brew install gh"; exit 1; }
	@gh release list --limit 10

release-open: ## Open the latest release page in browser
	@command -v gh >/dev/null 2>&1 || { echo "Install GitHub CLI: brew install gh"; exit 1; }
	@gh release view --web

release-delete-old: ## Delete releases older than 10, keeping the 10 most recent
	@command -v gh >/dev/null 2>&1 || { echo "Install GitHub CLI: brew install gh"; exit 1; }
	@echo "Keeping 10 most recent releases, deleting older ones..."
	@gh release list --limit 100 --json tagName -q '.[10:][].tagName' | \
		xargs -I{} gh release delete {} --yes --cleanup-tag 2>/dev/null || true
	@echo "Done."

# ─── FLY.IO (FastAPI) ─────────────────────────────────────────────

fly-login: ## Log into Fly.io
	flyctl auth login

fly-setup: ## First-time Fly.io app creation (run once)
	@command -v flyctl >/dev/null 2>&1 || { echo "Install: brew install flyctl"; exit 1; }
	@cd apps/api && flyctl launch \
		--name secureassess-api \
		--region sin \
		--no-deploy \
		--copy-config
	@echo ""
	@echo "App created. Now set secrets with: make fly-secrets"

fly-secrets: ## Set all required environment variables on Fly.io
	@command -v flyctl >/dev/null 2>&1 || { echo "Install: brew install flyctl"; exit 1; }
	@cd apps/api && \
	flyctl secrets set \
		SUPABASE_URL="$$(grep SUPABASE_URL .env | cut -d= -f2)" \
		SUPABASE_SERVICE_KEY="$$(grep SUPABASE_SERVICE_KEY .env | cut -d= -f2)" \
		SUPABASE_JWT_SECRET="$$(grep SUPABASE_JWT_SECRET .env | cut -d= -f2)" \
		BETTER_AUTH_SECRET="$$(grep BETTER_AUTH_SECRET .env | cut -d= -f2)" \
		BETTER_AUTH_URL="$$(grep BETTER_AUTH_URL .env | cut -d= -f2)" \
		LOG_LEVEL="INFO" \
		ENVIRONMENT="production" \
		DATABASE_URL="$$(grep '^# PROD: DATABASE_URL=' .env | sed 's/^# PROD: DATABASE_URL=//')"
	@echo "Secrets set. Run: make fly-deploy"

fly-secrets-set: ## Set a single secret (usage: make fly-secrets-set KEY=VALUE)
	@cd apps/api && flyctl secrets set $(KEY)="$(VALUE)"

fly-secrets-list: ## List all secrets set on Fly.io (values hidden)
	@cd apps/api && flyctl secrets list

fly-deploy: ## Deploy FastAPI to Fly.io
	@command -v flyctl >/dev/null 2>&1 || { echo "Install: brew install flyctl"; exit 1; }
	@echo "Deploying FastAPI to Fly.io..."
	@cd apps/api && flyctl deploy --remote-only --wait-timeout 120
	@echo ""
	@echo "API deployed. URL: https://secureassess-api.fly.dev"

fly-status: ## Show Fly.io app status
	@cd apps/api && flyctl status

fly-logs: ## Tail live logs from Fly.io
	@cd apps/api && flyctl logs

fly-logs-error: ## Show only error logs from Fly.io
	@cd apps/api && flyctl logs | grep -i "error\|exception\|traceback"

fly-ssh: ## SSH into the running Fly.io machine
	@cd apps/api && flyctl ssh console

fly-health: ## Check if the API health endpoint responds
	@API_URL=$$(cd apps/api && flyctl status --json 2>/dev/null | \
		python3 -c "import json,sys; d=json.load(sys.stdin); print('https://' + d.get('Hostname',''))" \
		2>/dev/null || echo "https://secureassess-api.fly.dev"); \
	echo "Checking $$API_URL/health ..."; \
	curl -sf "$$API_URL/health" | python3 -m json.tool || echo "Health check failed"

fly-open: ## Open the Fly.io API URL in browser
	@cd apps/api && flyctl open

fly-scale-down: ## Scale to 0 machines (complete pause — saves credits)
	@cd apps/api && flyctl scale count 0
	@echo "API scaled to 0. Resume with: make fly-scale-up"

fly-scale-up: ## Scale back to 1 machine
	@cd apps/api && flyctl scale count 1

fly-destroy: ## Completely delete the Fly.io app (irreversible)
	@read -p "Type the app name to confirm: " name; \
	[ "$$name" = "secureassess-api" ] && \
		cd apps/api && flyctl apps destroy secureassess-api || \
		echo "Cancelled."

# ─── VERCEL (Next.js Admin) ───────────────────────────────────────

vercel-login: ## Log into Vercel CLI
	cd apps/admin && npx vercel login

vercel-setup: ## Link admin app to Vercel project (run once)
	@cd apps/admin && npx vercel link
	@echo ""
	@echo "Linked. Now set env vars with: make vercel-env"

vercel-env: ## Push environment variables to Vercel from .env.local
	@echo "Adding env vars to Vercel..."
	@cd apps/admin && \
	while IFS= read -r line || [ -n "$$line" ]; do \
		[[ "$$line" =~ ^#.*$$ || -z "$$line" ]] && continue; \
		KEY=$$(echo "$$line" | cut -d= -f1); \
		VAL=$$(echo "$$line" | cut -d= -f2-); \
		echo "  Setting $$KEY..."; \
		echo "$$VAL" | npx vercel env add "$$KEY" production --yes 2>/dev/null || true; \
	done < .env.local
	@echo "Done. Redeploy with: make vercel-deploy"

vercel-env-set: ## Set a single env var on Vercel (usage: make vercel-env-set KEY=X VALUE=Y)
	@cd apps/admin && echo "$(VALUE)" | npx vercel env add "$(KEY)" production --yes

vercel-env-list: ## List all Vercel env vars (values partially hidden)
	@cd apps/admin && npx vercel env ls

vercel-deploy: ## Deploy admin dashboard to Vercel production
	@echo "Deploying admin dashboard to Vercel..."
	@cd apps/admin && npx vercel --prod
	@echo "Admin deployed."

vercel-preview: ## Deploy a preview (non-production) build
	@cd apps/admin && npx vercel

vercel-logs: ## Show latest Vercel deployment logs
	@cd apps/admin && npx vercel logs --follow

vercel-open: ## Open the Vercel deployment in browser
	@cd apps/admin && npx vercel open

# ─── DEPLOY ALL ───────────────────────────────────────────────────

deploy: ## Deploy both API (Fly.io) and admin (Vercel)
	@$(MAKE) fly-deploy
	@$(MAKE) vercel-deploy
	@echo ""
	@echo "All services deployed."

deploy-api: fly-deploy ## Alias for fly-deploy

deploy-admin: vercel-deploy ## Alias for vercel-deploy

deploy-trigger: ## Trigger deploy via GitHub Actions (without a release)
	@command -v gh >/dev/null 2>&1 || { echo "Install: brew install gh"; exit 1; }
	@gh workflow run deploy.yml -f target=all
	@echo "Deploy triggered. Watch: make deploy-status"

deploy-status: ## Show recent deploy workflow runs
	@command -v gh >/dev/null 2>&1 || { echo "Install GitHub CLI: brew install gh"; exit 1; }
	@gh run list --workflow=deploy.yml --limit 5

production-health: ## Check health of all production services
	@echo ""
	@echo "Checking production services..."
	@echo ""
	@echo "API (Fly.io):"
	@curl -sf https://secureassess-api.fly.dev/health | python3 -m json.tool 2>/dev/null || echo "  UNREACHABLE"
	@echo ""
	@echo "Run 'make fly-logs' or 'make vercel-logs' to debug issues."
