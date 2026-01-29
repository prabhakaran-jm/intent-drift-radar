"""Ensemble mode: run multiple thinking levels in parallel and compute consensus."""

import re
import time
import logging
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FuturesTimeoutError, as_completed
from statistics import median
from typing import List, Tuple, Optional

from .models import (
    AnalysisResult,
    AnalyzeRequest,
    EnsembleRequest,
    EnsembleResponse,
    Agreement,
    EvidenceAgreement,
    EvidenceItem,
    DirectionVote,
    EnsembleMeta,
    EnsembleErrorItem,
    Settings,
)
from .gemini import analyze_intent_drift
from .postprocess import apply_postprocess, normalize_drift_signature

logger = logging.getLogger(__name__)

ENSEMBLE_TIMEOUT_SEC = 90
MIN_SUCCESS_COUNT = 2


def _evidence_key(item: EvidenceItem) -> str:
    return f"{item.day}|{item.reason}".lower().strip()


def _infer_span_days(evidence: List[EvidenceItem]) -> int:
    """Infer span (max day number) from evidence day labels like 'Day 1', 'Day 5'."""
    max_num = 0
    for e in evidence:
        m = re.search(r"(\d+)", e.day)
        if m:
            max_num = max(max_num, int(m.group(1)))
    return max_num if max_num > 0 else 1


def _slug(s: str) -> str:
    """Short slug for signature dir: uppercase, replace spaces with _, limit length."""
    t = s.upper().replace(" ", "_")[:20]
    return re.sub(r"[^A-Z0-9_]", "", t) or "X"


def _build_drift_signature(consensus: AnalysisResult) -> str:
    """Build IDR:v1|dir=X>Y|span=Nd|e=N|conf=0.xx from consensus fields."""
    span = _infer_span_days(consensus.evidence)
    e_count = len(consensus.evidence)
    conf_str = f"{min(0.95, consensus.confidence):.2f}"
    base_slug = _slug(consensus.baseline_intent.title)
    curr_slug = _slug(consensus.current_intent.title)
    dir_part = f"{base_slug}>{curr_slug}"
    sig = f"IDR:v1|dir={dir_part}|span={span}d|e={e_count}|conf={conf_str}"
    return normalize_drift_signature(sig)


def compute_consensus(
    results: List[Tuple[str, AnalysisResult]], analysis_id: str
) -> Tuple[AnalysisResult, Agreement]:
    """
    Compute consensus and agreement from successful per-mode results.
    results: list of (mode, AnalysisResult) in any order.
    """
    if len(results) < MIN_SUCCESS_COUNT:
        raise ValueError("Need at least 2 successful results for consensus")

    modes = [m for m, _ in results]
    analyses = [r for _, r in results]

    # Majority drift_detected (>=2 votes)
    true_count = sum(1 for _, r in results if r.drift_detected)
    false_count = len(results) - true_count
    drift_detected = true_count >= 2

    # Confidence: median, clamp 0.95
    confidences = [r.confidence for _, r in results]
    conf_median = float(median(confidences))
    conf_median = min(0.95, conf_median)
    conf_min = min(confidences)
    conf_max = min(0.95, max(confidences))

    # Median run index (by confidence)
    sorted_by_conf = sorted(range(len(analyses)), key=lambda i: analyses[i].confidence)
    median_idx = sorted_by_conf[len(sorted_by_conf) // 2]
    median_run = analyses[median_idx]
    median_mode = modes[median_idx]

    # baseline_intent / current_intent from median run
    baseline_intent = median_run.baseline_intent
    current_intent = median_run.current_intent

    # drift_direction: majority by exact string; tie = median run
    dir_counts: dict = {}
    for _, r in results:
        d = r.drift_direction.strip()
        dir_counts[d] = dir_counts.get(d, 0) + 1
    direction_votes = [DirectionVote(value=k, count=v) for k, v in dir_counts.items()]
    direction_votes.sort(key=lambda x: (-x.count, x.value))
    drift_direction = median_run.drift_direction
    if direction_votes:
        best = direction_votes[0]
        if best.count >= 2:
            drift_direction = best.value

    # Evidence aggregation: stable key day|reason
    key_to_items: dict = {}
    key_to_sources: dict = {}
    for mode, r in results:
        for item in r.evidence:
            k = _evidence_key(item)
            if k not in key_to_items:
                key_to_items[k] = item
                key_to_sources[k] = []
            key_to_sources[k].append(mode)

    three_of_three: List[EvidenceItem] = []
    two_of_three: List[EvidenceItem] = []
    one_of_three: List[EvidenceItem] = []
    n = len(results)
    for k, item in key_to_items.items():
        count = len(key_to_sources[k])
        if count >= 3 or count == n:
            three_of_three.append(item)
        elif count == 2:
            two_of_three.append(item)
        else:
            one_of_three.append(item)

    # Consensus evidence: 3_of_3 + 2_of_3 + up to 5 from 1_of_3
    consensus_evidence = list(three_of_three) + list(two_of_three) + list(one_of_three)[:5]

    # reasoning_cards from median run
    reasoning_cards = list(median_run.reasoning_cards)

    # drift_signature recomputed
    draft = AnalysisResult(
        analysis_id=analysis_id,
        baseline_intent=baseline_intent,
        current_intent=current_intent,
        drift_detected=drift_detected,
        confidence=conf_median,
        drift_direction=drift_direction,
        evidence=consensus_evidence,
        reasoning_cards=reasoning_cards,
        drift_signature="",  # set below
        one_question=median_run.one_question,
    )
    draft = draft.model_copy(update={"drift_signature": _build_drift_signature(draft)})

    evidence_agg = EvidenceAgreement(
        three_of_three=three_of_three,
        two_of_three=two_of_three,
        one_of_three=one_of_three,
    )
    agreement = Agreement(
        drift_detected_votes={"true": true_count, "false": false_count},
        confidence_min=conf_min,
        confidence_max=conf_max,
        direction_votes=direction_votes,
        evidence_agreement=evidence_agg,
    )

    consensus = apply_postprocess(draft)
    consensus = AnalysisResult.model_validate(consensus.model_dump())
    return consensus, agreement


def run_ensemble(
    request: EnsembleRequest,
    analysis_id: str,
    timeout_sec: int = ENSEMBLE_TIMEOUT_SEC,
) -> Tuple[List[AnalysisResult], List[Tuple[str, str, str]], int]:
    """
    Run analyze_intent_drift for each mode in parallel. Returns (successful_results_with_mode, errors, duration_ms).
    Each successful result is (mode, AnalysisResult) but we store analysis_id per run; we return list of AnalysisResult
    with analysis_id set to analysis_id + '-' + mode for uniqueness.
    """
    modes = request.modes or ["low", "medium", "high"]
    settings = request.settings or Settings(
        baseline_window_size=2, current_window_size=2, thinking_level="medium"
    )
    errors: List[Tuple[str, str, str]] = []  # (mode, code, message)
    results: List[Tuple[str, AnalysisResult]] = []
    start = time.perf_counter()

    def run_one(mode: str) -> Optional[AnalysisResult]:
        level = mode if mode in ("low", "medium", "high") else "medium"
        req = AnalyzeRequest(
            signals=request.signals,
            settings=Settings(
                baseline_window_size=settings.baseline_window_size,
                current_window_size=settings.current_window_size,
                thinking_level=level,
            ),
            feedback=request.feedback,
        )
        rid = f"{analysis_id}-{mode}"
        try:
            return analyze_intent_drift(req, rid, timeout_sec=25)
        except TimeoutError as e:
            errors.append((mode, "MODEL_TIMEOUT", str(e)))
            return None
        except ValueError as e:
            msg = str(e)
            code = "MODEL_OUTPUT_INVALID" if "MODEL_OUTPUT_INVALID" in msg else "MODEL_ENSEMBLE_FAILED"
            errors.append((mode, code, msg))
            return None
        except Exception as e:
            errors.append((mode, "MODEL_ENSEMBLE_FAILED", str(e)))
            return None

    deadline = start + timeout_sec
    with ThreadPoolExecutor(max_workers=len(modes)) as executor:
        future_to_mode = {executor.submit(run_one, m): m for m in modes}
        try:
            for future in as_completed(future_to_mode):
                mode = future_to_mode[future]
                remaining = max(1, deadline - time.perf_counter())
                try:
                    r = future.result(timeout=remaining)
                    if r is not None:
                        results.append((mode, r))
                except FuturesTimeoutError:
                    errors.append((mode, "MODEL_TIMEOUT", "Ensemble run timed out"))
        except Exception:
            pass

    duration_ms = int((time.perf_counter() - start) * 1000)
    return results, errors, duration_ms
