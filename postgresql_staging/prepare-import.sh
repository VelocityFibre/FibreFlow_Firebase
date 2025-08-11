#!/bin/bash

# Preparation script for importing Lawley data files
# Run this after PostgreSQL is installed

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=== FibreFlow PostgreSQL Import Preparation ===${NC}"
echo ""

# List available Lawley files
echo -e "${YELLOW}📁 Available Lawley data files:${NC}"
ls -1 ~/Downloads/*Lawley*.xlsx | grep -E "[0-9]{13}_Lawley_[0-9]{8}\.xlsx" | sort | while read file; do
    size=$(du -h "$file" | cut -f1)
    basename=$(basename "$file")
    date=$(echo "$basename" | grep -oE "[0-9]{8}" | sed 's/\([0-9]\{2\}\)\([0-9]\{2\}\)\([0-9]\{4\}\)/\3-\2-\1/')
    echo "  ✓ $basename ($size) - Date: $date"
done

echo ""
echo -e "${YELLOW}📋 Import Strategy:${NC}"
echo "1. Import files chronologically (oldest to newest)"
echo "2. Track status changes between imports"
echo "3. Validate data integrity after each import"
echo "4. Cross-check with SQLite/DuckDB"
echo ""

# Create import batch script
cat > scripts/import-all-lawley.sh << 'EOF'
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
EOF

chmod +x scripts/import-all-lawley.sh

echo -e "${GREEN}✓ Created import script: scripts/import-all-lawley.sh${NC}"
echo ""

# Create single file import helper
cat > scripts/import-latest-lawley.sh << 'EOF'
#!/bin/bash

# Import only the latest Lawley file

LATEST=$(ls ~/Downloads/*Lawley*.xlsx | grep -E "[0-9]{13}_Lawley_[0-9]{8}\.xlsx" | sort | tail -1)

if [ -z "$LATEST" ]; then
    echo "No Lawley files found!"
    exit 1
fi

echo "Importing latest file: $(basename "$LATEST")"
node scripts/import-excel-to-postgres.js "$LATEST"
EOF

chmod +x scripts/import-latest-lawley.sh

echo -e "${GREEN}✓ Created helper script: scripts/import-latest-lawley.sh${NC}"
echo ""

# Show next steps
echo -e "${BLUE}=== Next Steps ===${NC}"
echo ""
echo "1. Install PostgreSQL:"
echo "   ${YELLOW}sudo pacman -S postgresql${NC}"
echo ""
echo "2. Initialize PostgreSQL:"
echo "   ${YELLOW}sudo -u postgres initdb -D /var/lib/postgres/data${NC}"
echo "   ${YELLOW}sudo systemctl start postgresql${NC}"
echo "   ${YELLOW}sudo systemctl enable postgresql${NC}"
echo ""
echo "3. Run setup:"
echo "   ${YELLOW}./scripts/setup-postgres.sh${NC}"
echo ""
echo "4. Import all files:"
echo "   ${YELLOW}./scripts/import-all-lawley.sh${NC}"
echo ""
echo "   Or import just the latest:"
echo "   ${YELLOW}./scripts/import-latest-lawley.sh${NC}"
echo ""
echo "5. Validate data:"
echo "   ${YELLOW}node scripts/cross-validate-databases.js${NC}"
echo ""
echo "6. Sync to Supabase:"
echo "   ${YELLOW}./scripts/postgres-to-supabase-sync.sh push${NC}"