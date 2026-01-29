#!/usr/bin/env bash
set -e

# Deploy Cloud Run: update image and inject GEMINI_API_KEY either from env or Secret Manager.
# If vars missing, sources scripts/tf_outputs.sh.
# Requires IMAGE_URI: from build_push.sh or: ./scripts/deploy_cloudrun.sh <image_uri>
# Usage: ./scripts/deploy_cloudrun.sh [IMAGE_URI]
#
# GEMINI_API_KEY injection:
#   - If GEMINI_API_KEY is set locally: use --set-env-vars (key never printed).
#   - Else: use Secret Manager: --set-secrets GEMINI_API_KEY=${SECRET_NAME}:latest (default SECRET_NAME=gemini-api-key).

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

if [ -n "${1:-}" ]; then
  IMAGE_URI="$1"
fi

if [ -z "${PROJECT_ID:-}" ] || [ -z "${REGION:-}" ] || [ -z "${SERVICE_NAME:-}" ] || [ -z "${CLOUD_RUN_URL:-}" ]; then
  # shellcheck source=scripts/tf_outputs.sh
  source "$SCRIPT_DIR/tf_outputs.sh"
fi

if [ -z "${IMAGE_URI:-}" ]; then
  echo "Error: IMAGE_URI required. Run build_push.sh first or: $0 <image_uri>" >&2
  exit 1
fi

GEMINI_MODEL="${GEMINI_MODEL:-gemini-3-pro-preview}"
SECRET_NAME="${SECRET_NAME:-gemini-api-key}"

echo "Deploying Cloud Run..."
echo "  Service: $SERVICE_NAME"
echo "  Image:   $IMAGE_URI"
echo "  Region:  $REGION"
echo ""

if [ -n "${GEMINI_API_KEY:-}" ]; then
  echo "Using GEMINI_API_KEY from environment (env var mode)." >&2
  gcloud run services update "$SERVICE_NAME" \
    --image "$IMAGE_URI" \
    --region "$REGION" \
    --project "$PROJECT_ID" \
    --set-env-vars "GEMINI_MODEL=$GEMINI_MODEL,GEMINI_API_KEY=$GEMINI_API_KEY"
else
  echo "Using Secret Manager for GEMINI_API_KEY (secret: ${SECRET_NAME}:latest)." >&2
  gcloud run services update "$SERVICE_NAME" \
    --image "$IMAGE_URI" \
    --region "$REGION" \
    --project "$PROJECT_ID" \
    --set-secrets "GEMINI_API_KEY=${SECRET_NAME}:latest" \
    --set-env-vars "GEMINI_MODEL=$GEMINI_MODEL"
fi

echo ""
echo "✅ Deployed."
echo ""
echo "  $CLOUD_RUN_URL"
echo "  ${CLOUD_RUN_URL}/api/health"
