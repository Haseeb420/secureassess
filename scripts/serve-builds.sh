#!/usr/bin/env bash
# Serves the dist/installers directory over HTTP on LAN
# So other devices on the same WiFi can download builds

PORT=${1:-9000}
IP=$(ipconfig getifaddr en0 2>/dev/null || hostname -I | awk '{print $1}')

echo ""
echo "Serving builds at:"
echo "  http://${IP}:${PORT}"
echo ""
echo "Share this URL with testers on the same network."
echo "Press Ctrl+C to stop."
echo ""

cd dist/installers 2>/dev/null || { echo "No builds in dist/installers yet. Run: make build-mac"; exit 1; }
python3 -m http.server $PORT
