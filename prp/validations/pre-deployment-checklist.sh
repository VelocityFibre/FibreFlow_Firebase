#!/bin/bash

# Pre-Deployment Validation Script
# Run this before any deployment to ensure production readiness

echo "🚀 FibreFlow Pre-Deployment Validation"
echo "====================================="

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track validation results
ERRORS=0
WARNINGS=0

# Function to check command success
check_status() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ $1${NC}"
    else
        echo -e "${RED}✗ $1${NC}"
        ERRORS=$((ERRORS + 1))
    fi
}

# Function for warnings
warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
    WARNINGS=$((WARNINGS + 1))
}

echo ""
echo "1️⃣ Checking TypeScript Compilation..."
echo "-----------------------------------"
npx tsc --noEmit
check_status "TypeScript compilation"

echo ""
echo "2️⃣ Running Linting Checks..."
echo "-----------------------------------"
npm run lint
check_status "ESLint validation"

echo ""
echo "3️⃣ Checking for API Keys..."
echo "-----------------------------------"
if grep -r "sk-ant-api" . --exclude-dir=node_modules --exclude-dir=.git > /dev/null 2>&1; then
    echo -e "${RED}✗ Found API keys in code!${NC}"
    ERRORS=$((ERRORS + 1))
    grep -r "sk-ant-api" . --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist
else
    echo -e "${GREEN}✓ No API keys found in code${NC}"
fi

echo ""
echo "4️⃣ Verifying Build Process..."
echo "-----------------------------------"
npm run build
check_status "Angular build"

echo ""
echo "5️⃣ Checking Bundle Size..."
echo "-----------------------------------"
MAX_SIZE=5000000  # 5MB max
BUNDLE_SIZE=$(find dist -name "*.js" -exec du -b {} + | awk '{sum+=$1} END {print sum}')
if [ "$BUNDLE_SIZE" -gt "$MAX_SIZE" ]; then
    warning "Bundle size ($BUNDLE_SIZE bytes) exceeds recommended limit"
else
    echo -e "${GREEN}✓ Bundle size within limits ($BUNDLE_SIZE bytes)${NC}"
fi

echo ""
echo "6️⃣ Checking Git Status..."
echo "-----------------------------------"
if [[ -n $(git status -s) ]]; then
    warning "Uncommitted changes detected"
    git status -s
else
    echo -e "${GREEN}✓ Working directory clean${NC}"
fi

echo ""
echo "7️⃣ Testing Firebase Connection..."
echo "-----------------------------------"
firebase projects:list > /dev/null 2>&1
check_status "Firebase authentication"

echo ""
echo "8️⃣ Checking Environment Variables..."
echo "-----------------------------------"
if [ -f ".env.local" ]; then
    echo -e "${GREEN}✓ .env.local exists${NC}"
else
    warning ".env.local not found - ensure environment variables are set"
fi

echo ""
echo "9️⃣ Running Security Audit..."
echo "-----------------------------------"
npm audit --production
if [ $? -gt 0 ]; then
    warning "Security vulnerabilities found - review npm audit"
fi

echo ""
echo "🔟 Checking Service Worker..."
echo "-----------------------------------"
if [ -f "src/sw.js" ]; then
    echo -e "${GREEN}✓ Service worker found${NC}"
else
    warning "Service worker not found - PWA features may not work"
fi

echo ""
echo "====================================="
echo "VALIDATION SUMMARY"
echo "====================================="
echo -e "Errors: ${RED}$ERRORS${NC}"
echo -e "Warnings: ${YELLOW}$WARNINGS${NC}"

if [ $ERRORS -gt 0 ]; then
    echo ""
    echo -e "${RED}❌ VALIDATION FAILED - Fix errors before deployment${NC}"
    exit 1
elif [ $WARNINGS -gt 0 ]; then
    echo ""
    echo -e "${YELLOW}⚠️  VALIDATION PASSED WITH WARNINGS - Review before deployment${NC}"
    exit 0
else
    echo ""
    echo -e "${GREEN}✅ ALL VALIDATIONS PASSED - Ready for deployment${NC}"
    exit 0
fi