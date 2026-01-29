#!/usr/bin/env bash
# Pre-submit checks: health, version, and HTML root.
# URL from Terraform (scripts/tf_outputs.sh) if available, else CLOUD_RUN_URL or URL env var.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Resolve base URL: try Terraform outputs first, then CLOUD_RUN_URL or URL env var
if [ -f "$PROJECT_ROOT/scripts/tf_outputs.sh" ] && [ -d "$PROJECT_ROOT/infra/.terraform" ]; then
  set +e
  eval "$("$PROJECT_ROOT/scripts/tf_outputs.sh" 2>/dev/null)"
  set -e
fi
BASE_URL="${CLOUD_RUN_URL:-${URL:-}}"
BASE_URL="${BASE_URL%/}"
if [ -z "$BASE_URL" ]; then
  echo "Error: Set CLOUD_RUN_URL or URL, or run from repo with Terraform applied (scripts/tf_outputs.sh)." >&2
  exit 1
fi

FAILED=0

check() {
  local name="$1"
  if [ "$2" = "0" ]; then
    echo "✅ $name"
  else
    echo "❌ $name"
    FAILED=1
  fi
}

# 1) GET /api/health must be ok
HEALTH_RESP="$(curl -sS -w "\n%{http_code}" "$BASE_URL/api/health" 2>/dev/null)" || true
HEALTH_BODY="$(echo "$HEALTH_RESP" | head -n -1)"
HEALTH_CODE="$(echo "$HEALTH_RESP" | tail -n 1)"
if [ "$HEALTH_CODE" = "200" ] && echo "$HEALTH_BODY" | grep -q '"ok"[[:space:]]*:[[:space:]]*true'; then
  check "GET /api/health (ok)" 0
else
  check "GET /api/health (ok)" 1
fi

# 2) GET /api/version must contain gemini_model
VERSION_RESP="$(curl -sS -w "\n%{http_code}" "$BASE_URL/api/version" 2>/dev/null)" || true
VERSION_BODY="$(echo "$VERSION_RESP" | head -n -1)"
VERSION_CODE="$(echo "$VERSION_RESP" | tail -n 1)"
if [ "$VERSION_CODE" = "200" ] && echo "$VERSION_BODY" | grep -q 'gemini_model'; then
  check "GET /api/version (contains gemini_model)" 0
else
  check "GET /api/version (contains gemini_model)" 1
fi

# 3) GET / must return HTML
ROOT_RESP="$(curl -sS -w "\n%{http_code}" "$BASE_URL/" 2>/dev/null)" || true
ROOT_BODY="$(echo "$ROOT_RESP" | head -n -1)"
ROOT_CODE="$(echo "$ROOT_RESP" | tail -n 1)"
if [ "$ROOT_CODE" = "200" ] && (echo "$ROOT_BODY" | grep -qi '<!DOCTYPE\|<html'); then
  check "GET / (returns HTML)" 0
else
  check "GET / (returns HTML)" 1
fi

if [ $FAILED -ne 0 ]; then
  exit 1
fi
