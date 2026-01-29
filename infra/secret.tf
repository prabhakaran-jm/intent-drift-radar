# Secret Manager: GEMINI_API_KEY (create in Terraform or use existing)
# Set create_gemini_secret = false if you already created gemini-api-key via gcloud.

locals {
  # Use created secret when create_gemini_secret is true, else existing secret (try avoids index error when count=0)
  gemini_secret_id_short = try(google_secret_manager_secret.gemini_api_key[0].secret_id, data.google_secret_manager_secret.gemini_api_key[0].secret_id)
  gemini_secret_id_full  = try(google_secret_manager_secret.gemini_api_key[0].id, data.google_secret_manager_secret.gemini_api_key[0].id)
}

# Create secret only when create_gemini_secret is true
resource "google_secret_manager_secret" "gemini_api_key" {
  count     = var.create_gemini_secret ? 1 : 0
  secret_id = "gemini-api-key"
  project   = var.project_id

  replication {
    auto {}
  }

  depends_on = [google_project_service.secretmanager]
}

# Reference existing secret when create_gemini_secret is false (must already exist)
data "google_secret_manager_secret" "gemini_api_key" {
  count     = var.create_gemini_secret ? 0 : 1
  secret_id = "gemini-api-key"
  project   = var.project_id
}

# Grant default Compute Engine SA access (Cloud Run when no custom SA is set)
resource "google_secret_manager_secret_iam_member" "cloudrun_access" {
  secret_id = local.gemini_secret_id_full
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${data.google_project.project.number}-compute@developer.gserviceaccount.com"
}

# Grant custom Cloud Run SA access (if the service was ever set to use intent-drift-radar-sa)
resource "google_secret_manager_secret_iam_member" "cloudrun_sa_access" {
  secret_id = local.gemini_secret_id_full
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.cloudrun.email}"
}
