resource "google_artifact_registry_repository" "repo" {
  location      = var.region
  repository_id = var.artifact_repo_name
  description   = "Docker repository for intent-drift-radar"
  format        = "DOCKER"

  depends_on = [google_project_service.artifactregistry]
}
