# Meeting Sync Architecture - FibreFlow

**Last Updated**: 2025-08-11  
**Purpose**: Document the complete meeting synchronization system from Fireflies API to Firebase

## Overview

FibreFlow synchronizes meeting data from Fireflies.ai API to Firebase Firestore on a daily basis. The system runs automatically via cron job and includes comprehensive error reporting.

## Architecture Components

### 1. Sync Scripts

#### Primary Script: `sync-meetings-simple.cjs`
- **Location**: `/scripts/sync-meetings-simple.cjs`
- **Purpose**: Main synchronization logic
- **Language**: CommonJS (for compatibility with ES modules project)
- **Features**:
  - Fetches meetings from Fireflies GraphQL API
  - Syncs to Firebase Firestore
  - Updates existing meetings or creates new ones
  - Extracts action items with priority detection

#### Wrapper Script: `daily-meeting-sync.sh`
- **Location**: `/scripts/daily-meeting-sync.sh`
- **Purpose**: Cron job wrapper with logging and reporting
- **Features**:
  - Environment setup and validation
  - Comprehensive logging with timestamps
  - Email notifications on success/failure
  - Log rotation (30-day retention)

### 2. Cron Configuration

#### Schedule
- **Time**: Daily at 9:00 AM
- **Command**: `/home/ldp/VF/Apps/FibreFlow/scripts/daily-meeting-sync.sh`
- **Logs**: `/home/ldp/VF/Apps/FibreFlow/logs/meeting-sync/`

#### Installation Script
- **Location**: `/scripts/add-meeting-sync-to-crontab.sh`
- **Purpose**: Adds/updates cron job entry

### 3. Data Flow

```
Fireflies API → GraphQL Query → Meeting Data
                      ↓
              sync-meetings-simple.cjs
                      ↓
              Firebase Firestore
                      ↓
              'meetings' collection
```

### 4. Meeting Data Structure

```typescript
interface FirestoreMeeting {
  firefliesId: string;           // Unique Fireflies ID
  title: string;                 // Meeting title
  dateTime: string;              // ISO date string
  duration: number;              // Duration in minutes
  participants: Array<{          // Meeting attendees
    name: string;
    email: string;
  }>;
  organizer: string;             // Organizer email
  meetingUrl: string;            // Meeting link
  summary: string;               // Meeting overview
  actionItems: Array<{           // Extracted action items
    id: string;
    text: string;
    assignee: string;
    dueDate: Date | null;
    priority: 'high' | 'medium' | 'low';
    completed: boolean;
    speaker: string;
    timestamp: number;
  }>;
  insights: {                    // Additional insights
    keywords: string[];
    outline: string;
    bulletPoints: string;
  };
  status: 'synced';              // Sync status
  createdAt: string;             // First sync time
  updatedAt: string;             // Last update time
}
```

## Configuration

### API Credentials
- **Fireflies API Key**: Stored in sync script
- **Firebase Config**: Uses project configuration from environment

### Sync Parameters
- **Default Period**: Last 7 days (original script) or optimized:
  - **Daily**: Sync yesterday's meetings only (1 day)
  - **Mondays**: Sync last 3 days (to catch weekend meetings)
  - **Manual Override**: Pass days as argument to sync script

### Duplicate Prevention
The sync system prevents duplicates by:
1. Each meeting has a unique `firefliesId` from Fireflies API
2. Before creating, it queries Firebase: `where('firefliesId', '==', meeting.id)`
3. If meeting exists → Updates existing record
4. If meeting doesn't exist → Creates new record

This means running a 7-day sync daily is safe but inefficient, as it re-checks 6 days of overlap.

## Error Handling

### Common Issues

1. **ES Module Compatibility**
   - **Issue**: Project uses ES modules, sync script uses CommonJS
   - **Solution**: Script renamed to `.cjs` extension

2. **API Rate Limits**
   - **Issue**: Too many requests to Fireflies
   - **Solution**: Daily sync schedule, batch processing

3. **Authentication Failures**
   - **Issue**: Invalid API key
   - **Solution**: Check key in script, update if needed

### Monitoring

#### Success Indicators
- Email notification with summary
- Log file shows meeting counts
- Syslog entry for success

#### Failure Indicators
- Email notification with error details
- Error report file created
- Syslog error entry
- Non-zero exit code

## Logs and Reports

### Log Files
- **Location**: `/logs/meeting-sync/`
- **Format**: `sync-YYYY-MM-DD.log`
- **Content**: Timestamped sync activities

### Report Files
- **Success**: `report-YYYY-MM-DD.txt`
- **Failure**: `error-report-YYYY-MM-DD.txt`

### Email Notifications
- **To**: admin@velocityfibre.com
- **Success Subject**: ✅ FibreFlow Meeting Sync - SUCCESS - YYYY-MM-DD
- **Failure Subject**: ❌ FibreFlow Meeting Sync - FAILED - YYYY-MM-DD

## Manual Operations

### Test Sync
```bash
# Test with 1 day of data
node scripts/sync-meetings-simple.cjs 1

# Test with default 7 days
./scripts/daily-meeting-sync.sh
```

### Check Cron Status
```bash
# View cron jobs
crontab -l | grep daily-meeting-sync

# View recent logs
tail -f logs/meeting-sync/sync-$(date +%Y-%m-%d).log

# View cron execution log
tail -f logs/meeting-sync/cron.log
```

### Update Configuration

#### Change Sync Time
1. Edit crontab: `crontab -e`
2. Update the schedule (currently `0 9 * * *`)
3. Save and exit

#### Change Email Recipient
1. Edit `/scripts/daily-meeting-sync.sh`
2. Update email addresses in notification sections
3. Test with `./scripts/daily-meeting-sync.sh`

## Troubleshooting

### Sync Not Running
1. Check cron service: `systemctl status cron`
2. Verify script permissions: `ls -la scripts/daily-meeting-sync.sh`
3. Check cron logs: `grep CRON /var/log/syslog`

### No Meetings Found
1. Verify API key is valid
2. Check date range parameters
3. Confirm meetings exist in Fireflies

### Email Not Received
1. Check if mail command exists: `command -v mail`
2. Verify email configuration
3. Check spam folder

## Security Considerations

1. **API Key Storage**: Currently in script (consider environment variables for production)
2. **Email Addresses**: Hardcoded (consider configuration file)
3. **Log Retention**: 30 days automatic cleanup
4. **Permissions**: Scripts should be executable by cron user only

## Future Enhancements

1. **Environment Variables**: Move API keys and emails to .env
2. **Webhook Support**: Real-time sync instead of daily batch
3. **Selective Sync**: Filter by meeting type or participants
4. **Database Backup**: Backup meetings before sync
5. **Metrics Dashboard**: Track sync performance over time

## Related Documentation

- `/scripts/README_MEETING_SYNC.md` - Quick reference for sync scripts
- `/docs/SYNC_MEETINGS_GUIDE.md` - User guide for meeting sync
- `CLAUDE.md` - Project-wide documentation