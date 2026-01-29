terraform {
  backend "gcs" {
    # Bucket name is provided via backend.tfvars or -backend-config flags
    # This allows different bucket names per environment without hardcoding
    bucket = ""  # Set via -backend-config=backend.tfvars
    prefix = "intent-drift-radar"
  }
}
