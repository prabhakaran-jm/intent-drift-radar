"""Tests for GET /api/demo (cached sample result)."""

import pytest
from fastapi.testclient import TestClient

from backend.src.app import app

client = TestClient(app)


def test_demo_returns_valid_analysis_shape():
    """GET /api/demo returns AnalysisResult with drift_signature and reasoning_cards."""
    response = client.get("/api/demo")
    assert response.status_code == 200
    data = response.json()
    assert "drift_signature" in data
    assert data["drift_signature"].startswith("IDR:v1|")
    assert "reasoning_cards" in data
    assert len(data["reasoning_cards"]) > 0
    assert response.headers.get("X-IDR-Mode") == "demo-cached"
