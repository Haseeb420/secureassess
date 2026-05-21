# 01 — Candidate Auth Flow

## Overview

The candidate auth flow handles identity verification before any assessment work begins. Candidates authenticate via email/password or a single-use invite token issued by an admin. On success, Supabase issues a JWT that is stored in both Zustand (in-memory) and local SQLite (for crash recovery). All protected routes validate the token on mount and auto-refresh it before expiry, ensuring candidates are never unexpectedly logged out mid-assessment.

## Actors

- **Candidate** — the person being assessed, using the desktop app
- **Desktop App (React)** — renders login UI, manages auth state via Zustand
- **API (FastAPI)** — proxies auth requests, validates invite tokens
- **Supabase** — issues and verifies JWTs, manages user records
- **SQLite (local)** — persists session token for crash recovery

## Flow Steps

1. [Candidate] → opens Desktop App → [LoginPage renders]
2. [Candidate] → selects "Email/Password" or "Invite Token" tab → [form updates]
3. [Candidate] → submits credentials → [authService.ts calls API POST /auth/candidate/login or /auth/candidate/verify-invite]
4. [API] → validates credentials against Supabase Auth → [Supabase returns JWT + refresh token]
5. [API] → if invite token: verifies token is valid, unused, not expired → [marks token as consumed]
6. [API] → returns { access_token, refresh_token, candidate_id, assessment_id } → [Desktop App receives response]
7. [Desktop App] → stores tokens in Zustand auth store → [in-memory session active]
8. [Desktop App] → persists token + candidate_id + assessment_id to SQLite sessions table → [crash-safe session created]
9. [Desktop App] → navigates to /pre-assessment → [PreAssessmentPage mounts]
10. [ProtectedRoute] → on each route mount, checks Zustand for valid token → [access granted or redirect to /login]
11. [Desktop App (background)] → checks token expiry every 60s → [if expiry within 5 min, calls /auth/refresh]
12. [API] → validates refresh token with Supabase → [returns new access_token]
13. [Desktop App] → updates Zustand + SQLite with new token → [session extended transparently]

## Error Cases

- **Wrong password / unknown email** — API returns 401; LoginPage shows "Invalid credentials" inline error; no token stored.
- **Invite token already used** — API returns 400 with `reason: token_consumed`; UI shows "This invite link has already been used."
- **Invite token expired** — API returns 400 with `reason: token_expired`; UI shows "This invite link has expired. Contact your administrator."
- **Network unreachable on login** — authService catches fetch error; UI shows "Unable to connect. Check your internet connection." Login requires initial connectivity.
- **Supabase service down** — API returns 503; UI shows generic "Authentication service unavailable" message; error is logged locally.
- **Refresh token expired** — auto-refresh receives 401; Zustand clears session; candidate is redirected to /login with message "Your session has expired."
- **SQLite write failure on token persist** — logged as local error; session continues in-memory only; crash recovery will not be available for this session.

## Offline Behavior

Initial login requires internet connectivity — credentials must be verified against Supabase. However, once authenticated and token is persisted to SQLite, subsequent app launches can restore the session from local storage without network access. Token refresh will fail offline but the existing token remains valid for its full TTL (default: 1 hour Supabase JWT). If the app restarts offline within that window, the candidate can resume their assessment using the SQLite-stored token.

## Related Files

- `apps/desktop/src/features/auth/` — React auth components and hooks
- `apps/desktop/src/lib/supabase.ts` — Supabase client initialization
- `apps/api/routers/auth.py` — login, verify-invite, refresh, me endpoints
- `apps/desktop/src-tauri/src/db/` — SQLite session persistence
