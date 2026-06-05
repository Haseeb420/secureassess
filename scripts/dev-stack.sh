#!/usr/bin/env bash
# Start API + admin + ngrok together. Ctrl+C kills everything.
set -e

BOLD='\033[1m'
RESET='\033[0m'
CYAN='\033[36m'
GREEN='\033[32m'
YELLOW='\033[33m'
RED='\033[31m'

# Run from repo root
cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

# ── Load env ──────────────────────────────────────────────────────────────────
if [ -f apps/api/.env ]; then
  export $(grep -v '^#' apps/api/.env | xargs 2>/dev/null) || true
fi
if [ -f apps/desktop/.env ]; then
  export $(grep -v '^#' apps/desktop/.env | xargs 2>/dev/null) || true
fi

# ── Validate ngrok domain ──────────────────────────────────────────────────────
if [ -z "$NGROK_STATIC_DOMAIN" ]; then
  printf "${RED}Error:${RESET} NGROK_STATIC_DOMAIN not set in apps/api/.env\n"
  printf "  1. Get a free static domain: https://dashboard.ngrok.com/domains\n"
  printf "  2. Add it to apps/api/.env: NGROK_STATIC_DOMAIN=your-domain.ngrok-free.app\n"
  printf "  3. Set it in apps/desktop/.env: VITE_API_BASE_URL=https://your-domain.ngrok-free.app/api/backend\n"
  exit 1
fi

API_URL="https://${NGROK_STATIC_DOMAIN}/api/backend"
DESKTOP_ENV_URL="${VITE_API_BASE_URL:-not set}"

printf "\n${BOLD}${CYAN}SecureAssess Dev Stack${RESET}\n"
printf "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}\n"
printf "  FastAPI   →  http://localhost:8000\n"
printf "  Admin     →  http://localhost:3000\n"
printf "  ngrok     →  https://${NGROK_STATIC_DOMAIN}\n"
printf "  ↳ desktop app API_URL should be: ${API_URL}\n"
printf "\n"

if [ "$DESKTOP_ENV_URL" != "$API_URL" ]; then
  printf "${YELLOW}⚠  apps/desktop/.env VITE_API_BASE_URL=${DESKTOP_ENV_URL}${RESET}\n"
  printf "${YELLOW}   Expected: ${API_URL}${RESET}\n\n"
fi

# ── PID tracking ──────────────────────────────────────────────────────────────
API_PID=""
ADMIN_PID=""
NGROK_PID=""

cleanup() {
  printf "\n${CYAN}Shutting down all services...${RESET}\n"
  [ -n "$NGROK_PID" ] && kill "$NGROK_PID" 2>/dev/null || true
  [ -n "$ADMIN_PID" ] && kill "$ADMIN_PID" 2>/dev/null || true
  [ -n "$API_PID"   ] && kill "$API_PID"   2>/dev/null || true
  wait 2>/dev/null || true
  exit 0
}
trap cleanup INT TERM EXIT

# ── Start FastAPI ──────────────────────────────────────────────────────────────
printf "${GREEN}▶ Starting FastAPI on :8000${RESET}\n"
(
  cd apps/api
  if [ ! -d ".venv" ]; then
    printf "${YELLOW}  No venv found — creating one...${RESET}\n"
    python3 -m venv .venv
  fi
  source .venv/bin/activate
  pip install -r requirements.txt -q
  exec uvicorn main:app --reload --port 8000 --host 0.0.0.0
) &
API_PID=$!

# ── Start Next.js admin ────────────────────────────────────────────────────────
printf "${GREEN}▶ Starting admin dashboard on :3000${RESET}\n"
(
  cd apps/admin
  exec pnpm dev
) &
ADMIN_PID=$!

# ── Wait for Next.js to be ready before starting ngrok ───────────────────────
printf "${YELLOW}  Waiting for Next.js to start...${RESET}\n"
for i in $(seq 1 30); do
  if curl -sf http://localhost:3000 >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

# ── Start ngrok ───────────────────────────────────────────────────────────────
printf "${GREEN}▶ Starting ngrok → https://${NGROK_STATIC_DOMAIN}${RESET}\n"
bash scripts/start-ngrok.sh &
NGROK_PID=$!

printf "\n${GREEN}All services running. Press Ctrl+C to stop.${RESET}\n\n"

# Wait — if any process dies, the trap fires and kills the rest
wait "$API_PID" "$ADMIN_PID" "$NGROK_PID"
