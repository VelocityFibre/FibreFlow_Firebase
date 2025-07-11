# Meetings Feature - Development Notes

## Overview
Meeting management system integrated with Fireflies.ai for automatic meeting transcription and action item tracking.

## Current Status (2025-01-11)

### Completed ✅
- Fireflies API integration via Firebase Functions
- Meeting list view with action items display
- Meeting detail page with full transcript
- Delete meeting functionality
- Action item priority detection (high/medium/low)
- Sync meetings script (`scripts/sync-meetings-simple.js`)
- Fixed action items array display in table

### In Progress 🚧
- Edit meeting details functionality
- Manual action item assignment
- Due date setting for action items

### TODO 📋

#### High Priority
- [ ] Add edit meeting details dialog
- [ ] Implement action item assignment to team members
- [ ] Add due date picker for action items
- [ ] Create action item completion tracking
- [ ] Add meeting notes editing capability

#### Medium Priority
- [ ] Implement meeting search/filter
- [ ] Add export to PDF/Excel
- [ ] Create meeting templates
- [ ] Add recurring meeting support
- [ ] Implement meeting reminders

#### Low Priority
- [ ] Add meeting analytics dashboard
- [ ] Create meeting cost tracking
- [ ] Add integration with calendar apps
- [ ] Implement meeting recording playback

## Technical Details

### Fireflies Integration
- API Key stored in Firebase Functions config
- GraphQL API endpoint: `https://api.fireflies.ai/graphql`
- Sync runs every 6 hours automatically
- Manual sync available via script

### Action Items Structure
```typescript
{
  id: string;
  text: string;
  assignee: string;
  dueDate: Date | null;
  priority: 'high' | 'medium' | 'low';
  completed: boolean;
  speaker: string;
  timestamp: number;
}
```

### Database Schema
```typescript
// Firestore Collection: meetings
{
  id: string;
  firefliesId: string;
  title: string;
  date: Date;
  duration: number;
  participants: Participant[];
  organizer: string;
  meetingUrl?: string;
  recordingUrl?: string;
  summary: string;
  actionItems: ActionItem[];
  keywords: string[];
  createdAt: Date;
  updatedAt: Date;
}
```

## API Endpoints

### Firebase Functions
- `getFirefliesMeetings` - Fetch meetings from Fireflies
- `getFirefliesTranscript` - Get full transcript
- `syncFirefliesMeetings` - Sync to Firestore
- `syncMeetingsHttp` - HTTP endpoint for sync

## Known Issues
- Action items sometimes don't have speakers identified
- Large transcripts can be slow to load
- No offline support for transcript viewing

## Sync Commands
```bash
# Sync last 30 days (default)
node scripts/sync-meetings-simple.js

# Sync specific days
node scripts/sync-meetings-simple.js 7   # Last 7 days
node scripts/sync-meetings-simple.js 60  # Last 60 days
```

## Related Files
- Service: `meeting.service.ts`
- List Component: `meeting-list/`
- Detail Component: `meeting-detail/`
- Sync Script: `scripts/sync-meetings-simple.js`
- Firebase Functions: `functions/src/fireflies-integration.ts`
- Documentation: `docs/SYNC_MEETINGS_GUIDE.md`