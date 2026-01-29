#!/usr/bin/env bash
set -e

# Read Terraform outputs from infra/ and export as environment variables.
# Must be run from repo root. Uses: terraform -chdir=infra output -raw <name>
# Usage: source scripts/tf_outputs.sh   OR   eval $(scripts/tf_outputs.sh)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

if [ ! -d "$PROJECT_ROOT/infra" ]; then
  echo "Error: infra/ not found. Run from repo root." >&2
  exit 1
fi

if [ ! -d "$PROJECT_ROOT/infra/.terraform" ]; then
  echo "Error: Terraform not initialized. Run: terraform -chdir=infra init" >&2
  exit 1
fi

_raw() {
  terraform -chdir="$PROJECT_ROOT/infra" output -raw "$1" 2>/dev/null || echo ""
}

export PROJECT_ID="$(_raw project_id)"
export REGION="$(_raw region)"
export SERVICE_NAME="$(_raw service_name)"
export ARTIFACT_REPO_NAME="$(_raw artifact_repo_name)"
export IMAGE_NAME="$(_raw image_name)"
export GEMINI_MODEL="$(_raw gemini_model)"
export CLOUD_RUN_URL="$(_raw cloud_run_url)"

if [ -z "$PROJECT_ID" ] || [ -z "$REGION" ] || [ -z "$SERVICE_NAME" ]; then
  echo "Error: Terraform outputs not available. Run from repo root: terraform -chdir=infra apply" >&2
  exit 1
fi

if [ "${BASH_SOURCE[0]}" != "${0}" ]; then
  echo "✅ Terraform outputs:" >&2
  echo "   PROJECT_ID=$PROJECT_ID" >&2
  echo "   REGION=$REGION" >&2
  echo "   SERVICE_NAME=$SERVICE_NAME" >&2
  echo "   ARTIFACT_REPO_NAME=$ARTIFACT_REPO_NAME" >&2
  echo "   IMAGE_NAME=$IMAGE_NAME" >&2
  echo "   GEMINI_MODEL=$GEMINI_MODEL" >&2
  echo "   CLOUD_RUN_URL=$CLOUD_RUN_URL" >&2
else
  echo "export PROJECT_ID='$PROJECT_ID'"
  echo "export REGION='$REGION'"
  echo "export SERVICE_NAME='$SERVICE_NAME'"
  echo "export ARTIFACT_REPO_NAME='$ARTIFACT_REPO_NAME'"
  echo "export IMAGE_NAME='$IMAGE_NAME'"
  echo "export GEMINI_MODEL='$GEMINI_MODEL'"
  echo "export CLOUD_RUN_URL='$CLOUD_RUN_URL'"
fi
