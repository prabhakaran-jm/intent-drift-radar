"""Tests for postprocess guardrails."""

import pytest

from backend.src.models import (
    AnalysisResult,
    EvidenceItem,
    IntentBlock,
    ReasoningCard,
)
from backend.src.postprocess import (
    ensure_reasoning_cards_non_empty,
    fix_temporal_compression_refs,
    normalize_drift_signature,
)


def test_normalize_signature_replaces_double_arrow():
    assert normalize_drift_signature("IDR:v1|dir=A>>B|e=1") == "IDR:v1|dir=A>B|e=1"
    assert normalize_drift_signature("IDR:v1|>>|x=1") == "IDR:v1|>|x=1"
    assert normalize_drift_signature("IDR:v1|conf=0.95") == "IDR:v1|conf=0.95"
    assert normalize_drift_signature("dir=EDTECH>>CREATOR") == "IDR:v1|dir=EDTECH>CREATOR"
    assert normalize_drift_signature("") == "IDR:v1|"


def test_empty_reasoning_cards_raises():
    with pytest.raises(ValueError, match="reasoning_cards_empty"):
        ensure_reasoning_cards_non_empty([])
    out = ensure_reasoning_cards_non_empty([ReasoningCard(title="T", body="B", refs=[])])
    assert len(out) == 1
    assert out[0].title == "T"


def test_temporal_compression_refs_filled_from_evidence():
    baseline = IntentBlock(title="Base", detail="base detail")
    current = IntentBlock(title="Current", detail="current detail")
    evidence = [
        EvidenceItem(day="Day 1", reason="r1"),
        EvidenceItem(day="Day 4", reason="r2"),
        EvidenceItem(day="Day 1", reason="r1 again"),
    ]
    reasoning_cards = [
        ReasoningCard(title="Other", body="Other body", refs=["Day 2"]),
        ReasoningCard(title="Temporal Compression", body="Pivot occurred.", refs=[]),
    ]
    result = AnalysisResult(
        analysis_id="test-id",
        baseline_intent=baseline,
        current_intent=current,
        drift_detected=True,
        confidence=0.9,
        drift_direction="A→B",
        evidence=evidence,
        reasoning_cards=reasoning_cards,
        drift_signature="IDR:v1|conf=0.9",
    )
    out = fix_temporal_compression_refs(result)
    tc = next(c for c in out.reasoning_cards if c.title == "Temporal Compression")
    assert tc.refs == ["Day 1", "Day 4"]
    assert tc.body == "Pivot occurred."
    other = next(c for c in out.reasoning_cards if c.title == "Other")
    assert other.refs == ["Day 2"]


def test_temporal_compression_refs_unchanged_when_refs_contain_day():
    baseline = IntentBlock(title="Base", detail="base detail")
    current = IntentBlock(title="Current", detail="current detail")
    reasoning_cards = [
        ReasoningCard(title="Temporal Compression", body="Same.", refs=["Day 2", "Day 4"]),
    ]
    result = AnalysisResult(
        analysis_id="test-id",
        baseline_intent=baseline,
        current_intent=current,
        drift_detected=True,
        confidence=0.9,
        drift_direction="A→B",
        evidence=[],
        reasoning_cards=reasoning_cards,
        drift_signature="IDR:v1|conf=0.9",
    )
    out = fix_temporal_compression_refs(result)
    tc = next(c for c in out.reasoning_cards if c.title == "Temporal Compression")
    assert tc.refs == ["Day 2", "Day 4"]
    assert tc.body == "Same."
