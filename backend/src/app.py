"""FastAPI app with /api/health, /api/analyze, and /api/feedback endpoints."""

import logging
import os
import uuid
from datetime import datetime

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .models import AnalyzeRequest, AnalysisResult, FeedbackRequest
from .store import append_feedback, list_feedback
from .gemini import analyze_intent_drift

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

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
    Analyze signals using Gemini 3 Pro and return AnalysisResult conforming to schema.
    
    Requires GEMINI_API_KEY environment variable to be set.
    Accepts prior feedback in the request (if provided).
    """
    # Check for API key
    if not os.getenv("GEMINI_API_KEY"):
        logger.error("GEMINI_API_KEY environment variable is not set")
        raise HTTPException(
            status_code=500,
            detail="GEMINI_API_KEY environment variable is not set. Please configure the API key to use the analysis service."
        )
    
    # Generate unique analysis_id
    analysis_id = str(uuid.uuid4())
    
    try:
        # Call Gemini API
        result = analyze_intent_drift(request, analysis_id)
        return result
    except ValueError as e:
        error_msg = str(e)
        if error_msg.startswith("MODEL_OUTPUT_INVALID"):
            logger.error(f"Model output validation failed: {error_msg}")
            raise HTTPException(
                status_code=502,
                detail={
                    "error": "MODEL_OUTPUT_INVALID",
                    "message": "The AI model returned invalid output. Please try again."
                }
            )
        elif "GEMINI_API_KEY" in error_msg:
            logger.error(f"API key error: {error_msg}")
            raise HTTPException(
                status_code=500,
                detail="GEMINI_API_KEY environment variable is not set. Please configure the API key to use the analysis service."
            )
        else:
            logger.error(f"Analysis error: {error_msg}")
            raise HTTPException(status_code=500, detail=f"Analysis failed: {error_msg}")
    except Exception as e:
        logger.error(f"Unexpected error during analysis: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Unexpected error during analysis: {str(e)}")


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
