# Utilities

Miscellaneous commands for day-to-day maintenance.

---

## Environment Check

```bash
make env-check
```

Verifies that all required env vars are set across all three `.env` files. Prints `✓` or `✗` for each variable.

```bash
make check-deps
```

Verifies that `pnpm`, `cargo`, `python3`, and `node` are on your PATH and prints their versions.

---

## Ports

```bash
make ports
```

Shows which project ports (`:8000`, `:3000`, `:5173`, `:4040`) are currently in use and by which processes.

```bash
make ip
```

Shows your LAN IP addresses — useful when you need to share a local server with devices on the same WiFi.

---

## Cleanup

| Command | What it removes |
|---|---|
| `make clean` | `node_modules`, `.next`, `dist`, `.turbo`, Rust `target/` |
| `make clean-node` | `node_modules`, `.next`, `dist` directories only |
| `make clean-rust` | `apps/desktop/src-tauri/target/` only |
| `make clean-all` | Everything above + `apps/api/.venv` |
| `make clean-sessions` | All project tmux sessions |

> `make clean-rust` is the most useful — the Rust `target/` directory can grow to several GB. Run it when you need disk space back.

---

## Format

```bash
make format
```

Runs all formatters in one shot:
- `prettier` — all JS/TS/JSON/CSS files
- `ruff format` — Python (`apps/api`)
- `cargo fmt` — Rust (`apps/desktop/src-tauri`)
