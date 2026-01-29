# Intent Drift Radar v1.0.0

Gemini 3–powered reasoning service that detects when a user's **original goal silently drifts over time** and explains why, when, and how confidently.

## Highlights

- **Judge Mode / Quick Demo** — Instant cached result for evaluation; no Gemini call by default
- **Live Gemini** — Single-call analysis with configurable thinking level
- **Ensemble Mode** — 3 parallel calls (low/medium/high) with majority voting and evidence agreement; discoverable via callout when viewing cached demo result
- **Structured output** — JSON schema, Pydantic validation, postprocessing guardrails
- **Deployable** — FastAPI backend, React frontend, Terraform for Google Cloud Run

## What's included

- Backend: FastAPI, Gemini 3 Pro integration, fallback & timeouts, `/api/analyze` and `/api/analyze/ensemble`
- Frontend: Timeline, analysis panel, evidence/reasoning, feedback, settings (including Ensemble toggle)
- Infra: Cloud Run (120s timeout for ensemble), Secret Manager for API key
- Docs: README, architecture, judge check script

## Requirements

- Python 3.11+, Node 18+ for local dev
- `GEMINI_API_KEY` for live/ensemble analysis

**Full docs:** [README.md](README.md)
