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

**If apply fails** with Cloud Run "internal error" (code 7): wait a minute and run `terraform apply` again. Cloud Run uses the default Compute Engine service account so the "gcp-sa-run does not exist" IAM error is avoided.

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

**Do not** put the key value in Terraform or in `terraform.tfvars`; that would risk storing it in state. Avoid keys in shell history and scripts—use Secret Manager (recommended).

**Option A – gcloud (quick, but key can end up in shell history):**

```bash
gcloud run services update intent-drift-radar \
  --region=europe-west2 \
  --set-env-vars GEMINI_API_KEY=your-actual-api-key-here
```

**Option B – Secret Manager (recommended):** Terraform does the setup:

- Enables the Secret Manager API
- Creates an empty secret `gemini-api-key` (or you create it via gcloud and import—see below)
- Grants the Cloud Run service account access to the secret (`roles/secretmanager.secretAccessor`)
- Configures Cloud Run to use the secret as the `GEMINI_API_KEY` env var

**If you already created the secret via gcloud:** Set `create_gemini_secret = false` so Terraform skips creation and uses the existing secret (IAM and Cloud Run config still applied):

```bash
# In terraform.tfvars (or -var)
create_gemini_secret = false
```

Then `terraform apply` will only add the IAM grant and Cloud Run env config; your secret value is unchanged.

**If Terraform creates the secret:** After `terraform apply`, you only need to **add the secret value** (the key never touches Terraform state or shell history):

```bash
# Paste your API key, then Ctrl+D
echo -n "your-api-key-here" | gcloud secrets versions add gemini-api-key --data-file=- --project=YOUR_PROJECT_ID
```

Or create a file and add it (then delete the file):

```bash
echo -n "your-api-key-here" > /tmp/gemini-key
gcloud secrets versions add gemini-api-key --data-file=/tmp/gemini-key --project=YOUR_PROJECT_ID
rm /tmp/gemini-key
```

The container gets `GEMINI_API_KEY` from Secret Manager at runtime. If you deploy before adding a version, the env var will be empty until you add one.

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
| `gemini_location`         | Gemini/Vertex location (use `global` for global-only models) | `global` |
| `create_gemini_secret`    | Create Secret Manager secret; set to `false` if you already created `gemini-api-key` via gcloud | `true` |

## Compute vs model inference

**Compute runs in europe-west2. Model inference happens on Google’s global Gemini API endpoint.**

This app uses the **Gemini API (API key)** at the global endpoint (`generativelanguage.googleapis.com`), not Vertex AI. Cloud Run and Artifact Registry stay in `europe-west2`; only the model call is global.

- **GEMINI_LOCATION**: For Gemini API calls, location is ignored. We keep `GEMINI_LOCATION` for forward compatibility with Vertex (it does not affect request routing).
- **No Vertex IAM needed** for the runtime service account when using the API key. Store `GEMINI_API_KEY` securely (Secret Manager recommended; see below).
- **If you switch to Vertex AI** (service account auth), grant the runtime SA `roles/aiplatform.user` and set `GEMINI_LOCATION=global` for global-only models like `gemini-3-pro-preview`.

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
| `secret.tf`            | Secret Manager secret + IAM for GEMINI_API_KEY |
| `iam.tf`               | IAM bindings (invoker, Cloud Build, etc.) |
