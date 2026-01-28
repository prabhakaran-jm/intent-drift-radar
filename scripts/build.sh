#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/.."

# Build frontend and copy to backend/static/ for single-container serving

echo "Building frontend..."

# Install frontend dependencies if needed
if [ ! -d "frontend/node_modules" ]; then
  echo "Installing frontend dependencies..."
  cd frontend && npm install && cd ..
fi

# Build frontend (outputs to backend/static/ per vite.config.ts)
cd frontend
npm run build
cd ..

echo "Frontend built successfully to backend/static/"
echo "You can now run (from project root):"
echo "  uvicorn backend.src.app:app --reload --host 127.0.0.1 --port 8000"
echo "Or: make run-backend"
