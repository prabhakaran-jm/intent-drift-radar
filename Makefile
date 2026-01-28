# Intent Drift Radar – single-container frontend + backend

.PHONY: dev install install-frontend install-backend build run-backend run-frontend

# Run both frontend (Vite) and backend (uvicorn) locally
dev:
	./scripts/dev.sh

# Install all dependencies
install: install-backend install-frontend

install-backend:
	pip install -r backend/requirements.txt

install-frontend:
	cd frontend && npm install

# Build frontend into backend/static for production / Cloud Run
build:
	./scripts/build.sh

# Run backend only (serves built frontend from backend/static when present)
# Must run from project root
run-backend:
	uvicorn backend.src.app:app --reload --host 127.0.0.1 --port 8000

# Run frontend dev server only (proxies /api to backend :8000)
run-frontend:
	cd frontend && npm run dev
