#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/.."

# Run backend (uvicorn) and frontend (Vite) in parallel for local dev.
# Frontend proxies /api to http://127.0.0.1:8000

run_backend() {
  # Run from project root so backend module can be imported
  uvicorn backend.src.app:app --reload --host 127.0.0.1 --port 8000
}

run_frontend() {
  (cd frontend && npm run dev)
}

# Start backend in background, then frontend in foreground. Ctrl+C kills frontend; trap kills backend.
run_backend &
PID=$!
trap "kill $PID 2>/dev/null || true" EXIT
run_frontend
