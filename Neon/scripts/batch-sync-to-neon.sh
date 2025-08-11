#!/bin/bash

# Batch sync script for large tables

echo "🚀 Batch PostgreSQL → Neon Sync"
echo "==============================="
echo ""

# Configuration
LOCAL_DB="fibreflow_staging"
LOCAL_USER="postgres"
LOCAL_HOST="localhost"
LOCAL_PORT="5433"
PG_BIN="/home/ldp/postgresql/bin"

# Neon configuration
NEON_URL="postgresql://neondb_owner:npg_AlX83ojfZpBk@ep-long-breeze-a9w7xool-pooler.gwc.azure.neon.tech/neondb?sslmode=require&options=endpoint%3Dep-long-breeze-a9w7xool"

# Table to sync
TABLE="onemap_lawley_raw"
BATCH_SIZE=10000

echo "📊 Syncing table: $TABLE in batches of $BATCH_SIZE"
echo ""

# Get total row count
TOTAL_ROWS=$($PG_BIN/psql -h $LOCAL_HOST -p $LOCAL_PORT -U $LOCAL_USER -d $LOCAL_DB -t -c "SELECT COUNT(*) FROM $TABLE;")
TOTAL_ROWS=$(echo $TOTAL_ROWS | xargs)  # Trim whitespace
echo "Total rows to sync: $TOTAL_ROWS"

# Clear the table in Neon first
echo "🗑️  Clearing existing data in Neon..."
$PG_BIN/psql "$NEON_URL" -c "TRUNCATE TABLE $TABLE;"

# Get the primary key or unique column for ordering
# Assuming there's an id or similar column
echo ""
echo "🔄 Starting batch sync..."

OFFSET=0
SYNCED=0

while [ $OFFSET -lt $TOTAL_ROWS ]; do
    # Calculate progress
    PROGRESS=$((OFFSET * 100 / TOTAL_ROWS))
    echo -ne "\rProgress: $PROGRESS% ($OFFSET/$TOTAL_ROWS rows)"
    
    # Export batch to temp file
    $PG_BIN/psql -h $LOCAL_HOST -p $LOCAL_PORT -U $LOCAL_USER -d $LOCAL_DB -q \
        -c "\COPY (SELECT * FROM $TABLE ORDER BY id LIMIT $BATCH_SIZE OFFSET $OFFSET) TO '/tmp/batch.csv' WITH (FORMAT csv, HEADER false);"
    
    # Import batch to Neon
    $PG_BIN/psql "$NEON_URL" -q \
        -c "\COPY $TABLE FROM '/tmp/batch.csv' WITH (FORMAT csv, HEADER false);"
    
    # Update offset
    OFFSET=$((OFFSET + BATCH_SIZE))
    SYNCED=$((SYNCED + BATCH_SIZE))
    
    # Clean up temp file
    rm -f /tmp/batch.csv
done

echo -e "\nProgress: 100% ($TOTAL_ROWS/$TOTAL_ROWS rows)"

# Verify final count
echo ""
echo "🔍 Verifying sync..."
NEON_COUNT=$($PG_BIN/psql "$NEON_URL" -t -c "SELECT COUNT(*) FROM $TABLE;")
NEON_COUNT=$(echo $NEON_COUNT | xargs)
echo "✅ Synced $NEON_COUNT rows to Neon"

if [ "$NEON_COUNT" -eq "$TOTAL_ROWS" ]; then
    echo "✅ Sync completed successfully! All rows transferred."
else
    echo "⚠️  Warning: Row count mismatch. Expected $TOTAL_ROWS, got $NEON_COUNT"
fi