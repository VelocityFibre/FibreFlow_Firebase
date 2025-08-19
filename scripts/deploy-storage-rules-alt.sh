#!/bin/bash
# Alternative methods to deploy Firebase Storage rules

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}Alternative Firebase Storage Rules Deployment${NC}"
echo "=============================================="
echo ""

echo -e "${YELLOW}Method 1: User Authentication${NC}"
echo "Try logging in with a different account that has admin permissions:"
echo ""
echo "firebase login --reauth"
echo "firebase deploy --only storage"
echo ""

echo -e "${YELLOW}Method 2: Token-based Authentication${NC}"
echo "Use a Firebase token (if available):"
echo ""
echo "firebase login:ci  # Get a token"
echo "FIREBASE_TOKEN=<your-token> firebase deploy --only storage"
echo ""

echo -e "${YELLOW}Method 3: Manual Console Update (RECOMMENDED)${NC}"
echo "Update rules directly in Firebase Console:"
echo "1. Go to: https://console.firebase.google.com/project/fibreflow-73daf/storage/files"
echo "2. Click 'Rules' tab"
echo "3. Replace with the rules from storage.rules file"
echo "4. Click 'Publish'"
echo ""

echo -e "${GREEN}Current Status Check:${NC}"
echo "Checking current authentication status..."
firebase login:list 2>/dev/null || echo "No authenticated accounts found"
echo ""
echo "Current project:"
firebase use 2>/dev/null || echo "No project selected"
echo ""

echo -e "${YELLOW}If all else fails, the Manual Console method is the fastest solution.${NC}"