#!/usr/bin/env bash
# Checks all required tools are installed before running anything
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

ok()   { echo -e "${GREEN}  ✓${NC}  $1"; }
fail() { echo -e "${RED}  ✗${NC}  $1"; MISSING=1; }

MISSING=0

command -v node    &>/dev/null && ok "node $(node -v)"         || fail "node not found — brew install node"
command -v pnpm    &>/dev/null && ok "pnpm $(pnpm -v)"         || fail "pnpm not found — npm i -g pnpm"
command -v python3 &>/dev/null && ok "python3 $(python3 -V)"   || fail "python3 not found — brew install python@3.12"
command -v cargo   &>/dev/null && ok "rust $(rustc -V)"        || fail "rust not found — curl --proto =https https://sh.rustup.rs | sh"
command -v ngrok   &>/dev/null && ok "ngrok $(ngrok version)"  || fail "ngrok not found — brew install ngrok/ngrok/ngrok"

if [ "$MISSING" -eq 1 ]; then
  echo ""
  echo "Fix missing dependencies and run again."
  exit 1
fi

echo ""
echo "All dependencies satisfied."
