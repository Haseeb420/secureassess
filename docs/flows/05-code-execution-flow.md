# 05 — Code Execution Flow

## Overview

When a candidate clicks "Run Tests", the desktop app sends their code to the backend API, which forwards it to a self-hosted Judge0 sandbox for isolated compilation and execution. Judge0 runs the code in a Docker container with strict CPU, memory, and time limits, completely isolated from the host filesystem. The API polls Judge0 until execution completes, then returns structured results to the desktop. The desktop renders per-test pass/fail status, stdout, stderr, and performance metrics. Hidden tests are evaluated server-side and their contents are never transmitted to the candidate.

## Actors

- **Candidate** — writes code, clicks "Run Tests", views results
- **Desktop App (React)** — sends execution request, renders results in ConsoleOutput and TestRunner
- **API (FastAPI)** — orchestrates Judge0 calls, enforces hidden test confidentiality
- **Judge0 CE** — executes code in isolated Docker container, returns stdout/stderr/status
- **Supabase** — stores execution results linked to the session

## Flow Steps

1. [Candidate] → clicks "Run Tests" in TestRunner → [Desktop App reads current code and selected language from Zustand]
2. [Desktop App] → calls API POST /evaluation/run with { source_code, language_id, question_id, session_id } → [request sent]
3. [API] → looks up question's sample tests and hidden tests from Supabase → [retrieves test cases]
4. [API] → for each test case: builds Judge0 submission { source_code, language_id, stdin, expected_output, cpu_time_limit, memory_limit } → [batched submissions]
5. [API] → sends batch to Judge0 POST /submissions?base64_encoded=true → [Judge0 queues execution]
6. [Judge0] → pulls Docker image for language → [sandbox container starts]
7. [Judge0] → compiles code (if compiled language) → [compilation errors captured in compile_output]
8. [Judge0] → executes compiled binary / interprets script with stdin → [stdout, stderr, exit code captured]
9. [Judge0] → enforces limits: terminates if over CPU time (default 5s), memory (256MB), or output size → [status reflects TLE/MLE/RE]
10. [API] → polls Judge0 GET /submissions/{token} every 500ms up to 10s → [waits for status != queued/processing]
11. [API] → receives final result per submission → [maps Judge0 status code to { passed, stdout, stderr, time_ms, memory_kb, status_description }]
12. [API] → filters results: sample tests returned fully; hidden tests return only { passed, time_ms } with no stdin/stdout content → [confidentiality enforced]
13. [API] → saves execution_result to Supabase evaluation_results table → [result persisted]
14. [API] → returns { sample_results: [...], hidden_results: [...], overall_pass: bool } to Desktop App → [response received]
15. [Desktop App] → updates TestRunner with per-test status icons → [pass/fail displayed per visible test]
16. [Desktop App] → updates ConsoleOutput with stdout and stderr from sample tests → [candidate sees output]
17. [Desktop App] → if compile error: Monaco editor shows inline error markers at relevant lines → [inline diagnostics displayed]

## Error Cases

- **Compile error** — Judge0 returns compile_output; API includes it in response; Desktop shows red banner in ConsoleOutput with compiler message; Monaco marks error lines if line numbers are parseable.
- **Runtime error (exit code != 0)** — test marked as failed; stderr shown in ConsoleOutput; candidate can debug and re-run.
- **Time limit exceeded** — test marked TLE; ConsoleOutput shows "Execution timed out (limit: Xs)."
- **Memory limit exceeded** — test marked MLE; ConsoleOutput shows "Memory limit exceeded (limit: XMB)."
- **Judge0 unreachable** — API returns 503 to Desktop App; Desktop shows "Code execution service unavailable. Try again in a moment." Test runner returns to idle state.
- **Judge0 poll timeout (> 10s)** — API returns 504 with message "Execution took too long to complete."; Desktop shows same to candidate.
- **Invalid language_id** — API validates language against allowed list before sending to Judge0; returns 400 if not allowed.
- **No internet on Desktop** — POST /evaluation/run fails; Desktop shows "Cannot run tests while offline." This is the one candidate action that requires connectivity.

## Offline Behavior

Code execution requires connectivity — Judge0 runs server-side and cannot be embedded in the desktop app. If the candidate is offline, the "Run Tests" button shows a tooltip "Internet required to run tests" and the request is blocked before it reaches the API. Candidates can continue writing code offline; they just cannot execute it until connectivity returns. This is a known and accepted trade-off: offline execution would require bundling a full language runtime, which conflicts with the sandboxing security requirement.

## Related Files

- `apps/desktop/src/features/ide/` — TestRunner, ConsoleOutput, CodeEditor
- `apps/api/services/evaluation.py` — Judge0 client and orchestration
- `apps/api/routers/` — POST /evaluation/run and POST /evaluation/submit endpoints
- `infra/judge0/` — docker-compose.yml for local Judge0 instance
