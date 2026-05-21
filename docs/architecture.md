# SecureAssess — System Architecture

## System Overview

SecureAssess is a secure, desktop-first software engineering assessment platform designed to prevent cheating during remote coding interviews while remaining functional in degraded network conditions. The system is built around three applications: a Tauri 2 desktop app (the candidate-facing proctored environment), a Next.js admin dashboard (for creating assessments and monitoring candidates), and a FastAPI backend (for auth, data persistence, code evaluation orchestration, and sync ingestion). All candidate data is persisted locally in an encrypted SQLite database first, then synced asynchronously to Supabase. Code execution is delegated to a self-hosted Judge0 CE instance that runs candidate code in isolated Docker containers, ensuring no candidate code ever executes on the host machine or the API server.

---

## Component Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CANDIDATE MACHINE                            │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                    Tauri Desktop App                          │  │
│  │                                                               │  │
│  │  ┌─────────────────────────────────────────────────────────┐  │  │
│  │  │              React Frontend (Vite + TS)                 │  │  │
│  │  │                                                         │  │  │
│  │  │  ┌──────────┐  ┌──────────────┐  ┌───────────────────┐  │  │  │
│  │  │  │ LoginPage│  │PreAssessment │  │  AssessmentPage   │  │  │  │
│  │  │  │          │  │    Page      │  │  ┌─────────────┐  │  │  │  │
│  │  │  └──────────┘  └──────────────┘  │  │MonacoEditor │  │  │  │  │
│  │  │                                  │  ├─────────────┤  │  │  │  │
│  │  │  ┌───────────────────────────┐   │  │QuestionPanel│  │  │  │  │
│  │  │  │     Zustand Store         │   │  ├─────────────┤  │  │  │  │
│  │  │  │ auth | session | editor   │   │  │ TestRunner  │  │  │  │  │
│  │  │  │ violations | syncStatus  │   │  ├─────────────┤  │  │  │  │
│  │  │  └───────────────────────────┘   │  │ConsoleOutput│  │  │  │  │
│  │  │                                  └───────────────────┘  │  │  │
│  │  └─────────────────────────────────────────────────────────┘  │  │
│  │                          │ Tauri IPC                          │  │
│  │  ┌─────────────────────────────────────────────────────────┐  │  │
│  │  │                   Rust Backend Layer                    │  │  │
│  │  │                                                         │  │  │
│  │  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐  │  │  │
│  │  │  │ security/│ │ kiosk/   │ │ monitor/ │ │processes/ │  │  │  │
│  │  │  │ integrity│ │ fullscr. │ │ focus    │ │ forbidden │  │  │  │
│  │  │  └──────────┘ └──────────┘ └──────────┘ └───────────┘  │  │  │
│  │  │                                                         │  │  │
│  │  │  ┌──────────────────────────┐  ┌─────────────────────┐  │  │  │
│  │  │  │       db/ (SQLCipher)    │  │  sync/              │  │  │  │
│  │  │  │ sessions | snapshots     │  │  queue.rs worker.rs  │  │  │  │
│  │  │  │ events   | sync_queue    │  │                     │  │  │  │
│  │  │  └──────────────────────────┘  └─────────────────────┘  │  │  │
│  │  └─────────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────────┘  │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ HTTPS (async, offline-tolerant)
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         BACKEND SERVICES                            │
│                                                                     │
│  ┌───────────────────────────────────┐  ┌─────────────────────────┐ │
│  │       FastAPI (Python 3.12)       │  │   Judge0 CE (Docker)    │ │
│  │                                   │  │                         │ │
│  │  /auth        /evaluation         │  │  Isolated sandbox per   │ │
│  │  /sync/ingest /sessions           │  │  submission: compile +  │ │
│  │  /assessments /questions          │  │  execute, CPU/mem caps  │ │
│  │  /reports     /monitor            │  │                         │ │
│  └────────────────┬──────────────────┘  └─────────────────────────┘ │
│                   │ Supabase client SDK                             │
│  ┌────────────────▼──────────────────────────────────────────────┐  │
│  │                     Supabase (PostgreSQL)                     │  │
│  │                                                               │  │
│  │  Auth  │  assessments  │  questions  │  sessions              │  │
│  │  snapshots  │  security_events  │  submissions  │  tokens     │  │
│  │                                                               │  │
│  │  ┌─────────────────────────────────────────────────────────┐  │  │
│  │  │              Supabase Realtime                          │  │  │
│  │  │  Broadcasts: security_events INSERT, sessions UPDATE    │  │  │
│  │  └─────────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────────┘  │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ Realtime subscription
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     ADMIN MACHINE (Browser)                         │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                 Next.js 14 Admin Dashboard                    │  │
│  │                                                               │  │
│  │  /admin/assessments   → CRUD + publish + invites             │  │
│  │  /admin/questions     → question bank management             │  │
│  │  /admin/monitor       → live candidate cards (Realtime)      │  │
│  │  /admin/reports       → per-candidate score reports          │  │
│  │                                                               │  │
│  │  TanStack Query (server state)  │  TanStack Table (lists)    │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow Summary

The canonical data path for every candidate write follows this chain:

```
Candidate keypress
    → Monaco onChange
        → useAutoSave debounce (3s) or periodic (30s)
            → Tauri IPC: save_snapshot command
                → Rust: write snapshot to SQLite (snapshots table)
                → Rust: insert into SQLite sync_queue (status=pending)
                    → Sync worker wakes (every 30s, when online)
                        → POST /sync/ingest (batch of pending items)
                            → FastAPI validates + writes to Supabase
                                → Supabase Realtime broadcasts to admin dashboard
```

Security events follow the same path: Rust detects → SQLite security_events → sync_queue → /sync/ingest → Supabase → admin monitor.

Submissions follow the same path but with an integrity envelope: Rust collects final answers → builds SignedPayload (checksum + HMAC + fingerprint) → sync_queue with type=submission → /sync/ingest with verification step before Supabase write.

---

## Security Architecture

Security is layered across four zones:

**1. Environment Integrity (Pre-assessment)**
The Rust layer validates the candidate's physical environment before the assessment starts: exactly one display connected, no forbidden applications running, not executing inside a VM. These checks run natively through OS APIs with no candidate-controllable bypass path.

**2. Kiosk Confinement (During assessment)**
The Tauri window is set to exclusive fullscreen. Window decorations, minimize, resize, and keyboard shortcuts that escape the app (Alt+Tab, Cmd+Tab) are intercepted. The Rust monitor polls OS focus state, display count, and process list every 1-2 seconds throughout the session. Any deviation emits a security violation event.

**3. Data Integrity (At submission)**
Submissions are signed before leaving the device: SHA-256 content checksum + HMAC-SHA256 using a key derived from the session and server secret. The machine fingerprint (hash of MAC + CPU + hostname) is included. The API re-derives and verifies all three before writing to Supabase. Replay attacks are blocked by a ±5 minute timestamp window check.

**4. Execution Isolation (Code evaluation)**
Candidate code never executes on the API server or candidate machine. All execution goes through Judge0 CE running in Docker with: CPU time limits (default 5s), memory limits (default 256MB), no network access, no filesystem access outside the sandbox, and separate containers per submission. The Judge0 API is not accessible from the candidate machine — only the FastAPI backend calls it.

**5. Data Encryption (At rest)**
The local SQLite database is encrypted with SQLCipher. The encryption key is derived from the machine fingerprint and a server-provided secret using a KDF — it is never stored in plaintext on disk. This ensures that copying the SQLite file to another machine yields an unreadable database.

---

## Offline Architecture

The offline-first design is built on three primitives:

**Local-first writes**: Every candidate action (code save, timer tick, security event) is written to SQLite before any network call is attempted. Network delivery is always asynchronous.

**Sync queue**: Every local write that needs to reach the server inserts a row into the `sync_queue` table with `status=pending`. This table is the durable record of what the server hasn't seen yet. It survives crashes, reboots, and network outages.

**Background sync worker**: A Rust async task wakes every 30 seconds, checks HTTP connectivity, and if online, fetches a batch of pending items and POSTs them to `/sync/ingest`. Items are retried up to 5 times with exponential backoff on transient errors. Permanent API rejections (invalid checksum, duplicate) are marked as failed and not retried.

The practical result: a candidate can complete an entire assessment in airplane mode. When connectivity returns — even days later — all snapshots, events, and the final submission will sync to the backend with accurate timestamps.

The single exception is code execution: running tests requires a network call to Judge0 via the API. Candidates can write code offline but cannot execute it.

---

## Tech Stack Table

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| Desktop shell | Tauri | 2.0 | Cross-platform native app container; provides OS APIs to Rust, secure WebView to React |
| Desktop frontend | React | 18.x | Candidate-facing UI: editor, questions, timer, violation banners |
| Desktop build tool | Vite | 5.x | Fast HMR dev server and production bundler for React |
| Desktop language | TypeScript | 5.x | Strict typing for all React components and services |
| Native layer | Rust | 1.75+ | OS-level kiosk, process monitoring, SQLite ops, HMAC signing, sync worker |
| State management (desktop) | Zustand | 4.x | Lightweight client state: auth, session, violations, editor code |
| Code editor | Monaco Editor | 0.45+ | VS Code editor embedded in React; syntax highlighting, IntelliSense |
| Admin dashboard | Next.js | 14.x (App Router) | Server-side rendered admin portal with React Server Components |
| Server state (admin) | TanStack Query | 5.x | Data fetching, caching, and invalidation for admin API calls |
| Table rendering (admin) | TanStack Table | 8.x | Headless table for question bank and session lists |
| Backend API | FastAPI | 0.110+ | Async Python API; request validation with Pydantic v2 |
| Backend language | Python | 3.12 | Type-annotated API handlers, services, and tests |
| Database (cloud) | Supabase (PostgreSQL) | — | Managed Postgres with Auth, Realtime, and REST/SDK |
| Real-time events | Supabase Realtime | — | Admin monitor live updates without WebSocket boilerplate |
| Auth | Supabase Auth | — | JWT issuance, refresh, invite token management |
| Local storage | SQLite + SQLCipher | SQLCipher 4.x | Encrypted offline persistence on candidate machine |
| Code execution | Judge0 CE | 1.13+ | Self-hosted Docker-based code sandbox for all 6 languages |
| Styling | Tailwind CSS | 3.x | Utility-first CSS used across desktop frontend and admin |
| Monorepo tooling | Turborepo | 1.x | Build pipeline orchestration and caching across packages |
| Package manager | pnpm | 8.x | Workspace-aware package management |
| Linting (TS) | ESLint | 8.x | Shared config from packages/config |
| Formatting (Python) | Black + Ruff | latest | Code formatting and fast linting |
| Type checking (Python) | mypy | 1.x | Static type checking for API code |
| Rust quality | clippy + rustfmt | stable | Rust linting and formatting |
| Testing (Rust) | cargo test | — | Unit tests for security, DB, sync, integrity modules |
| Testing (React) | Vitest + Testing Library | — | Component and hook tests |
| Testing (API) | Pytest + HTTPX | — | API route and service integration tests |
| E2E testing | Playwright | — | End-to-end tests for both desktop (Tauri WebDriver) and admin |

---

## Key Design Decisions

- **Tauri over Electron**: Tauri's Rust backend provides native OS APIs (process enumeration, display detection, kiosk APIs) without relying on Node.js child_process calls. The smaller binary size and lower memory footprint are secondary benefits; the primary reason is that native security controls require native code, and Rust is safer than C for that role.

- **Offline-first with sync queue over real-time writes**: Requiring connectivity for every save would make the assessment fragile on poor networks and would create a foothold for cheating (disable WiFi → assessment breaks → gains time). The sync queue decouples correctness from connectivity, which is both more resilient and more secure.

- **SQLCipher for local storage over plaintext SQLite**: Candidate code and session data stored in plain SQLite on a shared machine is a privacy risk. SQLCipher encrypts at the page level with negligible performance overhead. The key is derived from hardware identifiers, so the DB is machine-bound.

- **Judge0 for code execution over embedded interpreters**: Bundling Python/Java/Go runtimes in the Tauri app would be gigabytes of additional distribution weight, complicate updates, and create a larger attack surface. Judge0's Docker-per-submission model provides hermetic isolation that embedded runtimes cannot match.

- **HMAC + checksum + machine fingerprint on submissions**: Three independent integrity mechanisms because each catches a different attack class. The checksum catches accidental corruption or in-transit modification. The HMAC catches deliberate tampering (requires the server secret to forge). The machine fingerprint catches submissions submitted from a different machine than where the assessment was taken.

- **Turborepo monorepo over separate repos**: The desktop app, admin dashboard, API, and shared packages evolve together. A monorepo ensures shared type definitions (packages/shared-types) stay in sync, shared UI components (packages/ui) are tested once, and the build pipeline can be modeled as a dependency graph with caching.

- **FastAPI proxy for Judge0 rather than direct desktop-to-Judge0**: If the desktop called Judge0 directly, the Judge0 API URL and key would be bundled in the Tauri app binary, extractable by any motivated candidate. Routing through the API also allows server-side enforcement of hidden test confidentiality.

- **Supabase Realtime for admin monitor over polling**: The admin monitor needs to see violations within seconds of them occurring. Polling every N seconds introduces latency proportional to N and wastes bandwidth when nothing changes. Realtime WebSocket subscriptions push exactly when a row is inserted, with no polling overhead.

- **Invite tokens over open registration**: Assessments are high-stakes; only specific candidates should be able to take them. Single-use invite tokens bound to an email ensure that sharing a link does not give an unintended person access, and provide an audit trail of who was invited vs. who authenticated.

- **Zustand over Redux/Context for desktop state**: The assessment state is small (< 50 fields) and mutation patterns are simple (set code, increment counter, update timer). Zustand's minimal boilerplate and direct mutation model (without reducers) keeps the code readable without sacrificing reactivity or devtools support.
