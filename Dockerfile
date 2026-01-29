# Multi-stage Dockerfile for Cloud Run
# Stage 1: Build frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /app

# Create backend/static directory for build output
RUN mkdir -p backend/static

# Copy package files
COPY frontend/package.json frontend/package-lock.json* ./frontend/

# Install dependencies
RUN cd frontend && npm ci --only=production=false

# Copy frontend source
COPY frontend/ ./frontend/

# Build frontend (outputs to ../backend/static per vite.config.ts)
RUN cd frontend && npm run build

# Stage 2: Python backend with built frontend
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies if needed
RUN apt-get update && apt-get install -y --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source code
COPY backend/src ./backend/src
COPY backend/data ./backend/data

# Copy docs directory (needed for prompt template)
COPY docs ./docs

# Copy built frontend from stage 1
COPY --from=frontend-builder /app/backend/static ./backend/static

# Ensure backend/static directory exists (create if needed)
RUN mkdir -p backend/static && ls -la backend/static || echo "Warning: backend/static may be empty"

# Cloud Run sets PORT environment variable
# Default to 8080 if not set (Cloud Run requirement)
ENV PORT=8080

# Expose port (Cloud Run uses $PORT env var, but EXPOSE documents the default)
EXPOSE 8080

# Run uvicorn on 0.0.0.0:$PORT (Cloud Run requirement)
# Must run from project root so backend.src.app can be imported
CMD exec uvicorn backend.src.app:app --host 0.0.0.0 --port ${PORT} --workers 1
