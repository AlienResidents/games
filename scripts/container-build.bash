#!/usr/bin/env bash
# container-build.bash - Build container images with podman
#
# Error codes:
#   0   - Success
#   1   - General error
#   2   - Usage error
#   100 - Bash version too old
#   101 - Dockerfile not found
#   102 - Build failed
#   103 - Missing required argument

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
  echo -e "Build a container image using podman."
  echo -e ""
  echo -e "Arguments:"
  echo -e "  image-name    Full image name including registry (e.g., registry/project/image:tag)"
  echo -e ""
  echo -e "Options:"
  echo -e "  -d, --dockerfile  Path to Dockerfile (default: ./Dockerfile)"
  echo -e "  -c, --context     Build context directory (default: current directory)"
  echo -e "  -n, --no-cache    Build without cache"
  echo -e "  -h, --help        Show this help message"
  echo -e ""
  echo -e "Examples:"
  echo -e "  ${SCRIPT_NAME} australia-southeast1-docker.pkg.dev/chrispy/games/pong-flask:latest"
  echo -e "  ${SCRIPT_NAME} -n --dockerfile ./Dockerfile.prod myregistry/myimage:v1.0"
}

build_image() {
  local image_name="${1}"
  local dockerfile="${2}"
  local context="${3}"
  local no_cache="${4}"

  local build_args=()

  if [[ "${no_cache}" == "true" ]]; then
    build_args+=("--no-cache")
  fi

  echo -e "Building image: ${image_name}"
  echo -e "  Dockerfile: ${dockerfile}"
  echo -e "  Context: ${context}"
  echo -e "  No cache: ${no_cache}"
  echo -e ""

  if ! podman build "${build_args[@]}" -t "${image_name}" -f "${dockerfile}" "${context}"; then
    echo -e "Error: Build failed" >&2
    exit 102
  fi

  echo -e ""
  echo -e "Successfully built: ${image_name}"
}

main() {
  local dockerfile="Dockerfile"
  local context="."
  local no_cache="false"
  local image_name=""

  while [[ $# -gt 0 ]]; do
    case "${1}" in
      -h|--help)
        usage
        exit 0
        ;;
      -d|--dockerfile)
        dockerfile="${2}"
        shift 2
        ;;
      -c|--context)
        context="${2}"
        shift 2
        ;;
      -n|--no-cache)
        no_cache="true"
        shift
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
    exit 103
  fi

  # Resolve dockerfile path relative to context if not absolute
  if [[ "${dockerfile}" != /* ]]; then
    dockerfile="${context}/${dockerfile}"
  fi

  if [[ ! -f "${dockerfile}" ]]; then
    echo -e "Error: Dockerfile not found: ${dockerfile}" >&2
    exit 101
  fi

  build_image "${image_name}" "${dockerfile}" "${context}" "${no_cache}"
}

main "$@"
