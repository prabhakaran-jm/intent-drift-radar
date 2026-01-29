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
