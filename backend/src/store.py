"""Simple local JSON file storage for feedback and other data."""

from pathlib import Path
import json
from typing import Any, Dict, List

_STORE_PATH = Path(__file__).resolve().parent.parent / "data" / "store.json"


def _ensure_data_dir():
    """Ensure data directory exists."""
    _STORE_PATH.parent.mkdir(parents=True, exist_ok=True)


def load_store() -> Dict[str, Any]:
    """Load the store JSON file. Returns empty dict if missing or invalid."""
    _ensure_data_dir()
    if not _STORE_PATH.exists():
        return {}
    try:
        with open(_STORE_PATH, "r") as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError):
        return {}


def save_store(data: Dict[str, Any]) -> None:
    """Save data to store JSON file."""
    _ensure_data_dir()
    with open(_STORE_PATH, "w") as f:
        json.dump(data, f, indent=2)


def append_feedback(feedback: Dict[str, Any]) -> None:
    """Append a feedback entry to the store."""
    store = load_store()
    if "feedback" not in store:
        store["feedback"] = []
    store["feedback"].append(feedback)
    save_store(store)


def list_feedback() -> List[Dict[str, Any]]:
    """List all feedback entries."""
    store = load_store()
    return store.get("feedback", [])
