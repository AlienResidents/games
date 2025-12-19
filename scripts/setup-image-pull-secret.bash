#!/usr/bin/env bash
# setup-image-pull-secret.bash - Create GCP service account and K8s image pull secret
#
# Error codes:
#   100 - Missing required tool
#   101 - GCP authentication failed
#   102 - Service account creation failed
#   103 - IAM binding failed
#   104 - Key creation failed
#   105 - Kubernetes secret creation failed

set -euo pipefail

# Get script directory
script_path=$(dirname "$(readlink -f "${0}")")

# =============================================================================
# Configuration - Override these with environment variables
# =============================================================================
GCP_PROJECT="${GCP_PROJECT:-your-project-id}"
GCP_REGION="${GCP_REGION:-australia-southeast1}"
SERVICE_ACCOUNT_NAME="${SERVICE_ACCOUNT_NAME:-k8s-image-puller}"
SERVICE_ACCOUNT_DISPLAY="${SERVICE_ACCOUNT_DISPLAY:-K8s Image Puller}"
K8S_NAMESPACE="${K8S_NAMESPACE:-games}"
K8S_SECRET_NAME="${K8S_SECRET_NAME:-gcr-secret}"
KEY_FILE="${KEY_FILE:-${HOME}/k8s-image-puller-key.json}"
ENCRYPT_WITH_SOPS="${ENCRYPT_WITH_SOPS:-false}"
SOPS_OUTPUT_DIR="${SOPS_OUTPUT_DIR:-${script_path}/../secrets}"

# =============================================================================
# Functions
# =============================================================================

usage() {
  echo -e "Usage: ${0} [OPTIONS]"
  echo -e ""
  echo -e "Create a GCP service account and Kubernetes image pull secret for"
  echo -e "pulling container images from Artifact Registry."
  echo -e ""
  echo -e "Options:"
  echo -e "  -h, --help              Show this help message"
  echo -e "  -p, --project PROJECT   GCP project ID (default: ${GCP_PROJECT})"
  echo -e "  -r, --region REGION     GCP region (default: ${GCP_REGION})"
  echo -e "  -n, --namespace NS      Kubernetes namespace (default: ${K8S_NAMESPACE})"
  echo -e "  -s, --sops              Encrypt key file with sops"
  echo -e "  --dry-run               Show commands without executing"
  echo -e ""
  echo -e "Environment variables:"
  echo -e "  GCP_PROJECT             GCP project ID"
  echo -e "  GCP_REGION              GCP region for Artifact Registry"
  echo -e "  SERVICE_ACCOUNT_NAME    Service account name"
  echo -e "  K8S_NAMESPACE           Kubernetes namespace"
  echo -e "  K8S_SECRET_NAME         Kubernetes secret name"
  echo -e "  KEY_FILE                Path to store the key file"
  echo -e "  ENCRYPT_WITH_SOPS       Set to 'true' to encrypt with sops"
  echo -e ""
  echo -e "Example:"
  echo -e "  GCP_PROJECT=myproject ${0} --sops"
}

check_dependencies() {
  local missing=()

  for cmd in gcloud kubectl; do
    if ! command -v "${cmd}" &>/dev/null; then
      missing+=("${cmd}")
    fi
  done

  if [[ "${ENCRYPT_WITH_SOPS}" == "true" ]] && ! command -v sops &>/dev/null; then
    missing+=("sops")
  fi

  if [[ ${#missing[@]} -gt 0 ]]; then
    echo -e "Error: Missing required tools: ${missing[*]}" >&2
    exit 100
  fi
}

check_gcp_auth() {
  echo -e "Checking GCP authentication..."
  if ! gcloud auth print-access-token &>/dev/null; then
    echo -e "Error: Not authenticated to GCP. Run 'gcloud auth login' first." >&2
    exit 101
  fi
  gcloud config set project "${GCP_PROJECT}" --quiet
}

create_service_account() {
  local sa_email="${SERVICE_ACCOUNT_NAME}@${GCP_PROJECT}.iam.gserviceaccount.com"

  echo -e "Creating service account: ${SERVICE_ACCOUNT_NAME}"

  # Check if service account already exists
  if gcloud iam service-accounts describe "${sa_email}" &>/dev/null; then
    echo -e "Service account already exists: ${sa_email}"
  else
    if [[ "${DRY_RUN:-false}" == "true" ]]; then
      echo -e "[DRY-RUN] Would create service account: ${SERVICE_ACCOUNT_NAME}"
    else
      gcloud iam service-accounts create "${SERVICE_ACCOUNT_NAME}" \
        --description="Service account for Kubernetes to pull container images" \
        --display-name="${SERVICE_ACCOUNT_DISPLAY}" || exit 102
    fi
  fi
}

grant_iam_permissions() {
  local sa_email="${SERVICE_ACCOUNT_NAME}@${GCP_PROJECT}.iam.gserviceaccount.com"

  echo -e "Granting Artifact Registry Reader role..."

  if [[ "${DRY_RUN:-false}" == "true" ]]; then
    echo -e "[DRY-RUN] Would grant roles/artifactregistry.reader to ${sa_email}"
  else
    gcloud projects add-iam-policy-binding "${GCP_PROJECT}" \
      --member="serviceAccount:${sa_email}" \
      --role="roles/artifactregistry.reader" \
      --quiet >/dev/null || exit 103
  fi
}

create_key_file() {
  local sa_email="${SERVICE_ACCOUNT_NAME}@${GCP_PROJECT}.iam.gserviceaccount.com"

  echo -e "Creating service account key: ${KEY_FILE}"

  if [[ "${DRY_RUN:-false}" == "true" ]]; then
    echo -e "[DRY-RUN] Would create key file: ${KEY_FILE}"
  else
    gcloud iam service-accounts keys create "${KEY_FILE}" \
      --iam-account="${sa_email}" || exit 104

    chmod 600 "${KEY_FILE}"
    echo -e "Key file created: ${KEY_FILE}"
  fi
}

encrypt_with_sops() {
  if [[ "${ENCRYPT_WITH_SOPS}" != "true" ]]; then
    return
  fi

  echo -e "Encrypting key file with sops..."

  mkdir -p "${SOPS_OUTPUT_DIR}"
  local encrypted_file
  encrypted_file="${SOPS_OUTPUT_DIR}/$(basename "${KEY_FILE%.json}").json"

  if [[ "${DRY_RUN:-false}" == "true" ]]; then
    echo -e "[DRY-RUN] Would encrypt ${KEY_FILE} to ${encrypted_file}"
  else
    cp "${KEY_FILE}" "${encrypted_file}"
    sops -e -i "${encrypted_file}"

    echo -e "Encrypted key saved to: ${encrypted_file}"
    echo -e "Removing unencrypted key file..."
    rm "${KEY_FILE}"
  fi
}

create_k8s_secret() {
  local registry="${GCP_REGION}-docker.pkg.dev"

  echo -e "Creating Kubernetes secret: ${K8S_SECRET_NAME} in namespace: ${K8S_NAMESPACE}"

  # Delete existing secret if present
  if kubectl get secret "${K8S_SECRET_NAME}" -n "${K8S_NAMESPACE}" &>/dev/null; then
    echo -e "Deleting existing secret..."
    if [[ "${DRY_RUN:-false}" != "true" ]]; then
      kubectl delete secret "${K8S_SECRET_NAME}" -n "${K8S_NAMESPACE}"
    fi
  fi

  if [[ "${DRY_RUN:-false}" == "true" ]]; then
    echo -e "[DRY-RUN] Would create docker-registry secret"
  else
    local key_file_to_use="${KEY_FILE}"

    # If sops encryption was used, decrypt to temp file using --extract
    if [[ "${ENCRYPT_WITH_SOPS}" == "true" ]]; then
      local encrypted_file
      encrypted_file="${SOPS_OUTPUT_DIR}/$(basename "${KEY_FILE%.json}").json"
      local temp_key_file
      temp_key_file=$(mktemp)

      # Extract the entire JSON structure using sops
      sops --extract '["type"]' "${encrypted_file}" > /dev/null  # Verify we can decrypt

      # Reconstruct JSON from individual sops extractions
      {
        echo "{"
        echo "  \"type\": $(sops --extract '[\"type\"]' "${encrypted_file}"),"
        echo "  \"project_id\": $(sops --extract '[\"project_id\"]' "${encrypted_file}"),"
        echo "  \"private_key_id\": $(sops --extract '[\"private_key_id\"]' "${encrypted_file}"),"
        echo "  \"private_key\": $(sops --extract '[\"private_key\"]' "${encrypted_file}"),"
        echo "  \"client_email\": $(sops --extract '[\"client_email\"]' "${encrypted_file}"),"
        echo "  \"client_id\": $(sops --extract '[\"client_id\"]' "${encrypted_file}"),"
        echo "  \"auth_uri\": $(sops --extract '[\"auth_uri\"]' "${encrypted_file}"),"
        echo "  \"token_uri\": $(sops --extract '[\"token_uri\"]' "${encrypted_file}"),"
        echo "  \"auth_provider_x509_cert_url\": $(sops --extract '[\"auth_provider_x509_cert_url\"]' "${encrypted_file}"),"
        echo "  \"client_x509_cert_url\": $(sops --extract '[\"client_x509_cert_url\"]' "${encrypted_file}"),"
        echo "  \"universe_domain\": $(sops --extract '[\"universe_domain\"]' "${encrypted_file}")"
        echo "}"
      } > "${temp_key_file}"

      key_file_to_use="${temp_key_file}"
    fi

    kubectl create secret docker-registry "${K8S_SECRET_NAME}" \
      --namespace="${K8S_NAMESPACE}" \
      --docker-server="${registry}" \
      --docker-username=_json_key \
      --docker-password="$(cat "${key_file_to_use}")" \
      --docker-email="noreply@example.com" || exit 105

    # Clean up temp file if used
    if [[ "${ENCRYPT_WITH_SOPS}" == "true" ]] && [[ -f "${temp_key_file:-}" ]]; then
      rm -f "${temp_key_file}"
    fi

    echo -e "Kubernetes secret created successfully"
  fi
}

main() {
  local DRY_RUN="false"

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
      -n|--namespace)
        K8S_NAMESPACE="${2}"
        shift 2
        ;;
      -s|--sops)
        ENCRYPT_WITH_SOPS="true"
        shift
        ;;
      --dry-run)
        DRY_RUN="true"
        shift
        ;;
      *)
        echo -e "Unknown option: ${1}" >&2
        usage
        exit 1
        ;;
    esac
  done

  # Validate project is set
  if [[ "${GCP_PROJECT}" == "your-project-id" ]]; then
    echo -e "Error: GCP_PROJECT must be set" >&2
    echo -e "Use: GCP_PROJECT=myproject ${0}" >&2
    exit 1
  fi

  echo -e "=============================================="
  echo -e "GCP Image Pull Secret Setup"
  echo -e "=============================================="
  echo -e "Project:         ${GCP_PROJECT}"
  echo -e "Region:          ${GCP_REGION}"
  echo -e "Service Account: ${SERVICE_ACCOUNT_NAME}"
  echo -e "K8s Namespace:   ${K8S_NAMESPACE}"
  echo -e "K8s Secret:      ${K8S_SECRET_NAME}"
  echo -e "Encrypt w/SOPS:  ${ENCRYPT_WITH_SOPS}"
  echo -e "=============================================="
  echo -e ""

  check_dependencies
  check_gcp_auth
  create_service_account
  grant_iam_permissions
  create_key_file
  encrypt_with_sops
  create_k8s_secret

  echo -e ""
  echo -e "Setup complete!"
}

main "$@"
