"""FastAPI app with /api/health, /api/analyze, and /api/feedback endpoints."""

import uuid
from datetime import datetime

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .models import AnalyzeRequest, AnalysisResult, FeedbackRequest
from .store import append_feedback, list_feedback

app = FastAPI(title="Intent Drift Radar API")

# Add CORS middleware to allow frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health() -> dict:
    """Health check endpoint."""
    return {"ok": True}


@app.post("/api/analyze", response_model=AnalysisResult)
def analyze(request: AnalyzeRequest) -> AnalysisResult:
    """
    Analyze signals and return mocked AnalysisResult conforming to schema.
    
    Currently returns a mocked response matching docs/ai-studio/sample-output.json.
    Accepts prior feedback in the request (if provided).
    """
    # Generate unique analysis_id
    analysis_id = str(uuid.uuid4())
    
    # Note: In a real implementation, prior feedback would influence the analysis
    # For now, we just acknowledge it's present
    if request.feedback:
        # Feedback received but not yet used in mocked analysis
        pass
    
    # Mocked response matching the sample schema
    result = AnalysisResult(
        analysis_id=analysis_id,
        baseline_intent={
            "title": "Kids Educational Application",
            "detail": "Development of an education-first learning app for children with a specific focus on curriculum content and quiz mechanisms."
        },
        current_intent={
            "title": "Creator Monetization Infrastructure",
            "detail": "Development of a backend tool or platform designed to facilitate content monetization for creators, moving away from the educational vertical."
        },
        drift_detected=True,
        confidence=0.95,
        drift_direction="EdTech Product → Creator Tooling",
        evidence=[
            {"day": "Day 1", "reason": "Initial declaration of a specific B2C educational product goal."},
            {"day": "Day 4", "reason": "Investigation into payment infrastructure (Stripe/paywalls) which acted as a bridge topic."},
            {"day": "Day 5", "reason": "Explicit user declaration of a pivot towards the tool discovered during prior research."}
        ],
        reasoning_cards=[
            {
                "title": "Intent Snapshot (Baseline)",
                "body": "The user began with a content-centric goal (Day 1–2), focusing on educational pedagogy such as curriculum and quizzes rather than infrastructure.",
                "refs": ["Day 1", "Day 2"]
            },
            {
                "title": "Intent Snapshot (Current)",
                "body": "The focus has shifted entirely to enabling technology. The user is now building monetization infrastructure for creators rather than an end-user learning product for children.",
                "refs": ["Day 5"]
            },
            {
                "title": "Drift Evidence",
                "body": "Drift followed a mechanism-as-product pattern. The user explored pricing and payments for the original app (Day 3–4), then pivoted to building that infrastructure as the primary product (Day 5).",
                "refs": ["Day 3", "Day 4", "Day 5"]
            },
            {
                "title": "Temporal Compression",
                "body": "The pivot occurred rapidly within a 5-day window. The transition from product definition to infrastructure research happened in roughly 48 hours (Day 2 to Day 4), indicating low attachment to the original educational hypothesis.",
                "refs": ["Day 2", "Day 4", "Day 5"]
            },
            {
                "title": "Drift Signature Explanation",
                "body": "The drift signature encodes a high-confidence shift from the EdTech domain to Creator Tooling over a 5-day observation window, supported by three converging evidentiary signals.",
                "refs": ["Day 1", "Day 4", "Day 5"]
            }
        ],
        drift_signature="IDR:v1|dir=EDTECH>CREATOR_TOOLS|span=5d|e=3|conf=0.95",
        one_question=None
    )
    return result


@app.post("/api/feedback")
def feedback(request: FeedbackRequest) -> dict:
    """
    Accept feedback payload and persist it to local JSON store.
    Stores verdict ('confirm' or 'reject'), comment, and created_at timestamp.
    """
    feedback_data = {
        "analysis_id": request.analysis_id,
        "verdict": request.verdict,
        "comment": request.comment,
        "created_at": datetime.utcnow().isoformat() + "Z"
    }
    append_feedback(feedback_data)
    return {"ok": True, "saved": True}


@app.get("/api/feedback")
def get_feedback() -> dict:
    """List all feedback entries."""
    return {"feedback": list_feedback()}
