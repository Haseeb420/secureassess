#!/usr/bin/env bash
set -e
echo "Starting desktop app..."
cd apps/desktop
pnpm tauri dev
