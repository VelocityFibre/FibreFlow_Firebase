#!/bin/bash
# Script to help set up Firebase service account

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}Firebase Service Account Setup Guide${NC}"
echo "======================================"
echo ""
echo "The Firebase CLI deployment is failing because a service account is missing."
echo "Here's how to create one:"
echo ""
echo -e "${YELLOW}1. Go to Firebase Console:${NC}"
echo "   https://console.firebase.google.com/project/fibreflow-73daf/settings/serviceaccounts/adminsdk"
echo ""
echo -e "${YELLOW}2. Click 'Generate new private key'${NC}"
echo ""
echo -e "${YELLOW}3. Save the file as 'fibreflow-service-account.json' in project root${NC}"
echo "   $(pwd)/fibreflow-service-account.json"
echo ""
echo -e "${YELLOW}4. Run the setup script:${NC}"
echo "   ./firebase-login/setup-permanent-auth.sh"
echo ""
echo -e "${YELLOW}5. Test deployment:${NC}"
echo "   firebase deploy --only storage"
echo ""
echo -e "${RED}IMPORTANT:${NC} Make sure the service account file is in .gitignore!"
echo ""
echo -e "${GREEN}Alternative: Use Manual Console Update (Solution 1) for immediate fix${NC}"