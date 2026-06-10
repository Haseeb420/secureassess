# Testing & Code Quality

Run tests, lint, type-check, and format code.

---

## Tests

| Command | What it runs |
|---|---|
| `make test` | All: Vitest (admin + desktop) + Rust unit tests + Pytest |
| `make test-admin` | Admin dashboard Vitest suite |
| `make test-desktop` | Desktop frontend Vitest suite |
| `make test-rust` | `cargo test` in `apps/desktop/src-tauri` |
| `make test-api` | `pytest tests/ -v` in `apps/api` |

### Running individually

```bash
# Rust
cd apps/desktop/src-tauri && cargo test

# React (Vitest)
pnpm --filter desktop test
pnpm --filter admin test

# Python
cd apps/api && source .venv/bin/activate && pytest tests/ -v

# All at once
make test
```

---

## Lint

| Command | What it runs |
|---|---|
| `make lint` | ESLint (all TS apps) + ruff + black check (API) |
| `make lint-admin` | ESLint on admin dashboard |
| `make lint-desktop` | ESLint on desktop frontend |
| `make lint-api` | `ruff check .` + `black --check .` on `apps/api` |

---

## Type-Check

| Command | What it runs |
|---|---|
| `make type-check` | `tsc --noEmit` across all TypeScript apps |
| `make type-check-admin` | TypeScript check for admin dashboard |
| `make type-check-desktop` | TypeScript check for desktop frontend |

---

## Format

```bash
make format
```

Runs all formatters in sequence:
- `prettier` — JS/TS/JSON/CSS
- `ruff format` — Python (`apps/api`)
- `cargo fmt` — Rust (`apps/desktop/src-tauri`)
