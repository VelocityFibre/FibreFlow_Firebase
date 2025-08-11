#!/bin/bash

# Direct PostgreSQL to PostgreSQL sync using pg_dump over network
# This is the fastest method for cloud-to-cloud sync

echo "⚡ Direct Cloud-to-Cloud PostgreSQL Sync"
echo "========================================"
echo ""

# Configuration
PG_BIN="/home/ldp/postgresql/bin"

# Supabase direct connection (you'll need to get this from Supabase dashboard)
# Go to Settings > Database > Connection string
SUPABASE_DIRECT_URL="postgresql://postgres.[PROJECT-REF]:[YOUR-DATABASE-PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres"

# Neon connection
NEON_URL="postgresql://neondb_owner:npg_AlX83ojfZpBk@ep-long-breeze-a9w7xool-pooler.gwc.azure.neon.tech/neondb?sslmode=require&options=endpoint%3Dep-long-breeze-a9w7xool"

echo "📝 NOTE: You need to get your Supabase direct database URL from:"
echo "   Supabase Dashboard > Settings > Database > Connection string"
echo "   Use the 'Transaction' mode connection string"
echo ""

# Tables to sync
TABLES="status_changes zone_progress_view projects daily_progress"

echo "Choose sync method:"
echo "1. Full database sync (all tables)"
echo "2. Specific tables only"
echo "3. Using pg_dump network pipe (fastest)"
read -p "Enter option (1-3): " option

case $option in
    1)
        echo -e "\n🚀 Full database sync..."
        echo "This will pipe data directly from Supabase to Neon"
        
        # Direct pipe from Supabase to Neon (no local storage)
        $PG_BIN/pg_dump "$SUPABASE_DIRECT_URL" \
            --no-owner --no-privileges --no-comments \
            --exclude-schema=auth --exclude-schema=storage \
            --exclude-schema=graphql* --exclude-schema=realtime \
            --exclude-schema=extensions --exclude-schema=pgsodium* \
            --exclude-schema=vault \
            | $PG_BIN/psql "$NEON_URL"
        
        echo "✅ Direct sync completed!"
        ;;
        
    2)
        echo -e "\n📋 Syncing specific tables..."
        for table in $TABLES; do
            echo "Syncing $table..."
            
            $PG_BIN/pg_dump "$SUPABASE_DIRECT_URL" \
                --table="public.$table" \
                --no-owner --no-privileges \
                --data-only \
                | $PG_BIN/psql "$NEON_URL"
        done
        
        echo "✅ Tables synced!"
        ;;
        
    3)
        echo -e "\n⚡ Using network pipe (fastest method)..."
        echo "Creating direct pipe from Supabase to Neon..."
        
        # Use COPY TO STDOUT and COPY FROM STDIN for maximum speed
        for table in $TABLES; do
            echo -n "Syncing $table... "
            
            # Clear target table
            $PG_BIN/psql "$NEON_URL" -c "TRUNCATE TABLE $table CASCADE;" 2>/dev/null
            
            # Direct copy via pipe
            $PG_BIN/psql "$SUPABASE_DIRECT_URL" -c "\COPY $table TO STDOUT WITH (FORMAT binary)" \
                | $PG_BIN/psql "$NEON_URL" -c "\COPY $table FROM STDIN WITH (FORMAT binary)"
            
            echo "✅"
        done
        
        echo -e "\n✅ Network pipe sync completed!"
        ;;
esac

# Verify sync
echo -e "\n🔍 Verifying sync..."
$PG_BIN/psql "$NEON_URL" -c "
SELECT 
    tablename,
    pg_size_pretty(pg_total_relation_size(tablename::regclass)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
"

echo -e "\n💡 Tips for faster syncing:"
echo "1. Use Supabase direct connection (not connection pooler)"
echo "2. Run this script from a cloud VM for best performance"
echo "3. Consider using Neon branching for testing"
echo "4. Use binary format for large tables"