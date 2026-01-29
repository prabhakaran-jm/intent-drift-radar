"""Tests for prompt building (thinking level directives)."""

import pytest

from backend.src.gemini import _build_prompt, _thinking_level_directive
from backend.src.models import AnalyzeRequest, Settings, Signal


def _minimal_request(thinking_level: str | None = None) -> AnalyzeRequest:
    signals = [Signal(day="Day 1", type="declaration", content="Build an app.")]
    settings = Settings(thinking_level=thinking_level or "medium", baseline_window_size=2, current_window_size=2)
    return AnalyzeRequest(signals=signals, settings=settings)


def test_thinking_level_directive_low():
    block = _thinking_level_directive("low")
    assert "Thinking Level: LOW" in block
    assert "evidence" in block and "max 3" in block
    assert "1–2 sentences" in block


def test_thinking_level_directive_medium():
    block = _thinking_level_directive("medium")
    assert "Thinking Level: MEDIUM" in block
    assert "No extra constraints" in block


def test_thinking_level_directive_high():
    block = _thinking_level_directive("high")
    assert "Thinking Level: HIGH" in block
    assert "up to 5" in block
    assert "2–4 sentences" in block
    assert "at least 2 distinct Day" in block


def test_build_prompt_includes_low_directive_when_settings_low():
    request = _minimal_request(thinking_level="low")
    prompt = _build_prompt(request)
    assert "Thinking Level: LOW" in prompt
    assert "evidence" in prompt and "max 3" in prompt
    assert "1–2 sentences" in prompt


def test_build_prompt_includes_medium_directive_when_settings_medium():
    request = _minimal_request(thinking_level="medium")
    prompt = _build_prompt(request)
    assert "Thinking Level: MEDIUM" in prompt
    assert "No extra constraints" in prompt


def test_build_prompt_includes_high_directive_when_settings_high():
    request = _minimal_request(thinking_level="high")
    prompt = _build_prompt(request)
    assert "Thinking Level: HIGH" in prompt
    assert "up to 5" in prompt
    assert "2–4 sentences" in prompt
    assert "at least 2 distinct Day" in prompt


def test_build_prompt_defaults_to_medium_when_settings_none():
    request = AnalyzeRequest(signals=[Signal(day="Day 1", type="declaration", content="x")])
    prompt = _build_prompt(request)
    assert "Thinking Level: MEDIUM" in prompt


def test_build_prompt_includes_signals():
    request = _minimal_request("medium")
    prompt = _build_prompt(request)
    assert "Signals:" in prompt
    assert "Day 1" in prompt
    assert "Build an app." in prompt
