#!/bin/bash

# Fast sync script using COPY commands for large tables

echo "🚀 Fast PostgreSQL → Neon Sync"
echo "=============================="
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

echo "📊 Syncing table: $TABLE"
echo ""

# First, clear the table in Neon
echo "🗑️  Clearing existing data in Neon..."
$PG_BIN/psql "$NEON_URL" -c "TRUNCATE TABLE $TABLE;"

# Export data from local PostgreSQL to CSV
echo "📤 Exporting data from local PostgreSQL..."
$PG_BIN/psql -h $LOCAL_HOST -p $LOCAL_PORT -U $LOCAL_USER -d $LOCAL_DB \
    -c "\COPY $TABLE TO '/tmp/$TABLE.csv' WITH (FORMAT csv, HEADER true);"

# Check file size
FILE_SIZE=$(du -h /tmp/$TABLE.csv | cut -f1)
echo "   CSV file size: $FILE_SIZE"

# Import data to Neon
echo "📥 Importing data to Neon..."
$PG_BIN/psql "$NEON_URL" \
    -c "\COPY $TABLE FROM '/tmp/$TABLE.csv' WITH (FORMAT csv, HEADER true);"

# Verify import
echo ""
echo "🔍 Verifying import..."
ROW_COUNT=$($PG_BIN/psql "$NEON_URL" -t -c "SELECT COUNT(*) FROM $TABLE;")
echo "✅ Imported $ROW_COUNT rows"

# Cleanup
rm -f /tmp/$TABLE.csv

echo ""
echo "✅ Sync completed successfully!"