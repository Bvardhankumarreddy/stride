#!/usr/bin/env bash
# ── Stride — Provision a new k3s cluster on an EC2 instance ───────────────────
#
# Usage:
#   ./provision-cluster.sh <ec2-ip> <path-to-pem>
#
# Example:
#   ./provision-cluster.sh 13.233.x.x ~/.ssh/my-key.pem
#
# What it does:
#   1. SSHs into the EC2 instance
#   2. Installs Docker, kubectl, k3s (Traefik disabled)
#   3. Installs Nginx Ingress + cert-manager
#   4. Copies kubeconfig back to your local machine as ~/.kube/stride.yaml
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

EC2_IP=${1:?"Usage: $0 <ec2-ip> <pem-file>"}
PEM=${2:?"Usage: $0 <ec2-ip> <pem-file>"}

SSH="ssh -i $PEM -o StrictHostKeyChecking=no ubuntu@$EC2_IP"

echo "━━━ Provisioning Stride cluster on $EC2_IP ━━━"

# ── 1. System deps ─────────────────────────────────────────────────────────────
echo "→ Installing system dependencies..."
$SSH "sudo apt-get update -q && sudo apt-get upgrade -y -q"

# ── 2. Docker ──────────────────────────────────────────────────────────────────
echo "→ Installing Docker..."
$SSH "curl -fsSL https://get.docker.com | sh && sudo usermod -aG docker ubuntu"

# ── 3. k3s ─────────────────────────────────────────────────────────────────────
echo "→ Installing k3s..."
# --tls-san includes the public IP so remote kubectl works without cert errors
$SSH "curl -sfL https://get.k3s.io | INSTALL_K3S_EXEC='--disable traefik --tls-san $EC2_IP' sh -"
$SSH "mkdir -p ~/.kube && sudo cp /etc/rancher/k3s/k3s.yaml ~/.kube/config && sudo chown ubuntu:ubuntu ~/.kube/config"

# ── 4. kubectl ────────────────────────────────────────────────────────────────
echo "→ Installing kubectl..."
$SSH "curl -sLO https://dl.k8s.io/release/\$(curl -Ls https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl && sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl && rm kubectl"

# ── 5. Nginx Ingress ──────────────────────────────────────────────────────────
echo "→ Installing Nginx Ingress Controller..."
$SSH "kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/baremetal/deploy.yaml"
$SSH "kubectl wait --namespace ingress-nginx --for=condition=ready pod --selector=app.kubernetes.io/component=controller --timeout=120s"

# Baremetal nginx-ingress uses hostPort on the controller pod (ports 80 + 443).
# No NodePort patch needed — k3s restricts NodePort range to 30000-32767.

# ── 6. cert-manager ───────────────────────────────────────────────────────────
echo "→ Installing cert-manager..."
$SSH "kubectl apply -f https://github.com/cert-manager/cert-manager/releases/latest/download/cert-manager.yaml"
$SSH "kubectl wait --namespace cert-manager --for=condition=ready pod --selector=app.kubernetes.io/instance=cert-manager --timeout=120s"

# ── 7. Copy kubeconfig locally ────────────────────────────────────────────────
echo "→ Copying kubeconfig to ~/.kube/stride.yaml..."
$SSH "cat ~/.kube/config" \
  | sed "s/127.0.0.1/$EC2_IP/g" \
  | sed "s/default/stride/g" \
  > ~/.kube/stride.yaml

chmod 600 ~/.kube/stride.yaml

echo ""
echo "✅ Cluster ready!"
echo ""
echo "Next steps:"
echo "  1. Point DNS:  stride.example.com → $EC2_IP"
echo "                 api.stride.example.com → $EC2_IP"
echo "  2. Copy secrets file:"
echo "     cp k8s/base/01-secrets.yaml.example k8s/base/01-secrets.yaml"
echo "     # Fill in real values"
echo "  3. Build and push images (see deploy.sh)"
echo "  4. Deploy:"
echo "     ./k8s/scripts/deploy.sh"
