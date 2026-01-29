# Intent Drift Radar Backend

FastAPI backend with Gemini 3 Pro integration for intent drift analysis. Uses strict Pydantic models matching `docs/ai-studio/sample-output.json` schema.

## Setup

1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. Set the Gemini API key:
   ```bash
   export GEMINI_API_KEY="your-api-key-here"
   ```
   
   Or create a `.env` file in the backend directory:
   ```
   GEMINI_API_KEY=your-api-key-here
   ```
   
   Get your API key from [Google AI Studio](https://makersuite.google.com/app/apikey).

3. (Optional) Configure the model:
   ```bash
   export GEMINI_MODEL="gemini-3-pro-preview"  # Default
   ```
   
   **Model Fallback:** If the configured model returns 404 NOT_FOUND, the backend will automatically:
   - List available models via the API
   - Select a fallback model in preference order:
     1. `gemini-3-pro-preview`
     2. `gemini-3-pro`
     3. `gemini-3-flash-preview`
   - Retry the request with the fallback model
   - Log the final model used

4. Run the server (from project root):
   ```bash
   # IMPORTANT: Must run from project root, not from backend/ directory
   cd /path/to/intent-drift-radar  # project root
   uvicorn backend.src.app:app --reload --host 127.0.0.1 --port 8000
   ```
   
   Or use the Makefile:
   ```bash
   make run-backend
   ```

5. Server runs on `http://127.0.0.1:8000`

**Note:** If `GEMINI_API_KEY` is not set, `/api/analyze` will return HTTP 500 with a clear error message.

## API Endpoints

### GET /api/health
Health check endpoint.

**Response:**
```json
{"ok": true}
```

**Example:**
```bash
curl http://127.0.0.1:8000/api/health
```

### POST /api/analyze
Analyze signals using Gemini 3 Pro and return intent drift analysis.

**Request Body:**
```json
{
  "signals": [
    {
      "day": "Day 1",
      "type": "declaration",
      "content": "Build an education-first kids learning app."
    },
    {
      "day": "Day 2",
      "type": "declaration",
      "content": "Focus on curriculum and quizzes."
    }
  ],
  "settings": {
    "baseline_window_size": 2,
    "current_window_size": 2,
    "thinking_level": "medium"
  },
  "feedback": [
    {
      "analysis_id": "previous-analysis-id",
      "verdict": "confirm",
      "comment": "Analysis was accurate",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

**Response:**
Returns `AnalysisResult` matching the schema in `docs/ai-studio/sample-output.json`:
- `analysis_id`: string (unique identifier)
- `baseline_intent`: IntentBlock (title, detail)
- `current_intent`: IntentBlock (title, detail)
- `drift_detected`: bool
- `confidence`: float (0.0-0.95)
- `drift_direction`: string
- `evidence`: List[EvidenceItem] (day, reason)
- `reasoning_cards`: List[ReasoningCard] (title, body, refs) - always includes 5 required cards
- `drift_signature`: string (format: `IDR:v1|dir=<FROM>><TO>|span=<Nd>|e=<count>|conf=<0.xx>`)
- `one_question`: string | null (only set if confidence is 0.40-0.70)

**Example:**
```bash
curl -X POST http://127.0.0.1:8000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "signals": [
      {
        "day": "Day 1",
        "type": "declaration",
        "content": "Build an education-first kids learning app."
      },
      {
        "day": "Day 2",
        "type": "declaration",
        "content": "Focus on curriculum and quizzes."
      },
      {
        "day": "Day 3",
        "type": "declaration",
        "content": "Thinking about pricing tiers."
      },
      {
        "day": "Day 4",
        "type": "research",
        "content": "Reading Stripe docs and paywall ideas."
      },
      {
        "day": "Day 5",
        "type": "declaration",
        "content": "Pivot toward creator monetization tool."
      }
    ]
  }'
```

**Expected Behavior:**
- Returns schema-valid JSON with all required fields
- Includes 5 reasoning cards (Intent Snapshot Baseline, Intent Snapshot Current, Drift Evidence, Temporal Compression, Drift Signature Explanation)
- Drift signature follows required format
- Confidence is between 0.0 and 0.95

**Error Responses:**
- `500`: `GEMINI_API_KEY` not set
- `502`: Model output invalid (with error code `MODEL_OUTPUT_INVALID`)

### POST /api/feedback
Accept feedback and persist to local JSON store (`backend/data/store.json`).

**Request Body:**
```json
{
  "analysis_id": "analysis-id-from-result",
  "verdict": "confirm",
  "comment": "Optional comment"
}
```

**Verdict values:** `"confirm"` or `"reject"`

**Example:**
```bash
curl -X POST http://127.0.0.1:8000/api/feedback \
  -H "Content-Type: application/json" \
  -d '{
    "analysis_id": "123e4567-e89b-12d3-a456-426614174000",
    "verdict": "confirm",
    "comment": "Analysis was accurate"
  }'
```

### GET /api/feedback
List all feedback entries.

**Example:**
```bash
curl http://127.0.0.1:8000/api/feedback
```

## Storage

Feedback is stored in `backend/data/store.json` as a simple JSON file. No database required.

## Models

All models are defined in `src/models.py`:
- `Signal`: day, type, content
- `Settings`: baseline_window_size, current_window_size, thinking_level
- `IntentBlock`: title, detail
- `EvidenceItem`: day, reason
- `ReasoningCard`: title, body, refs
- `AnalysisResult`: complete analysis response
- `AnalyzeRequest`: request body for /api/analyze (signals: List[Signal], optional settings, optional feedback)
- `FeedbackRequest`: request body for /api/feedback

## Output guardrails

After parsing and validating model output, `src/postprocess.py` applies guardrails:

- **normalize_drift_signature**: Replace `>>` with `>`, ensure prefix `IDR:v1|`
- **ensure_reasoning_cards_non_empty**: Reject empty reasoning_cards
- **normalize_drift_direction**: Map abstract wording to `{baseline_intent.title} → {current_intent.title}`
- **fix_temporal_compression_refs**: Fill Temporal Compression card refs from evidence days when missing

Tests: `backend/tests/test_postprocess.py`. Run from repo root: `make test`.
