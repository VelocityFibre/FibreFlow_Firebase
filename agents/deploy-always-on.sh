#!/bin/bash
set -e

echo "🚀 Deploying Always-On Neon+Gemini Agent to Google Cloud Run"
echo "============================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}❌ Google Cloud SDK not found. Please install it first.${NC}"
    echo "   Visit: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check if user is authenticated
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    echo -e "${YELLOW}🔐 Please authenticate with Google Cloud:${NC}"
    gcloud auth login
fi

# Set project (use FibreFlow's project)
PROJECT_ID="fibreflow-73daf"
gcloud config set project $PROJECT_ID
echo -e "${BLUE}📦 Using project: $PROJECT_ID${NC}"

echo -e "${BLUE}🔧 Building and deploying Always-On configuration...${NC}"

# Deploy using Cloud Build with enhanced configuration
gcloud builds submit --config cloudbuild.yaml .

# Get the service URL
SERVICE_URL=$(gcloud run services describe neon-agent --platform=managed --region=us-central1 --format="value(status.url)")

echo ""
echo -e "${GREEN}🎉 Always-On Deployment Complete!${NC}"
echo -e "${GREEN}📱 Service URL: $SERVICE_URL${NC}"
echo ""
echo -e "${BLUE}💡 Always-On Features:${NC}"
echo "   ✅ Min instances: 1 (always running)"
echo "   ✅ Connection pooling: 10 connections"
echo "   ✅ Keep-alive monitoring: 30s intervals"
echo "   ✅ Auto-healing: Health checks every 30s"
echo "   ✅ Resource allocation: 1GB RAM, 1 CPU"
echo "   ✅ Extended timeout: 15 minutes"
echo ""
echo -e "${BLUE}🔗 Test Endpoints:${NC}"
echo "   Health: $SERVICE_URL/health"
echo "   Detailed Health: $SERVICE_URL/health/detailed"
echo "   Database Info: $SERVICE_URL/database/info"
echo "   Query API: $SERVICE_URL/query (POST)"
echo ""
echo -e "${BLUE}🔧 Monitor Service:${NC}"
echo "   gcloud run services logs read neon-agent --region=us-central1 --follow"
echo ""
echo -e "${BLUE}🚨 Service Management:${NC}"
echo "   Update env vars: gcloud run services update neon-agent --region=us-central1 --set-env-vars=KEY=VALUE"
echo "   Scale manually: gcloud run services update neon-agent --region=us-central1 --min-instances=2"
echo "   View logs: gcloud logging tail 'resource.type=\"cloud_run_revision\"'"
echo ""

# Test the deployment
echo -e "${YELLOW}🧪 Testing deployment...${NC}"
sleep 5  # Give it time to start

if curl -f -s "$SERVICE_URL/health" > /dev/null; then
    echo -e "${GREEN}✅ Health check passed - service is running!${NC}"
    
    # Get detailed health info
    echo -e "${BLUE}🔍 Service status:${NC}"
    curl -s "$SERVICE_URL/health/detailed" | jq '.' 2>/dev/null || echo "Detailed health info available at /health/detailed"
else
    echo -e "${RED}⚠️ Health check failed - service may still be starting...${NC}"
    echo "   Try checking again in 30-60 seconds"
fi

echo ""
echo -e "${GREEN}🔗 Update Angular service to use: $SERVICE_URL${NC}"
echo -e "${YELLOW}💡 The service will stay warm with min-instances=1${NC}"
echo -e "${YELLOW}💡 Connection pooling handles concurrent requests efficiently${NC}"
echo -e "${YELLOW}💡 Keep-alive tasks ensure database connectivity${NC}"