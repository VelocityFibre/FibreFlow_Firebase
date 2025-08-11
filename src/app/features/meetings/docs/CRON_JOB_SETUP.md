# Cron Job Setup for Meeting Sync

**Created**: 2025-08-11  
**Purpose**: Step-by-step guide for setting up the meeting sync cron job

## Current Configuration

### Hybrid Sync Approach
To optimize API usage while ensuring no meetings are missed, we use a hybrid approach:

1. **Daily Sync** (9:00 AM)
   - Syncs only yesterday's meetings
   - Reduces API calls by ~85%
   - Handles most use cases efficiently

2. **Weekly Sync** (9:30 AM Sundays)
   - Full 7-day sync as safety net
   - Catches any missed meetings
   - Handles edge cases (API outages, etc.)

### Cron Entries
```bash
# Daily sync at 9:00 AM (yesterday's meetings only)
0 9 * * * /home/ldp/VF/Apps/FibreFlow/scripts/daily-meeting-sync-optimized.sh 1 > /home/ldp/VF/Apps/FibreFlow/logs/meeting-sync/cron-daily.log 2>&1

# Weekly full sync at 9:30 AM on Sundays (last 7 days as safety net)
30 9 * * 0 /home/ldp/VF/Apps/FibreFlow/scripts/daily-meeting-sync.sh 7 > /home/ldp/VF/Apps/FibreFlow/logs/meeting-sync/cron-weekly.log 2>&1
```

## Installation Steps

### 1. Automatic Installation (Recommended)
```bash
cd /home/ldp/VF/Apps/FibreFlow
# For hybrid approach:
./scripts/add-meeting-sync-hybrid-crontab.sh

# For simple daily 7-day sync:
./scripts/add-meeting-sync-to-crontab.sh
```

### 2. Manual Installation
```bash
# Edit crontab
crontab -e

# Add this line
0 9 * * * /home/ldp/VF/Apps/FibreFlow/scripts/daily-meeting-sync.sh > /home/ldp/VF/Apps/FibreFlow/logs/meeting-sync/cron.log 2>&1

# Save and exit
```

## Cron Schedule Format

```
┌───────────── minute (0-59)
│ ┌─────────── hour (0-23)
│ │ ┌───────── day of month (1-31)
│ │ │ ┌─────── month (1-12)
│ │ │ │ ┌───── day of week (0-6, Sunday=0)
│ │ │ │ │
0 9 * * *
```

### Common Schedule Examples
- `0 9 * * *` - Daily at 9:00 AM
- `0 */4 * * *` - Every 4 hours
- `0 9,15 * * *` - At 9 AM and 3 PM
- `0 9 * * 1-5` - Weekdays only at 9 AM
- `30 8 * * *` - Daily at 8:30 AM

## Email Notifications

### Success Email
- **Subject**: ✅ FibreFlow Meeting Sync - SUCCESS - YYYY-MM-DD
- **Content**: Summary of meetings processed
- **Recipient**: admin@velocityfibre.com

### Failure Email
- **Subject**: ❌ FibreFlow Meeting Sync - FAILED - YYYY-MM-DD
- **Content**: Error details and last 50 log lines
- **Recipient**: admin@velocityfibre.com

### Email Configuration
The script uses the system's `mail` command. Ensure it's configured:

```bash
# Test mail command
echo "Test email" | mail -s "Test Subject" your-email@example.com

# If mail is not installed
sudo apt-get install mailutils  # Debian/Ubuntu
sudo yum install mailx          # CentOS/RHEL
```

## Log Management

### Log Locations
- **Sync Logs**: `/home/ldp/VF/Apps/FibreFlow/logs/meeting-sync/sync-YYYY-MM-DD.log`
- **Cron Log**: `/home/ldp/VF/Apps/FibreFlow/logs/meeting-sync/cron.log`
- **Reports**: `/home/ldp/VF/Apps/FibreFlow/logs/meeting-sync/report-YYYY-MM-DD.txt`

### Log Rotation
- Automatic cleanup of logs older than 30 days
- Happens after each sync run
- Includes sync logs, reports, and error reports

### Manual Log Cleanup
```bash
# Remove logs older than 7 days
find /home/ldp/VF/Apps/FibreFlow/logs/meeting-sync -name "*.log" -mtime +7 -delete

# View disk usage
du -sh /home/ldp/VF/Apps/FibreFlow/logs/meeting-sync/
```

## Monitoring

### Check Cron Status
```bash
# Is cron running?
systemctl status cron

# View cron jobs
crontab -l

# Check if job exists
crontab -l | grep daily-meeting-sync
```

### View Recent Executions
```bash
# System cron log (if available)
grep CRON /var/log/syslog | grep daily-meeting-sync | tail -20

# Application cron log
tail -f /home/ldp/VF/Apps/FibreFlow/logs/meeting-sync/cron.log

# Today's sync log
tail -f /home/ldp/VF/Apps/FibreFlow/logs/meeting-sync/sync-$(date +%Y-%m-%d).log
```

### Verify Next Run Time
```bash
# Calculate next run
date -d "tomorrow 09:00"

# Or use cron expression parser
# Note: Install cronie-anacron if needed
```

## Troubleshooting

### Cron Job Not Running

1. **Check cron service**
   ```bash
   systemctl status cron
   sudo systemctl start cron  # If not running
   ```

2. **Verify permissions**
   ```bash
   ls -la /home/ldp/VF/Apps/FibreFlow/scripts/daily-meeting-sync.sh
   # Should show: -rwxr-xr-x (executable)
   ```

3. **Check PATH issues**
   - Cron has limited PATH
   - Script uses full paths for safety

4. **Test manually**
   ```bash
   /home/ldp/VF/Apps/FibreFlow/scripts/daily-meeting-sync.sh
   ```

### Email Not Received

1. **Check mail service**
   ```bash
   systemctl status postfix  # or sendmail
   ```

2. **Test mail command**
   ```bash
   echo "Test" | mail -s "Test" admin@velocityfibre.com
   ```

3. **Check mail queue**
   ```bash
   mailq
   ```

4. **Review mail logs**
   ```bash
   tail -f /var/log/mail.log
   ```

### Script Errors

1. **Permission denied**
   ```bash
   chmod +x /home/ldp/VF/Apps/FibreFlow/scripts/daily-meeting-sync.sh
   chmod +x /home/ldp/VF/Apps/FibreFlow/scripts/sync-meetings-simple.cjs
   ```

2. **Node.js not found**
   - Add Node.js to PATH in script
   - Or use full path to node binary

3. **Firebase authentication**
   - Check Firebase credentials
   - Verify project configuration

## Maintenance Tasks

### Weekly
- Check sync success rate
- Review error reports if any
- Verify email notifications working

### Monthly
- Review log disk usage
- Check for API changes
- Update documentation if needed

### Quarterly
- Review sync performance
- Consider optimization opportunities
- Update Node.js dependencies

## Security Notes

1. **Script Permissions**: Only executable by owner
2. **API Keys**: Consider moving to environment variables
3. **Log Files**: Contains meeting data, secure appropriately
4. **Email Addresses**: Hardcoded, consider config file
5. **Cron Access**: Limit to necessary users only

## Backup and Recovery

### Backup Cron Configuration
```bash
# Export current crontab
crontab -l > ~/crontab-backup-$(date +%Y%m%d).txt
```

### Restore Cron Configuration
```bash
# Restore from backup
crontab ~/crontab-backup-20250811.txt
```

### Disaster Recovery
1. Reinstall cron job using installation script
2. Verify Node.js and dependencies installed
3. Test sync manually before relying on cron
4. Monitor first few automated runs closely