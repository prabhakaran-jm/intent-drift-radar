# Allow unauthenticated invocations (public demo). Good for demos; risky beyond that.
resource "google_cloud_run_v2_service_iam_member" "public_invoker" {
  count = var.allow_unauthenticated ? 1 : 0

  project  = google_cloud_run_v2_service.default.project
  location = google_cloud_run_v2_service.default.location
  name     = google_cloud_run_v2_service.default.name

  role   = "roles/run.invoker"
  member = "allUsers"
}

# Cloud Build default SA: push to Artifact Registry and deploy Cloud Run
# Get project number for Cloud Build SA
data "google_project" "project" {
  project_id = var.project_id
}

# Grant Cloud Build SA permission to push to Artifact Registry
resource "google_artifact_registry_repository_iam_member" "cloudbuild_writer" {
  project    = google_artifact_registry_repository.repo.project
  location   = google_artifact_registry_repository.repo.location
  repository = google_artifact_registry_repository.repo.name

  role   = "roles/artifactregistry.writer"
  member = "serviceAccount:${data.google_project.project.number}@cloudbuild.gserviceaccount.com"
}

# Grant Cloud Build SA permission to deploy to Cloud Run
# For tighter prod: use roles/run.developer + roles/iam.serviceAccountUser scoped to runtime SA
resource "google_cloud_run_v2_service_iam_member" "cloudbuild_admin" {
  project  = google_cloud_run_v2_service.default.project
  location = google_cloud_run_v2_service.default.location
  name     = google_cloud_run_v2_service.default.name

  role   = "roles/run.admin"
  member = "serviceAccount:${data.google_project.project.number}@cloudbuild.gserviceaccount.com"
}

# Gemini: we use the Gemini API (API key), not Vertex AI. The runtime SA does not need
# Vertex permissions. GEMINI_API_KEY is set via gcloud/Secret Manager after deploy.
# If you switch to Vertex AI (service account auth), grant the runtime SA:
#   roles/aiplatform.user
# and set GEMINI_LOCATION=global for global-only models (e.g. gemini-3-pro-preview).
