output "project_id" {
  description = "GCP project ID"
  value       = var.project_id
}

output "region" {
  description = "GCP region"
  value       = var.region
}

output "service_name" {
  description = "Cloud Run service name"
  value       = var.service_name
}

output "artifact_repo_name" {
  description = "Artifact Registry repository name"
  value       = var.artifact_repo_name
}

output "image_name" {
  description = "Docker image name (without tag)"
  value       = var.image_name
}

output "gemini_model" {
  description = "Gemini model name for analysis"
  value       = var.gemini_model
}

output "gemini_location" {
  description = "Gemini/Vertex location (global for global-only models)"
  value       = var.gemini_location
}

output "cloud_run_url" {
  description = "URL of the deployed Cloud Run service"
  value       = google_cloud_run_v2_service.default.uri
}

output "artifact_registry_repo" {
  description = "Artifact Registry repository (for pushing images)"
  value       = google_artifact_registry_repository.repo.id
}

output "artifact_registry_location" {
  description = "Full image path for docker push / gcloud builds submit"
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/${var.artifact_repo_name}/${var.image_name}"
}

output "suggested_build_command" {
  description = "Suggested gcloud command to build and push the image"
  value       = <<-EOT
    # From project root (parent of infra/):
    gcloud builds submit --tag ${var.region}-docker.pkg.dev/${var.project_id}/${var.artifact_repo_name}/${var.image_name}:latest .
  EOT
}

output "suggested_deploy_note" {
  description = "Reminder to set GEMINI_API_KEY after first deploy"
  value       = "After first deploy, set GEMINI_API_KEY: gcloud run services update ${var.service_name} --region=${var.region} --set-env-vars GEMINI_API_KEY=your-key"
}
