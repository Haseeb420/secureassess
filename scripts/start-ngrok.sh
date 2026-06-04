#!/usr/bin/env bash
set -e

# Load env to get the static domain
if [ -f apps/api/.env ]; then
  export $(grep -v '^#' apps/api/.env | xargs)
fi

if [ -z "$NGROK_STATIC_DOMAIN" ]; then
  echo "Error: NGROK_STATIC_DOMAIN not set in apps/api/.env"
  echo "Run: ngrok dashboard → Domains → copy your static domain → add to apps/api/.env"
  exit 1
fi

echo ""
echo "Starting ngrok tunnels..."
echo "  API  → https://${NGROK_STATIC_DOMAIN}"
echo "  Admin → dynamic URL (check ngrok dashboard or terminal output)"
echo ""

# Substitute domain into a temp config (ngrok.yml does not expand shell vars)
TMPCONF=$(mktemp /tmp/ngrok-secureassess-XXXXXX.yml)
trap "rm -f $TMPCONF" EXIT
sed "s|\$NGROK_STATIC_DOMAIN|${NGROK_STATIC_DOMAIN}|g" ngrok.yml > "$TMPCONF"

ngrok start --config "$TMPCONF" api admin
