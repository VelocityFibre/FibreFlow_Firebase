#!/bin/bash

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_ID="fibreflow-73daf"
SERVICE_NAME="neon-agent"
REGION="us-central1"

echo -e "${BLUE}🔍 FibreFlow Neon+Gemini Agent Monitoring${NC}"
echo "=========================================="

# Get service URL
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --platform=managed --region=$REGION --format="value(status.url)" 2>/dev/null)

if [ -z "$SERVICE_URL" ]; then
    echo -e "${RED}❌ Service not found or not deployed${NC}"
    exit 1
fi

echo -e "${BLUE}🌐 Service URL: $SERVICE_URL${NC}"
echo ""

# Function to make API call and parse response
check_endpoint() {
    local endpoint=$1
    local description=$2
    
    echo -e "${YELLOW}🧪 Testing $description...${NC}"
    
    response=$(curl -s -w "\n%{http_code}" "$SERVICE_URL$endpoint" 2>/dev/null)
    http_code=$(echo "$response" | tail -n1)
    response_body=$(echo "$response" | head -n -1)
    
    if [ "$http_code" = "200" ]; then
        echo -e "${GREEN}✅ $description - OK (200)${NC}"
        if command -v jq &> /dev/null && echo "$response_body" | jq empty 2>/dev/null; then
            echo "$response_body" | jq '.'
        else
            echo "$response_body"
        fi
    else
        echo -e "${RED}❌ $description - Failed ($http_code)${NC}"
        echo "$response_body"
    fi
    echo ""
}

# Test endpoints
check_endpoint "/health" "Basic Health Check"
check_endpoint "/health/detailed" "Detailed Health Check"
check_endpoint "/database/info" "Database Information"

# Test a simple query
echo -e "${YELLOW}🧪 Testing Query Endpoint...${NC}"
query_response=$(curl -s -X POST "$SERVICE_URL/query" \
    -H "Content-Type: application/json" \
    -d '{
        "question": "How many records are in the database?",
        "user_id": "monitor-test",
        "include_sql": true
    }' 2>/dev/null)

if echo "$query_response" | jq -e '.success == true' >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Query Endpoint - OK${NC}"
    echo "$query_response" | jq '.'
elif echo "$query_response" | jq empty 2>/dev/null; then
    echo -e "${YELLOW}⚠️ Query Endpoint - Response received but not successful${NC}"
    echo "$query_response" | jq '.'
else
    echo -e "${RED}❌ Query Endpoint - Failed or invalid response${NC}"
    echo "$query_response"
fi

echo ""

# Cloud Run service info
echo -e "${BLUE}☁️ Cloud Run Service Information:${NC}"
gcloud run services describe $SERVICE_NAME --platform=managed --region=$REGION --format="table(
    status.url:label='URL',
    status.conditions[0].type:label='READY',
    status.conditions[0].status:label='STATUS',
    spec.template.spec.containers[0].resources.limits:label='RESOURCES'
)" 2>/dev/null

echo ""
echo -e "${BLUE}📊 Recent Service Metrics:${NC}"
echo "View in console: https://console.cloud.google.com/run/detail/$REGION/$SERVICE_NAME/metrics?project=$PROJECT_ID"

echo ""
echo -e "${BLUE}📋 Quick Commands:${NC}"
echo "  View logs: gcloud run services logs tail $SERVICE_NAME --region=$REGION"
echo "  Update service: gcloud run services update $SERVICE_NAME --region=$REGION"
echo "  Delete service: gcloud run services delete $SERVICE_NAME --region=$REGION"