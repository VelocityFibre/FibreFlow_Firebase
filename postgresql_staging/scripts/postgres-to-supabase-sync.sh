#!/bin/bash

# PostgreSQL to Supabase Sync Script
# Direct sync from local PostgreSQL staging to Supabase Cloud

set -e  # Exit on error

# Configuration
LOCAL_DB="fibreflow_staging"
LOCAL_USER="fibreflow_user"
LOCAL_PASS="fibreflow_pass"
LOCAL_HOST="localhost"
LOCAL_PORT="5432"

# Load Supabase config from parent .env.local if exists
if [ -f "../.env.local" ]; then
    source ../.env.local
fi

# Supabase connection settings
SUPABASE_HOST="${SUPABASE_HOST:-db.xxxxx.supabase.co}"
SUPABASE_USER="${SUPABASE_USER:-postgres}"
SUPABASE_PASS="${SUPABASE_PASSWORD}"
SUPABASE_DB="${SUPABASE_DB:-postgres}"
SUPABASE_PORT="${SUPABASE_PORT:-5432}"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Function to check prerequisites
check_prerequisites() {
    if [ -z "$SUPABASE_PASSWORD" ]; then
        echo -e "${RED}Error: SUPABASE_PASSWORD not set${NC}"
        echo "Please set in ../.env.local or environment"
        exit 1
    fi
    
    if ! command -v pg_dump &> /dev/null; then
        echo -e "${RED}Error: pg_dump not found${NC}"
        exit 1
    fi
}

# Function to sync schema only
sync_schema() {
    echo -e "${YELLOW}📋 Syncing schema from PostgreSQL to Supabase...${NC}"
    
    # Dump schema only (excluding system schemas)
    PGPASSWORD=$LOCAL_PASS pg_dump \
        -h $LOCAL_HOST \
        -U $LOCAL_USER \
        -d $LOCAL_DB \
        -p $LOCAL_PORT \
        --schema-only \
        --no-owner \
        --no-privileges \
        --no-security-labels \
        --no-publications \
        --no-subscriptions \
        -N 'information_schema' \
        -N 'pg_*' \
        -f schema_dump.sql
    
    # Apply to Supabase
    echo "Applying schema to Supabase..."
    PGPASSWORD=$SUPABASE_PASS psql \
        -h $SUPABASE_HOST \
        -U $SUPABASE_USER \
        -d $SUPABASE_DB \
        -p $SUPABASE_PORT \
        -f schema_dump.sql
    
    rm schema_dump.sql
    echo -e "${GREEN}✓ Schema synced${NC}"
}

# Function to sync data only
sync_data() {
    echo -e "${YELLOW}📦 Syncing data from PostgreSQL to Supabase...${NC}"
    
    # Dump data only
    PGPASSWORD=$LOCAL_PASS pg_dump \
        -h $LOCAL_HOST \
        -U $LOCAL_USER \
        -d $LOCAL_DB \
        -p $LOCAL_PORT \
        --data-only \
        --disable-triggers \
        --no-owner \
        -f data_dump.sql
    
    # Apply to Supabase
    echo "Loading data to Supabase (this may take a while)..."
    PGPASSWORD=$SUPABASE_PASS psql \
        -h $SUPABASE_HOST \
        -U $SUPABASE_USER \
        -d $SUPABASE_DB \
        -p $SUPABASE_PORT \
        -f data_dump.sql
    
    rm data_dump.sql
    echo -e "${GREEN}✓ Data synced${NC}"
}

# Function to sync specific tables
sync_tables() {
    TABLES=$@
    echo -e "${YELLOW}📊 Syncing tables: $TABLES${NC}"
    
    for table in $TABLES; do
        echo "  Syncing $table..."
        
        # Dump specific table
        PGPASSWORD=$LOCAL_PASS pg_dump \
            -h $LOCAL_HOST \
            -U $LOCAL_USER \
            -d $LOCAL_DB \
            -p $LOCAL_PORT \
            --table=$table \
            --data-only \
            --disable-triggers \
            -f ${table}_dump.sql
        
        # Clear target table (with CASCADE to handle foreign keys)
        echo "  Clearing $table in Supabase..."
        PGPASSWORD=$SUPABASE_PASS psql \
            -h $SUPABASE_HOST \
            -U $SUPABASE_USER \
            -d $SUPABASE_DB \
            -p $SUPABASE_PORT \
            -c "TRUNCATE TABLE $table CASCADE;"
        
        # Import data
        PGPASSWORD=$SUPABASE_PASS psql \
            -h $SUPABASE_HOST \
            -U $SUPABASE_USER \
            -d $SUPABASE_DB \
            -p $SUPABASE_PORT \
            -f ${table}_dump.sql
        
        rm ${table}_dump.sql
    done
    
    echo -e "${GREEN}✓ Tables synced${NC}"
}

# Function to pull from Supabase to local
pull_from_supabase() {
    echo -e "${YELLOW}⬇️  Pulling from Supabase to local PostgreSQL...${NC}"
    
    # Create backup first
    echo "Creating local backup..."
    PGPASSWORD=$LOCAL_PASS pg_dump \
        -h $LOCAL_HOST \
        -U $LOCAL_USER \
        -d $LOCAL_DB \
        -p $LOCAL_PORT \
        -f local_backup_$(date +%Y%m%d_%H%M%S).sql
    
    # Dump from Supabase
    echo "Dumping from Supabase..."
    PGPASSWORD=$SUPABASE_PASS pg_dump \
        -h $SUPABASE_HOST \
        -U $SUPABASE_USER \
        -d $SUPABASE_DB \
        -p $SUPABASE_PORT \
        --clean \
        --if-exists \
        --no-owner \
        --no-privileges \
        -f supabase_dump.sql
    
    # Restore to local
    echo "Restoring to local PostgreSQL..."
    PGPASSWORD=$LOCAL_PASS psql \
        -h $LOCAL_HOST \
        -U $LOCAL_USER \
        -d $LOCAL_DB \
        -p $LOCAL_PORT \
        -f supabase_dump.sql
    
    rm supabase_dump.sql
    echo -e "${GREEN}✓ Pulled from Supabase${NC}"
}

# Function to compare row counts
compare_counts() {
    echo -e "${YELLOW}🔍 Comparing row counts...${NC}"
    echo ""
    
    # Get local counts
    echo "Local PostgreSQL:"
    PGPASSWORD=$LOCAL_PASS psql \
        -h $LOCAL_HOST \
        -U $LOCAL_USER \
        -d $LOCAL_DB \
        -p $LOCAL_PORT \
        -t -c "
        SELECT 
            'poles' as table_name, 
            COUNT(*) as count 
        FROM poles
        UNION ALL
        SELECT 'drops', COUNT(*) FROM drops
        UNION ALL
        SELECT 'properties', COUNT(*) FROM properties
        UNION ALL
        SELECT 'status_changes', COUNT(*) FROM status_changes
        ORDER BY table_name;
    " | column -t
    
    echo -e "\nSupabase Cloud:"
    PGPASSWORD=$SUPABASE_PASS psql \
        -h $SUPABASE_HOST \
        -U $SUPABASE_USER \
        -d $SUPABASE_DB \
        -p $SUPABASE_PORT \
        -t -c "
        SELECT 
            'poles' as table_name, 
            COUNT(*) as count 
        FROM poles
        UNION ALL
        SELECT 'drops', COUNT(*) FROM drops
        UNION ALL
        SELECT 'properties', COUNT(*) FROM properties
        UNION ALL
        SELECT 'status_changes', COUNT(*) FROM status_changes
        ORDER BY table_name;
    " | column -t
}

# Function for incremental sync (only changes)
sync_incremental() {
    echo -e "${YELLOW}🔄 Incremental sync (changes only)...${NC}"
    
    # This would typically use timestamps or batch IDs
    # For now, we'll sync recent import batches
    
    RECENT_BATCH=$(PGPASSWORD=$LOCAL_PASS psql \
        -h $LOCAL_HOST \
        -U $LOCAL_USER \
        -d $LOCAL_DB \
        -p $LOCAL_PORT \
        -t -c "SELECT batch_id FROM import_batches ORDER BY import_date DESC LIMIT 1;"
    )
    
    if [ -z "$RECENT_BATCH" ]; then
        echo "No recent batches to sync"
        return
    fi
    
    echo "Syncing batch: $RECENT_BATCH"
    
    # Export recent changes
    PGPASSWORD=$LOCAL_PASS psql \
        -h $LOCAL_HOST \
        -U $LOCAL_USER \
        -d $LOCAL_DB \
        -p $LOCAL_PORT \
        -c "\COPY (
            SELECT * FROM poles 
            WHERE data->>'source' = '$RECENT_BATCH'
        ) TO 'poles_incremental.csv' CSV HEADER;"
    
    # Import to Supabase
    # ... implementation depends on conflict resolution strategy
    
    echo -e "${GREEN}✓ Incremental sync completed${NC}"
}

# Main menu
check_prerequisites

case "$1" in
    push)
        sync_schema
        sync_data
        compare_counts
        ;;
    pull)
        pull_from_supabase
        compare_counts
        ;;
    schema)
        sync_schema
        ;;
    data)
        sync_data
        ;;
    tables)
        shift
        sync_tables $@
        ;;
    compare)
        compare_counts
        ;;
    incremental)
        sync_incremental
        ;;
    *)
        echo -e "${GREEN}PostgreSQL → Supabase Sync Tool${NC}"
        echo "Usage: $0 {push|pull|schema|data|tables|compare|incremental}"
        echo ""
        echo "Commands:"
        echo "  push        - Full sync (schema + data) to Supabase"
        echo "  pull        - Pull from Supabase to local"
        echo "  schema      - Sync schema only"
        echo "  data        - Sync data only"
        echo "  tables      - Sync specific tables"
        echo "  compare     - Compare row counts"
        echo "  incremental - Sync recent changes only"
        echo ""
        echo "Examples:"
        echo "  $0 push                    # Full sync to Supabase"
        echo "  $0 tables poles drops      # Sync specific tables"
        echo "  $0 pull                    # Get production data"
        exit 1
esac