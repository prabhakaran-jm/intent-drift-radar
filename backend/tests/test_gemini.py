"""Tests for Gemini integration with mocked SDK calls. No network access."""

import json
from pathlib import Path

import pytest

from backend.src.gemini import (
    SDK_AVAILABLE,
    analyze_intent_drift,
    _call_gemini_sdk,
    _find_fallback_model,
)
from backend.src.models import AnalyzeRequest, Signal

# Repo root (backend/tests -> backend -> repo)
REPO_ROOT = Path(__file__).resolve().parent.parent.parent
SAMPLE_OUTPUT_PATH = REPO_ROOT / "docs" / "ai-studio" / "sample-output.json"


def _valid_response_json(analysis_id: str = "test-id") -> str:
    """Load sample output and return JSON string with analysis_id set."""
    with open(SAMPLE_OUTPUT_PATH, "r") as f:
        data = json.load(f)
    data["analysis_id"] = analysis_id
    return json.dumps(data)


def _minimal_request() -> AnalyzeRequest:
    return AnalyzeRequest(
        signals=[Signal(day="Day 1", type="declaration", content="Build an app.")]
    )


@pytest.mark.skipif(not SDK_AVAILABLE, reason="google.generativeai SDK not installed")
class TestAnalyzeIntentDriftRetry:
    """Test retry behavior when output is invalid JSON."""

    def test_invalid_json_retries_once_then_succeeds(self, monkeypatch):
        call_count = 0

        def mock_sdk(prompt: str, model_name: str, api_key: str, use_fallback: bool = True):
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                return "not valid json at all", model_name
            return _valid_response_json("retry-id"), model_name

        monkeypatch.setattr(
            "backend.src.gemini._call_gemini_sdk",
            mock_sdk,
        )
        monkeypatch.setenv("GEMINI_API_KEY", "test-key")

        request = _minimal_request()
        result = analyze_intent_drift(request, "analysis-123")

        assert call_count == 2
        assert result.analysis_id == "analysis-123"
        assert result.drift_detected is True

    def test_invalid_json_retry_receives_repair_instruction(self, monkeypatch):
        prompts_received = []

        def mock_sdk(prompt: str, model_name: str, api_key: str, use_fallback: bool = True):
            prompts_received.append(prompt)
            if len(prompts_received) == 1:
                return "not valid json", model_name
            return _valid_response_json("retry-id"), model_name

        monkeypatch.setattr(
            "backend.src.gemini._call_gemini_sdk",
            mock_sdk,
        )
        monkeypatch.setenv("GEMINI_API_KEY", "test-key")

        request = _minimal_request()
        analyze_intent_drift(request, "analysis-123")

        assert len(prompts_received) == 2
        repair = "Return ONLY valid JSON matching the schema. No markdown. No extra text."
        assert prompts_received[1].startswith(repair)


@pytest.mark.skipif(not SDK_AVAILABLE, reason="google.generativeai SDK not installed")
class TestTimeoutErrorPropagation:
    """Test that TimeoutError propagates (app.py maps to MODEL_TIMEOUT)."""

    def test_timeout_error_propagates(self, monkeypatch):
        def mock_sdk(*args, **kwargs):
            raise TimeoutError("Gemini API request timed out after 25 seconds")

        monkeypatch.setattr(
            "backend.src.gemini._call_gemini_sdk",
            mock_sdk,
        )
        monkeypatch.setenv("GEMINI_API_KEY", "test-key")

        request = _minimal_request()

        with pytest.raises(TimeoutError, match="timed out"):
            analyze_intent_drift(request, "analysis-123")


@pytest.mark.skipif(not SDK_AVAILABLE, reason="google.generativeai SDK not installed")
class Test404Fallback:
    """Test that 404 model-not-found triggers fallback and retry."""

    def test_404_triggers_fallback_model_and_retries(self, monkeypatch):
        # Mock at SDK level so real _call_gemini_sdk runs and does its internal
        # 404 -> _find_fallback_model -> recursive _call_gemini_sdk(fallback).
        model_calls = []

        class MockGenerativeModel:
            def __init__(self, model_name: str):
                model_calls.append(model_name)
                self.model_name = model_name

            def generate_content(self, prompt, **kwargs):
                if self.model_name == "gemini-3-pro-preview":
                    raise ValueError("404 Model not found: gemini-3-pro-preview")
                response = type("Response", (), {"text": _valid_response_json("fallback-id")})()
                return response

        def mock_find_fallback(api_key: str, current_model: str):
            return "gemini-3-pro"

        monkeypatch.setattr(
            "backend.src.gemini.genai.GenerativeModel",
            MockGenerativeModel,
        )
        monkeypatch.setattr(
            "backend.src.gemini._find_fallback_model",
            mock_find_fallback,
        )
        monkeypatch.setenv("GEMINI_API_KEY", "test-key")

        request = _minimal_request()
        result = analyze_intent_drift(request, "analysis-456")

        assert len(model_calls) == 2
        assert model_calls[0] == "gemini-3-pro-preview"
        assert model_calls[1] == "gemini-3-pro"
        assert result.analysis_id == "analysis-456"
