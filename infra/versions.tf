terraform {
  required_version = ">= 1.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }

  # Local state by default. For production, add a GCS backend:
  # backend "gcs" {
  #   bucket = "your-terraform-state-bucket"
  #   prefix = "intent-drift-radar"
  # }
}
