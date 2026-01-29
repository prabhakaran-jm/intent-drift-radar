"""Unit tests for ensemble consensus (no Gemini calls)."""

import pytest
from backend.src.ensemble import compute_consensus
from backend.src.models import (
    AnalysisResult,
    EvidenceItem,
    IntentBlock,
    ReasoningCard,
)


def _make_result(
    analysis_id: str,
    drift_detected: bool,
    confidence: float,
    drift_direction: str,
    evidence: list,
    drift_signature: str,
) -> AnalysisResult:
    return AnalysisResult(
        analysis_id=analysis_id,
        baseline_intent=IntentBlock(title="Baseline", detail="Baseline detail"),
        current_intent=IntentBlock(title="Current", detail="Current detail"),
        drift_detected=drift_detected,
        confidence=confidence,
        drift_direction=drift_direction,
        evidence=[EvidenceItem(day=e["day"], reason=e["reason"]) for e in evidence],
        reasoning_cards=[
            ReasoningCard(title="Card", body="Body", refs=["Day 1"]),
        ],
        drift_signature=drift_signature,
        one_question=None,
    )


def test_consensus_drift_detected_majority():
    """2/3 drift_detected true => consensus true."""
    r1 = _make_result("a1", True, 0.9, "A→B", [{"day": "Day 1", "reason": "x"}], "IDR:v1|dir=A>B|span=1d|e=1|conf=0.90")
    r2 = _make_result("a2", True, 0.8, "A→B", [{"day": "Day 1", "reason": "x"}], "IDR:v1|dir=A>B|span=1d|e=1|conf=0.80")
    r3 = _make_result("a3", False, 0.7, "A→B", [{"day": "Day 1", "reason": "x"}], "IDR:v1|dir=A>B|span=1d|e=1|conf=0.70")
    consensus, agreement = compute_consensus([("low", r1), ("medium", r2), ("high", r3)], "ens-1")
    assert consensus.drift_detected is True
    assert agreement.drift_detected_votes["true"] == 2
    assert agreement.drift_detected_votes["false"] == 1


def test_consensus_confidence_median():
    """Confidence is median of successful confidences, clamped 0.95."""
    r1 = _make_result("a1", True, 0.95, "A→B", [{"day": "Day 1", "reason": "r"}], "IDR:v1|dir=A>B|span=1d|e=1|conf=0.95")
    r2 = _make_result("a2", True, 0.80, "A→B", [{"day": "Day 1", "reason": "r"}], "IDR:v1|dir=A>B|span=1d|e=1|conf=0.80")
    r3 = _make_result("a3", True, 0.70, "A→B", [{"day": "Day 1", "reason": "r"}], "IDR:v1|dir=A>B|span=1d|e=1|conf=0.70")
    consensus, agreement = compute_consensus([("low", r1), ("medium", r2), ("high", r3)], "ens-2")
    assert consensus.confidence == 0.80
    assert agreement.confidence_min == 0.70
    assert agreement.confidence_max == 0.95


def test_consensus_evidence_buckets():
    """Evidence grouped into 3_of_3, 2_of_3, 1_of_3."""
    e_common = {"day": "Day 1", "reason": "common"}
    e_two = {"day": "Day 2", "reason": "two"}
    e_one = {"day": "Day 3", "reason": "one"}
    r1 = _make_result("a1", True, 0.9, "A→B", [e_common, e_two, e_one], "IDR:v1|dir=A>B|span=3d|e=3|conf=0.90")
    r2 = _make_result("a2", True, 0.8, "A→B", [e_common, e_two], "IDR:v1|dir=A>B|span=2d|e=2|conf=0.80")
    r3 = _make_result("a3", True, 0.7, "A→B", [e_common], "IDR:v1|dir=A>B|span=1d|e=1|conf=0.70")
    consensus, agreement = compute_consensus([("low", r1), ("medium", r2), ("high", r3)], "ens-3")
    agg = agreement.evidence_agreement
    assert len(agg.three_of_three) == 1
    assert agg.three_of_three[0].day == "Day 1" and "common" in agg.three_of_three[0].reason
    assert len(agg.two_of_three) == 1
    assert agg.two_of_three[0].day == "Day 2"
    assert len(agg.one_of_three) == 1
    assert agg.one_of_three[0].day == "Day 3"
    assert consensus.drift_signature.startswith("IDR:v1|")


def test_consensus_drift_signature_normalized():
    """Drift signature has IDR:v1|, no >> (normalized)."""
    r1 = _make_result("a1", True, 0.9, "A→B", [{"day": "Day 1", "reason": "r"}], "IDR:v1|dir=A>B|span=1d|e=1|conf=0.90")
    r2 = _make_result("a2", True, 0.8, "A→B", [{"day": "Day 1", "reason": "r"}], "IDR:v1|dir=A>>B|span=1d|e=1|conf=0.80")
    consensus, _ = compute_consensus([("low", r1), ("medium", r2)], "ens-4")
    assert consensus.drift_signature.startswith("IDR:v1|")
    assert ">>" not in consensus.drift_signature


def test_consensus_requires_at_least_two():
    """Fewer than 2 results raises ValueError."""
    r1 = _make_result("a1", True, 0.9, "A→B", [{"day": "Day 1", "reason": "r"}], "IDR:v1|dir=A>B|span=1d|e=1|conf=0.90")
    with pytest.raises(ValueError, match="at least 2"):
        compute_consensus([("low", r1)], "ens-5")
