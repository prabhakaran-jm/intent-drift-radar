# Allow unauthenticated invocations (public demo)
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
resource "google_cloud_run_v2_service_iam_member" "cloudbuild_admin" {
  project  = google_cloud_run_v2_service.default.project
  location = google_cloud_run_v2_service.default.location
  name     = google_cloud_run_v2_service.default.name

  role   = "roles/run.admin"
  member = "serviceAccount:${data.google_project.project.number}@cloudbuild.gserviceaccount.com"
}

# Allow Cloud Run service agent to use the custom SA (required when template.service_account is set)
resource "google_service_account_iam_member" "cloudrun_sa_user" {
  service_account_id = google_service_account.cloudrun.name
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${data.google_project.project.number}@gcp-sa-run.iam.gserviceaccount.com"
}

# Optional: if Gemini API requires project-level or SA permissions, add here.
# For API key–based Gemini, the key is passed via env; no extra IAM needed for the SA.
