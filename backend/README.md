# Intent Drift Radar Backend

FastAPI backend with strict Pydantic models matching `docs/ai-studio/sample-output.json` schema.

## Local Run Steps

1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. Run the server:
   ```bash
   uvicorn src.app:app --reload --app-dir .
   ```
   
   Or from the project root:
   ```bash
   uvicorn backend.src.app:app --reload --app-dir backend
   ```

3. Server runs on `http://127.0.0.1:8000`

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
Analyze signals and return intent drift analysis.

**Request Body:**
```json
{
  "signals": [
    "Day 1: Build an education-first kids learning app.",
    "Day 2: Focus on curriculum and quizzes."
  ]
}
```

**Response:**
Returns `AnalysisResult` matching the schema in `docs/ai-studio/sample-output.json`:
- `baseline_intent`: IntentBlock (title, detail)
- `current_intent`: IntentBlock (title, detail)
- `drift_detected`: bool
- `confidence`: float (0.0-0.95)
- `drift_direction`: string
- `evidence`: List[EvidenceItem] (day, reason)
- `reasoning_cards`: List[ReasoningCard] (title, body, refs)
- `drift_signature`: string
- `one_question`: string | null

**Example:**
```bash
curl -X POST http://127.0.0.1:8000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"signals": ["Day 1: Build an education-first kids learning app."]}'
```

### POST /api/feedback
Accept feedback and persist to local JSON store (`backend/data/store.json`).

**Request Body:**
```json
{
  "analysis_id": "optional-id",
  "feedback_type": "correct",
  "comment": "Optional comment",
  "metadata": {}
}
```

**Example:**
```bash
curl -X POST http://127.0.0.1:8000/api/feedback \
  -H "Content-Type: application/json" \
  -d '{"feedback_type": "correct", "comment": "Analysis was accurate"}'
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
- `IntentBlock`: title, detail
- `EvidenceItem`: day, reason
- `ReasoningCard`: title, body, refs
- `AnalysisResult`: complete analysis response
- `AnalyzeRequest`: request body for /api/analyze
- `FeedbackRequest`: request body for /api/feedback
