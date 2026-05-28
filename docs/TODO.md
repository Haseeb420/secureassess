# SecureAssess — Master TODO

> Auto-updated as work progresses. Check off items when complete.

## Legend
- [ ] Not started
- [~] In progress
- [x] Complete

---

## M0 — Docs & TODO Setup

- [x] Create docs/flows/ directory and all 10 flow docs
- [x] Create docs/architecture.md
- [x] Create docs/TODO.md (this file)

---

## M1 — Monorepo Foundation

- [x] Initialize Turborepo with pnpm workspaces
- [x] Create turbo.json pipeline config
- [x] Create root package.json with dev/build/lint scripts
- [x] Create pnpm-workspace.yaml
- [x] Scaffold packages/config (tsconfig, eslint, tailwind)
- [x] Scaffold packages/shared-types with placeholder
- [x] Scaffold packages/ui with Button component
- [x] Scaffold apps/desktop (Vite + React + TS)
- [x] Scaffold apps/admin (Next.js 14 App Router)
- [x] Scaffold apps/api (FastAPI + health endpoint)
- [x] Verify pnpm install succeeds
- [x] Verify pnpm build succeeds across all packages

---

## M2 — Desktop App Shell

- [x] Run cargo tauri init inside apps/desktop
- [x] Configure tauri.conf.json (window, bundle, security)
- [x] Install react-router-dom, zustand, @tauri-apps/api
- [x] Create route structure: Login, PreAssessment, Assessment, Completion
- [x] Create SecureLayout wrapper
- [x] Create AppShell component
- [x] Create Zustand store skeleton (candidateId, assessmentId, status, timerSeconds)
- [x] Verify cargo tauri dev opens native window

---

## M3 — Authentication

- [x] Add auth interfaces to packages/shared-types
- [x] Set up FastAPI Supabase client and config
- [x] Create /auth/candidate/login endpoint
- [x] Create /auth/candidate/verify-invite endpoint
- [x] Create /auth/refresh endpoint
- [x] Create /auth/me endpoint
- [x] Create get_current_candidate FastAPI dependency
- [x] Add Supabase client to desktop (apps/desktop/src/lib/supabase.ts)
- [x] Create authService.ts in desktop
- [x] Create useAuth.ts hook
- [x] Build LoginPage with email/password + invite token toggle
- [x] Add ProtectedRoute wrapper
- [x] Wrap assessment routes in ProtectedRoute
- [x] Add Supabase SSR auth to admin (Next.js)
- [x] Create admin middleware for route protection
- [x] Build admin login page
- [x] Build admin dashboard placeholder

---

## M4 — Native Security Layer

- [x] Create security/ Rust module structure
- [x] Define SecurityEvent, ViolationType, ValidationResult types
- [x] Implement display count detection (macOS)
- [x] Implement forbidden process scanner (sysinfo)
- [x] Implement focus loss detection
- [x] Implement kiosk fullscreen enforcement
- [x] Register all security Tauri commands
- [x] Create securityService.ts in React
- [x] Create useSecurityMonitor hook
- [x] Create ViolationBanner component
- [x] Build PreAssessmentPage validation checklist UI
- [ ] Verify: Chrome open → violation detected
- [ ] Verify: multiple displays → validation fails

---

## M5 — IDE & Code Editor

- [x] Install @monaco-editor/react
- [x] Create CodeEditor.tsx with dark theme, font, settings
- [x] Create LanguageSelector.tsx (6 languages)
- [x] Create EditorToolbar.tsx
- [x] Create ConsoleOutput.tsx with color-coded output
- [x] Create code templates for all 6 languages
- [x] Add codeByLanguage to Zustand store
- [x] Add assessment types to shared-types
- [x] Create QuestionPanel.tsx with markdown rendering
- [x] Create TestRunner.tsx with stubbed execution
- [x] Compose full AssessmentPage layout with resizable panels
- [x] Create TopBar.tsx with countdown timer
- [x] Timer turns red at < 5 minutes
- [x] Timer at 0 triggers auto-submit stub

---

## M6 — Offline Persistence & Sync

- [x] Add tauri-plugin-sql with SQLCipher to Cargo.toml
- [x] Create db/ Rust module (schema, migrations, models)
- [x] Define all 4 DB tables (sessions, snapshots, events, sync_queue)
- [x] Implement encryption key derivation from machine fingerprint
- [x] Run migrations on app startup
- [x] Create Tauri commands for save/get session, snapshot, events
- [x] Create useAutoSave hook (debounce 3s + periodic 30s)
- [x] Create useTimerPersistence hook (every 10s)
- [x] Create useCrashRecovery hook
- [x] Create CrashRecoveryModal component
- [x] Wire auto-save into CodeEditor onChange
- [x] Wire timer persistence into TopBar
- [x] Wire crash recovery into App.tsx mount
- [x] Create Rust sync queue (queue.rs, worker.rs)
- [x] Background sync worker flushes every 30s when online
- [x] Create useSyncStatus React hook
- [x] Create SyncIndicator component in TopBar
- [ ] Verify: kill app → relaunch → session restores
- [ ] Verify: offline → work → reconnect → data syncs

---

## M7 — Evaluation Engine

### Part A — Rust EvaluationBackend trait + LocalExecutor
- [x] Add async-trait dep and enable tokio full features in Cargo.toml
- [x] Create eval/types.rs (ExecutionRequest, ExecutionResult, ExecutionStatus)
- [x] Create eval/mod.rs (EvaluationBackend trait, get_backend())
- [x] Create eval/judge0.rs (Judge0Client stub — not yet implemented)
- [x] Create eval/local.rs (LocalExecutor with subprocess execution for 6 languages)
- [x] Write and pass 4 unit tests (python hello world, timeout, runtime error, js hello world)

### Part B — Tauri commands + scoring
- [x] Add test_cases SQLite table (schema + model + migration)
- [x] Add evaluation_results SQLite table (schema + model + migration)
- [x] Add save_test_cases and get_test_cases Tauri commands
- [x] Add run_sample_tests Tauri command (sample tests, no hidden)
- [x] Add submit_solution Tauri command (all tests, score, save + sync)
- [x] Create API migration files for evaluation_results and question_submissions

### Part C — React wiring + submission UI (upcoming)
- [x] Create evaluationService.ts in desktop
- [x] Wire TestRunner to real Tauri eval commands
- [x] Wire ConsoleOutput to real execution results
- [x] Wire Monaco markers for compile errors
- [x] Create SubmissionModal component
- [x] Add runtime detection (runtime_check.rs + get_available_runtimes command)
- [ ] Verify: Python hello world runs correctly
- [ ] Verify: hidden tests not exposed to candidate

---

## M8 — Admin Dashboard

- [x] Install TanStack Query, TanStack Table, recharts, lucide-react
- [x] Create dashboard layout with sidebar nav
- [x] Build assessments list page (TanStack Table)
- [x] Build create assessment form
- [x] Build assessment detail page
- [x] Build question bank list page with filters
- [x] Build create question form (markdown editor)
- [x] Build live monitor page (Supabase Realtime)
- [x] Build candidate violation drawer
- [x] Build candidate report page
- [x] Create FastAPI assessments CRUD router
- [x] Create FastAPI questions CRUD router
- [x] Create FastAPI sessions router
- [x] Create FastAPI reports router
- [ ] Verify: admin creates assessment → candidate sees it
- [ ] Verify: candidate active → admin monitor updates live

---

## M9 — Submission Integrity

- [x] Implement machine fingerprint (MAC + CPU + hostname hash)
- [x] Build SignedPayload with SHA256 checksum + HMAC
- [x] Create API integrity verification service
- [x] Add replay protection (timestamp check)
- [~] Implement assessment locking in Rust
- [~] Emit assessment:locked Tauri event
- [~] Build CompletionPage (no back navigation)
- [~] Add submission_hash deduplication to sync_queue
- [~] Add idempotency check in API /sync/ingest
- [ ] Verify: submit → cannot go back
- [ ] Verify: duplicate sync → no duplicate record
- [ ] Verify: tampered payload → API rejects

---

## M10 — MVP Hardening

- [ ] Create ErrorBoundary component
- [ ] Wrap assessment pages in ErrorBoundary
- [ ] Add skeleton loaders for question and test loading
- [ ] Install and configure sonner toasts
- [ ] Add offline banner component
- [ ] Add keyboard shortcuts (Ctrl+Enter, Ctrl+Shift+Enter, Ctrl+S)
- [ ] Audit accessibility (aria-labels, focus ring, contrast)
- [ ] Write Rust unit tests (display, processes, integrity, encryption)
- [ ] Write Python tests (auth, evaluation, integrity)
- [ ] Write React tests (CodeEditor, TestRunner, CrashRecoveryModal)
- [ ] All tests pass with pnpm test
- [ ] Create .github/workflows/ci.yml
- [ ] CI passes on push to main
- [ ] Configure Tauri production bundle (fullscreen, no devtools)
- [ ] Add startup env var validation to FastAPI
- [ ] Add structured logging (structlog + tracing)
- [ ] Write root README.md
- [ ] cargo tauri build produces working macOS .app

---

## Progress Summary
<!-- Auto-updated -->
- Total tasks: 117 complete / 143 total
