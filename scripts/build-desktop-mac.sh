#!/usr/bin/env bash
set -e

echo "Building desktop app for macOS..."

# Load ngrok URL if available, otherwise use static domain from .env
if [ -f apps/api/.env ]; then
  export $(grep -v '^#' apps/api/.env | grep NGROK_STATIC_DOMAIN | xargs)
fi

# Set API URL for the build
if [ -n "$1" ]; then
  export VITE_API_BASE_URL="$1"
  echo "Using API URL: $1"
elif [ -n "$NGROK_STATIC_DOMAIN" ]; then
  export VITE_API_BASE_URL="https://${NGROK_STATIC_DOMAIN}"
  echo "Using static domain: https://${NGROK_STATIC_DOMAIN}"
else
  echo "Warning: No API URL set. Using localhost. Built app will only work locally."
  export VITE_API_BASE_URL="http://localhost:8000"
fi

cd apps/desktop
pnpm tauri build

echo ""
echo "Build complete. Output:"
find src-tauri/target/release/bundle -name "*.dmg" -o -name "*.app" | head -10

# Copy to dist/installers
mkdir -p ../../dist/installers
find src-tauri/target/release/bundle -name "*.dmg" -exec cp {} ../../dist/installers/ \;
echo "Installers copied to dist/installers/"
