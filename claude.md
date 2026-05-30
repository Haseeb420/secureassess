# CLAUDE.md — Secure Software Engineering Assessment Platform

## Project Identity

**Name:** SecureAssess  
**Type:** Secure desktop-based coding assessment platform  
**Monorepo:** Turborepo  
**Primary Dev Machine:** macOS M1

---

## Monorepo Structure

```
secureassess/
├── apps/
│   ├── desktop/          # Tauri 2 app (Rust + React/TS) — candidate-facing
│   ├── admin/            # Next.js 14 — admin/proctor web dashboard
│   └── api/              # FastAPI (Python) — backend services
├── packages/
│   ├── shared-types/     # TypeScript types shared across apps
│   ├── ui/               # Shared React component library
│   └── config/           # Shared ESLint, TS, Tailwind configs
├── CLAUDE.md             # This file
├── turbo.json
├── package.json
└── pnpm-workspace.yaml
```

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Desktop App | Tauri 2.0 | Cross-platform secure shell |
| Desktop Frontend | React 18 + TypeScript | Candidate UI inside Tauri |
| Native Security | Rust (Tauri plugins) | OS-level monitoring, kiosk mode |
| Admin Dashboard | Next.js 14 (App Router) | Admin/proctor web portal |
| Backend API | FastAPI (Python 3.12) | Auth, assessments, sync, evaluation |
| Database | Supabase (PostgreSQL) | Cloud DB + Auth + Realtime |
| Local Storage | SQLite + SQLCipher | Encrypted offline persistence |
| Code Execution (MVP) | LocalExecutor (Rust subprocess) | Runs on candidate machine, no server cost |
| Code Execution (Future) | Judge0 CE (self-hosted) | Isolated server sandbox, swap via config flag |
| Execution Abstraction | EvaluationBackend trait (Rust) | Swappable backend: Local or Judge0 |
| Styling | Tailwind CSS v3 | All frontends |
| Forms | react-hook-form + zod | All forms, validated on blur and submit |
| Component Primitives | Radix UI | Accessible Select, Dialog, Checkbox, Switch, Tabs |
| Icons | Lucide React | Single icon set across all apps |
| Animations | Framer Motion | Page transitions and micro-interactions |
| Toasts | Sonner | User feedback for async actions |
| Class Utilities | cva + clsx + tailwind-merge | Component variants and className merging |
| Monorepo | Turborepo + pnpm | Workspace orchestration |
| State (Desktop) | Zustand | Client state |
| State (Admin) | TanStack Query v5 | Server state |
| Auth | Supabase Auth | JWT + SSO support |

---

## Key Constraints & Rules

### Security Rules (Never Violate)
- Code execution uses the `EvaluationBackend` trait — never call language runtimes directly from application logic, always go through the trait
- MVP backend is `LocalExecutor` which runs on the candidate's own machine — this is acceptable because candidates can only harm their own machine
- When `EXECUTION_BACKEND=judge0` is set, all execution routes through the remote Judge0 server instead — no other code changes needed
- Every execution must enforce a hard timeout — kill the process after the time limit regardless of backend
- Local SQLite DB must always use SQLCipher encryption — never plain SQLite in production paths
- All submissions must include integrity checksum + machine fingerprint before sending to API
- Assessment timer state must persist to local DB every 10 seconds
- Focus loss events must be logged — never silently ignored

### UI/UX Standards (Always Follow)

Every UI change must meet these standards. No exceptions.

**Forms**
- All forms use `react-hook-form` with `zodResolver` — never uncontrolled forms or manual state
- Every field has a `<label>` element, never placeholder-only
- Errors display inline below the field using the `FormField` wrapper component
- Required fields marked with `*` visually and `aria-required="true"` on the input
- Submit buttons show a spinner and disable while submitting — no double-submit possible
- On submit failure: server error shown in an Alert above the form, not just a toast
- On submit success: toast.success(), then navigate or reset form

**Validation**
- All validation schemas live in `packages/shared-types/src/schemas.ts` using zod
- Client-side validation runs on blur (individual field) and on submit (all fields)
- Error messages are human, specific, and actionable: "Enter a valid email" not "Invalid"
- Never show a generic "Something went wrong" without a reason when a specific one is available

**Loading States**
- Every async action has a loading state — buttons show Spinner (Loader2), lists show Skeleton rows
- Skeleton rows must match the real layout (same height, same column count)
- Never show a blank white flash — use skeleton until data arrives
- TanStack Query `isLoading` → skeleton, `isFetching` → subtle spinner in corner

**Errors**
- Network errors: toast.error() with a retry button where retrying makes sense
- 401 errors: clear auth, redirect to login, toast "Your session expired. Please sign in again."
- 404 errors: show EmptyState component with context-appropriate message
- Unexpected errors: ErrorBoundary catches, shows error card, logs to SQLite

**Accessibility**
- All icon-only buttons have `aria-label`
- Error messages linked via `aria-describedby` to their input
- Error messages use `role="alert"` so screen readers announce them immediately
- Focus rings always visible: global `*:focus-visible { outline: 2px solid #DE5E1F; outline-offset: 2px; }`
- Tab order follows visual reading order
- All modals trap focus (Radix Dialog handles this automatically)
- Color contrast minimum: WCAG AA (4.5:1 normal text, 3:1 large text)
  — Use `#B84A14` for orange text on white backgrounds (darker variant passes contrast)
  — `#2A2A47` on white always passes

**Components**
- Use `cn()` from `packages/ui/src/lib/utils.ts` for all className merging — never template literals
- Use `cva()` for components with variants — never manually conditional classnames
- Import components from `@secureassess/ui` — never duplicate component code across apps
- Use Radix UI primitives for: Select, Dialog, Checkbox, Switch, Tooltip, Tabs
- Use Lucide icons everywhere — never mix icon sets

**Animations**
- All animations via framer-motion — no CSS keyframes for interactive transitions
- Page enter: `opacity 0→1, y 8→0, duration 200ms` — always
- Error message appear: `opacity + height, duration 150ms`
- Stagger list items: `staggerChildren: 0.08`
- All animations under 300ms — longer feels sluggish
- Never animate purely for decoration — every animation guides attention or confirms action

**Empty States**
- Every list, table, and data view has an EmptyState component when data is empty
- EmptyState always has: icon (Lucide), title, description, and an action button where relevant
- Never show a blank div or "No data" text

**Destructive Actions**
- All destructive actions (delete, terminate, abandon) use ConfirmDialog
- ConfirmDialog description must explain the consequence: what will be lost or cannot be undone
- Confirm button uses `variant="danger"` — never primary orange for destructive actions


- Desktop app must function fully without internet after assessment loads
- Sync queue in SQLite — flush to backend when connection restores
- Never block candidate from writing code due to connectivity state

### Git Rules
- One branch per milestone: `milestone/m{N}-{slug}`
- **Auto-commit after every logical unit of work** — do not batch everything into one commit at the end
- Conventional commits format: `type(scope): description`
- Types: `feat`, `fix`, `chore`, `refactor`, `test`, `docs`, `build`, `ci`
- Scopes: `desktop`, `admin`, `api`, `shared`, `security`, `ide`, `sync`, `eval`, `auth`
- Never mention AI tools, Claude, or AI assistance in commit messages
- Commit messages must describe what changed, not how it was generated

### Auto-Commit Behavior (ALWAYS follow this)
After completing each logical unit (a file, a feature, a config), immediately run:
```bash
git add <relevant files>
git commit -m "type(scope): description"
```
Do NOT wait until the end of the task to commit.
Commit triggers:
- New file created → commit it
- Existing file meaningfully modified → commit it
- Package installed and working → commit lock files
- Bug fixed → commit immediately
- Config changed → commit immediately

Logical unit examples:
- Created CodeEditor.tsx → `git commit -m "feat(ide): add monaco editor component"`
- Added auth router → `git commit -m "feat(api): add candidate login endpoint"`
- Fixed crash in sync → `git commit -m "fix(sync): handle null session on reconnect"`

Never commit:
- Broken code that doesn't compile/run
- Half-finished features (finish the unit first, then commit)
- `.env` files with real secrets

### TODO.md Auto-Update Rule (ALWAYS follow this)
`docs/TODO.md` is the living task tracker. Update it as you work:
- Before starting a task → change `- [ ]` to `- [~]` (in progress)
- After completing a task → change `- [~]` to `- [x]` (done)
- After updating TODO.md → always commit it alongside the related code commit:
  ```bash
  git add docs/TODO.md <other changed files>
  git commit -m "type(scope): description"
  ```
- Keep the Progress Summary section at bottom of TODO.md updated with counts:
  ```
  - Total tasks: N complete / T total
  ```
- Never leave a task marked `[~]` when the work is actually done

### Code Style
- TypeScript strict mode everywhere in TS packages
- Python: `ruff` for linting, `black` for formatting, `mypy` for types
- Rust: `clippy` + `rustfmt`
- No `any` in TypeScript — use proper types or `unknown`
- All API routes must have request/response Pydantic models
- All Tauri commands must have typed Rust structs

---

## Environment Variables

### Desktop App (`apps/desktop/.env`)
```
VITE_API_BASE_URL=
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_JUDGE0_URL=
```

### API (`apps/api/.env`)
```
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
JUDGE0_URL=
JUDGE0_API_KEY=
ENCRYPTION_SECRET=
JWT_SECRET=
```

### Admin Dashboard (`apps/admin/.env.local`)
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_API_BASE_URL=
```

---

## Docs Structure

```
docs/
├── flows/                          # One doc per system flow
│   ├── 01-candidate-auth-flow.md
│   ├── 02-pre-assessment-validation-flow.md
│   ├── 03-assessment-execution-flow.md
│   ├── 04-offline-sync-flow.md
│   ├── 05-code-execution-flow.md
│   ├── 06-submission-integrity-flow.md
│   ├── 07-crash-recovery-flow.md
│   ├── 08-admin-assessment-creation-flow.md
│   ├── 09-live-monitoring-flow.md
│   └── 10-security-violation-flow.md
├── architecture.md                 # Full system architecture
└── TODO.md                         # Living task tracker — always kept up to date
```

**TODO.md is the source of truth for task status.** Update it before and after every task.

---



| Module | App | Key Files |
|---|---|---|
| Candidate Auth | desktop + api | `apps/desktop/src/features/auth/`, `apps/api/routers/auth.py` |
| Pre-Assessment Validation | desktop | `apps/desktop/src-tauri/src/security/` |
| Secure Fullscreen | desktop (Rust) | `apps/desktop/src-tauri/src/kiosk/` |
| Focus Monitoring | desktop (Rust) | `apps/desktop/src-tauri/src/monitor/` |
| Forbidden App Detection | desktop (Rust) | `apps/desktop/src-tauri/src/processes/` |
| IDE / Code Editor | desktop | `apps/desktop/src/features/ide/` |
| Offline Persistence | desktop (Rust) | `apps/desktop/src-tauri/src/db/` |
| Sync Queue | desktop + api | `apps/desktop/src-tauri/src/sync/`, `apps/api/routers/sync.py` |
| Code Execution (trait) | desktop (Rust) | `apps/desktop/src-tauri/src/eval/mod.rs` |
| Local Executor (MVP) | desktop (Rust) | `apps/desktop/src-tauri/src/eval/local.rs` |
| Judge0 Client (future) | desktop (Rust) | `apps/desktop/src-tauri/src/eval/judge0.rs` |
| Admin Dashboard | admin | `apps/admin/app/` |
| Monitoring View | admin | `apps/admin/app/monitor/` |
| Question Management | admin + api | `apps/admin/app/questions/`, `apps/api/routers/questions.py` |

---

## Milestone Overview

| # | Branch | Description |
|---|---|---|
| M1 | `milestone/m1-monorepo-foundation` | Turborepo setup, all app skeletons, shared configs |
| M2 | `milestone/m2-desktop-shell` | Tauri app, React shell, routing, basic UI |
| M3 | `milestone/m3-auth` | Supabase auth, candidate login, admin login, JWT |
| M4 | `milestone/m4-security-layer` | Rust security plugin, fullscreen, display/process detection |
| M5 | `milestone/m5-ide` | Monaco editor, multi-language, test runner UI |
| M6 | `milestone/m6-offline-persistence` | SQLCipher DB, auto-save, crash recovery, sync queue |
| M7 | `milestone/m7-evaluation-engine` | LocalExecutor in Rust, EvaluationBackend trait, scoring, Judge0 migration path |
| M8 | `milestone/m8-admin-dashboard` | Next.js admin, assessment CRUD, monitoring view |
| M9 | `milestone/m9-submission-integrity` | Checksums, signatures, machine fingerprint, locking |
| M10 | `milestone/m10-mvp-hardening` | E2E tests, error boundaries, production configs |

---

## Local Dev Setup

```bash
# Prerequisites
brew install rust node python@3.12 pnpm
cargo install tauri-cli

# Clone & install
git clone <repo>
cd secureassess
pnpm install

# Run all apps in dev
pnpm dev

# Run specific app
pnpm --filter desktop dev
pnpm --filter admin dev
pnpm --filter api dev

# Tauri dev (desktop with native layer)
pnpm --filter desktop tauri dev
```

Code execution runs locally on your dev machine via `LocalExecutor`.
No Docker or Judge0 needed. Set `EXECUTION_BACKEND=local` in `apps/desktop/.env`.

---

## Future: Judge0 Setup (when scaling)

When you are ready to move execution to a server:

```bash
# 1. Set flag in desktop env
EXECUTION_BACKEND=judge0
VITE_JUDGE0_URL=https://judge0.yourdomain.com

# 2. Deploy Judge0 on a $35/mo EC2 t3.medium
cd infra/judge0
docker-compose up -d

# 3. No other code changes needed
```

---

## Database Migrations

```bash
# Supabase migrations (cloud schema)
cd apps/api
supabase migration new <name>
supabase db push

# Local SQLite schema (desktop)
# Managed via Tauri SQLite plugin migrations in:
# apps/desktop/src-tauri/src/db/migrations/
```

---

## Testing Strategy

| Layer | Tool |
|---|---|
| Rust unit tests | `cargo test` |
| React components | Vitest + Testing Library |
| API | Pytest + HTTPX |
| E2E Desktop | Playwright (Tauri WebDriver) |
| Admin E2E | Playwright |

---

## Commit Message Examples

```
feat(auth): add candidate login with supabase jwt
feat(security): implement display count detection on macos
fix(sync): resolve duplicate submission on reconnect
chore(monorepo): configure turborepo pipeline and pnpm workspaces
refactor(db): extract encryption key derivation into separate module
test(eval): add unit tests for judge0 scoring adapter
docs(api): add openapi descriptions to assessment endpoints
build(desktop): configure tauri bundle for macos arm64
```

---

## Critical Paths (Do Not Break)

1. `Candidate writes code → auto-save to SQLite → sync to API` must never lose data
2. `Assessment timer` must survive app crash and restore on relaunch
3. `Submission` must be idempotent — duplicate sync attempts must not create duplicate records
4. `Security violations` must be logged locally even when offline
5. `Code execution` always goes through `EvaluationBackend` trait — never call runtime binaries directly from feature code
6. `EvaluationBackend` backend is selected at startup from `EXECUTION_BACKEND` env var — `local` or `judge0`