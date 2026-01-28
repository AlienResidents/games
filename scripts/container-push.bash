#!/usr/bin/env bash
# container-push.bash - Push container images to registry with podman
#
# Error codes:
#   0   - Success
#   1   - General error
#   2   - Usage error
#   100 - Bash version too old
#   101 - Image not found locally
#   102 - Login failed
#   103 - Push failed
#   104 - Missing required argument
#   105 - gcloud not found

set -euo pipefail

# Require bash 5.2+
if [[ ${BASH_VERSINFO[0]} -lt 5 ]] || [[ ${BASH_VERSINFO[0]} -eq 5 && ${BASH_VERSINFO[1]} -lt 2 ]]; then
  echo -e "Error: Bash 5.2+ required, found ${BASH_VERSION}" >&2
  exit 100
fi

SCRIPT_PATH=$(dirname "$(readlink -f "${0}")")
# shellcheck disable=SC2034
readonly SCRIPT_PATH
SCRIPT_NAME=$(basename "${0}")
readonly SCRIPT_NAME

usage() {
  echo -e "Usage: ${SCRIPT_NAME} [OPTIONS] <image-name>"
  echo -e ""
  echo -e "Push a container image to registry using podman."
  echo -e ""
  echo -e "Arguments:"
  echo -e "  image-name    Full image name including registry (e.g., registry/project/image:tag)"
  echo -e ""
  echo -e "Options:"
  echo -e "  -l, --login       Force re-login to registry before push"
  echo -e "  -g, --gcloud      Use gcloud for authentication (for GCP Artifact Registry)"
  echo -e "  -r, --registry    Override registry for login (extracted from image name by default)"
  echo -e "  -h, --help        Show this help message"
  echo -e ""
  echo -e "Examples:"
  echo -e "  ${SCRIPT_NAME} australia-southeast1-docker.pkg.dev/chrispy/games/pong-flask:latest"
  echo -e "  ${SCRIPT_NAME} -g -l australia-southeast1-docker.pkg.dev/chrispy/games/pong-flask:latest"
}

extract_registry() {
  local image_name="${1}"
  echo -e "${image_name}" | cut -d'/' -f1
}

gcloud_login() {
  local registry="${1}"

  if ! command -v gcloud &>/dev/null; then
    echo -e "Error: gcloud not found in PATH" >&2
    exit 105
  fi

  echo -e "Authenticating with gcloud..."
  if ! gcloud auth print-access-token | podman login -u oauth2accesstoken --password-stdin "${registry}"; then
    echo -e "Error: Login failed for registry: ${registry}" >&2
    exit 102
  fi
  echo -e "Login successful"
}

check_image_exists() {
  local image_name="${1}"

  if ! podman image exists "${image_name}"; then
    echo -e "Error: Image not found locally: ${image_name}" >&2
    echo -e "Run container-build.bash first to build the image" >&2
    exit 101
  fi
}

push_image() {
  local image_name="${1}"

  echo -e "Pushing image: ${image_name}"
  echo -e ""

  if ! podman push "${image_name}"; then
    echo -e "Error: Push failed" >&2
    exit 103
  fi

  echo -e ""
  echo -e "Successfully pushed: ${image_name}"
}

main() {
  local force_login="false"
  local use_gcloud="false"
  local registry=""
  local image_name=""

  while [[ $# -gt 0 ]]; do
    case "${1}" in
      -h|--help)
        usage
        exit 0
        ;;
      -l|--login)
        force_login="true"
        shift
        ;;
      -g|--gcloud)
        use_gcloud="true"
        shift
        ;;
      -r|--registry)
        registry="${2}"
        shift 2
        ;;
      -*)
        echo -e "Error: Unknown option: ${1}" >&2
        usage >&2
        exit 2
        ;;
      *)
        image_name="${1}"
        shift
        ;;
    esac
  done

  if [[ -z "${image_name}" ]]; then
    echo -e "Error: Image name is required" >&2
    usage >&2
    exit 104
  fi

  # Extract registry from image name if not provided
  if [[ -z "${registry}" ]]; then
    registry=$(extract_registry "${image_name}")
  fi

  check_image_exists "${image_name}"

  # Login if requested or using gcloud
  if [[ "${force_login}" == "true" ]] || [[ "${use_gcloud}" == "true" ]]; then
    gcloud_login "${registry}"
  fi

  push_image "${image_name}"
}

main "$@"
