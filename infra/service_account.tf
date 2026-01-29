# Service account for Cloud Run runtime (least privilege)
resource "google_service_account" "cloudrun" {
  account_id   = "${var.service_name}-sa"
  display_name = "Cloud Run runtime for ${var.service_name}"
  project      = var.project_id
}

# Cloud Build uses default compute SA; ensure it can push and deploy
# (default Cloud Build SA is project_number@cloudbuild.gserviceaccount.com)
