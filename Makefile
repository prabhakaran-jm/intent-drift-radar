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
build: install-frontend
	cd frontend && npm run build

# Run backend only (serves built frontend from backend/static when present)
run-backend:
	uvicorn backend.app.main:app --reload --app-dir .

# Run frontend dev server only (proxies /api to backend :8000)
run-frontend:
	cd frontend && npm run dev
