#!/usr/bin/env bash
# First-time setup: copies .env.example files if .env does not exist

setup_env() {
  local dir="$1"
  local example="$2"
  local target="$3"
  if [ ! -f "$dir/$target" ]; then
    if [ -f "$dir/$example" ]; then
      cp "$dir/$example" "$dir/$target"
      echo "Created $dir/$target from $example"
    else
      echo "Warning: $dir/$example not found, skipping"
    fi
  else
    echo "$dir/$target already exists, skipping"
  fi
}

setup_env "apps/api"     ".env.example"       ".env"
setup_env "apps/admin"   ".env.local.example" ".env.local"
setup_env "apps/desktop" ".env.example"        ".env"

echo ""
echo "Edit the .env files and add your:"
echo "  SUPABASE_URL, SUPABASE_SERVICE_KEY"
echo "  BETTER_AUTH_SECRET"
echo "  NGROK_STATIC_DOMAIN (from ngrok dashboard)"
