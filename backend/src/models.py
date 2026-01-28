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
    baseline_intent: IntentBlock
    current_intent: IntentBlock
    drift_detected: bool
    confidence: float = Field(ge=0.0, le=0.95, description="Confidence between 0.00 and 0.95")
    drift_direction: str
    evidence: List[EvidenceItem] = Field(default_factory=list)
    reasoning_cards: List[ReasoningCard] = Field(default_factory=list)
    drift_signature: str
    one_question: Optional[str] = Field(default=None, description="Only set if confidence is 0.40-0.70")


class AnalyzeRequest(BaseModel):
    """Request body for /api/analyze endpoint."""
    signals: List[str] = Field(description="List of signals/timeline entries to analyze")


class FeedbackRequest(BaseModel):
    """Request body for /api/feedback endpoint."""
    analysis_id: Optional[str] = Field(default=None, description="Optional ID linking to analysis")
    feedback_type: str = Field(description="Type of feedback (e.g., 'correct', 'incorrect', 'clarification')")
    comment: Optional[str] = Field(default=None, description="Optional comment text")
    metadata: Optional[dict] = Field(default_factory=dict, description="Optional metadata dict")
