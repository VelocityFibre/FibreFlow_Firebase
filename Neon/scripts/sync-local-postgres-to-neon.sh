#!/bin/bash

# Script to sync data from local PostgreSQL to Neon
# Wait for user to set up local PostgreSQL first

echo "🔄 Local PostgreSQL → Neon Sync Script"
echo "====================================="
echo ""

# Configuration - UPDATE THESE BASED ON YOUR LOCAL SETUP
LOCAL_DB_NAME="fibreflow_staging"   # Change to your database name
LOCAL_DB_USER="postgres"            # Change to your PostgreSQL user
LOCAL_DB_HOST="localhost"           # Change if needed
LOCAL_DB_PORT="5433"                # Change if using different port

# Neon configuration
NEON_URL="postgresql://neondb_owner:npg_AlX83ojfZpBk@ep-long-breeze-a9w7xool-pooler.gwc.azure.neon.tech/neondb?sslmode=require&options=endpoint%3Dep-long-breeze-a9w7xool"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Prerequisites:${NC}"
echo "1. Local PostgreSQL should be running"
echo "2. Your OneMap data should be loaded into local PostgreSQL"
echo "3. Update the configuration variables in this script if needed"
echo ""

# PostgreSQL binary path
PG_BIN="/home/ldp/postgresql/bin"

# Check if PostgreSQL is running
if ! $PG_BIN/pg_isready -h $LOCAL_DB_HOST -p $LOCAL_DB_PORT &> /dev/null; then
    echo -e "${RED}❌ PostgreSQL is not running on $LOCAL_DB_HOST:$LOCAL_DB_PORT${NC}"
    echo "Please start PostgreSQL and try again"
    exit 1
fi

echo -e "${GREEN}✅ PostgreSQL is running${NC}"

# Function to sync a specific table
sync_table() {
    local table=$1
    echo -e "\n📋 Syncing table: ${YELLOW}$table${NC}"
    
    # Dump the table structure and data
    $PG_BIN/pg_dump -h $LOCAL_DB_HOST -p $LOCAL_DB_PORT -U $LOCAL_DB_USER \
        -d $LOCAL_DB_NAME -t $table --no-owner --no-privileges \
        --if-exists --clean > /tmp/${table}_dump.sql
    
    # Load into Neon
    $PG_BIN/psql "$NEON_URL" < /tmp/${table}_dump.sql
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Table $table synced successfully${NC}"
    else
        echo -e "${RED}❌ Failed to sync table $table${NC}"
    fi
    
    # Cleanup
    rm -f /tmp/${table}_dump.sql
}

# Main sync process
echo ""
echo "Choose sync option:"
echo "1. Sync entire database"
echo "2. Sync specific tables"
echo "3. Show available tables first"
read -p "Enter option (1-3): " option

case $option in
    1)
        echo -e "\n🚀 Syncing entire database..."
        
        # Create full dump
        echo "Creating database dump..."
        $PG_BIN/pg_dump -h $LOCAL_DB_HOST -p $LOCAL_DB_PORT -U $LOCAL_DB_USER \
            -d $LOCAL_DB_NAME --no-owner --no-privileges \
            --if-exists --clean > /tmp/full_dump.sql
        
        # Check dump size
        dump_size=$(du -h /tmp/full_dump.sql | cut -f1)
        echo -e "Dump size: ${YELLOW}$dump_size${NC}"
        
        # Load into Neon
        echo "Loading into Neon (this may take a while)..."
        $PG_BIN/psql "$NEON_URL" < /tmp/full_dump.sql
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ Database synced successfully!${NC}"
        else
            echo -e "${RED}❌ Sync failed${NC}"
        fi
        
        # Cleanup
        rm -f /tmp/full_dump.sql
        ;;
        
    2)
        echo -e "\n📝 Available tables in local database:"
        $PG_BIN/psql -h $LOCAL_DB_HOST -p $LOCAL_DB_PORT -U $LOCAL_DB_USER -d $LOCAL_DB_NAME \
            -c "\dt" | grep -E '^\s*public'
        
        echo ""
        read -p "Enter table names to sync (comma-separated): " tables
        
        # Split comma-separated tables and sync each
        IFS=',' read -ra TABLE_ARRAY <<< "$tables"
        for table in "${TABLE_ARRAY[@]}"; do
            table=$(echo $table | xargs)  # Trim whitespace
            sync_table "$table"
        done
        ;;
        
    3)
        echo -e "\n📊 Tables in local PostgreSQL database:"
        $PG_BIN/psql -h $LOCAL_DB_HOST -p $LOCAL_DB_PORT -U $LOCAL_DB_USER -d $LOCAL_DB_NAME \
            -c "\dt+" | head -30
        
        echo -e "\n${YELLOW}Run this script again and choose option 1 or 2 to sync${NC}"
        exit 0
        ;;
        
    *)
        echo -e "${RED}Invalid option${NC}"
        exit 1
        ;;
esac

# Verify sync
echo -e "\n🔍 Verifying data in Neon..."
echo "Tables in Neon:"
$PG_BIN/psql "$NEON_URL" -c "\dt" | head -20

echo ""
echo -e "${GREEN}✅ Sync process complete!${NC}"
echo ""
echo "You can connect to Neon with:"
echo "psql '$NEON_URL'"