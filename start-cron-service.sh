#!/bin/bash
# Script to start and enable cron service
# Run this script to fix the meeting sync cron job issue

echo "🚀 Starting and enabling cron service..."

# Enable and start the cron service
sudo systemctl enable cronie
sudo systemctl start cronie

# Check status
echo "📊 Checking cron service status..."
sudo systemctl status cronie --no-pager

# Verify it's enabled for startup
echo "🔍 Verifying auto-start is enabled..."
sudo systemctl is-enabled cronie

echo "✅ Cron service setup complete!"
echo ""
echo "Your meeting sync jobs will now run automatically:"
echo "  - Daily sync: 9:00 AM (yesterday's meetings)"  
echo "  - Weekly sync: 9:30 AM Sundays (last 7 days)"
echo ""
echo "To test immediately, run: ./scripts/daily-meeting-sync-optimized.sh 1"