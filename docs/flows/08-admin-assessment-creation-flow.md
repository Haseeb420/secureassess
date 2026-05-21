# 08 — Admin Assessment Creation Flow

## Overview

Admins use the Next.js dashboard to create and publish assessments. The flow covers building the assessment configuration (duration, languages, security level), selecting or authoring questions from the question bank, and publishing — which generates single-use invite tokens for each candidate. The dashboard uses TanStack Query for server state so assessment data stays fresh, and TanStack Table for the question bank browser. Once published, the assessment is immutable to prevent changing questions mid-session.

## Actors

- **Admin** — creates and configures assessments, manages question bank
- **Admin Dashboard (Next.js)** — UI for all creation steps; calls API via TanStack Query
- **API (FastAPI)** — CRUD for assessments and questions; token generation; Supabase writes
- **Supabase** — stores assessments, questions, invite tokens, and candidate-assessment mappings

## Flow Steps

1. [Admin] → logs into admin dashboard at /admin/login → [Supabase SSR auth validates session; redirected to /admin/dashboard]
2. [Admin] → clicks "New Assessment" → [navigates to /admin/assessments/new]
3. [Admin] → fills assessment form: title, description, duration (minutes), allowed languages, security level (standard/strict) → [form state updated]
4. [Admin] → clicks "Save Draft" → [Dashboard calls API POST /assessments with { title, description, duration_minutes, languages, security_level, status=draft }]
5. [API] → validates input with Pydantic model → [creates assessment record in Supabase; returns assessment_id]
6. [Dashboard] → navigates to /admin/assessments/{id}/questions → [assessment detail page with question tab]
7. [Admin] → clicks "Add Question" → [question creation panel opens or question bank modal opens]
8. [Admin] → authors question: title, description (markdown), difficulty, time estimate, language constraints → [form filled]
9. [Admin] → adds sample test cases: { input, expected_output, description } (visible to candidate) → [sample tests list]
10. [Admin] → adds hidden test cases: { input, expected_output, points } (never shown to candidate) → [hidden tests list]
11. [Admin] → clicks "Save Question" → [Dashboard calls API POST /questions with full question object]
12. [API] → stores question in Supabase questions table; stores test cases in test_cases table with is_hidden flag → [question persisted]
13. [Admin] → adds question to assessment → [API POST /assessments/{id}/questions with question_id and ordering]
14. [Admin] → repeats steps 7-13 for each question → [assessment question list grows]
15. [Admin] → clicks "Publish Assessment" → [Dashboard calls API POST /assessments/{id}/publish]
16. [API] → validates: at least 1 question, at least 1 hidden test per question → [validation check]
17. [API] → sets assessment status=published in Supabase → [assessment locked from edits]
18. [Admin] → navigates to /admin/assessments/{id}/candidates → [invite management page]
19. [Admin] → enters candidate emails or uploads CSV → [invite list prepared]
20. [Admin] → clicks "Generate Invites" → [API POST /assessments/{id}/invites with emails array]
21. [API] → generates one cryptographically random invite token per email; stores in Supabase invite_tokens table with { token, email, assessment_id, expires_at, status=unused } → [tokens created]
22. [API] → returns tokens (or sends emails if SMTP configured) → [admin receives tokens to distribute]

## Error Cases

- **Publish with no questions** — API returns 400 "Assessment must have at least one question before publishing."
- **Publish with question having no hidden tests** — API returns 400 "Question '{title}' has no hidden test cases. Add at least one to enable scoring."
- **Duplicate question title** — allowed; questions are keyed by UUID not title. Admin is not warned.
- **Edit attempt on published assessment** — API returns 403 "Published assessments cannot be modified. Create a new version."
- **Invite token generation for already-invited email** — API returns 409; existing token returned rather than creating duplicate.
- **Admin session expires during creation** — Next.js middleware intercepts next request; redirects to /admin/login. Draft is saved if "Save Draft" was clicked; otherwise in-progress form data is lost (browser memory only).
- **CSV upload with invalid emails** — API validates email format; returns 422 with list of invalid entries; valid ones proceed.

## Offline Behavior

The admin dashboard requires internet connectivity — it is a web application that calls the Supabase-backed API for all operations. There is no offline mode for admins. If connectivity is lost during assessment creation, in-progress form data remains in the browser until the page is closed; saved drafts persist in Supabase and are accessible when connectivity returns.

## Related Files

- `apps/admin/app/` — Next.js pages: assessments/, questions/, monitor/
- `apps/api/routers/questions.py` — question CRUD endpoints
- `apps/api/routers/` — assessment CRUD, publish, invite generation
- `packages/shared-types/` — shared Assessment, Question, InviteToken TypeScript types
