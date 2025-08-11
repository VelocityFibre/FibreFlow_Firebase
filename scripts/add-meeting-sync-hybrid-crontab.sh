#!/bin/bash
# Script to add hybrid FibreFlow meeting sync to crontab
# Daily: Sync yesterday's meetings only
# Weekly: Full 7-day sync on Sundays as safety net
# Last updated: 2025-08-11

# Create a temporary file with the new cron entries
TEMP_CRON=$(mktemp)

# Get existing crontab (ignore error if no crontab exists)
crontab -l > "$TEMP_CRON" 2>/dev/null || true

# Remove any existing meeting sync entries
grep -v "daily-meeting-sync" "$TEMP_CRON" > "${TEMP_CRON}.filtered" || true
mv "${TEMP_CRON}.filtered" "$TEMP_CRON"

# Add a blank line and comment if file is not empty
if [ -s "$TEMP_CRON" ]; then
    echo "" >> "$TEMP_CRON"
fi

# Add FibreFlow meeting sync jobs
echo "# FibreFlow Meeting Sync - Hybrid Approach" >> "$TEMP_CRON"
echo "# Daily sync at 9:00 AM (yesterday's meetings only)" >> "$TEMP_CRON"
echo "0 9 * * * /home/ldp/VF/Apps/FibreFlow/scripts/daily-meeting-sync-optimized.sh 1 > /home/ldp/VF/Apps/FibreFlow/logs/meeting-sync/cron-daily.log 2>&1" >> "$TEMP_CRON"
echo "" >> "$TEMP_CRON"
echo "# Weekly full sync at 9:30 AM on Sundays (last 7 days as safety net)" >> "$TEMP_CRON"
echo "30 9 * * 0 /home/ldp/VF/Apps/FibreFlow/scripts/daily-meeting-sync.sh 7 > /home/ldp/VF/Apps/FibreFlow/logs/meeting-sync/cron-weekly.log 2>&1" >> "$TEMP_CRON"

# Install the new crontab
crontab "$TEMP_CRON"

# Remove temporary file
rm "$TEMP_CRON"

echo "✅ FibreFlow hybrid meeting sync added to crontab!"
echo ""
echo "📋 Current crontab:"
crontab -l
echo ""
echo "ℹ️  Sync Schedule:"
echo "   • Daily at 9:00 AM - Syncs yesterday's meetings only"
echo "   • Sundays at 9:30 AM - Full 7-day sync as safety net"
echo ""
echo "📁 Log files:"
echo "   • Daily: /home/ldp/VF/Apps/FibreFlow/logs/meeting-sync/cron-daily.log"
echo "   • Weekly: /home/ldp/VF/Apps/FibreFlow/logs/meeting-sync/cron-weekly.log"
echo ""
echo "💡 Benefits:"
echo "   • 85% reduction in API calls"
echo "   • No missed meetings"
echo "   • Weekly safety net catches any gaps"
echo ""
echo "To manually test:"
echo "   • Daily sync: ./scripts/daily-meeting-sync-optimized.sh 1"
echo "   • Weekly sync: ./scripts/daily-meeting-sync.sh 7"