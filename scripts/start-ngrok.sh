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

# Resolve ngrok's default config (contains the authtoken)
if [ -f "$HOME/Library/Application Support/ngrok/ngrok.yml" ]; then
  DEFAULT_CONFIG="$HOME/Library/Application Support/ngrok/ngrok.yml"
elif [ -f "$HOME/.config/ngrok/ngrok.yml" ]; then
  DEFAULT_CONFIG="$HOME/.config/ngrok/ngrok.yml"
else
  echo "Error: ngrok default config not found. Run: ngrok config add-authtoken YOUR_TOKEN"
  exit 1
fi

# Substitute domain into a temp config (ngrok.yml does not expand shell vars)
TMPCONF=$(mktemp /tmp/ngrok-secureassess-XXXXXX.yml)
trap "rm -f $TMPCONF" EXIT
sed "s|\$NGROK_STATIC_DOMAIN|${NGROK_STATIC_DOMAIN}|g" ngrok.yml > "$TMPCONF"

# Pass both configs: default (authtoken) + project (tunnel definitions)
ngrok start --config "$DEFAULT_CONFIG" --config "$TMPCONF" api admin
