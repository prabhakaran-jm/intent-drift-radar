"""Local JSON file storage. No database or auth."""

from pathlib import Path
import json
from typing import Any

_DATA_DIR = Path(__file__).resolve().parent.parent / "data"
_DATA_DIR.mkdir(parents=True, exist_ok=True)


def _path(name: str) -> Path:
    return _DATA_DIR / f"{name}.json"


def load(name: str, default: Any = None) -> Any:
    """Load JSON data by name. Returns default if file missing or invalid."""
    p = _path(name)
    if not p.exists():
        return default
    try:
        with open(p, "r") as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError):
        return default


def save(name: str, data: Any) -> None:
    """Save data as JSON by name."""
    p = _path(name)
    with open(p, "w") as f:
        json.dump(data, f, indent=2)
