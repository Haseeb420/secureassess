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

# Use config file
ngrok start --config ngrok.yml api admin
