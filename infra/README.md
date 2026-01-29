# Intent Drift Radar – GCP Infrastructure (Terraform)

Terraform config to provision GCP resources for the Intent Drift Radar Cloud Run service. The service runs the app (frontend + backend) in a single container.

## Prerequisites

- [Terraform](https://www.terraform.io/downloads) >= 1.0
- [gcloud](https://cloud.google.com/sdk/docs/install) CLI
- A GCP **project** that already exists
- You must be able to enable APIs and create resources in that project

## Quick Start

### 1. Set up GCS backend (recommended)

Create a GCS bucket for Terraform state:

```bash
# Set your project and bucket name
PROJECT_ID="your-gcp-project-id"
BUCKET_NAME="your-terraform-state-bucket"
REGION="europe-west2"

# Create the bucket
gsutil mb -p $PROJECT_ID -l $REGION gs://$BUCKET_NAME

# Enable versioning (recommended)
gsutil versioning set on gs://$BUCKET_NAME
```

Configure the backend by editing `backend.tfvars`:

```bash
cd infra/
# Edit backend.tfvars and set your bucket name
# bucket = "your-terraform-state-bucket"
```

Then initialize Terraform with the backend:

```bash
terraform init -backend-config=backend.tfvars
```

**Note:** The backend configuration is in `backend.tf`. The bucket name is provided via `backend.tfvars` (which is gitignored). If you need to change it later, edit `backend.tfvars` and run:
```bash
terraform init -reconfigure -backend-config=backend.tfvars
```

### 2. Configure and apply Terraform

```bash
cd infra/

# Copy the example tfvars file
cp terraform.tfvars.example terraform.tfvars

# Edit terraform.tfvars with your values (this file is gitignored)
# At minimum, set: project_id = "your-gcp-project-id"

terraform plan -out=tfplan
terraform apply tfplan
```

Or pass variables on the command line:

```bash
terraform init -backend-config=backend.tfvars
terraform apply -var="project_id=YOUR_GCP_PROJECT_ID"
```

### 2. Build and push the container image

From the **project root** (parent of `infra/`):

```bash
# Use the image path from Terraform output
gcloud builds submit --tag europe-west2-docker.pkg.dev/YOUR_PROJECT_ID/intent-drift-radar/intent-drift-radar:latest .
```

You need a `Dockerfile` in the project root that builds the app and runs the backend (e.g. port 8080). The repo may already provide one; if not, add one that:

- Builds the frontend (`./scripts/build.sh` or equivalent)
- Uses a Python image, installs backend deps, runs `uvicorn backend.src.app:app --host 0.0.0.0 --port 8080`

### 3. Deploy the new image to Cloud Run

After the image is in Artifact Registry, point the Cloud Run service at it:

```bash
gcloud run services update intent-drift-radar \
  --region=europe-west2 \
  --image=europe-west2-docker.pkg.dev/YOUR_PROJECT_ID/intent-drift-radar/intent-drift-radar:latest
```

### 4. Set GEMINI_API_KEY (required for /api/analyze)

**Do not** put `GEMINI_API_KEY` in Terraform or in `terraform.tfvars`; that would risk storing it in state.

**Option A – gcloud (simplest):**

```bash
gcloud run services update intent-drift-radar \
  --region=europe-west2 \
  --set-env-vars GEMINI_API_KEY=your-actual-api-key-here
```

**Option B – Secret Manager (recommended for production):**

1. Create the secret:  
   `gcloud secrets create gemini-api-key --data-file=-` (paste key, then Ctrl+D)
2. Grant the Cloud Run service account access to the secret.
3. Update the Cloud Run service to use the secret as an env var (e.g. `GEMINI_API_KEY` from `projects/PROJECT_ID/secrets/gemini-api-key/versions/latest`).

Terraform does not configure Secret Manager or the secret env var in this repo; that can be added later.

## Terraform workflow

| Step              | Command / action |
|-------------------|------------------|
| Init              | `terraform init` |
| Plan              | `terraform plan -out=tfplan` |
| Apply             | `terraform apply tfplan` |
| View outputs      | `terraform output` |
| Destroy resources | `terraform destroy` |

## Outputs

After `terraform apply`:

- **cloud_run_url** – URL of the Cloud Run service (works even with placeholder image).
- **artifact_registry_repo** – Artifact Registry repo ID.
- **artifact_registry_location** – Full image path for `gcloud builds submit` and `gcloud run services update --image=...`.
- **suggested_build_command** – Example `gcloud builds submit` command.
- **suggested_deploy_note** – Reminder to set `GEMINI_API_KEY` after deploy.

## Variables

| Variable                 | Description                          | Default                |
|--------------------------|--------------------------------------|------------------------|
| `project_id`             | GCP project ID (required)            | –                      |
| `region`                 | Region for Run and Artifact Registry | `europe-west2`         |
| `service_name`           | Cloud Run service name               | `intent-drift-radar`   |
| `artifact_repo_name`     | Artifact Registry repo name         | `intent-drift-radar`   |
| `image_name`             | Docker image name                    | `intent-drift-radar`   |
| `allow_unauthenticated` | Allow public (unauthenticated) calls | `true`                 |
| `gemini_model`           | Gemini model env value               | `gemini-3-pro-preview` |

## State and backend

State is stored in **GCS** by default (configured in `backend.tf`). The bucket name is specified in `backend.tfvars` (which is gitignored).

**Setup:**
1. Create the GCS bucket (if not already created):
   ```bash
   gsutil mb -p PROJECT_ID -l REGION gs://BUCKET_NAME
   gsutil versioning set on gs://$BUCKET_NAME
   ```

2. Edit `backend.tfvars` and set your bucket name:
   ```hcl
   bucket = "your-terraform-state-bucket"
   prefix = "intent-drift-radar"
   ```

3. Initialize Terraform:
   ```bash
   terraform init -backend-config=backend.tfvars
   ```

**Security:** The state bucket should have:
- Versioning enabled (for recovery)
- Access restricted to your team/service accounts
- Consider enabling object-level logging

**Migrating from local state:** If you have existing local state:
```bash
terraform init -migrate-state -backend-config=backend.tfvars
```

## Destroying resources

```bash
cd infra/
terraform destroy
```

You will be prompted to confirm. All created resources (APIs remain enabled; disable manually in the project if desired) will be removed.

## File layout

| File                   | Purpose |
|------------------------|--------|
| `main.tf`              | Enable GCP APIs |
| `variables.tf`         | Input variables |
| `outputs.tf`           | Output values |
| `versions.tf`          | Terraform and provider version constraints |
| `providers.tf`         | Google provider config |
| `backend.tf`           | GCS backend configuration |
| `backend.tfvars`       | Backend bucket name (gitignored) |
| `artifact_registry.tf` | Artifact Registry Docker repo |
| `service_account.tf`   | Cloud Run runtime service account |
| `cloudrun.tf`          | Cloud Run service definition |
| `iam.tf`               | IAM bindings (invoker, Cloud Build, etc.) |
