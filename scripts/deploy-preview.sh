#!/bin/bash

# Deploy to Preview Site Script
# This deploys to a separate preview URL without affecting production

echo "🚀 Starting preview deployment..."

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if we're in production directory
if [[ "$PWD" == *"/FibreFlow"* ]] && [[ "$PWD" != *"/FibreFlow-"* ]]; then
    echo -e "${RED}⚠️  WARNING: You're in the production directory!${NC}"
    echo "For safety, please use a worktree for preview deployments:"
    echo ""
    echo "  git worktree add ../FibreFlow-Preview"
    echo "  cd ../FibreFlow-Preview"
    echo "  ./scripts/deploy-preview.sh"
    echo ""
    read -p "Do you still want to continue? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Build the application
echo -e "${BLUE}📦 Building application...${NC}"
npm run build

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Build failed!${NC}"
    exit 1
fi

# Deploy to preview site
echo -e "${BLUE}🌐 Deploying to preview site...${NC}"

# First, you need to add the preview site in Firebase Console
# Then use this command:
firebase hosting:channel:deploy preview --expires 30d

# Alternative: If you've set up a separate preview site
# firebase deploy --only hosting:preview

echo -e "${GREEN}✅ Preview deployment complete!${NC}"
echo ""
echo "Preview URL: https://fibreflow-73daf--preview-{hash}.web.app"
echo "This preview will expire in 30 days"
echo ""
echo "To deploy to production, use: npm run deploy"