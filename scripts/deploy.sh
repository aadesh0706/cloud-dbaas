#!/bin/bash

# DBaaS Platform Deployment Script
# This script deploys the complete DBaaS platform to Kubernetes

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
NAMESPACE_SYSTEM="dbaas-system"
NAMESPACE_DATABASES="dbaas-databases"
NAMESPACE_MONITORING="dbaas-monitoring"
HELM_RELEASE_NAME="dbaas-platform"

# Functions
log() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check if kubectl is installed
    if ! command -v kubectl &> /dev/null; then
        error "kubectl is not installed. Please install kubectl first."
    fi
    
    # Check if helm is installed
    if ! command -v helm &> /dev/null; then
        error "helm is not installed. Please install Helm first."
    fi
    
    # Check if we can connect to Kubernetes cluster
    if ! kubectl cluster-info &> /dev/null; then
        error "Cannot connect to Kubernetes cluster. Please check your kubeconfig."
    fi
    
    success "Prerequisites check passed!"
}

create_namespaces() {
    log "Creating namespaces..."
    
    kubectl apply -f k8s/base.yaml
    
    success "Namespaces created!"
}

deploy_storage() {
    log "Setting up storage classes..."
    
    # Apply storage classes from base.yaml (already applied above)
    
    success "Storage classes configured!"
}

deploy_postgresql() {
    log "Deploying PostgreSQL..."
    
    kubectl apply -f k8s/postgresql.yaml
    
    log "Waiting for PostgreSQL to be ready..."
    kubectl wait --for=condition=ready pod -l app=postgresql -n $NAMESPACE_SYSTEM --timeout=300s
    
    success "PostgreSQL deployed successfully!"
}

deploy_redis() {
    log "Deploying Redis..."
    
    kubectl apply -f k8s/redis.yaml
    
    log "Waiting for Redis to be ready..."
    kubectl wait --for=condition=ready pod -l app=redis -n $NAMESPACE_SYSTEM --timeout=300s
    
    success "Redis deployed successfully!"
}

deploy_backend() {
    log "Deploying backend API..."
    
    kubectl apply -f k8s/backend.yaml
    
    log "Waiting for backend to be ready..."
    kubectl wait --for=condition=available deployment/dbaas-backend -n $NAMESPACE_SYSTEM --timeout=300s
    
    success "Backend API deployed successfully!"
}

deploy_frontend() {
    log "Deploying frontend..."
    
    kubectl apply -f k8s/frontend.yaml
    
    log "Waiting for frontend to be ready..."
    kubectl wait --for=condition=available deployment/dbaas-frontend -n $NAMESPACE_SYSTEM --timeout=300s
    
    success "Frontend deployed successfully!"
}

deploy_monitoring() {
    log "Deploying monitoring stack..."
    
    kubectl apply -f monitoring/prometheus.yaml
    kubectl apply -f monitoring/grafana.yaml
    
    log "Waiting for monitoring components to be ready..."
    kubectl wait --for=condition=available deployment/prometheus -n $NAMESPACE_MONITORING --timeout=300s
    kubectl wait --for=condition=available deployment/grafana -n $NAMESPACE_MONITORING --timeout=300s
    
    success "Monitoring stack deployed successfully!"
}

get_access_info() {
    log "Getting access information..."
    
    echo ""
    echo "=== Access Information ==="
    echo ""
    
    # Get ingress IP
    INGRESS_IP=$(kubectl get ingress dbaas-ingress -n $NAMESPACE_SYSTEM -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "Pending...")
    
    if [ "$INGRESS_IP" != "Pending..." ] && [ -n "$INGRESS_IP" ]; then
        echo "🌐 DBaaS Platform: http://$INGRESS_IP"
        echo "📊 Grafana: http://$INGRESS_IP/grafana (admin/grafanaadmin)"
    else
        echo "🌐 DBaaS Platform: kubectl port-forward -n $NAMESPACE_SYSTEM svc/dbaas-frontend 8080:80"
        echo "🔧 Backend API: kubectl port-forward -n $NAMESPACE_SYSTEM svc/dbaas-backend 3000:3000"
        echo "📊 Grafana: kubectl port-forward -n $NAMESPACE_MONITORING svc/grafana 3001:3000"
        echo "📈 Prometheus: kubectl port-forward -n $NAMESPACE_MONITORING svc/prometheus 9090:9090"
    fi
    
    echo ""
    echo "=== Default Credentials ==="
    echo "📧 Email: demo@dbaas.local"
    echo "🔑 Password: demo123"
    echo ""
    
    echo "=== Useful Commands ==="
    echo "📋 View pods: kubectl get pods -n $NAMESPACE_SYSTEM"
    echo "📋 View services: kubectl get svc -n $NAMESPACE_SYSTEM"
    echo "📋 View logs: kubectl logs -f deployment/dbaas-backend -n $NAMESPACE_SYSTEM"
    echo ""
}

cleanup() {
    warn "Cleaning up resources..."
    
    kubectl delete -f k8s/ --ignore-not-found=true
    kubectl delete -f monitoring/ --ignore-not-found=true
    
    success "Cleanup completed!"
}

deploy_with_helm() {
    log "Deploying with Helm..."
    
    # Add required repositories
    helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
    helm repo add grafana https://grafana.github.io/helm-charts
    helm repo update
    
    # Deploy the platform
    helm upgrade --install $HELM_RELEASE_NAME ./helm/dbaas-platform \
        --namespace $NAMESPACE_SYSTEM \
        --create-namespace \
        --wait \
        --timeout 10m
    
    success "Platform deployed with Helm!"
}

# Main execution
main() {
    case "${1:-deploy}" in
        "deploy")
            log "Starting DBaaS Platform deployment..."
            check_prerequisites
            create_namespaces
            deploy_storage
            deploy_postgresql
            deploy_redis
            deploy_backend
            deploy_frontend
            deploy_monitoring
            get_access_info
            success "🎉 DBaaS Platform deployed successfully!"
            ;;
        "helm")
            log "Starting Helm deployment..."
            check_prerequisites
            deploy_with_helm
            get_access_info
            success "🎉 DBaaS Platform deployed with Helm!"
            ;;
        "cleanup")
            cleanup
            ;;
        "info")
            get_access_info
            ;;
        *)
            echo "Usage: $0 {deploy|helm|cleanup|info}"
            echo ""
            echo "Commands:"
            echo "  deploy  - Deploy using raw Kubernetes manifests"
            echo "  helm    - Deploy using Helm chart"
            echo "  cleanup - Remove all deployed resources"
            echo "  info    - Show access information"
            exit 1
            ;;
    esac
}

main "$@"
