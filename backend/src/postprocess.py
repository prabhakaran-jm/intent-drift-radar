"""Post-processing guardrails for model output. Applied after JSON parse + Pydantic validation."""

from typing import List

from .models import AnalysisResult, ReasoningCard


def normalize_drift_signature(sig: str) -> str:
    """
    Normalize drift_signature: replace ">>" with ">" and ensure it starts with "IDR:v1|".
    """
    if not sig:
        return "IDR:v1|"
    out = sig.replace(">>", ">")
    if not out.startswith("IDR:v1|"):
        out = "IDR:v1|" + out
    return out


def ensure_reasoning_cards_non_empty(cards: list) -> list:
    """
    Ensure reasoning_cards is not empty. Raises ValueError("reasoning_cards_empty") if empty.
    """
    if not cards:
        raise ValueError("reasoning_cards_empty")
    return cards


def fix_temporal_compression_refs(result: AnalysisResult) -> AnalysisResult:
    """
    Find the card with title exactly "Temporal Compression". If its refs is empty or
    refs do not contain any "Day" strings, set refs to the evidence day list (unique, preserve order).
    Do not modify body text.
    """
    evidence_days: List[str] = []
    seen: set = set()
    for e in result.evidence:
        if e.day not in seen:
            seen.add(e.day)
            evidence_days.append(e.day)

    new_cards: List[ReasoningCard] = []
    for card in result.reasoning_cards:
        if card.title == "Temporal Compression":
            refs_need_fix = not card.refs or not any("Day" in r for r in card.refs)
            if refs_need_fix and evidence_days:
                new_cards.append(
                    ReasoningCard(title=card.title, body=card.body, refs=evidence_days)
                )
            else:
                new_cards.append(card)
        else:
            new_cards.append(card)

    return result.model_copy(update={"reasoning_cards": new_cards})


def apply_postprocess(result: AnalysisResult) -> AnalysisResult:
    """
    Apply all postprocess guardrails and return a new AnalysisResult.
    Raises ValueError on invalid state (e.g. reasoning_cards_empty).
    """
    ensure_reasoning_cards_non_empty(result.reasoning_cards)
    result = result.model_copy(
        update={"drift_signature": normalize_drift_signature(result.drift_signature)}
    )
    result = fix_temporal_compression_refs(result)
    return result
