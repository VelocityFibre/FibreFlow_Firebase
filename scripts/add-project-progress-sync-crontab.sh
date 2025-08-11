#!/bin/bash

# Script to add cron job for syncing OneMap SQLite data to Supabase
# This ensures the project progress dashboard has fresh data

echo "Setting up automated OneMap → Supabase sync..."

# Get the full path to the project directory
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Create the cron job command
# Run every 15 minutes
CRON_JOB="*/15 * * * * cd $PROJECT_DIR && /usr/bin/node supabase/scripts/sync-from-onemap-sqlite.js >> $PROJECT_DIR/logs/supabase-sync.log 2>&1"

# Check if cron job already exists
(crontab -l 2>/dev/null | grep -q "sync-from-onemap-sqlite.js") && {
    echo "Cron job already exists. Removing old version..."
    # Remove existing job
    crontab -l 2>/dev/null | grep -v "sync-from-onemap-sqlite.js" | crontab -
}

# Add the new cron job
(crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -

# Create logs directory if it doesn't exist
mkdir -p "$PROJECT_DIR/logs"

echo "✅ Cron job added successfully!"
echo "   The sync will run every 15 minutes"
echo "   Logs will be saved to: $PROJECT_DIR/logs/supabase-sync.log"
echo ""
echo "To verify the cron job was added:"
echo "   crontab -l | grep supabase"
echo ""
echo "To manually run the sync:"
echo "   cd $PROJECT_DIR && node supabase/scripts/sync-from-onemap-sqlite.js"
echo ""
echo "To remove the cron job later:"
echo "   crontab -l | grep -v 'sync-from-onemap-sqlite.js' | crontab -"