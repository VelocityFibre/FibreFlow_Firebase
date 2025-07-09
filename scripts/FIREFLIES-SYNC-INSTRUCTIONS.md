# Fireflies Meeting Sync Instructions

## Overview
This script syncs meetings from Fireflies.ai to Firebase Firestore for display in the FibreFlow meetings page.

## Usage

### Quick Commands
```bash
# Sync all meetings (no date filter)
npm run sync:meetings

# Sync last 7 days
npm run sync:meetings:7days

# Sync last 60 days
npm run sync:meetings:60days

# Custom date range (e.g., last 90 days)
node scripts/sync-meetings-simple.js 90
```

### What it does
1. Connects to Fireflies API using the configured API key
2. Fetches all meetings (or within specified date range)
3. For each meeting:
   - Checks if it already exists in Firebase (by firefliesId)
   - Creates new meetings or updates existing ones
   - Extracts and saves action items with priority levels
   - Processes participant emails into structured data
4. Shows progress for each meeting processed
5. Displays summary statistics at the end

### Meeting Data Synced
- Meeting title, date, duration
- Participants (extracted from email addresses)
- Organizer email
- Meeting URL/link
- Summary and insights
- Action items with priorities (high/medium/low)
- Keywords and bullet points

### Viewing Synced Meetings
After running the sync, meetings will be available at:
https://fibreflow.web.app/meetings

The meetings page will display:
- All synced meetings in a table view
- Summary cards showing total meetings, today's meetings, action items
- Filters for searching and date ranges
- Click on any meeting to view details

### Troubleshooting
- **No meetings found**: Check if there are meetings in your Fireflies account
- **API errors**: Verify the API key is correct in the script
- **Permission errors**: Ensure Firebase is properly configured

### API Key
The Fireflies API key is hardcoded in the script. To update it:
1. Edit `scripts/sync-meetings-simple.js`
2. Update the `FIREFLIES_API_KEY` constant
3. The key can be found in your Fireflies account settings