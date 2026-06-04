#!/usr/bin/env bash
# Fetches live ngrok tunnel URLs from the local ngrok API
# Outputs them and optionally writes .env.ngrok files

API_URL=$(curl -s http://localhost:4040/api/tunnels | \
  python3 -c "
import sys, json
data = json.load(sys.stdin)
for t in data.get('tunnels', []):
  if 'api' in t.get('name', '').lower() or '8000' in t.get('config', {}).get('addr', ''):
    print('API_NGROK_URL=' + t['public_url'])
  if '3000' in t.get('config', {}).get('addr', ''):
    print('ADMIN_NGROK_URL=' + t['public_url'])
" 2>/dev/null)

if [ -z "$API_URL" ]; then
  echo "ngrok is not running. Start it with: make ngrok"
  exit 1
fi

echo "$API_URL"

# Write to reference file
echo "$API_URL" > .ngrok-urls
echo "URLs written to .ngrok-urls"
cat .ngrok-urls
