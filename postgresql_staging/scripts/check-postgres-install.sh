#!/bin/bash

# PostgreSQL Installation Checker
# Run this after installing PostgreSQL to verify everything is ready

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}=== PostgreSQL Installation Check ===${NC}"
echo ""

# Check if psql is installed
echo -n "Checking for psql command... "
if command -v psql &> /dev/null; then
    echo -e "${GREEN}✓ Found$(NC)"
    psql --version
else
    echo -e "${RED}✗ Not found${NC}"
    echo "Please install PostgreSQL first: sudo pacman -S postgresql"
    exit 1
fi

# Check if pg_dump is installed
echo -n "Checking for pg_dump command... "
if command -v pg_dump &> /dev/null; then
    echo -e "${GREEN}✓ Found$(NC)"
else
    echo -e "${RED}✗ Not found${NC}"
    exit 1
fi

# Check if PostgreSQL service exists
echo -n "Checking PostgreSQL service... "
if systemctl list-unit-files | grep -q postgresql.service; then
    echo -e "${GREEN}✓ Service exists$(NC)"
    
    # Check if running
    if systemctl is-active --quiet postgresql; then
        echo -e "  ${GREEN}✓ PostgreSQL is running$(NC)"
    else
        echo -e "  ${YELLOW}⚠ PostgreSQL is not running${NC}"
        echo ""
        echo "To start PostgreSQL:"
        echo "  sudo systemctl start postgresql"
    fi
else
    echo -e "${RED}✗ Service not found${NC}"
    exit 1
fi

# Check if data directory is initialized
echo -n "Checking data directory... "
if [ -d "/var/lib/postgres/data" ] && [ "$(sudo ls -A /var/lib/postgres/data 2>/dev/null)" ]; then
    echo -e "${GREEN}✓ Initialized$(NC)"
else
    echo -e "${YELLOW}⚠ Not initialized${NC}"
    echo ""
    echo "To initialize PostgreSQL:"
    echo "  sudo -u postgres initdb -D /var/lib/postgres/data"
fi

echo ""
echo -e "${GREEN}=== Installation Status ===${NC}"

# Summary
if command -v psql &> /dev/null && systemctl is-active --quiet postgresql; then
    echo -e "${GREEN}✅ PostgreSQL is installed and running!${NC}"
    echo ""
    echo "Next step: Run the setup script"
    echo "  ./scripts/setup-postgres.sh"
else
    echo -e "${YELLOW}⚠ PostgreSQL needs configuration${NC}"
    echo ""
    echo "Required steps:"
    if ! command -v psql &> /dev/null; then
        echo "1. Install PostgreSQL: sudo pacman -S postgresql"
    fi
    if [ ! -d "/var/lib/postgres/data" ] || [ -z "$(sudo ls -A /var/lib/postgres/data 2>/dev/null)" ]; then
        echo "2. Initialize database: sudo -u postgres initdb -D /var/lib/postgres/data"
    fi
    if ! systemctl is-active --quiet postgresql; then
        echo "3. Start service: sudo systemctl start postgresql"
        echo "4. Enable on boot: sudo systemctl enable postgresql"
    fi
fi