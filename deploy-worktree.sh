#!/bin/bash

# FibreFlow Worktree Deployment Script
# Usage: ./deploy-worktree.sh [target]

# Color codes for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if target is provided
if [ -z "$1" ]; then
    echo -e "${RED}Error: No deployment target specified${NC}"
    echo "Usage: ./deploy-worktree.sh [target]"
    echo ""
    echo "Available targets:"
    echo "  main    - Production (fibreflow-73daf.web.app)"
    echo "  boq     - BOQ features (fibreflow-boq.web.app)"
    echo "  rfq     - RFQ system (fibreflow-rfq.web.app)"
    echo "  tasks   - Task management (fibreflow-tasks.web.app)"
    echo "  reports - Analytics/Reports (fibreflow-reports.web.app)"
    echo "  hotfix  - Emergency fixes (fibreflow-hotfix.web.app)"
    echo "  perf    - Performance fixes (fibreflow-perf.web.app)"
    exit 1
fi

TARGET=$1

# Map targets to worktree directories
case $TARGET in
    "main")
        WORKTREE_DIR="/home/ldp/VF/Apps/FibreFlow"
        ;;
    "boq")
        WORKTREE_DIR="/home/ldp/VF/Apps/FibreFlow-BOQ"
        ;;
    "rfq")
        WORKTREE_DIR="/home/ldp/VF/Apps/FibreFlow-RFQ"
        ;;
    "tasks")
        WORKTREE_DIR="/home/ldp/VF/Apps/FibreFlow-Tasks"
        ;;
    "reports")
        WORKTREE_DIR="/home/ldp/VF/Apps/FibreFlow-Reports"
        ;;
    "hotfix")
        WORKTREE_DIR="/home/ldp/VF/Apps/FibreFlow-Hotfix"
        ;;
    "perf")
        WORKTREE_DIR="/home/ldp/VF/Apps/FibreFlow-Perf"
        ;;
    *)
        echo -e "${RED}Error: Unknown target '$TARGET'${NC}"
        exit 1
        ;;
esac

# Check if worktree directory exists
if [ ! -d "$WORKTREE_DIR" ]; then
    echo -e "${RED}Error: Worktree directory not found: $WORKTREE_DIR${NC}"
    echo "Create the worktree first with: git worktree add $WORKTREE_DIR"
    exit 1
fi

# Navigate to worktree directory
cd "$WORKTREE_DIR"

echo -e "${YELLOW}Deploying from: $WORKTREE_DIR${NC}"
echo -e "${YELLOW}Target: $TARGET${NC}"

# Check if we need to use the multisite config
if [ "$TARGET" != "main" ]; then
    # Copy multisite config to current worktree
    cp /home/ldp/VF/Apps/FibreFlow/firebase-multisite.json ./firebase.json
    echo -e "${GREEN}Using multisite Firebase configuration${NC}"
fi

# Build the project
echo -e "${YELLOW}Building production bundle...${NC}"
npm run build:prod

if [ $? -ne 0 ]; then
    echo -e "${RED}Build failed!${NC}"
    exit 1
fi

# Deploy to Firebase
echo -e "${YELLOW}Deploying to Firebase hosting:$TARGET...${NC}"
firebase deploy --only hosting:$TARGET

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Deployment successful!${NC}"
    
    # Show the deployed URL
    case $TARGET in
        "main")
            echo -e "${GREEN}Live at: https://fibreflow-73daf.web.app${NC}"
            ;;
        *)
            echo -e "${GREEN}Preview at: https://fibreflow-$TARGET.web.app${NC}"
            ;;
    esac
else
    echo -e "${RED}Deployment failed!${NC}"
    exit 1
fi

# Restore original firebase.json if we modified it
if [ "$TARGET" != "main" ]; then
    git checkout firebase.json 2>/dev/null || true
fi