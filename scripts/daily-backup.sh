#!/bin/bash
# FibreFlow Daily Backup Script
# This script is called by cron to perform automated backups

# Set up environment
export PATH=/usr/local/bin:/usr/bin:/bin:$PATH
export NODE_PATH=/usr/local/lib/node_modules

# Change to project directory
cd /home/ldp/VF/Apps/FibreFlow

# Log start time
echo "Starting backup at $(date)" >> backups/cron.log

# Run the backup
/usr/bin/node scripts/automated-backup.js >> backups/cron.log 2>&1

# Log completion
echo "Backup completed at $(date)" >> backups/cron.log
echo "---" >> backups/cron.log