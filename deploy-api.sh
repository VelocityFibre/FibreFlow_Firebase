#!/bin/bash
# Deploy API Functions using service account

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Set service account
export GOOGLE_APPLICATION_CREDENTIALS="./fibreflow-service-account.json"

echo -e "${GREEN}🔐 Using service account for authentication${NC}"
echo -e "${YELLOW}🚀 Deploying API Functions...${NC}"

# Deploy specific functions
if [ "$1" == "all" ]; then
    echo "Deploying all API functions..."
    firebase deploy --only functions:neonReadAPI,functions:stagingAPI,functions:processValidationQueue,functions:moveApprovedToProduction
else
    echo "Deploying neonReadAPI..."
    firebase deploy --only functions:neonReadAPI
fi

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Deployment successful!${NC}"
    echo ""
    echo -e "${GREEN}API Endpoints:${NC}"
    echo "Read-Only API: https://us-central1-fibreflow-73daf.cloudfunctions.net/neonReadAPI"
    echo ""
    echo -e "${GREEN}Test with:${NC}"
    echo 'curl https://us-central1-fibreflow-73daf.cloudfunctions.net/neonReadAPI/health -H "X-API-Key: dev-api-key-12345"'
else
    echo -e "${RED}❌ Deployment failed!${NC}"
    exit 1
fi