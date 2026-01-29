variable "project_id" {
  description = "GCP project ID (must already exist)"
  type        = string
}

variable "region" {
  description = "GCP region for Cloud Run and Artifact Registry"
  type        = string
  default     = "europe-west2"
}

variable "service_name" {
  description = "Cloud Run service name"
  type        = string
  default     = "intent-drift-radar"
}

variable "artifact_repo_name" {
  description = "Artifact Registry repository name"
  type        = string
  default     = "intent-drift-radar"
}

variable "image_name" {
  description = "Docker image name (without tag)"
  type        = string
  default     = "intent-drift-radar"
}

variable "allow_unauthenticated" {
  description = "Allow unauthenticated invocations (public demo)"
  type        = bool
  default     = true
}

variable "gemini_model" {
  description = "Gemini model name for analysis"
  type        = string
  default     = "gemini-3-pro-preview"
}

variable "gemini_location" {
  description = "Location for Gemini/Vertex calls. Use 'global' for gemini-3-pro-preview (global-only model). Infra (Run, AR) stays in region."
  type        = string
  default     = "global"
  
  # Validation: preview models must use global location
  # This prevents runtime failures when someone switches to Vertex with a regional location
  validation {
    condition = (
      !can(regex("preview", var.gemini_model)) || var.gemini_location == "global"
    )
    error_message = "Preview Gemini models (containing 'preview') must use gemini_location='global'. Regional locations will cause 404/invalid location errors."
  }
}

variable "create_gemini_secret" {
  description = "Set to false if you already created gemini-api-key via gcloud; Terraform will use the existing secret instead of creating one."
  type        = bool
  default     = true
}

# GEMINI_API_KEY must NOT be set here to avoid storing in Terraform state.
# Set it after deploy via: gcloud run services update ... --set-env-vars GEMINI_API_KEY=...
# Or use Secret Manager (documented in README).
