# Intent Drift Radar

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![React](https://img.shields.io/badge/React-18-61dafb?logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript)](https://www.typescriptlang.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.109-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![Google Gemini](https://img.shields.io/badge/Google-Gemini%203-4285f4?logo=google)](https://ai.google.dev/)
[![Cloud Run](https://img.shields.io/badge/Google-Cloud%20Run-4285f4?logo=google-cloud)](https://cloud.google.com/run)
[![Terraform](https://img.shields.io/badge/Terraform-GCP-7b42bc?logo=terraform)](https://www.terraform.io/)

**Intent Drift Radar** is a Gemini 3–powered reasoning service that detects when a user’s *original goal silently drifts over time* — and explains **why**, **when**, and **how confidently** that drift occurred.

Unlike stateless chat-based tools, Intent Drift Radar operates over a **time-ordered signal stream** (days, notes, decisions) and produces a **deterministic drift decision** that downstream agents can trust.

## Public Demo (No Login)

- **App:** https://intent-drift-radar-2jxc3vgkpa-nw.a.run.app
- **Quick Demo:** Click **▶ Quick Demo** (instant cached result; no Gemini call)
- **Health:** https://intent-drift-radar-2jxc3vgkpa-nw.a.run.app/api/health
- **Version:** https://intent-drift-radar-2jxc3vgkpa-nw.a.run.app/api/version
- **Architecture:** [docs/architecture.md](docs/architecture.md)

**Pre-submit checks:** `./scripts/judge_check.sh`

## Screenshot

![Judge Mode](docs/screenshots/judge-mode.png)

---

## What it does (in one run)

Given a timeline of user signals, the system:

- Identifies the **baseline intent** vs the **current intent**
- Detects whether **intent drift** occurred
- Assigns a **confidence score**
- Extracts **evidence tied to specific days**
- Generates **inspectable reasoning cards**
- Emits a **compact drift signature** for agent orchestration

This turns Gemini 3’s reasoning into a **verifiable decision layer**, not just a chat response.

---

## Why this matters

Long-running agents fail when intent changes silently.

Intent Drift Radar enables agents to:
- pause execution,
- re-plan,
- ask clarifying questions,
- or escalate to a human

— based on **evidence-backed intent change**, not guesswork.

---

## Quick Demo / Judge evaluation

- **Quick Demo** uses **cached**, precomputed Gemini analysis from `docs/ai-studio/sample-output.json` for instant judge evaluation and to avoid quota/latency. Click **▶ Quick Demo** to load the demo dataset and see the cached result in ~5 seconds; no live Gemini call is made.
- **Live Analyze** uses Gemini 3 via `POST /api/analyze`. Use the **Analyze** button after loading or editing signals to run a real Gemini analysis (typical duration 20–30 seconds).

Open the app and click **▶ Quick Demo** to try it:

- A 5-day dataset loads automatically
- Cached analysis appears immediately (badge: **Demo Result (Cached)**)
- Hover evidence or reasoning cards to see **which days caused the decision**
- Pinned highlights show **multi-day causal links**
- Copy a clean summary for reports or agent logs

### Validation

You can verify which path was used:

1. **Network header:** Open DevTools → Network. For the response that returns the analysis, check the **X-IDR-Mode** header: `demo-cached` (Quick Demo) or `live-gemini` (Analyze).
2. **Cloud Run logs:** Only live analyzes log `IDR_LIVE_ANALYZE_CALLED analysis_id=<uuid>`. Quick Demo does not call Gemini, so that log line will not appear.

---

## Architecture (at a glance)

- **Frontend**: React + TypeScript (single-page UI)
- **Backend**: FastAPI + Gemini 3 Pro
- **Inference**: Gemini API (global)
- **Runtime**: Cloud Run (europe-west2)
- **Secrets**: Secret Manager (no keys in code or Terraform)
- **Infra**: Terraform (reproducible deployment)

---

## What makes it different

- **Temporal reasoning**, not prompt comparison
- **Evidence → Day → Decision traceability**
- **Human-reviewable reasoning cards**
- **Deterministic drift signatures**
- **Feedback loop** (confirm / reject drift) for iterative refinement

---

## Quick Start

### Local Development (Two-Process Mode)

Run backend and frontend separately for hot-reload development:

```bash
# Install dependencies
make install

# Run both backend and frontend concurrently
make dev
# Or: ./scripts/dev.sh

# Backend runs on http://localhost:8000
# Frontend runs on http://localhost:5173 (with Vite proxy to backend)
```

Access the app at `http://localhost:5173` - the frontend will proxy `/api/*` requests to the backend.

### Production Build (Single-Container Mode)

Build frontend and serve everything from the backend:

```bash
# Build frontend into backend/static/
./scripts/build.sh
# Or: make build

# Run backend only (serves built frontend)
# IMPORTANT: Run from project root, not from backend/ directory
make run-backend
# Or: uvicorn backend.src.app:app --reload --host 127.0.0.1 --port 8000

# Access at http://localhost:8000
```

The backend serves:
- `/api/*` - API endpoints
- `/` - Frontend SPA (index.html)
- `/assets/*` - Static assets (JS, CSS, images)

## Setup

### Backend

1. Install Python dependencies:
   ```bash
   pip install -r backend/requirements.txt
   ```

2. Set Gemini API key:
   ```bash
   export GEMINI_API_KEY="your-api-key-here"
   ```

3. (Optional) Configure model:
   ```bash
   export GEMINI_MODEL="gemini-3-pro-preview"  # Default
   ```

See [backend/README.md](backend/README.md) for detailed backend documentation.

### Frontend

1. Install dependencies:
   ```bash
   cd frontend && npm install
   ```

2. For local dev, optionally set API base:
   ```bash
   export VITE_API_BASE="http://localhost:8000"
   ```

   If not set, Vite proxy handles `/api` routes automatically in dev mode.

## Project Structure

```
intent-drift-radar/
├── backend/
│   ├── src/
│   │   ├── app.py          # FastAPI app (serves API + static frontend)
│   │   ├── gemini.py       # Gemini 3 Pro integration
│   │   ├── models.py       # Pydantic models
│   │   ├── postprocess.py  # Output guardrails (signature, drift direction, refs)
│   │   └── store.py        # JSON file storage
│   ├── tests/              # Pytest tests (e.g. test_postprocess.py)
│   ├── static/             # Built frontend (generated by build.sh)
│   └── data/               # JSON data storage
├── frontend/
│   ├── src/
│   │   ├── components/     # HeaderBar, TimelinePanel, AnalysisPanel, EvidencePanel, etc.
│   │   ├── App.tsx         # Root layout, state, Judge/Demo mode
│   │   ├── api.ts          # Backend API client
│   │   └── types.ts        # Shared types
│   └── vite.config.ts      # Builds to ../backend/static
├── infra/                  # Terraform (Cloud Run, Artifact Registry, IAM, secrets)
├── scripts/
│   ├── build.sh            # Build frontend for production
│   ├── dev.sh              # Run backend + frontend for dev
│   └── deploy_all.sh       # Build, push, deploy to Cloud Run
└── docs/
    └── ai-studio/          # Prompt templates and sample output
```

## Deployment

### Deploy (Terraform + Cloud Run)

**Compute runs in europe-west2. Model inference happens on Google’s global Gemini API endpoint.**

Scripts read Terraform outputs from `infra/` and build/push/deploy to Cloud Run. No secrets are stored in Terraform state. **GEMINI_API_KEY** is required for `/api/analyze`; you can inject it from Secret Manager (recommended) or from an env var (quick dev).

**Steps:**

```bash
# 1. Provision infrastructure (from repo root)
terraform -chdir=infra init -backend-config=backend.tfvars
terraform -chdir=infra apply

# 2. Provide the API key for /api/analyze — choose one:
#    Recommended (Secret Manager; no key in shell):
export SECRET_NAME=gemini-api-key   # default; ensure secret exists and runtime SA has secretAccessor

#    Optional quick dev (key in environment):
# export GEMINI_API_KEY="your-api-key-here"

# 3. Build, push, and deploy
./scripts/deploy_all.sh
```

**4. Verify**

```bash
curl <CLOUD_RUN_URL>/api/health
```

To confirm Cloud Run gets `GEMINI_API_KEY` from Secret Manager:

```bash
gcloud run services describe <SERVICE_NAME> --region <REGION> --project <PROJECT_ID> --format='yaml(spec.template.spec.containers[0].env)' | grep -A2 GEMINI_API_KEY
```

You should see a `valueSource.secretKeyRef` (secret) rather than a literal `value` (env var).

#### Detailed Steps

**Step 1: Provision Infrastructure**

```bash
cd infra/

# Initialize Terraform with backend
terraform init -backend-config=backend.tfvars

# Review and apply infrastructure
terraform plan
terraform apply
```

This creates:
- Artifact Registry Docker repository
- Cloud Run service (with placeholder image)
- Required IAM bindings

**Step 2: Deploy Application**

From the **project root**:

```bash
# Recommended: use Secret Manager (secret must exist; Terraform grants runtime SA access for gemini-api-key)
export SECRET_NAME=gemini-api-key
./scripts/deploy_all.sh
```

Or for quick local testing (key in environment):

```bash
export GEMINI_API_KEY="your-api-key-here"
./scripts/deploy_all.sh
```

The script loads Terraform outputs, builds and pushes the image, then updates Cloud Run. It injects **GEMINI_API_KEY** either from Secret Manager (`SECRET_NAME`) or from your environment (`GEMINI_API_KEY`). **GEMINI_MODEL** is always set from Terraform/default.

**Deploy only** (skip build; requires `IMAGE_URI` set):

```bash
export IMAGE_URI="europe-west2-docker.pkg.dev/PROJECT_ID/REPO/IMAGE:TAG"
./scripts/deploy_all.sh --skip-build
```

**Custom Image Tag**:

```bash
./scripts/deploy_all.sh --tag v1.0.0
```

#### Verify Deployment

After deployment, the script prints the service URL. Test it:

```bash
# Health check
curl <SERVICE_URL>/api/health
# Should return: {"ok":true}

# The service URL is also available via:
cd infra && terraform output -raw cloud_run_url
```

**Important:** The `/api/analyze` endpoint requires `GEMINI_API_KEY`. Use `export SECRET_NAME=gemini-api-key` (default) so the deploy script injects it from Secret Manager; ensure the secret exists and the Cloud Run runtime SA has `roles/secretmanager.secretAccessor` on it (Terraform does this for the default secret). See [infra/README.md](infra/README.md) for creating the secret and IAM.

#### Manual deployment

Run steps individually:

```bash
source scripts/tf_outputs.sh
./scripts/build_push.sh
./scripts/deploy_cloudrun.sh "$IMAGE_URI"
```

Or pass image URI directly: `./scripts/deploy_cloudrun.sh <image_uri>`.

### Local Production Build

For local testing of the production build:

1. Build frontend: `./scripts/build.sh`
2. Deploy backend (which includes built frontend in `backend/static/`)
3. Set `GEMINI_API_KEY` environment variable
4. Backend serves both API and frontend from one container

## Troubleshooting

### Error Codes

The API returns consistent JSON error responses with `error.code` and `error.message`:

#### `GEMINI_API_KEY_MISSING` (500)
- **Message**: "GEMINI_API_KEY is not set in the runtime environment."
- **Fix**: Ensure `GEMINI_API_KEY` is set as an environment variable or injected via Secret Manager. For Cloud Run, use `export SECRET_NAME=gemini-api-key` before deploying (default) and ensure the secret exists with the correct IAM permissions.

#### `MODEL_TIMEOUT` (504)
- **Message**: "Gemini request timed out. Try again."
- **Fix**: The Gemini API call exceeded 25 seconds. This can happen with very long prompts or slow API responses. Retry the request or reduce the input size.

#### `MODEL_OUTPUT_INVALID` (502)
- **Message**: "Model output did not match required JSON schema."
- **Fix**: The model returned invalid JSON or data that doesn't match the expected schema. The service automatically retries once with a repair instruction. If it still fails, try again or check the model configuration.

### Version Endpoint

The `/api/version` endpoint is useful for demos and debugging:

```bash
curl <SERVICE_URL>/api/version
```

Returns:
```json
{
  "git_sha": "<commit SHA or unknown>",
  "build_time": "<build timestamp or unknown>",
  "gemini_model": "<model name>",
  "service_name": "<service name>"
}
```

These values come from environment variables (`GIT_SHA`, `BUILD_TIME`, `GEMINI_MODEL`, `SERVICE_NAME`) set during build/deploy.

## Development

- **Backend API**: FastAPI with Gemini 3 Pro integration; output guardrails in `postprocess.py`
- **Frontend**: Vite + React + TypeScript; 3-column UI (Timeline | Analysis | Evidence & Reasoning)
- **Storage**: Local JSON files (no database required)
- **Analysis**: Intent drift detection with reasoning cards, evidence, and traceability (evidence ↔ timeline linking)

See [backend/README.md](backend/README.md) and [frontend/README.md](frontend/README.md) for more details.
