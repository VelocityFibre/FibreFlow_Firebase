#!/bin/bash
# Setup permanent Firebase authentication using service account

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}Firebase Service Account Setup${NC}"
echo "=============================="
echo ""

# Get the full path to service account
SERVICE_ACCOUNT_FULL_PATH="$(cd "$(dirname "$0")/.." && pwd)/fibreflow-service-account.json"

# Check if service account exists
if [ ! -f "$SERVICE_ACCOUNT_FULL_PATH" ]; then
    echo -e "${RED}Error: Service account not found at:${NC}"
    echo "$SERVICE_ACCOUNT_FULL_PATH"
    echo ""
    echo "Please ensure fibreflow-service-account.json exists in the project root"
    exit 1
fi

echo -e "${GREEN}✅ Service account found at:${NC}"
echo "$SERVICE_ACCOUNT_FULL_PATH"
echo ""

# Detect shell
if [ -n "$ZSH_VERSION" ]; then
    SHELL_RC="$HOME/.zshrc"
    SHELL_NAME="zsh"
elif [ -n "$BASH_VERSION" ]; then
    SHELL_RC="$HOME/.bashrc"
    SHELL_NAME="bash"
else
    echo -e "${YELLOW}Could not detect shell. Assuming bash.${NC}"
    SHELL_RC="$HOME/.bashrc"
    SHELL_NAME="bash"
fi

echo -e "${YELLOW}Adding to $SHELL_RC...${NC}"

# Check if already configured
if grep -q "GOOGLE_APPLICATION_CREDENTIALS.*fibreflow-service-account" "$SHELL_RC"; then
    echo -e "${YELLOW}Already configured in $SHELL_RC${NC}"
    echo "Updating path..."
    # Remove old entry
    sed -i '/GOOGLE_APPLICATION_CREDENTIALS.*fibreflow-service-account/d' "$SHELL_RC"
fi

# Add to shell RC file
cat >> "$SHELL_RC" << EOF

# Firebase Service Account Authentication (added by FibreFlow setup)
export GOOGLE_APPLICATION_CREDENTIALS="$SERVICE_ACCOUNT_FULL_PATH"
EOF

echo -e "${GREEN}✅ Added to $SHELL_RC${NC}"
echo ""

# Create convenient alias
echo -e "${YELLOW}Adding deployment alias...${NC}"

# Remove old alias if exists
sed -i '/alias firebase-deploy/d' "$SHELL_RC"

# Add new alias
cat >> "$SHELL_RC" << EOF
alias firebase-deploy="cd $SERVICE_ACCOUNT_FULL_PATH/.. && ./firebase-login/deploy-with-service-account.sh"
EOF

echo -e "${GREEN}✅ Setup complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Reload your shell configuration:"
echo "   ${GREEN}source $SHELL_RC${NC}"
echo ""
echo "2. Test the setup:"
echo "   ${GREEN}firebase projects:list${NC}"
echo ""
echo "3. Deploy your project:"
echo "   ${GREEN}firebase-deploy${NC}"
echo ""
echo "You can now use Firebase CLI without any login issues!"