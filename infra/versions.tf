terraform {
  required_version = ">= 1.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }

  # Remote backend using GCS (recommended for production)
  # Create the bucket first: gsutil mb -p PROJECT_ID -l REGION gs://BUCKET_NAME
  # Or use: terraform init -backend-config="bucket=BUCKET_NAME" -backend-config="prefix=intent-drift-radar"
  backend "gcs" {
    bucket = ""  # Set via -backend-config or terraform init -reconfigure
    prefix = "intent-drift-radar"
  }
}
