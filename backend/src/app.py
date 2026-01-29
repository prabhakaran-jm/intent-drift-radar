"""FastAPI app with /api/health, /api/analyze, and /api/feedback endpoints.
Also serves built frontend from backend/static/ for single-container deployment."""

import logging
import os
import uuid
from datetime import datetime
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .models import AnalyzeRequest, AnalysisResult, FeedbackRequest
from .store import append_feedback, list_feedback
from .gemini import analyze_intent_drift

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Intent Drift Radar")

# Path to static files directory
STATIC_DIR = Path(__file__).resolve().parent.parent / "static"

# Add CORS middleware to allow frontend requests
# In production (Cloud Run), allow all origins since we're serving the frontend from the same domain
# In local dev, allow common localhost ports
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins (safe since we serve frontend from same domain)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health() -> dict:
    """Health check endpoint."""
    return {"ok": True}


@app.get("/api/version")
def version() -> dict:
    """Version information endpoint. Useful for demos and debugging."""
    return {
        "git_sha": os.getenv("GIT_SHA", "unknown"),
        "build_time": os.getenv("BUILD_TIME", "unknown"),
        "gemini_model": os.getenv("GEMINI_MODEL", "gemini-3-pro-preview"),
        "service_name": os.getenv("SERVICE_NAME", "intent-drift-radar"),
    }


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
            detail={
                "error": {
                    "code": "GEMINI_API_KEY_MISSING",
                    "message": "GEMINI_API_KEY is not set in the runtime environment."
                }
            }
        )
    
    # Generate unique analysis_id
    analysis_id = str(uuid.uuid4())
    
    try:
        # Call Gemini API
        result = analyze_intent_drift(request, analysis_id)
        return result
    except TimeoutError as e:
        logger.error(f"Gemini request timed out: {e}")
        raise HTTPException(
            status_code=504,
            detail={
                "error": {
                    "code": "MODEL_TIMEOUT",
                    "message": "Gemini request timed out. Try again."
                }
            }
        )
    except ValueError as e:
        error_msg = str(e)
        if error_msg.startswith("MODEL_OUTPUT_INVALID"):
            logger.error(f"Model output validation failed: {error_msg}")
            raise HTTPException(
                status_code=502,
                detail={
                    "error": {
                        "code": "MODEL_OUTPUT_INVALID",
                        "message": "Model output did not match required JSON schema."
                    }
                }
            )
        elif "GEMINI_API_KEY" in error_msg:
            logger.error(f"API key error: {error_msg}")
            raise HTTPException(
                status_code=500,
                detail={
                    "error": {
                        "code": "GEMINI_API_KEY_MISSING",
                        "message": "GEMINI_API_KEY is not set in the runtime environment."
                    }
                }
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


# Serve static files and SPA (only if static directory exists)
if STATIC_DIR.exists() and (STATIC_DIR / "index.html").exists():
    # Mount static assets (JS, CSS, etc.) - Vite outputs these under /assets/
    assets_dir = STATIC_DIR / "assets"
    if assets_dir.exists() and assets_dir.is_dir():
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")
    
    # SPA catch-all: serve index.html for all non-API routes
    # This must be registered last so API routes take precedence
    @app.get("/{path:path}")
    def serve_spa(path: str):
        """Serve index.html for SPA routes (all routes except /api/*)."""
        # API routes are already handled above, so this won't match /api/*
        # Check if it's a static file first
        file_path = STATIC_DIR / path
        if file_path.exists() and file_path.is_file() and not path.startswith("api/"):
            return FileResponse(file_path)
        
        # Otherwise serve index.html for SPA routing
        index_path = STATIC_DIR / "index.html"
        if index_path.exists():
            return FileResponse(index_path)
        else:
            raise HTTPException(status_code=404, detail="Frontend not built. Run ./scripts/build.sh first.")
