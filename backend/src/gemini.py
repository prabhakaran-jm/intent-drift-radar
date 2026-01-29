"""Gemini 3 Pro integration for intent drift analysis.

We use the Gemini API (API key) at the global endpoint, not Vertex AI.
- SDK: google.generativeai uses https://generativelanguage.googleapis.com (global).
- HTTP fallback: same global URL. No region/location is sent.
- For Gemini API calls, location is ignored. We keep GEMINI_LOCATION for forward
  compatibility with Vertex (logging only; it does not affect request routing).
"""

import json
import logging
import os
from pathlib import Path
from typing import Optional

from pydantic import ValidationError

from .models import AnalysisResult, AnalyzeRequest, FeedbackItem, Signal
from .postprocess import apply_postprocess

logger = logging.getLogger(__name__)

# Model preference order for fallback
MODEL_PREFERENCE_ORDER = [
    "gemini-3-pro-preview",
    "gemini-3-pro",
    "gemini-3-flash-preview",
]


def _validate_model_location_combo() -> None:
    """
    Runtime startup check: warn if preview model is used with non-global location.
    
    Preview models (e.g. gemini-3-pro-preview) are global-only. Using them with
    a regional location (e.g. europe-west2) will cause 404/invalid location errors.
    This check turns a 2-hour debug into a 5-second log warning.
    """
    model = os.getenv("GEMINI_MODEL", "gemini-3-pro-preview")
    location = os.getenv("GEMINI_LOCATION", "global")
    
    if "preview" in model.lower() and location.lower() != "global":
        logger.warning(
            f"⚠️  WARNING: Preview model '{model}' detected with location '{location}'. "
            f"Preview models are global-only and must use location='global'. "
            f"You may get 404/invalid location errors. Set GEMINI_LOCATION=global."
        )


# Run validation at module import time (startup check)
_validate_model_location_combo()

# Try to import Google GenAI SDK, fallback to HTTP
# Prefer deprecated google.generativeai for now (more stable API)
# TODO: Migrate to google.genai when stable
try:
    import google.generativeai as genai
    SDK_AVAILABLE = True
except ImportError:
    SDK_AVAILABLE = False
    import requests


def _load_prompt_template() -> str:
    """Load the prompt template from docs/ai-studio/prompt.md."""
    repo_root = Path(__file__).resolve().parent.parent.parent
    prompt_path = repo_root / "docs" / "ai-studio" / "prompt.md"
    
    if not prompt_path.exists():
        raise FileNotFoundError(f"Prompt template not found at {prompt_path}")
    
    with open(prompt_path, "r") as f:
        return f.read().strip()


def _format_signals(signals: list[Signal]) -> str:
    """Format signals for the prompt."""
    if not signals:
        return ""
    
    lines = ["Signals:"]
    for signal in signals:
        # Signal object with day and content
        lines.append(f"{signal.day}: {signal.content}")
    return "\n".join(lines)


def _format_feedback(feedback: Optional[list[FeedbackItem]]) -> str:
    """Format prior feedback for the prompt."""
    if not feedback:
        return ""
    
    lines = ["Prior feedback:"]
    for item in feedback:
        verdict_label = "confirmed" if item.verdict == "confirm" else "rejected"
        lines.append(f"- Analysis {item.analysis_id[:8]}...: {verdict_label}")
        if item.comment:
            lines.append(f"  Comment: {item.comment}")
    
    return "\n".join(lines)


def _build_prompt(request: AnalyzeRequest) -> str:
    """Build the complete prompt from template, signals, and feedback."""
    template = _load_prompt_template()
    
    # Replace the example "Signals:" section with actual signals
    signals_section = _format_signals(request.signals)
    feedback_section = _format_feedback(request.feedback)
    
    # Find where "Signals:" starts in the template and replace everything after it
    if "Signals:" in template:
        # Split at "Signals:" and keep everything before it
        parts = template.split("Signals:", 1)
        if len(parts) == 2:
            # Keep everything before "Signals:" and append new signals section
            template = parts[0].rstrip() + "\n\n" + signals_section
        else:
            template += "\n\n" + signals_section
    else:
        template += "\n\n" + signals_section
    
    # Append feedback if present
    if feedback_section:
        template += "\n\n" + feedback_section
    
    return template


def _list_available_models(api_key: str) -> list[str]:
    """List available models that support generateContent."""
    try:
        genai.configure(api_key=api_key)
        models = genai.list_models()
        
        available = []
        for model in models:
            # Check if model supports generateContent
            if "generateContent" in model.supported_generation_methods:
                available.append(model.name.replace("models/", ""))
        
        return available
    except Exception as e:
        logger.warning(f"Failed to list models: {e}")
        return []


def _find_fallback_model(api_key: str, current_model: str) -> Optional[str]:
    """Find a fallback model from preference order if current model is not available."""
    available_models = _list_available_models(api_key)
    
    if not available_models:
        logger.warning("Could not list available models, cannot find fallback")
        return None
    
    logger.info(f"Available models: {available_models[:5]}...")  # Log first 5 models
    
    # Try preference order
    for preferred in MODEL_PREFERENCE_ORDER:
        # Check exact match or if model name contains the preferred name
        for available in available_models:
            if preferred == available or available.endswith(f"/{preferred}"):
                logger.info(f"Found fallback model: {preferred} (from {available})")
                return preferred
    
    # If no preference matches, return first available model
    if available_models:
        fallback = available_models[0]
        # Strip models/ prefix if present
        if fallback.startswith("models/"):
            fallback = fallback.replace("models/", "")
        logger.info(f"Using first available model as fallback: {fallback}")
        return fallback
    
    return None


def _call_gemini_sdk(prompt: str, model_name: str, api_key: str, use_fallback: bool = True) -> tuple[str, str]:
    """
    Call Gemini API using the official SDK (google.generativeai).
    
    Returns:
        tuple of (response_text, final_model_name)
    """
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel(model_name)
    
    try:
        # Disable web grounding/search
        response = model.generate_content(
            prompt,
            generation_config={
                "temperature": 0.1,  # Lower temperature for more deterministic output
            },
            safety_settings=[
                {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
                {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
                {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
                {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"},
            ],
        )
        
        return response.text, model_name
    except Exception as e:
        error_str = str(e)
        error_type = type(e).__name__
        
        # Check if it's a 404 NOT_FOUND error (could be NotFound exception or error message)
        is_404 = (
            "404" in error_str and ("not found" in error_str.lower() or "NOT_FOUND" in error_str)
        ) or error_type == "NotFound"
        
        if is_404:
            if use_fallback:
                logger.warning(f"Model {model_name} not found (404), attempting fallback")
                fallback_model = _find_fallback_model(api_key, model_name)
                if fallback_model and fallback_model != model_name:
                    logger.info(f"Retrying with fallback model: {fallback_model}")
                    # Retry with fallback model (no further fallback)
                    return _call_gemini_sdk(prompt, fallback_model, api_key, use_fallback=False)
                else:
                    raise ValueError(f"Model {model_name} not found and no suitable fallback available")
            else:
                raise ValueError(f"Model {model_name} not found (404)")
        else:
            # Re-raise other exceptions
            raise


def _call_gemini_http(prompt: str, model_name: str, api_key: str) -> str:
    """Call Gemini API using HTTP requests (fallback)."""
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent"
    
    headers = {
        "Content-Type": "application/json",
    }
    
    params = {
        "key": api_key,
    }
    
    payload = {
        "contents": [{
            "parts": [{"text": prompt}]
        }],
        "generationConfig": {
            "temperature": 0.1,
        },
        "safetySettings": [
            {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"},
        ],
    }
    
    response = requests.post(url, json=payload, headers=headers, params=params, timeout=60)
    response.raise_for_status()
    
    data = response.json()
    
    # Extract text from response
    if "candidates" in data and len(data["candidates"]) > 0:
        candidate = data["candidates"][0]
        if "content" in candidate and "parts" in candidate["content"]:
            parts = candidate["content"]["parts"]
            if parts and "text" in parts[0]:
                return parts[0]["text"]
    
    raise ValueError("Unexpected response format from Gemini API")


def _parse_json_response(text: str) -> dict:
    """Parse JSON from model response, handling markdown code blocks."""
    text = text.strip()
    
    # Remove markdown code blocks if present
    if text.startswith("```"):
        # Find the first newline after ```
        lines = text.split("\n")
        if len(lines) > 1:
            # Skip first line (```json or ```) and last line (```)
            text = "\n".join(lines[1:-1])
        else:
            text = text.replace("```", "").strip()
    
    # Try to parse as JSON
    try:
        return json.loads(text)
    except json.JSONDecodeError as e:
        # Try to extract JSON from text if it's embedded
        # Look for { ... } pattern
        start = text.find("{")
        end = text.rfind("}")
        if start != -1 and end != -1 and end > start:
            try:
                return json.loads(text[start:end+1])
            except json.JSONDecodeError:
                pass
        
        raise ValueError(f"Failed to parse JSON: {e}")


def _validate_result(data: dict, analysis_id: str) -> AnalysisResult:
    """Validate and create AnalysisResult from parsed JSON."""
    # Ensure analysis_id is set (don't trust model output)
    data["analysis_id"] = analysis_id
    
    # Ensure reasoning_cards exists and is not empty
    if "reasoning_cards" not in data or not data["reasoning_cards"]:
        raise ValueError("reasoning_cards is missing or empty")
    
    try:
        return AnalysisResult(**data)
    except ValidationError as e:
        raise ValueError(f"Validation failed: {e}")


def analyze_intent_drift(request: AnalyzeRequest, analysis_id: str) -> AnalysisResult:
    """
    Analyze intent drift using Gemini 3 Pro.
    
    Args:
        request: AnalyzeRequest with signals and optional feedback
        analysis_id: Unique identifier for this analysis
        
    Returns:
        AnalysisResult validated against schema
        
    Raises:
        ValueError: If API key is missing or model output is invalid
        requests.RequestException: If HTTP request fails (fallback mode)
    """
    # Get API key from environment
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY environment variable is not set")
    
    # Get model name from environment (default: gemini-3-pro-preview)
    model_name = os.getenv("GEMINI_MODEL", "gemini-3-pro-preview")
    # GEMINI_LOCATION is ignored for Gemini API; kept for forward compatibility with Vertex.
    location = os.getenv("GEMINI_LOCATION", "global")
    logger.info(f"Gemini location (for reference): {location}")

    # Build prompt
    prompt = _build_prompt(request)
    
    logger.info(f"Calling Gemini model: {model_name}, signals count: {len(request.signals)}, feedback count: {len(request.feedback) if request.feedback else 0}")
    
    # Call Gemini API with retry logic
    retry_count = 0
    max_retries = 1
    final_model_name = model_name
    
    while retry_count <= max_retries:
        try:
            # Call API
            if SDK_AVAILABLE:
                raw_response, final_model_name = _call_gemini_sdk(prompt, model_name, api_key)
            else:
                raw_response = _call_gemini_http(prompt, model_name, api_key)
                final_model_name = model_name
            
            logger.info(f"Gemini response received (retry: {retry_count}, model: {final_model_name})")
            
            # Parse JSON
            try:
                parsed_data = _parse_json_response(raw_response)
            except ValueError as e:
                logger.warning(f"JSON parsing failed (retry {retry_count}): {e}")
                if retry_count < max_retries:
                    # Prepend repair instruction
                    repair_instruction = "Return ONLY valid JSON matching the schema. No markdown. No extra text.\n\n"
                    prompt = repair_instruction + prompt
                    retry_count += 1
                    continue
                else:
                    logger.error(f"Failed to parse JSON after retries. Raw response (first 500 chars): {raw_response[:500]}")
                    raise ValueError("MODEL_OUTPUT_INVALID: Failed to parse JSON response")
            
            # Validate against schema, then apply postprocess guardrails
            try:
                result = _validate_result(parsed_data, analysis_id)
                result = apply_postprocess(result)
                result = AnalysisResult.model_validate(result.model_dump())
                logger.info(f"Analysis successful (model: {final_model_name}): drift_detected={result.drift_detected}, confidence={result.confidence}")
                return result
            except ValueError as e:
                logger.warning(f"Validation/postprocess failed (retry {retry_count}): {e}")
                if retry_count < max_retries:
                    # Prepend repair instruction
                    repair_instruction = "Return ONLY valid JSON matching the schema. No markdown. No extra text.\n\n"
                    prompt = repair_instruction + prompt
                    retry_count += 1
                    continue
                else:
                    logger.error(f"Validation failed after retries. Parsed data keys: {list(parsed_data.keys())}")
                    logger.error(f"Raw response (first 500 chars): {raw_response[:500]}")
                    raise ValueError("MODEL_OUTPUT_INVALID: Response does not match schema")
        
        except Exception as e:
            if retry_count < max_retries:
                logger.warning(f"API call failed (retry {retry_count}): {e}")
                retry_count += 1
                continue
            else:
                logger.error(f"API call failed after retries: {e}")
                raise
    
    # Should never reach here, but just in case
    raise ValueError("MODEL_OUTPUT_INVALID: Unexpected error")
