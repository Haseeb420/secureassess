#!/usr/bin/env bash
set -e
echo "Starting FastAPI..."
cd apps/api
if [ ! -d ".venv" ]; then
  echo "Creating virtual environment..."
  python3 -m venv .venv
fi
source .venv/bin/activate
pip install -r requirements.txt -q
uvicorn main:app --reload --port 8000 --host 0.0.0.0
