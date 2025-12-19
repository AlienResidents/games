#!/usr/bin/env bash
# setup-gcp-infrastructure.bash - Create GCP infrastructure for games deployment
#
# This script creates the necessary GCP resources for deploying containerized games:
# - Artifact Registry repository for container images
# - Service account for Kubernetes image pulling
# - IAM bindings for the service account
#
# Error codes:
#   100 - Missing required tool
#   101 - GCP authentication failed
#   102 - Artifact Registry creation failed
#   103 - Service account creation failed
#   104 - IAM binding failed

set -euo pipefail

# Get script directory
script_path=$(dirname "$(readlink -f "${0}")")

# =============================================================================
# Configuration - Override these with environment variables or a config file
# =============================================================================

# Load config file if it exists
CONFIG_FILE="${CONFIG_FILE:-${script_path}/../.gcp-config}"
if [[ -f "${CONFIG_FILE}" ]]; then
  # shellcheck source=/dev/null
  source "${CONFIG_FILE}"
fi

# GCP Settings
GCP_PROJECT="${GCP_PROJECT:-}"
GCP_REGION="${GCP_REGION:-australia-southeast1}"

# Artifact Registry
AR_REPOSITORY="${AR_REPOSITORY:-games}"
AR_DESCRIPTION="${AR_DESCRIPTION:-Container images for browser-based games}"

# Service Account
SERVICE_ACCOUNT_NAME="${SERVICE_ACCOUNT_NAME:-games-k8s-puller}"
SERVICE_ACCOUNT_DISPLAY="${SERVICE_ACCOUNT_DISPLAY:-Games K8s Image Puller}"
SERVICE_ACCOUNT_DESCRIPTION="${SERVICE_ACCOUNT_DESCRIPTION:-Service account for Kubernetes to pull game container images}"

# =============================================================================
# Functions
# =============================================================================

usage() {
  echo -e "Usage: ${0} [OPTIONS] [COMMAND]"
  echo -e ""
  echo -e "Create GCP infrastructure for games deployment."
  echo -e ""
  echo -e "Commands:"
  echo -e "  all                 Run all setup steps (default)"
  echo -e "  registry            Create Artifact Registry repository only"
  echo -e "  service-account     Create service account only"
  echo -e "  status              Show current infrastructure status"
  echo -e ""
  echo -e "Options:"
  echo -e "  -h, --help          Show this help message"
  echo -e "  -p, --project ID    GCP project ID (required)"
  echo -e "  -r, --region REGION GCP region (default: ${GCP_REGION})"
  echo -e "  --dry-run           Show commands without executing"
  echo -e "  --init-config       Create a sample config file"
  echo -e ""
  echo -e "Environment variables:"
  echo -e "  GCP_PROJECT              GCP project ID"
  echo -e "  GCP_REGION               GCP region (default: australia-southeast1)"
  echo -e "  AR_REPOSITORY            Artifact Registry repo name (default: games)"
  echo -e "  SERVICE_ACCOUNT_NAME     Service account name (default: games-k8s-puller)"
  echo -e ""
  echo -e "Config file:"
  echo -e "  Create ${script_path}/../.gcp-config with your settings:"
  echo -e "    GCP_PROJECT=your-project-id"
  echo -e "    GCP_REGION=your-region"
  echo -e ""
  echo -e "Example:"
  echo -e "  ${0} --project myproject all"
  echo -e "  ${0} --project myproject --dry-run status"
  echo -e "  GCP_PROJECT=myproject ${0} registry"
}

init_config() {
  local config_path="${script_path}/../.gcp-config"

  if [[ -f "${config_path}" ]]; then
    echo -e "Config file already exists: ${config_path}"
    echo -e "Remove it first if you want to recreate."
    exit 1
  fi

  cat > "${config_path}" << 'EOF'
# GCP Configuration for Games Deployment
# This file is sourced by setup scripts - do not commit sensitive values

# GCP Project ID (required)
GCP_PROJECT=""

# GCP Region for Artifact Registry
GCP_REGION="australia-southeast1"

# Artifact Registry repository name
AR_REPOSITORY="games"

# Service account for Kubernetes image pulling
SERVICE_ACCOUNT_NAME="games-k8s-puller"
EOF

  chmod 600 "${config_path}"
  echo -e "Created config file: ${config_path}"
  echo -e "Edit this file with your GCP project ID, then run the setup script."
  echo -e ""
  echo -e "IMPORTANT: Add .gcp-config to .gitignore to avoid committing sensitive values."
}

check_dependencies() {
  # Note: Use a loop here if checking multiple commands
  if ! command -v gcloud &>/dev/null; then
    echo -e "Error: Missing required tool: gcloud" >&2
    echo -e "Install the Google Cloud SDK: https://cloud.google.com/sdk/docs/install" >&2
    exit 100
  fi
}

check_project() {
  if [[ -z "${GCP_PROJECT}" ]]; then
    echo -e "Error: GCP_PROJECT is required" >&2
    echo -e ""
    echo -e "Set it via:"
    echo -e "  1. Environment variable: GCP_PROJECT=myproject ${0}"
    echo -e "  2. Command line: ${0} --project myproject"
    echo -e "  3. Config file: ${script_path}/../.gcp-config"
    echo -e ""
    echo -e "Run '${0} --init-config' to create a sample config file."
    exit 1
  fi
}

check_gcp_auth() {
  echo -e "Checking GCP authentication..."
  if ! gcloud auth print-access-token &>/dev/null; then
    echo -e "Error: Not authenticated to GCP. Run 'gcloud auth login' first." >&2
    exit 101
  fi

  if [[ "${DRY_RUN}" != "true" ]]; then
    gcloud config set project "${GCP_PROJECT}" --quiet
  fi
  echo -e "Authenticated and project set to: ${GCP_PROJECT}"
}

create_artifact_registry() {
  local registry="${GCP_REGION}-docker.pkg.dev/${GCP_PROJECT}/${AR_REPOSITORY}"

  echo -e ""
  echo -e "Creating Artifact Registry repository..."
  echo -e "  Name:        ${AR_REPOSITORY}"
  echo -e "  Location:    ${GCP_REGION}"
  echo -e "  Registry:    ${registry}"
  echo -e ""

  # Check if repository already exists
  if gcloud artifacts repositories describe "${AR_REPOSITORY}" \
      --location="${GCP_REGION}" &>/dev/null 2>&1; then
    echo -e "Repository already exists: ${AR_REPOSITORY}"
    return 0
  fi

  if [[ "${DRY_RUN}" == "true" ]]; then
    echo -e "[DRY-RUN] Would create Artifact Registry repository: ${AR_REPOSITORY}"
  else
    gcloud artifacts repositories create "${AR_REPOSITORY}" \
      --repository-format=docker \
      --location="${GCP_REGION}" \
      --description="${AR_DESCRIPTION}" || exit 102

    echo -e "Repository created successfully"
  fi
}

create_service_account() {
  local sa_email="${SERVICE_ACCOUNT_NAME}@${GCP_PROJECT}.iam.gserviceaccount.com"

  echo -e ""
  echo -e "Creating service account..."
  echo -e "  Name:  ${SERVICE_ACCOUNT_NAME}"
  echo -e "  Email: ${sa_email}"
  echo -e ""

  # Check if service account already exists
  if gcloud iam service-accounts describe "${sa_email}" &>/dev/null 2>&1; then
    echo -e "Service account already exists: ${sa_email}"
  else
    if [[ "${DRY_RUN}" == "true" ]]; then
      echo -e "[DRY-RUN] Would create service account: ${SERVICE_ACCOUNT_NAME}"
    else
      gcloud iam service-accounts create "${SERVICE_ACCOUNT_NAME}" \
        --description="${SERVICE_ACCOUNT_DESCRIPTION}" \
        --display-name="${SERVICE_ACCOUNT_DISPLAY}" || exit 103

      echo -e "Service account created successfully"
    fi
  fi

  # Grant Artifact Registry Reader role
  echo -e "Granting Artifact Registry Reader role..."

  if [[ "${DRY_RUN}" == "true" ]]; then
    echo -e "[DRY-RUN] Would grant roles/artifactregistry.reader to ${sa_email}"
  else
    gcloud projects add-iam-policy-binding "${GCP_PROJECT}" \
      --member="serviceAccount:${sa_email}" \
      --role="roles/artifactregistry.reader" \
      --quiet >/dev/null || exit 104

    echo -e "IAM binding created successfully"
  fi
}

show_status() {
  echo -e ""
  echo -e "=============================================="
  echo -e "GCP Infrastructure Status"
  echo -e "=============================================="
  echo -e "Project: ${GCP_PROJECT}"
  echo -e "Region:  ${GCP_REGION}"
  echo -e "=============================================="
  echo -e ""

  # Check Artifact Registry
  echo -e "Artifact Registry:"
  if gcloud artifacts repositories describe "${AR_REPOSITORY}" \
      --location="${GCP_REGION}" &>/dev/null 2>&1; then
    echo -e "  ✓ Repository '${AR_REPOSITORY}' exists"
    echo -e "    Registry: ${GCP_REGION}-docker.pkg.dev/${GCP_PROJECT}/${AR_REPOSITORY}"
  else
    echo -e "  ✗ Repository '${AR_REPOSITORY}' not found"
  fi
  echo -e ""

  # Check Service Account
  local sa_email="${SERVICE_ACCOUNT_NAME}@${GCP_PROJECT}.iam.gserviceaccount.com"
  echo -e "Service Account:"
  if gcloud iam service-accounts describe "${sa_email}" &>/dev/null 2>&1; then
    echo -e "  ✓ Service account '${SERVICE_ACCOUNT_NAME}' exists"
    echo -e "    Email: ${sa_email}"

    # Check IAM bindings
    if gcloud projects get-iam-policy "${GCP_PROJECT}" \
        --flatten="bindings[].members" \
        --filter="bindings.members:serviceAccount:${sa_email}" \
        --format="value(bindings.role)" 2>/dev/null | grep -q "artifactregistry.reader"; then
      echo -e "  ✓ Has Artifact Registry Reader role"
    else
      echo -e "  ✗ Missing Artifact Registry Reader role"
    fi
  else
    echo -e "  ✗ Service account '${SERVICE_ACCOUNT_NAME}' not found"
  fi
  echo -e ""

  # Show next steps
  echo -e "Next steps:"
  echo -e "  1. Authenticate container tool:"
  echo -e "     gcloud auth print-access-token | podman login -u oauth2accesstoken --password-stdin ${GCP_REGION}-docker.pkg.dev"
  echo -e ""
  echo -e "  2. Build and push images:"
  echo -e "     podman build -t ${GCP_REGION}-docker.pkg.dev/${GCP_PROJECT}/${AR_REPOSITORY}/game-name:tag ."
  echo -e "     podman push ${GCP_REGION}-docker.pkg.dev/${GCP_PROJECT}/${AR_REPOSITORY}/game-name:tag"
  echo -e ""
  echo -e "  3. Create K8s image pull secret:"
  echo -e "     scripts/setup-image-pull-secret.bash --sops"
}

print_summary() {
  local registry="${GCP_REGION}-docker.pkg.dev/${GCP_PROJECT}/${AR_REPOSITORY}"
  local sa_email="${SERVICE_ACCOUNT_NAME}@${GCP_PROJECT}.iam.gserviceaccount.com"

  echo -e ""
  echo -e "=============================================="
  echo -e "Setup Complete"
  echo -e "=============================================="
  echo -e ""
  echo -e "Artifact Registry:"
  echo -e "  ${registry}"
  echo -e ""
  echo -e "Service Account:"
  echo -e "  ${sa_email}"
  echo -e ""
  echo -e "Next steps:"
  echo -e "  1. Run scripts/setup-image-pull-secret.bash --sops"
  echo -e "     to create the Kubernetes image pull secret"
  echo -e ""
  echo -e "  2. Build and push your container images:"
  echo -e "     podman build -t ${registry}/<game>:latest <game>/"
  echo -e "     podman push ${registry}/<game>:latest"
  echo -e ""
}

main() {
  local DRY_RUN="false"
  local COMMAND="all"

  # Parse arguments
  while [[ $# -gt 0 ]]; do
    case "${1}" in
      -h|--help)
        usage
        exit 0
        ;;
      -p|--project)
        GCP_PROJECT="${2}"
        shift 2
        ;;
      -r|--region)
        GCP_REGION="${2}"
        shift 2
        ;;
      --dry-run)
        DRY_RUN="true"
        shift
        ;;
      --init-config)
        init_config
        exit 0
        ;;
      all|registry|service-account|status)
        COMMAND="${1}"
        shift
        ;;
      *)
        echo -e "Unknown option: ${1}" >&2
        usage
        exit 1
        ;;
    esac
  done

  # Export DRY_RUN for use in functions
  export DRY_RUN

  check_dependencies
  check_project
  check_gcp_auth

  case "${COMMAND}" in
    all)
      create_artifact_registry
      create_service_account
      print_summary
      ;;
    registry)
      create_artifact_registry
      ;;
    service-account)
      create_service_account
      ;;
    status)
      show_status
      ;;
  esac
}

main "$@"
