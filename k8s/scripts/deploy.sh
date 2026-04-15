#!/usr/bin/env bash
# ── Stride — Build, push, and deploy to k3s on EC2 ───────────────────────────
#
# Usage:
#   ./deploy.sh [--skip-build]
#
# Requires:
#   - ~/.kube/stride.yaml (created by provision-cluster.sh)
#   - k8s/base/01-secrets.yaml (copied from 01-secrets.yaml.example and filled in)
#   - docker login to Docker Hub
#
# IMPORTANT — Next.js build args:
#   NEXT_PUBLIC_API_URL is baked at build time. Set it below before building.
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

KUBECONFIG_PATH=~/.kube/stride.yaml
DOCKER_USER="bhopathivardhan1"
TAG="latest"

# ── Config — edit these ───────────────────────────────────────────────────────
APP_DOMAIN="stride.inferix.in"
API_DOMAIN="api.stride.inferix.in"
AUTH_SECRET="$(grep NEXTAUTH_SECRET k8s/base/01-secrets.yaml | awk -F'"' '{print $2}')"
# ─────────────────────────────────────────────────────────────────────────────

SKIP_BUILD=${1:-""}

if [ ! -f "$KUBECONFIG_PATH" ]; then
  echo "❌ No kubeconfig at $KUBECONFIG_PATH — run provision-cluster.sh first"
  exit 1
fi

if [ ! -f "k8s/base/01-secrets.yaml" ]; then
  echo "❌ k8s/base/01-secrets.yaml not found"
  echo "   cp k8s/base/01-secrets.yaml.example k8s/base/01-secrets.yaml && fill in values"
  exit 1
fi

export KUBECONFIG=$KUBECONFIG_PATH

# ── Build & push images ───────────────────────────────────────────────────────
if [ "$SKIP_BUILD" != "--skip-build" ]; then
  echo "━━━ Building API image ━━━"
  # --platform linux/amd64 required when building on Apple Silicon for EC2 (x86_64)
  docker buildx build --platform linux/amd64 \
    -f api/Dockerfile \
    -t $DOCKER_USER/stride-api:$TAG \
    --push \
    .

  echo "━━━ Building Web image ━━━"
  # NEXT_PUBLIC_* vars must be baked at build time
  docker buildx build --platform linux/amd64 \
    -f app/Dockerfile \
    --build-arg NEXT_PUBLIC_API_URL=https://$API_DOMAIN \
    --build-arg NEXT_PUBLIC_APP_URL=https://$APP_DOMAIN \
    --build-arg AUTH_SECRET=$AUTH_SECRET \
    --build-arg AUTH_URL=https://$APP_DOMAIN \
    --build-arg DATABASE_URL=placeholder \
    --build-arg API_URL=http://localhost:4000 \
    -t $DOCKER_USER/stride-web:$TAG \
    --push \
    app/
else
  echo "→ Skipping build (--skip-build)"
fi

# ── Deploy to cluster ─────────────────────────────────────────────────────────
echo "━━━ Deploying to cluster ━━━"
echo "→ Cluster: $(kubectl config current-context)"

kubectl apply -k k8s/clusters/stride/

echo ""
echo "→ Waiting for pods..."
kubectl rollout status deployment/api -n stride --timeout=180s
kubectl rollout status deployment/web -n stride --timeout=180s

echo ""
kubectl get pods -n stride
echo ""
echo "✅ Stride deployed!"
echo "   App: https://$APP_DOMAIN"
echo "   API: https://$API_DOMAIN"
