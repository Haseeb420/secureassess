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

- [~] Initialize Turborepo with pnpm workspaces
- [~] Create turbo.json pipeline config
- [~] Create root package.json with dev/build/lint scripts
- [~] Create pnpm-workspace.yaml
- [x] Scaffold packages/config (tsconfig, eslint, tailwind)
- [~] Scaffold packages/shared-types with placeholder
- [~] Scaffold packages/ui with Button component
- [~] Scaffold apps/desktop (Vite + React + TS)
- [~] Scaffold apps/admin (Next.js 14 App Router)
- [~] Scaffold apps/api (FastAPI + health endpoint)
- [~] Verify pnpm install succeeds
- [~] Verify pnpm build succeeds across all packages

---

## M2 — Desktop App Shell

- [ ] Run cargo tauri init inside apps/desktop
- [ ] Configure tauri.conf.json (window, bundle, security)
- [ ] Install react-router-dom, zustand, @tauri-apps/api
- [ ] Create route structure: Login, PreAssessment, Assessment, Completion
- [ ] Create SecureLayout wrapper
- [ ] Create AppShell component
- [ ] Create Zustand store skeleton (candidateId, assessmentId, status, timerSeconds)
- [ ] Verify cargo tauri dev opens native window

---

## M3 — Authentication

- [ ] Add auth interfaces to packages/shared-types
- [ ] Set up FastAPI Supabase client and config
- [ ] Create /auth/candidate/login endpoint
- [ ] Create /auth/candidate/verify-invite endpoint
- [ ] Create /auth/refresh endpoint
- [ ] Create /auth/me endpoint
- [ ] Create get_current_candidate FastAPI dependency
- [ ] Add Supabase client to desktop (apps/desktop/src/lib/supabase.ts)
- [ ] Create authService.ts in desktop
- [ ] Create useAuth.ts hook
- [ ] Build LoginPage with email/password + invite token toggle
- [ ] Add ProtectedRoute wrapper
- [ ] Wrap assessment routes in ProtectedRoute
- [ ] Add Supabase SSR auth to admin (Next.js)
- [ ] Create admin middleware for route protection
- [ ] Build admin login page
- [ ] Build admin dashboard placeholder

---

## M4 — Native Security Layer

- [ ] Create security/ Rust module structure
- [ ] Define SecurityEvent, ViolationType, ValidationResult types
- [ ] Implement display count detection (macOS)
- [ ] Implement forbidden process scanner (sysinfo)
- [ ] Implement focus loss detection
- [ ] Implement kiosk fullscreen enforcement
- [ ] Register all security Tauri commands
- [ ] Create securityService.ts in React
- [ ] Create useSecurityMonitor hook
- [ ] Create ViolationBanner component
- [ ] Build PreAssessmentPage validation checklist UI
- [ ] Verify: Chrome open → violation detected
- [ ] Verify: multiple displays → validation fails

---

## M5 — IDE & Code Editor

- [ ] Install @monaco-editor/react
- [ ] Create CodeEditor.tsx with dark theme, font, settings
- [ ] Create LanguageSelector.tsx (6 languages)
- [ ] Create EditorToolbar.tsx
- [ ] Create ConsoleOutput.tsx with color-coded output
- [ ] Create code templates for all 6 languages
- [ ] Add codeByLanguage to Zustand store
- [ ] Add assessment types to shared-types
- [ ] Create QuestionPanel.tsx with markdown rendering
- [ ] Create TestRunner.tsx with stubbed execution
- [ ] Compose full AssessmentPage layout with resizable panels
- [ ] Create TopBar.tsx with countdown timer
- [ ] Timer turns red at < 5 minutes
- [ ] Timer at 0 triggers auto-submit stub

---

## M6 — Offline Persistence & Sync

- [ ] Add tauri-plugin-sql with SQLCipher to Cargo.toml
- [ ] Create db/ Rust module (schema, migrations, models)
- [ ] Define all 4 DB tables (sessions, snapshots, events, sync_queue)
- [ ] Implement encryption key derivation from machine fingerprint
- [ ] Run migrations on app startup
- [ ] Create Tauri commands for save/get session, snapshot, events
- [ ] Create useAutoSave hook (debounce 3s + periodic 30s)
- [ ] Create useTimerPersistence hook (every 10s)
- [ ] Create useCrashRecovery hook
- [ ] Create CrashRecoveryModal component
- [ ] Wire auto-save into CodeEditor onChange
- [ ] Wire timer persistence into TopBar
- [ ] Wire crash recovery into App.tsx mount
- [ ] Create Rust sync queue (queue.rs, worker.rs)
- [ ] Background sync worker flushes every 30s when online
- [ ] Create useSyncStatus React hook
- [ ] Create SyncIndicator component in TopBar
- [ ] Verify: kill app → relaunch → session restores
- [ ] Verify: offline → work → reconnect → data syncs

---

## M7 — Evaluation Engine

- [ ] Create infra/judge0/ with docker-compose.yml
- [ ] Verify Judge0 running on port 2358
- [ ] Create Judge0Client in apps/api/services/judge0.py
- [ ] Add JUDGE0_URL + JUDGE0_API_KEY to config
- [ ] Create POST /evaluation/run endpoint
- [ ] Create POST /evaluation/submit endpoint
- [ ] Create evaluation_results Supabase table
- [ ] Create question_submissions Supabase table
- [ ] Create evaluationService.ts in desktop
- [ ] Wire TestRunner to real API
- [ ] Wire ConsoleOutput to real execution results
- [ ] Wire Monaco markers for compile errors
- [ ] Create SubmissionModal component
- [ ] Verify: Python hello world runs correctly
- [ ] Verify: hidden tests not exposed to candidate

---

## M8 — Admin Dashboard

- [ ] Install TanStack Query, TanStack Table, recharts, lucide-react
- [ ] Create dashboard layout with sidebar nav
- [ ] Build assessments list page (TanStack Table)
- [ ] Build create assessment form
- [ ] Build assessment detail page
- [ ] Build question bank list page with filters
- [ ] Build create question form (markdown editor)
- [ ] Build live monitor page (Supabase Realtime)
- [ ] Build candidate violation drawer
- [ ] Build candidate report page
- [ ] Create FastAPI assessments CRUD router
- [ ] Create FastAPI questions CRUD router
- [ ] Create FastAPI sessions router
- [ ] Create FastAPI reports router
- [ ] Verify: admin creates assessment → candidate sees it
- [ ] Verify: candidate active → admin monitor updates live

---

## M9 — Submission Integrity

- [ ] Implement machine fingerprint (MAC + CPU + hostname hash)
- [ ] Build SignedPayload with SHA256 checksum + HMAC
- [ ] Create API integrity verification service
- [ ] Add replay protection (timestamp check)
- [ ] Implement assessment locking in Rust
- [ ] Emit assessment:locked Tauri event
- [ ] Build CompletionPage (no back navigation)
- [ ] Add submission_hash deduplication to sync_queue
- [ ] Add idempotency check in API /sync/ingest
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
- Total tasks: 3 complete / 118 total
