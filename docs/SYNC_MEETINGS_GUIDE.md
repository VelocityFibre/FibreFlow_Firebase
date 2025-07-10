# Fireflies Meeting Sync Guide

*Last Updated: 2025-01-10*

## Overview

This guide explains how to sync meetings from Fireflies.ai into FibreFlow. The sync process retrieves meeting data including transcripts, summaries, and action items.

## Prerequisites

### 1. Fireflies Account Credentials
- **Email**: `meetings@velocityfibre.co.za`
- **Password**: `Mitzi@0203`
- **API Key**: `894886b5-b232-4319-95c7-1296782e9ea6`

### 2. Access Requirements
- Node.js installed
- Access to FibreFlow project directory
- Firebase project access

## Sync Methods

### Method 1: Improved Script Sync (Recommended)

The best way to sync meetings is using the improved sync script that properly parses action items:

```bash
# Sync last 30 days (default)
node scripts/sync-meetings-improved.js

# Sync specific number of days
node scripts/sync-meetings-improved.js 7   # Last 7 days
node scripts/sync-meetings-improved.js 60  # Last 60 days
```

**Note**: Use `sync-meetings-improved.js` instead of `sync-meetings-simple.js` as it properly parses individual action items from Fireflies' concatenated string format.

**What it does:**
- Fetches all meetings from Fireflies for the specified period
- Creates new meetings in Firebase if they don't exist
- Updates existing meetings with latest data
- Syncs action items, summaries, and participant information

### Method 2: Firebase Functions (Automated)

There's a scheduled function that runs every 6 hours automatically:
- Function: `syncFirefliesMeetings`
- Schedule: Every 6 hours
- Syncs: Last 24 hours of meetings

### Method 3: Manual Function Call

You can trigger a manual sync through Firebase Functions:

```javascript
// In the browser console on FibreFlow
const functions = getFunctions();
const syncMeetings = httpsCallable(functions, 'syncFirefliesMeetingsManually');
const result = await syncMeetings({ days: 30 });
console.log(result);
```

## Data Synced

### Meeting Information
- Title
- Date and time
- Duration
- Participants
- Organizer
- Meeting URL
- Recording URL (if available)

### Action Items
Action items are extracted from `summary.action_items` and include:
- Text content
- Priority (auto-detected from keywords)
- Assignee (blank by default)
- Due date (null by default)
- Completed status (false by default)

### Meeting Insights
- Keywords
- Summary/Overview
- Outline
- Bullet points

## Troubleshooting

### No Action Items Showing

If action items aren't appearing:

1. **Check the sync output** - Look for meetings with action items
2. **Verify in Firebase Console** - Check the meetings collection
3. **Look for the actionItems array** in meeting documents

### Common Issues

1. **Authentication Error**
   - Verify API key is correct
   - Check if Fireflies account is active

2. **No Meetings Found**
   - Extend the date range (use more days)
   - Verify meetings exist in Fireflies account

3. **Action Items Not Syncing**
   - Check if meetings have action_items in Fireflies
   - Look at the raw API response in the script

## Viewing Synced Meetings

1. **In FibreFlow UI**
   - Navigate to Meetings section
   - Action items appear in the table
   - Click meeting to see detailed action items

2. **In Firebase Console**
   - Go to Firestore Database
   - Navigate to `meetings` collection
   - Check `actionItems` array in documents

## Action Items Structure

Action items are stored as:
```javascript
{
  id: "meetingId_action_0",
  text: "Complete the API integration",
  assignee: "",
  dueDate: null,
  priority: "high", // auto-detected
  completed: false,
  speaker: "",
  timestamp: 0
}
```

Priority is auto-detected based on keywords:
- **High**: urgent, asap, critical, immediately
- **Medium**: important, priority
- **Low**: default for others

## Best Practices

1. **Regular Syncs**: Run sync at least weekly
2. **Check Results**: Verify action items after sync
3. **Date Ranges**: Start with smaller ranges (7-30 days)
4. **Monitor Logs**: Check console output for errors

## Quick Commands Reference

```bash
# Sync last 30 days (with proper action item parsing)
node scripts/sync-meetings-improved.js

# Sync last week
node scripts/sync-meetings-improved.js 7

# Sync last 2 months
node scripts/sync-meetings-improved.js 60

# Check sync logs
cat scripts/sync-meetings-improved.js | grep parseActionItems
```

## API Details

The sync uses Fireflies GraphQL API:
- Endpoint: `https://api.fireflies.ai/graphql`
- Auth: Bearer token with API key
- Query: Fetches transcripts with summaries

## Known Issues & Solutions

### Action Items Showing as One Long String

**Problem**: Fireflies returns action items as a single concatenated string rather than an array.

**Solution**: Use `sync-meetings-improved.js` which includes a parser that:
- Splits the string by lines
- Identifies assignees (marked with **Name**)
- Extracts individual action items with timestamps
- Creates proper structured objects for each item

## Related Files

- **Improved Sync Script**: `scripts/sync-meetings-improved.js` (use this!)
- **Simple Sync Script**: `scripts/sync-meetings-simple.js` (deprecated)
- **Firebase Functions**: `functions/src/fireflies-integration.ts`
- **Meeting Model**: `src/app/features/meetings/models/meeting.model.ts`
- **Meeting Service**: `src/app/features/meetings/services/meeting.service.ts`