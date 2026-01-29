#!/usr/bin/env bash
set -e

# Build and push Docker image to Artifact Registry.
# If PROJECT_ID/REGION/ARTIFACT_REPO_NAME/IMAGE_NAME are missing, sources scripts/tf_outputs.sh.
# Image tag: ${REGION}-docker.pkg.dev/${PROJECT_ID}/${ARTIFACT_REPO_NAME}/${IMAGE_NAME}:${TAG}
# Usage: ./scripts/build_push.sh [--tag TAG]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

if [ -z "${PROJECT_ID:-}" ] || [ -z "${REGION:-}" ] || [ -z "${ARTIFACT_REPO_NAME:-}" ] || [ -z "${IMAGE_NAME:-}" ]; then
  # shellcheck source=scripts/tf_outputs.sh
  source "$SCRIPT_DIR/tf_outputs.sh"
fi

TAG="${TAG:-$(git rev-parse --short HEAD 2>/dev/null || echo 'latest')}"

while [[ $# -gt 0 ]]; do
  case $1 in
    --tag) TAG="$2"; shift 2 ;;
    *) echo "Usage: $0 [--tag TAG]" >&2; exit 1 ;;
  esac
done

if [ -z "$PROJECT_ID" ]; then
  echo "Error: PROJECT_ID required. Run from repo root after: terraform -chdir=infra apply" >&2
  exit 1
fi

cd "$PROJECT_ROOT"

IMAGE_URI="${REGION}-docker.pkg.dev/${PROJECT_ID}/${ARTIFACT_REPO_NAME}/${IMAGE_NAME}:${TAG}"
export IMAGE_URI

echo "Building and pushing..."
echo "  Image: $IMAGE_URI"
echo ""

gcloud builds submit --tag "$IMAGE_URI" --project "$PROJECT_ID" --region "$REGION" .

echo ""
echo "✅ Image built and pushed."
echo "IMAGE_URI=$IMAGE_URI"
