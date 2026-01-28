"""Pydantic models matching docs/ai-studio/sample-output.json schema."""

from pydantic import BaseModel, Field
from typing import List, Optional


class IntentBlock(BaseModel):
    """Intent snapshot with title and detail."""
    title: str
    detail: str


class EvidenceItem(BaseModel):
    """Evidence item with day reference and reason."""
    day: str
    reason: str


class ReasoningCard(BaseModel):
    """Reasoning card with title, body, and day references."""
    title: str
    body: str
    refs: List[str] = Field(default_factory=list)


class AnalysisResult(BaseModel):
    """Complete analysis result matching the schema."""
    analysis_id: str = Field(description="Unique identifier for this analysis")
    baseline_intent: IntentBlock
    current_intent: IntentBlock
    drift_detected: bool
    confidence: float = Field(ge=0.0, le=0.95, description="Confidence between 0.00 and 0.95")
    drift_direction: str
    evidence: List[EvidenceItem] = Field(default_factory=list)
    reasoning_cards: List[ReasoningCard] = Field(default_factory=list)
    drift_signature: str
    one_question: Optional[str] = Field(default=None, description="Only set if confidence is 0.40-0.70")


class FeedbackItem(BaseModel):
    """Single feedback item."""
    analysis_id: str
    verdict: str = Field(description="'confirm' or 'reject'")
    comment: Optional[str] = None
    created_at: str = Field(description="ISO timestamp")


class AnalyzeRequest(BaseModel):
    """Request body for /api/analyze endpoint."""
    signals: List[str] = Field(description="List of signals/timeline entries to analyze")
    feedback: Optional[List[FeedbackItem]] = Field(default=None, description="Prior feedback items to consider")


class FeedbackRequest(BaseModel):
    """Request body for /api/feedback endpoint."""
    analysis_id: str = Field(description="ID linking to analysis")
    verdict: str = Field(description="'confirm' or 'reject'")
    comment: Optional[str] = Field(default=None, description="Optional comment text")
