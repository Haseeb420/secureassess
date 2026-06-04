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
- [x] Implement assessment locking in Rust
- [x] Emit assessment:locked Tauri event
- [x] Build CompletionPage (no back navigation)
- [x] Add submission_hash deduplication to sync_queue
- [x] Add idempotency check in API /sync/ingest
- [ ] Verify: submit → cannot go back
- [ ] Verify: duplicate sync → no duplicate record
- [ ] Verify: tampered payload → API rejects

---

## M10 — MVP Hardening

- [x] Create ErrorBoundary component
- [x] Wrap assessment pages in ErrorBoundary
- [x] Add skeleton loaders for question and test loading
- [x] Install and configure sonner toasts
- [x] Add offline banner component
- [x] Add keyboard shortcuts (Ctrl+Enter, Ctrl+Shift+Enter, Ctrl+S)
- [x] Audit accessibility (aria-labels, focus ring, contrast)
- [x] Write Rust unit tests (display, processes, integrity, encryption)
- [x] Write Python tests (auth, evaluation, integrity)
- [x] Write React tests (CodeEditor, TestRunner, CrashRecoveryModal)
- [x] All tests pass with pnpm test
- [x] Create .github/workflows/ci.yml
- [ ] CI passes on push to main
- [x] Configure Tauri production bundle (fullscreen, no devtools)
- [x] Add startup env var validation to FastAPI
- [x] Add structured logging (structlog + tracing)
- [x] Write root README.md
- [ ] cargo tauri build produces working macOS .app

---

## UI Production Polish (feat/ui-production-polish)

- [x] Add zod schemas to shared-types (loginSchema, inviteTokenSchema)
- [x] Build shared UI component library (Input, FormField, Alert, Badge, EmptyState, Skeleton, ConfirmDialog)
- [x] Rebuild desktop LoginPage with react-hook-form, zod validation, accessible inputs
- [x] Rebuild PreAssessmentPage with animated check rows and actionable error messages
- [x] Polish TopBar with ConfirmDialog on submit, timer color transitions
- [x] Update SyncIndicator with text label
- [x] Improve OfflineBanner with framer-motion slide and WifiOff icon
- [x] Update ErrorBoundary with brand styling and restart button
- [x] Add VS Code-style status bar to AssessmentPage
- [x] Add collapsible sidebar with active route detection, tooltip on icons, user section, logout
- [x] Add PageHeader component for all admin pages
- [x] Rebuild assessments list with search bar, filter pills, skeleton rows, empty state, icon actions
- [x] Add stats bar (Active / Violations / Submitted / Terminated) to monitor page
- [x] Accessibility pass: global focus rings, aria-labels, error announcements, role=alert
- [x] Micro-animations: page transitions (framer-motion), staggered check rows, error messages

---

## Better Auth (feat/better-auth)

- [x] Install better-auth + pg in admin; better-auth in desktop
- [x] Generate BETTER_AUTH_SECRET and add env vars to admin .env.local
- [x] Create apps/admin/lib/auth.ts — Better Auth server instance (pg adapter, admin plugin, trusted origins)
- [x] Create apps/admin/app/api/auth/[...all]/route.ts — Next.js route handler
- [x] Create apps/admin/lib/auth-client.ts — admin auth client with adminClient plugin
- [x] Create apps/admin/hooks/useCurrentUser.ts — session hook with role, name, isAdmin, isProctor
- [x] Update middleware.ts — lightweight Edge cookie-presence check (no Node.js APIs)
- [x] Update dashboard layout — full session validation + role check in Node.js server component
- [x] Update login page — client component with react-hook-form, signIn.email(), Alert on error
- [x] Update Sidebar — use useCurrentUser hook, show name/role/initials, signOut()
- [x] Update api.ts — use Better Auth session.token as Bearer token for FastAPI
- [x] Create apps/api/core/better_auth.py — FastAPI session validator (looks up token in session table)
- [x] Update apps/api/core/dependencies.py — use Better Auth validators
- [x] Remove apps/admin/lib/supabase/ (auth-only files); keep @supabase/supabase-js for Realtime
- [x] Fix kysely version mismatch (pin 0.28.17) for Turbopack compatibility
- [ ] Run Better Auth DB migration: npx @better-auth/cli generate → apply SQL in Supabase
- [ ] Create first admin user in Supabase (INSERT INTO "user" ...)

---

## feat/desktop-ui-overhaul

- [x] Install @fontsource/inter; update index.css with brand tokens, editor colors, scrollbars, prose styles
- [x] Update tailwind.config.cjs with editor color theme extension
- [x] Rebuild AppShell — include OfflineBanner, move Toaster here
- [x] Rebuild OfflineBanner — back-online state with green/amber variants and framer-motion slide
- [x] Rebuild ViolationBanner — framer-motion slide, dismiss button, violation count badge
- [x] Rebuild CrashRecoveryModal — navy header, ConfirmDialog for abandon, polished layout
- [x] Rebuild LoginPage — two-column split with brand navy panel, feature list, dot-toggle tabs
- [x] Rebuild PreAssessmentPage — 6 check cards (display, screen rec, browsers, AI, remote, system), step pills, fix hints, sticky action bar
- [x] Update CodeEditor — custom secureassess-dark theme, cursor position status line, font size prop
- [x] Update EditorToolbar — language selector with dot indicator, A+/A- font size, reset code, keyboard shortcuts popover
- [x] Update LanguageSelector — styled native select with language color dot
- [x] Rebuild ConsoleOutput — dark zone (#1E1E2E), structured output with animated rows, clear button
- [x] Rebuild QuestionPanel — sticky header, three tabs (Problem/Examples/My Runs), prose-content markdown styles
- [x] Rebuild TopBar — SVG timer ring with color transitions, centered title, ShieldCheck logo mark
- [x] Rebuild SubmissionModal — animated SVG score ring, next/finish footer, navy header
- [x] Rebuild CompletionPage — animated SVG checkmark, staggered content reveal, session stats pills
- [x] Update AssessmentPage — ViolationBanner wired, run history passed to QuestionPanel, font size state, reset code handler
- [x] Fix tests for updated component text/interaction patterns

---

## feat/f2-token-management

- [x] Create apps/api/services/token_generator.py
- [x] Create apps/api/schemas/tokens.py
- [x] Create apps/api/routers/tokens.py (CRUD + validate endpoint)
- [x] Register tokens router in main.py
- [x] Add Token types and tokensApi to apps/admin/lib/api.ts
- [x] Add Tokens nav item to Sidebar
- [x] Build apps/admin/app/dashboard/tokens/page.tsx

---

## feat/f5-question-types

- [x] Add McqOption type and update Question/CreateQuestionBody in apps/admin/lib/api.ts
- [x] Add question_weightages to CreateAssessmentBody in apps/admin/lib/api.ts
- [x] Rebuild question create form: type selector cards (Coding/MCQ/Text), weightage field
- [x] MCQ builder: dynamic options list, radio for correct answer, Trash2 remove, min 2/max 8
- [x] Text question info box (amber, manual scoring notice)
- [x] Coding fields (test cases, time/memory limits) shown only for coding type
- [x] Strip is_correct from MCQ options in GET /questions/:id (candidate endpoint)
- [x] Add weightage + options to QuestionCreate/QuestionPatch Pydantic models
- [x] Persist weightage and options in POST/PUT /questions
- [x] Serialize McqOption objects in PATCH /questions/:id
- [x] Assessment wizard: inline weightage input per selected question
- [x] Assessment wizard: type badge per question row
- [x] Assessment wizard: live weightage total bar (green/amber/red)
- [x] Assessment wizard: disable submit when sum ≠ 100
- [x] Create apps/api/services/scoring.py (score_mcq_answer, score_coding_answer, compute_final_score)

---

## feat/f3-assessment-scheduling

- [x] Add createAssessmentScheduleSchema to packages/shared-types/src/schemas.ts
- [x] Add scheduling fields to CreateAssessmentBody and Assessment in apps/admin/lib/api.ts
- [x] Add Schedule section (card-radio open/deadline/window) to admin new assessment page
- [x] Update AssessmentCreate and AssessmentPatch Pydantic models with scheduling fields
- [x] Update POST /assessments to persist scheduling fields
- [x] Update PATCH /assessments to guard schedule edits when attempts exist
- [x] Create apps/desktop/src/lib/schedule.ts — getAssessmentStatus() utility
- [x] Create apps/desktop/src/components/CountdownTimer.tsx
- [x] Create apps/desktop/src/components/AssessmentClosedState.tsx

---

## feat/f8-results-scoring

- [x] Rebuild CompletionPage with score card (bg-white rounded-2xl), CSS draw-check animation, score color coding, stats pills
- [x] Add GET /attempts admin list endpoint with filters (assessment_id, status, date_from, date_to)
- [x] Add GET /attempts/{id} enrichment: assessment_title, usage_limit, question_title/weightage/options per answer
- [x] Add PATCH /attempts/{id}/answers/{answer_id}/score endpoint with final score recomputation
- [x] Add ManualScoreRequest/ManualScoreResponse Pydantic schemas
- [x] Add AttemptListItem, AttemptDetail, AnswerDetail, TestResult types to admin api.ts
- [x] Add attemptsApi (list, get, scoreAnswer) to admin api.ts
- [x] Add "Results" nav item to Sidebar (below Assessments)
- [x] Create admin results list page with filter bar, stats row, and table with pending review badges
- [x] Create admin attempt detail page with two-column header, score breakdown table, expandable question rows
- [x] Coding expansion: read-only source code block + test cases table with pass/fail row borders
- [x] MCQ expansion: all options with candidate selection and correct answer highlighted
- [x] Text expansion: submitted answer + amber manual scoring form with save button

---

## Progress Summary
<!-- Auto-updated -->
- Total tasks: 232 complete / 234 total
