#!/bin/bash

# PostgreSQL to Supabase Sync Script
# Easy sync between local PostgreSQL and Supabase Cloud

# Configuration
LOCAL_DB="fibreflow_local"
LOCAL_USER="postgres"
LOCAL_HOST="localhost"
LOCAL_PORT="5432"

# Supabase connection (set these in .env)
SUPABASE_HOST="${SUPABASE_HOST:-db.xxxxx.supabase.co}"
SUPABASE_USER="${SUPABASE_USER:-postgres}"
SUPABASE_PASS="${SUPABASE_PASSWORD}"
SUPABASE_DB="${SUPABASE_DB:-postgres}"
SUPABASE_PORT="${SUPABASE_PORT:-5432}"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

# Function to sync schema only
sync_schema() {
    echo "📋 Syncing schema from local to Supabase..."
    
    # Dump schema only
    pg_dump -h $LOCAL_HOST -U $LOCAL_USER -d $LOCAL_DB \
        --schema-only \
        --no-owner \
        --no-privileges \
        -f schema.sql
    
    # Apply to Supabase
    PGPASSWORD=$SUPABASE_PASS psql \
        -h $SUPABASE_HOST \
        -U $SUPABASE_USER \
        -d $SUPABASE_DB \
        -p $SUPABASE_PORT \
        -f schema.sql
    
    echo -e "${GREEN}✓ Schema synced${NC}"
}

# Function to sync data only
sync_data() {
    echo "📦 Syncing data from local to Supabase..."
    
    # Dump data only
    pg_dump -h $LOCAL_HOST -U $LOCAL_USER -d $LOCAL_DB \
        --data-only \
        --disable-triggers \
        -f data.sql
    
    # Apply to Supabase
    PGPASSWORD=$SUPABASE_PASS psql \
        -h $SUPABASE_HOST \
        -U $SUPABASE_USER \
        -d $SUPABASE_DB \
        -p $SUPABASE_PORT \
        -f data.sql
    
    echo -e "${GREEN}✓ Data synced${NC}"
}

# Function to sync specific tables
sync_tables() {
    TABLES=$@
    echo "📊 Syncing tables: $TABLES"
    
    for table in $TABLES; do
        echo "  Syncing $table..."
        
        # Dump specific table
        pg_dump -h $LOCAL_HOST -U $LOCAL_USER -d $LOCAL_DB \
            --table=$table \
            --data-only \
            --disable-triggers \
            -f ${table}.sql
        
        # Clear target table
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
            -f ${table}.sql
    done
    
    echo -e "${GREEN}✓ Tables synced${NC}"
}

# Function to pull from Supabase to local
pull_from_supabase() {
    echo "⬇️  Pulling from Supabase to local..."
    
    # Dump from Supabase
    PGPASSWORD=$SUPABASE_PASS pg_dump \
        -h $SUPABASE_HOST \
        -U $SUPABASE_USER \
        -d $SUPABASE_DB \
        -p $SUPABASE_PORT \
        --clean \
        --if-exists \
        -f supabase_backup.sql
    
    # Restore to local
    psql -h $LOCAL_HOST -U $LOCAL_USER -d $LOCAL_DB -f supabase_backup.sql
    
    echo -e "${GREEN}✓ Pulled from Supabase${NC}"
}

# Function to compare row counts
compare_counts() {
    echo "🔍 Comparing row counts..."
    
    # Get local counts
    echo "Local database:"
    psql -h $LOCAL_HOST -U $LOCAL_USER -d $LOCAL_DB -c "
        SELECT schemaname, tablename, n_live_tup as row_count
        FROM pg_stat_user_tables
        ORDER BY tablename;
    "
    
    # Get Supabase counts
    echo -e "\nSupabase database:"
    PGPASSWORD=$SUPABASE_PASS psql \
        -h $SUPABASE_HOST \
        -U $SUPABASE_USER \
        -d $SUPABASE_DB \
        -p $SUPABASE_PORT \
        -c "
        SELECT schemaname, tablename, n_live_tup as row_count
        FROM pg_stat_user_tables
        ORDER BY tablename;
    "
}

# Main menu
case "$1" in
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
    pull)
        pull_from_supabase
        ;;
    compare)
        compare_counts
        ;;
    full)
        sync_schema
        sync_data
        ;;
    *)
        echo "PostgreSQL ↔ Supabase Sync Tool"
        echo "Usage: $0 {schema|data|tables|pull|compare|full}"
        echo ""
        echo "Commands:"
        echo "  schema         - Sync schema only (local → Supabase)"
        echo "  data           - Sync data only (local → Supabase)"
        echo "  tables <names> - Sync specific tables (local → Supabase)"
        echo "  pull           - Pull from Supabase → local"
        echo "  compare        - Compare row counts"
        echo "  full           - Full sync (schema + data)"
        echo ""
        echo "Examples:"
        echo "  $0 schema"
        echo "  $0 tables poles drops"
        echo "  $0 pull"
        exit 1
esac

# Cleanup
rm -f schema.sql data.sql *.sql 2>/dev/null