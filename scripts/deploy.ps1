# PowerShell deployment script for Windows
# DBaaS Platform Deployment Script

param(
    [string]$Action = "deploy"
)

# Configuration
$NAMESPACE_SYSTEM = "dbaas-system"
$NAMESPACE_DATABASES = "dbaas-databases"
$NAMESPACE_MONITORING = "dbaas-monitoring"
$HELM_RELEASE_NAME = "dbaas-platform"

# Functions
function Write-Log {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Blue
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARN] $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
    exit 1
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor Green
}

function Test-Prerequisites {
    Write-Log "Checking prerequisites..."
    
    # Check if kubectl is installed
    try {
        kubectl version --client | Out-Null
    }
    catch {
        Write-Error "kubectl is not installed. Please install kubectl first."
    }
    
    # Check if helm is installed
    try {
        helm version --short | Out-Null
    }
    catch {
        Write-Error "helm is not installed. Please install Helm first."
    }
    
    # Check if we can connect to Kubernetes cluster
    try {
        kubectl cluster-info | Out-Null
    }
    catch {
        Write-Error "Cannot connect to Kubernetes cluster. Please check your kubeconfig."
    }
    
    Write-Success "Prerequisites check passed!"
}

function New-Namespaces {
    Write-Log "Creating namespaces..."
    
    kubectl apply -f k8s/base.yaml
    
    Write-Success "Namespaces created!"
}

function Deploy-PostgreSQL {
    Write-Log "Deploying PostgreSQL..."
    
    kubectl apply -f k8s/postgresql.yaml
    
    Write-Log "Waiting for PostgreSQL to be ready..."
    kubectl wait --for=condition=ready pod -l app=postgresql -n $NAMESPACE_SYSTEM --timeout=300s
    
    Write-Success "PostgreSQL deployed successfully!"
}

function Deploy-Redis {
    Write-Log "Deploying Redis..."
    
    kubectl apply -f k8s/redis.yaml
    
    Write-Log "Waiting for Redis to be ready..."
    kubectl wait --for=condition=ready pod -l app=redis -n $NAMESPACE_SYSTEM --timeout=300s
    
    Write-Success "Redis deployed successfully!"
}

function Deploy-Backend {
    Write-Log "Deploying backend API..."
    
    kubectl apply -f k8s/backend.yaml
    
    Write-Log "Waiting for backend to be ready..."
    kubectl wait --for=condition=available deployment/dbaas-backend -n $NAMESPACE_SYSTEM --timeout=300s
    
    Write-Success "Backend API deployed successfully!"
}

function Deploy-Frontend {
    Write-Log "Deploying frontend..."
    
    kubectl apply -f k8s/frontend.yaml
    
    Write-Log "Waiting for frontend to be ready..."
    kubectl wait --for=condition=available deployment/dbaas-frontend -n $NAMESPACE_SYSTEM --timeout=300s
    
    Write-Success "Frontend deployed successfully!"
}

function Deploy-Monitoring {
    Write-Log "Deploying monitoring stack..."
    
    kubectl apply -f monitoring/prometheus.yaml
    kubectl apply -f monitoring/grafana.yaml
    
    Write-Log "Waiting for monitoring components to be ready..."
    kubectl wait --for=condition=available deployment/prometheus -n $NAMESPACE_MONITORING --timeout=300s
    kubectl wait --for=condition=available deployment/grafana -n $NAMESPACE_MONITORING --timeout=300s
    
    Write-Success "Monitoring stack deployed successfully!"
}

function Get-AccessInfo {
    Write-Log "Getting access information..."
    
    Write-Host ""
    Write-Host "=== Access Information ===" -ForegroundColor Cyan
    Write-Host ""
    
    # Get ingress IP
    try {
        $IngressIP = kubectl get ingress dbaas-ingress -n $NAMESPACE_SYSTEM -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>$null
    }
    catch {
        $IngressIP = "Pending..."
    }
    
    if ($IngressIP -and $IngressIP -ne "Pending...") {
        Write-Host "🌐 DBaaS Platform: http://$IngressIP" -ForegroundColor White
        Write-Host "📊 Grafana: http://$IngressIP/grafana (admin/grafanaadmin)" -ForegroundColor White
    }
    else {
        Write-Host "🌐 DBaaS Platform: kubectl port-forward -n $NAMESPACE_SYSTEM svc/dbaas-frontend 8080:80" -ForegroundColor White
        Write-Host "🔧 Backend API: kubectl port-forward -n $NAMESPACE_SYSTEM svc/dbaas-backend 3000:3000" -ForegroundColor White
        Write-Host "📊 Grafana: kubectl port-forward -n $NAMESPACE_MONITORING svc/grafana 3001:3000" -ForegroundColor White
        Write-Host "📈 Prometheus: kubectl port-forward -n $NAMESPACE_MONITORING svc/prometheus 9090:9090" -ForegroundColor White
    }
    
    Write-Host ""
    Write-Host "=== Default Credentials ===" -ForegroundColor Cyan
    Write-Host "📧 Email: demo@dbaas.local" -ForegroundColor White
    Write-Host "🔑 Password: demo123" -ForegroundColor White
    Write-Host ""
    
    Write-Host "=== Useful Commands ===" -ForegroundColor Cyan
    Write-Host "📋 View pods: kubectl get pods -n $NAMESPACE_SYSTEM" -ForegroundColor White
    Write-Host "📋 View services: kubectl get svc -n $NAMESPACE_SYSTEM" -ForegroundColor White
    Write-Host "📋 View logs: kubectl logs -f deployment/dbaas-backend -n $NAMESPACE_SYSTEM" -ForegroundColor White
    Write-Host ""
}

function Remove-Platform {
    Write-Warning "Cleaning up resources..."
    
    kubectl delete -f k8s/ --ignore-not-found=true
    kubectl delete -f monitoring/ --ignore-not-found=true
    
    Write-Success "Cleanup completed!"
}

function Deploy-WithHelm {
    Write-Log "Deploying with Helm..."
    
    # Add required repositories
    helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
    helm repo add grafana https://grafana.github.io/helm-charts
    helm repo update
    
    # Deploy the platform
    helm upgrade --install $HELM_RELEASE_NAME .\helm\dbaas-platform `
        --namespace $NAMESPACE_SYSTEM `
        --create-namespace `
        --wait `
        --timeout 10m
    
    Write-Success "Platform deployed with Helm!"
}

# Main execution
switch ($Action.ToLower()) {
    "deploy" {
        Write-Log "Starting DBaaS Platform deployment..."
        Test-Prerequisites
        New-Namespaces
        Deploy-PostgreSQL
        Deploy-Redis
        Deploy-Backend
        Deploy-Frontend
        Deploy-Monitoring
        Get-AccessInfo
        Write-Success "🎉 DBaaS Platform deployed successfully!"
    }
    "helm" {
        Write-Log "Starting Helm deployment..."
        Test-Prerequisites
        Deploy-WithHelm
        Get-AccessInfo
        Write-Success "🎉 DBaaS Platform deployed with Helm!"
    }
    "cleanup" {
        Remove-Platform
    }
    "info" {
        Get-AccessInfo
    }
    default {
        Write-Host "Usage: .\deploy.ps1 [-Action <deploy|helm|cleanup|info>]" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Commands:" -ForegroundColor Cyan
        Write-Host "  deploy  - Deploy using raw Kubernetes manifests" -ForegroundColor White
        Write-Host "  helm    - Deploy using Helm chart" -ForegroundColor White
        Write-Host "  cleanup - Remove all deployed resources" -ForegroundColor White
        Write-Host "  info    - Show access information" -ForegroundColor White
        exit 1
    }
}
