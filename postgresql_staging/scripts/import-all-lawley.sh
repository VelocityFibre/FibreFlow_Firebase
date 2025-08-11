#!/bin/bash

# Import all Lawley files chronologically
# This script processes files from oldest to newest to track status changes

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Get all Lawley files sorted by date
FILES=$(ls ~/Downloads/*Lawley*.xlsx | grep -E "[0-9]{13}_Lawley_[0-9]{8}\.xlsx" | sort)
TOTAL=$(echo "$FILES" | wc -l)
CURRENT=0

echo -e "${YELLOW}Starting import of $TOTAL Lawley files...${NC}"
echo ""

# Import each file
for file in $FILES; do
    CURRENT=$((CURRENT + 1))
    basename=$(basename "$file")
    echo -e "${BLUE}[$CURRENT/$TOTAL] Importing: $basename${NC}"
    
    # Run import
    if node scripts/import-excel-to-postgres.js "$file"; then
        echo -e "${GREEN}✓ Successfully imported $basename${NC}"
        
        # Optional: Add delay between imports to avoid overwhelming the system
        sleep 2
    else
        echo -e "${RED}✗ Failed to import $basename${NC}"
        echo "Continue with next file? (y/n)"
        read -r response
        if [[ "$response" != "y" ]]; then
            exit 1
        fi
    fi
    
    echo ""
done

echo -e "${GREEN}=== Import Complete ===${NC}"
echo ""

# Run validation
echo -e "${YELLOW}Running cross-database validation...${NC}"
node scripts/cross-validate-databases.js

echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "1. Review validation report in logs/"
echo "2. If validation passed: ./scripts/postgres-to-supabase-sync.sh push"
echo "3. If issues found: Review and fix before syncing"
