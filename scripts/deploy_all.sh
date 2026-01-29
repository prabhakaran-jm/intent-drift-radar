#!/usr/bin/env bash
set -euo pipefail

# Build and push, then deploy Cloud Run. Uses Terraform outputs from infra/.
# Usage: ./scripts/deploy_all.sh [--skip-build] [--tag TAG]
# With --skip-build: deploy only (IMAGE_URI must be set).
#
# GEMINI_API_KEY (for /api/analyze) — choose one:
#   Recommended: export SECRET_NAME=gemini-api-key   (inject from Secret Manager; no key in shell)
#   Quick dev:   export GEMINI_API_KEY=...         (key in env; not recommended for shared machines)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

SKIP_BUILD=false
TAG="${TAG:-$(git rev-parse --short HEAD 2>/dev/null || echo 'latest')}"

while [[ $# -gt 0 ]]; do
  case $1 in
    --skip-build) SKIP_BUILD=true; shift ;;
    --tag) TAG="$2"; shift 2 ;;
    *) echo "Usage: $0 [--skip-build] [--tag TAG]" >&2; exit 1 ;;
  esac
done

cd "$PROJECT_ROOT"

# shellcheck source=scripts/tf_outputs.sh
source "$SCRIPT_DIR/tf_outputs.sh"

if [ "$SKIP_BUILD" = true ]; then
  if [ -z "${IMAGE_URI:-}" ]; then
    echo "Error: --skip-build requires IMAGE_URI to be set." >&2
    exit 1
  fi
  "$SCRIPT_DIR/deploy_cloudrun.sh" "$IMAGE_URI"
else
  export TAG
  # shellcheck source=scripts/build_push.sh
  source "$SCRIPT_DIR/build_push.sh"
  "$SCRIPT_DIR/deploy_cloudrun.sh" "$IMAGE_URI"
fi

echo ""
echo "Verify: curl ${CLOUD_RUN_URL}/api/health"
