#!/bin/bash

# FibreFlow Worktree Setup Script
# This script sets up all worktrees with necessary dependencies

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== FibreFlow Worktree Setup ===${NC}"
echo ""

# Base directory
BASE_DIR="/home/ldp/VF/Apps"

# Array of worktrees to set up
declare -A WORKTREES=(
    ["FibreFlow"]="Main Production"
    ["FibreFlow-BOQ"]="BOQ Management"
    ["FibreFlow-RFQ"]="RFQ System"
    ["FibreFlow-Reports"]="Analytics Reports"
    ["FibreFlow-Perf"]="Performance Fixes"
    ["FibreFlow-Hotfix"]="Production Hotfixes"
)

# Function to setup a worktree
setup_worktree() {
    local dir=$1
    local desc=$2
    
    echo -e "${YELLOW}Setting up: $desc ($dir)${NC}"
    
    if [ ! -d "$BASE_DIR/$dir" ]; then
        echo -e "${RED}  ✗ Directory not found: $BASE_DIR/$dir${NC}"
        echo -e "${RED}    Skipping...${NC}"
        return 1
    fi
    
    cd "$BASE_DIR/$dir"
    
    # Check if node_modules exists
    if [ -d "node_modules" ]; then
        echo -e "${GREEN}  ✓ Dependencies already installed${NC}"
    else
        echo -e "${BLUE}  → Installing dependencies...${NC}"
        npm install --legacy-peer-deps
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}  ✓ Dependencies installed successfully${NC}"
        else
            echo -e "${RED}  ✗ Failed to install dependencies${NC}"
            return 1
        fi
    fi
    
    # Copy deployment script if it doesn't exist
    if [ ! -f "deploy-worktree.sh" ] && [ -f "$BASE_DIR/FibreFlow/deploy-worktree.sh" ]; then
        cp "$BASE_DIR/FibreFlow/deploy-worktree.sh" .
        chmod +x deploy-worktree.sh
        echo -e "${GREEN}  ✓ Deployment script copied${NC}"
    fi
    
    # Copy firebase multisite config if needed
    if [ ! -f "firebase-multisite.json" ] && [ -f "$BASE_DIR/FibreFlow/firebase-multisite.json" ]; then
        cp "$BASE_DIR/FibreFlow/firebase-multisite.json" .
        echo -e "${GREEN}  ✓ Firebase config copied${NC}"
    fi
    
    echo ""
}

# Check current worktrees
echo -e "${BLUE}Current Git Worktrees:${NC}"
cd "$BASE_DIR/FibreFlow"
git worktree list
echo ""

# Setup each worktree
for worktree in "${!WORKTREES[@]}"; do
    setup_worktree "$worktree" "${WORKTREES[$worktree]}"
done

# Summary
echo -e "${BLUE}=== Setup Complete ===${NC}"
echo ""
echo -e "${GREEN}Quick Commands:${NC}"
echo "  Check worktrees:    git worktree list"
echo "  Deploy to BOQ:      npm run deploy:boq"
echo "  Deploy to RFQ:      npm run deploy:rfq"
echo "  Deploy to Hotfix:   npm run deploy:hotfix"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Create Firebase hosting sites (see FIREBASE_SETUP.md)"
echo "2. Start working in any worktree:"
echo "   cd $BASE_DIR/FibreFlow-BOQ"
echo "   claude-code \"Continue BOQ development\""
echo ""
echo -e "${RED}Remember:${NC} Each worktree is independent - changes in one don't affect others!"