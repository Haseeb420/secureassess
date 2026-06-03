# 11 — Token → Session Link Flow

## Overview

This document describes how an invitation token is created by an admin, validated by a candidate,
and then permanently linked to the assessment session that follows. The link is a single
`token_id` foreign key on `assessment_sessions` that gives admins full traceability from a
token issuance all the way through the candidate's submission — including revocation impact,
per-token usage analytics, and monitor page visibility.

---

## Actors

| Actor | Role |
|---|---|
| **Admin** | Creates tokens, monitors usage, revokes if needed |
| **Candidate** | Enters token on the desktop app to unlock their assessment |
| **Desktop App (React + Tauri)** | Validates token, stores `token_id`, passes it on session creation |
| **API (FastAPI)** | Issues tokens, validates them, writes the session row |
| **Supabase (PostgreSQL)** | Source of truth for `tokens`, `assessment_sessions`, `token_usage_log` |

---

## Database Relationships

```
tokens
  id  ←──────────────────────────────────────────────────────────┐
  candidate_email                                                 │  FK (nullable)
  assessment_id ──→ assessments.id                               │
  usage_limit / used_count                                        │
  expiry_at / is_revoked                                          │
                                                                  │
token_usage_log                                                   │
  token_id ──→ tokens.id   (one row per validate call)           │
  used_at, ip_address                                             │
                                                                  │
assessment_sessions                                               │
  token_id ──────────────────────────────────────────────────────┘
  candidate_id, candidate_name, candidate_email
  assessment_id, status, final_score
  started_at
```

`token_id` on `assessment_sessions` is **nullable** — sessions created before the token system
(M3-era Supabase auth flow) carry `NULL` and are not affected.

---

## Full Flow

### Step 1 — Admin creates a token

```
Admin  →  POST /tokens
          {
            candidate_name:  "Jane Smith",
            candidate_email: "jane@example.com",
            assessment_id:   "<uuid>",
            mock_ids:        [],
            expiry_at:       "2026-06-10T18:00:00Z",
            usage_limit:     1
          }

API    →  1. Verifies assessment exists and is active
          2. Calls generate_token_value() → "F4KL-R8TX-9WQA"
          3. Inserts into tokens table (used_count=0, is_revoked=FALSE)
          4. Returns TokenResponse including token_value and id
```

Admin copies `F4KL-R8TX-9WQA` and sends it to Jane out-of-band (email, Slack, etc.).

---

### Step 2 — Candidate validates the token

```
Candidate  →  enters "F4KL-R8TX-9WQA" in Desktop App → Login with Token tab

Desktop    →  POST /tokens/validate
              { token_value: "F4KL-R8TX-9WQA" }

API        →  1. Looks up token by token_value
              2. Checks: not revoked → not expired → used_count < usage_limit
              3. Checks: assessment exists and status = 'active'
              4. Fetches questions (strips hidden test cases and MCQ isCorrect flags)
              5. Computes assessment_status (open / deadline / window logic)
              6. Inserts row into token_usage_log (used_at, ip_address)
              7. Increments tokens.used_count by 1
              8. Returns ValidateTokenResponse:
                 {
                   valid: true,
                   token: { id: "<token_id>", ... },
                   assessment: { id, title, questions, ... },
                   assessment_status: "active",
                   mocks: []
                 }

Desktop    →  stores token.id in Zustand (assessmentStore.tokenId)
              renders LandingPage with assessment details
```

---

### Step 3 — Candidate starts the assessment, session is created

```
Candidate  →  clicks "Start Assessment" on LandingPage

Desktop    →  POST /sessions
              {
                session_id:       "<local-uuid>",
                assessment_id:    "<uuid>",
                assessment_title: "Backend Engineering — June 2026",
                total_questions:  3,
                token_id:         "<token_id>"     ← from Zustand
              }

API        →  upserts into assessment_sessions with token_id set
              returns session row

Desktop    →  persists session to local SQLite
              navigates to /assessment
```

The session row now has `token_id` populated. The link is permanent for the life of the session.

---

### Step 4 — Admin traces the session back to the token

From the Token detail endpoint:

```
GET /tokens/<token_id>

Response includes:
  {
    ...token fields...,
    usage_log: [
      { id, used_at, ip_address }   ← one entry from Step 2
    ],
    sessions: [
      {
        id, candidate_name, candidate_email,
        status, started_at, final_score
      }
    ]
  }
```

From the Session detail endpoint (monitor page):

```
GET /sessions/<session_id>

Response includes token_id field, allowing admin to
navigate back to the token that granted access.
```

---

## Validation Rules (enforced in POST /tokens/validate)

| Check | Failure reason returned |
|---|---|
| `token_value` not found in DB | `not_found` |
| `is_revoked = TRUE` | `not_found` (intentionally opaque) |
| `expiry_at < now()` | `expired` |
| `used_count >= usage_limit` | `usage_limit_reached` |
| Assessment not found | `not_found` |
| Assessment `status` not `active` | `assessment_closed` |

Failure responses always return `{ valid: false, reason: "..." }` with HTTP 200 — never
a 4xx — so the desktop app can display a user-friendly message without triggering an
error boundary.

---

## Assessment Status Computation

When `valid = true`, the API computes `assessment_status` from the assessment's `type` field:

| `type` | Logic | Result |
|---|---|---|
| `open` | Always accessible | `active` |
| `deadline` | `now < deadline_at` | `active` |
| `deadline` | `now >= deadline_at` | `closed` |
| `window` | `now < window_start` | `upcoming` + `countdown_to_ms` |
| `window` | `window_start <= now <= window_end` | `active` |
| `window` | `now > window_end` | `closed` |

The desktop app uses `assessment_status` and `countdown_to_ms` to decide whether to show
the assessment immediately, display a countdown, or block access with a "closed" message.

---

## Revocation Impact

When an admin calls `DELETE /tokens/<id>` (soft delete — sets `is_revoked = TRUE`):

- **Future validate calls** → return `valid: false, reason: 'not_found'` immediately
- **In-progress sessions** → are **not** terminated automatically. The candidate already past
  the validation gate can continue their current session. Admins who need to stop an
  active session must use `POST /sessions/<id>/terminate` separately.
- **Audit trail** → the token row is never deleted. `is_revoked`, `used_count`, `usage_log`,
  and linked `sessions` rows remain fully visible for post-event auditing.

---

## Error Cases

| Scenario | Behaviour |
|---|---|
| Desktop sends `POST /sessions` without `token_id` | Accepted — `token_id` is nullable; legacy flow still works |
| Token revoked between validate and session create | Session still created (revocation only blocks the validate gate) |
| `token_id` references a deleted token | Impossible — tokens are soft-deleted only (`is_revoked`), never removed |
| Multiple sessions from one multi-use token | All sessions carry the same `token_id`; `GET /tokens/<id>` returns all of them under `sessions[]` |
| Assessment archived after token issued | Next validate call returns `assessment_closed`; existing sessions unaffected |

---

## Related Files

| File | Purpose |
|---|---|
| `apps/api/routers/tokens.py` | Token CRUD, validate endpoint, revocation |
| `apps/api/routers/sessions.py` | Session create — accepts and writes `token_id` |
| `apps/api/services/token_generator.py` | Cryptographic `XXXX-XXXX-XXXX` token generation |
| `apps/api/migrations/003_feature_expansion.sql` | Creates `tokens` and `token_usage_log` tables |
| `apps/api/migrations/004_token_revocation.sql` | Adds `is_revoked` column to `tokens` |
| `apps/api/migrations/005_session_token_link.sql` | Adds `token_id` FK to `assessment_sessions` |
| `apps/admin/app/dashboard/tokens/page.tsx` | Admin token management UI |
| `apps/admin/lib/api.ts` | `tokensApi` client functions and `Token` type |
| `packages/shared-types/src/features.ts` | `Token`, `TokenValidationResult`, `LandingPageData` types |
