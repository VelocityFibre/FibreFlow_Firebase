#!/bin/bash
# FibreFlow Deploy Script with jj integration

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Load token from .env.local file
if [ -f .env.local ]; then
    export $(grep FIREBASE_TOKEN .env.local | xargs)
fi

# Check if token is set
if [ -z "$FIREBASE_TOKEN" ]; then
    echo -e "${RED}Error: FIREBASE_TOKEN not found in .env.local${NC}"
    exit 1
fi

# Function to commit changes with jj
commit_changes() {
    local message="${1:-$(date +%Y-%m-%d) updates}"
    echo -e "${YELLOW}📝 Committing all changes with jj...${NC}"
    jj describe -m "$message"
    echo -e "${YELLOW}📤 Pushing to GitHub...${NC}"
    jj git push
}

# Function to deploy to preview channel
deploy_preview() {
    local channel_name=${1:-"preview"}
    local expires=${2:-"7d"}
    
    echo -e "${YELLOW}🔨 Building project...${NC}"
    npm run build
    
    echo -e "${YELLOW}🚀 Deploying to preview channel: $channel_name${NC}"
    firebase hosting:channel:deploy "$channel_name" --expires "$expires" --token "$FIREBASE_TOKEN"
}

# Function to deploy to production
deploy_prod() {
    echo -e "${YELLOW}🔨 Building project...${NC}"
    npm run build
    
    echo -e "${YELLOW}🚀 Deploying to production...${NC}"
    firebase deploy --only hosting --token "$FIREBASE_TOKEN"
}

# Function for quick deploy (commit + build + deploy)
quick_deploy() {
    local message="${1:-$(date +%Y-%m-%d) updates}"
    
    echo -e "${GREEN}🚀 FibreFlow Quick Deploy${NC}"
    echo "=========================="
    
    # Commit all changes first
    commit_changes "$message"
    
    # Deploy to production
    deploy_prod
    
    echo -e "${GREEN}✅ Deployment complete!${NC}"
    echo "=========================="
    echo -e "Message: $message"
    echo -e "Time: $(date)"
}

# Main script
case "$1" in
    "preview")
        commit_changes "Preview deployment"
        deploy_preview "$2" "$3"
        ;;
    "prod")
        commit_changes "Production deployment"
        deploy_prod
        ;;
    "commit")
        commit_changes "$2"
        ;;
    "quick"|"")
        # Default action - commit and deploy everything
        quick_deploy "$2"
        ;;
    "--help"|"-h")
        echo "Usage: ./deploy.sh [command] [options]"
        echo ""
        echo "Commands:"
        echo "  quick [message]     - Commit all changes and deploy to production (default)"
        echo "  preview [channel]   - Commit and deploy to preview channel"
        echo "  prod                - Commit and deploy to production"
        echo "  commit [message]    - Only commit changes with jj"
        echo ""
        echo "Examples:"
        echo "  ./deploy.sh                      # Quick deploy with timestamp"
        echo "  ./deploy.sh 'Added new feature' # Quick deploy with message"
        echo "  ./deploy.sh preview feature-xyz  # Preview deployment"
        echo "  ./deploy.sh commit 'WIP changes' # Just commit, no deploy"
        ;;
    *)
        # Treat unknown command as commit message for quick deploy
        quick_deploy "$1"
        ;;
esac