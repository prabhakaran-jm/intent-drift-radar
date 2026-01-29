# Cloud Run service
# Initial create uses a public placeholder image so Terraform apply succeeds.
# After first build/push, update the service to use your image (see README).
locals {
  # Placeholder image that exists; replace with your image after: gcloud builds submit ...
  placeholder_image = "gcr.io/google-samples/hello-app:1.0"
  # Your image (use after first build): region-docker.pkg.dev/project/repo/name:latest
  app_image = "${var.region}-docker.pkg.dev/${var.project_id}/${var.artifact_repo_name}/${var.image_name}:latest"
}

resource "google_cloud_run_v2_service" "default" {
  name     = var.service_name
  location = var.region
  project  = var.project_id

  template {
    service_account = google_service_account.cloudrun.email

    scaling {
      min_instance_count = 0
      max_instance_count = 10
    }

    containers {
      # Start with placeholder so apply succeeds; update to app_image after first build
      image = local.placeholder_image

      ports {
        container_port = 8080
      }

      env {
        name  = "GEMINI_MODEL"
        value = var.gemini_model
      }
      # GEMINI_API_KEY: do NOT add here. Set via gcloud after deploy (see README).
    }
  }

  traffic {
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    percent = 100
  }

  depends_on = [
    google_project_service.run,
    google_artifact_registry_repository.repo,
  ]
}
