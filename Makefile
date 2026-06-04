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
        setup-rust setup-python check-deps

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
	@printf "\n$(BOLD)API Utilities$(RESET)\n"
	@printf "  $(CYAN)make api-dev$(RESET)              Start API with hot-reload (uvicorn)\n"
	@printf "  $(CYAN)make api-migrate$(RESET)          Run Supabase migrations\n"
	@printf "\n$(BOLD)Cleanup$(RESET)\n"
	@printf "  $(CYAN)make clean$(RESET)                Remove all build artifacts and caches\n"
	@printf "  $(CYAN)make clean-rust$(RESET)           Remove Rust target directory\n"
	@printf "  $(CYAN)make clean-node$(RESET)           Remove node_modules and .next caches\n"
	@printf "\n"

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
