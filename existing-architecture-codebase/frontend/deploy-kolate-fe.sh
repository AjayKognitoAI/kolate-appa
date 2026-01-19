#!/usr/bin/env bash
# deploy-kolate-fe.sh
# Build, tag, push to ECR, then stop/remove old container, pull & run the new image.
set -euo pipefail

# --------- Config (override by exporting env vars if you want) ----------
AWS_REGION="${AWS_REGION:-us-west-2}"
AWS_ACCOUNT="${AWS_ACCOUNT:-767397887751}"
ECR_REPO_PATH="${ECR_REPO_PATH:-kolateai/kolate-fe-app}"   # repo path in ECR
LOCAL_IMAGE="${LOCAL_IMAGE:-kolateai/kolate-fe-app}"
TAG="${TAG:-latest}"
CONTAINER_NAME="${CONTAINER_NAME:-kolate-fe-app}"
HOST_PORT="${HOST_PORT:-3000}"
CONTAINER_PORT="${CONTAINER_PORT:-3000}"
BUILD_ARG_NODE_ENV="${BUILD_ARG_NODE_ENV:-dev}"
DOCKERFILE="${DOCKERFILE:-Dockerfile}"
BUILD_CONTEXT="${BUILD_CONTEXT:-.}"

ECR_REGISTRY="${AWS_ACCOUNT}.dkr.ecr.${AWS_REGION}.amazonaws.com"
ECR_IMAGE="${ECR_REGISTRY}/${ECR_REPO_PATH}:${TAG}"

# --------- Helpers ----------
info(){ echo -e "\033[1;34m[INFO]\033[0m $*"; }
warn(){ echo -e "\033[1;33m[WARN]\033[0m $*"; }
err(){ echo -e "\033[1;31m[ERROR]\033[0m $*" >&2; }

# --------- Preconditions ----------
if ! command -v docker >/dev/null 2>&1; then
  err "docker CLI not found. Install Docker and ensure daemon is running."
  exit 1
fi
if ! command -v aws >/dev/null 2>&1; then
  err "aws CLI not found. Install & configure AWS CLI (aws configure)."
  exit 1
fi

info "Using:"
info "  Local image: ${LOCAL_IMAGE}:${TAG}"
info "  ECR image:   ${ECR_IMAGE}"
info "  Container:   ${CONTAINER_NAME} (host:${HOST_PORT} -> container:${CONTAINER_PORT})"
info "  NODE_ENV build-arg: ${BUILD_ARG_NODE_ENV}"

# --------- Login to ECR ----------
info "🔐 Logging in to ECR ${ECR_REGISTRY}..."
aws ecr get-login-password --region "${AWS_REGION}" | docker login --username AWS --password-stdin "${ECR_REGISTRY}"

# --------- Build ----------
info "🐳 Building Docker image ${LOCAL_IMAGE}:${TAG}..."
docker build -t "${LOCAL_IMAGE}:${TAG}" --build-arg NODE_ENV="${BUILD_ARG_NODE_ENV}" -f "${DOCKERFILE}" "${BUILD_CONTEXT}"

# --------- Tag ----------
info "🏷 Tagging image -> ${ECR_IMAGE}..."
docker tag "${LOCAL_IMAGE}:${TAG}" "${ECR_IMAGE}"

# --------- Push ----------
info "📤 Pushing ${ECR_IMAGE} to ECR..."
docker push "${ECR_IMAGE}"

# --------- Stop & remove existing container (if present) ----------
if docker ps -a --format '{{.Names}}' | grep -wq "${CONTAINER_NAME}"; then
  if docker ps --format '{{.Names}}' | grep -wq "${CONTAINER_NAME}"; then
    info "🛑 Stopping running container ${CONTAINER_NAME}..."
    docker stop "${CONTAINER_NAME}"
  fi
  info "🧹 Removing container ${CONTAINER_NAME}..."
  docker rm "${CONTAINER_NAME}"
else
  info "ℹ️  No existing container named ${CONTAINER_NAME} found."
fi

# --------- Pull new image ----------
info "⬇️  Pulling ${ECR_IMAGE} ..."
docker pull "${ECR_IMAGE}"

# --------- Run ----------
info "▶️  Running container ${CONTAINER_NAME}..."
docker run -d \
  --name "${CONTAINER_NAME}" \
  -p "${HOST_PORT}:${CONTAINER_PORT}" \
  "${ECR_IMAGE}"

info "✅ Deployment complete. App should be available at http://localhost:${HOST_PORT}"
