#!/bin/bash
# Deploy script using service account authentication

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Path to service account (relative to project root)
SERVICE_ACCOUNT_PATH="./fibreflow-service-account.json"

# Check if service account exists
if [ ! -f "$SERVICE_ACCOUNT_PATH" ]; then
    echo -e "${RED}Error: Service account file not found at $SERVICE_ACCOUNT_PATH${NC}"
    echo "Please ensure fibreflow-service-account.json exists in the project root"
    exit 1
fi

# Export the service account for Firebase to use
export GOOGLE_APPLICATION_CREDENTIALS="$SERVICE_ACCOUNT_PATH"

echo -e "${GREEN}🔐 Using service account for authentication${NC}"
echo -e "Service account: $SERVICE_ACCOUNT_PATH"
echo ""

# Function to build the project
build_project() {
    echo -e "${YELLOW}🔨 Building project...${NC}"
    npm run build
    if [ $? -ne 0 ]; then
        echo -e "${RED}Build failed!${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ Build successful${NC}"
}

# Function to deploy to production
deploy_production() {
    echo -e "${YELLOW}🚀 Deploying to production...${NC}"
    firebase deploy --only hosting
    if [ $? -ne 0 ]; then
        echo -e "${RED}Deployment failed!${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ Deployment successful!${NC}"
    echo -e "${GREEN}🌐 Live at: https://fibreflow-73daf.web.app${NC}"
}

# Function to deploy everything (hosting, functions, rules)
deploy_all() {
    echo -e "${YELLOW}🚀 Deploying all services...${NC}"
    firebase deploy
    if [ $? -ne 0 ]; then
        echo -e "${RED}Deployment failed!${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ Full deployment successful!${NC}"
}

# Function to deploy to preview channel
deploy_preview() {
    local channel_name=${1:-"preview"}
    local expires=${2:-"7d"}
    
    echo -e "${YELLOW}🚀 Deploying to preview channel: $channel_name${NC}"
    firebase hosting:channel:deploy "$channel_name" --expires "$expires"
    if [ $? -ne 0 ]; then
        echo -e "${RED}Preview deployment failed!${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ Preview deployment successful!${NC}"
}

# Main script logic
case "$1" in
    "build")
        build_project
        ;;
    "preview")
        build_project
        deploy_preview "$2" "$3"
        ;;
    "all")
        build_project
        deploy_all
        ;;
    "hosting"|"")
        # Default: build and deploy hosting only
        build_project
        deploy_production
        ;;
    "--help"|"-h")
        echo "Firebase Deploy Script (Using Service Account)"
        echo "============================================="
        echo ""
        echo "Usage: ./firebase-login/deploy-with-service-account.sh [command] [options]"
        echo ""
        echo "Commands:"
        echo "  hosting    - Build and deploy hosting only (default)"
        echo "  all        - Deploy everything (hosting, functions, rules)"
        echo "  preview    - Deploy to preview channel"
        echo "  build      - Build only, no deployment"
        echo ""
        echo "Examples:"
        echo "  ./firebase-login/deploy-with-service-account.sh"
        echo "  ./firebase-login/deploy-with-service-account.sh all"
        echo "  ./firebase-login/deploy-with-service-account.sh preview feature-xyz 7d"
        echo ""
        echo "Note: Uses service account at: $SERVICE_ACCOUNT_PATH"
        ;;
    *)
        echo -e "${RED}Unknown command: $1${NC}"
        echo "Use --help for usage information"
        exit 1
        ;;
esac