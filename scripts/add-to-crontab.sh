#!/bin/bash
# Script to add FibreFlow backup to crontab

# Create a temporary file with the new cron entry
TEMP_CRON=$(mktemp)

# Get existing crontab
crontab -l > "$TEMP_CRON" 2>/dev/null || true

# Add a blank line and comment if file is not empty
if [ -s "$TEMP_CRON" ]; then
    echo "" >> "$TEMP_CRON"
fi

# Add FibreFlow backup job
echo "# FibreFlow Daily Backup - Runs at 2:00 AM every day" >> "$TEMP_CRON"
echo "0 2 * * * /home/ldp/VF/Apps/FibreFlow/scripts/daily-backup.sh" >> "$TEMP_CRON"

# Install the new crontab
crontab "$TEMP_CRON"

# Remove temporary file
rm "$TEMP_CRON"

echo "✅ FibreFlow backup added to crontab!"
echo ""
echo "📋 Current crontab:"
crontab -l