# FibreFlow API Reference

*Last Updated: 2025-01-08*

## Firebase Functions API

All functions are deployed to: `https://us-central1-fibreflow-73daf.cloudfunctions.net/`

### Authentication

Most functions require Firebase Authentication. Include the ID token in requests:
```javascript
const user = await firebase.auth().currentUser;
const token = await user.getIdToken();
```

---

## Meeting Management APIs

### getFirefliesMeetings
**Type**: Callable Function  
**Auth**: Not required (public)

Fetches meetings from Fireflies.ai integration.

**Request**:
```typescript
{
  dateFrom?: string;  // ISO date "2025-01-01"
  dateTo?: string;    // ISO date "2025-01-31"
}
```

**Response**:
```typescript
{
  meetings: Array<{
    id: string;
    title: string;
    date: string;
    duration: number;
    participants: Array<{
      name: string;
      email: string;
    }>;
    transcript_url: string;
    summary: string;
    action_items: Array<{
      text: string;
      assignee: string;
      due_date: string;
      speaker: string;
      timestamp: number;
    }>;
    video_url: string;
    audio_url: string;
  }>
}
```

**Usage**:
```typescript
const getMeetings = httpsCallable(functions, 'getFirefliesMeetings');
const result = await getMeetings({ 
  dateFrom: '2025-01-01', 
  dateTo: '2025-01-31' 
});
```

### getFirefliesTranscript
**Type**: Callable Function  
**Auth**: Not required (public)

Gets full transcript for a specific meeting.

**Request**:
```typescript
{
  meetingId: string;  // Fireflies meeting ID
}
```

**Response**:
```typescript
{
  transcript: {
    meeting_id: string;
    sentences: Array<{
      text: string;
      speaker_name: string;
      timestamp: number;
    }>;
  }
}
```

### syncFirefliesMeetings
**Type**: Callable Function  
**Auth**: Not required (public)

Syncs meetings from Fireflies to Firestore.

**Request**:
```typescript
{
  dateFrom?: string;
  dateTo?: string;
  forceUpdate?: boolean;  // Re-sync existing meetings
}
```

**Response**:
```typescript
{
  success: boolean;
  syncedCount: number;
  meetings: Array<Meeting>;
}
```

### syncMeetingsHttp
**Type**: HTTP Function  
**Auth**: Not required  
**Method**: GET/POST

CORS-enabled HTTP endpoint for syncing meetings.

**URL**: `/syncMeetingsHttp`

**Query Parameters**:
- `dateFrom` - Start date (ISO format)
- `dateTo` - End date (ISO format)

**Response**: Same as syncFirefliesMeetings

---

## Audit Trail APIs

### universalAuditTrail
**Type**: Firestore Trigger  
**Trigger**: On any document write

Automatically creates audit logs for all collection changes.

**Tracked Collections**:
- projects, tasks, clients, suppliers
- contractors, staff, stock, materials
- boq, quotes, rfqs, phases, steps
- roles, emailLogs, meetings, personalTodos

**Audit Log Structure**:
```typescript
{
  id: string;           // Event ID (prevents duplicates)
  entityType: string;   // Type of entity
  entityId: string;     // Document ID
  entityName: string;   // Human-readable name
  action: 'create' | 'update' | 'delete';
  changes?: Array<{     // Only for updates
    field: string;
    oldValue: any;
    newValue: any;
    dataType: string;
    displayOldValue: string;
    displayNewValue: string;
  }>;
  userId: string;
  userEmail: string;
  userDisplayName: string;
  actionType: 'user' | 'system';
  status: 'success';
  timestamp: Timestamp;
  metadata: {
    collection: string;
    cloudFunction: boolean;
    eventId: string;
  };
  source: 'audit';
}
```

### auditSubcollections
**Type**: Firestore Trigger  
**Trigger**: On subcollection document write

Tracks changes in nested subcollections.

### testAuditSystem
**Type**: HTTP Function  
**Auth**: Not required  
**Method**: GET

Tests the audit system by creating a test entry.

**URL**: `/testAuditSystem`

**Response**:
```json
{
  "success": true,
  "message": "Test audit log created successfully",
  "documentId": "abc123",
  "checkUrl": "https://fibreflow.web.app/audit-trail"
}
```

---

## Email Functions

### Mail Extension
**Collection**: `mail`

Uses Firebase Extensions for email. Write to `mail` collection:

```typescript
await addDoc(collection(db, 'mail'), {
  to: ['recipient@example.com'],
  message: {
    subject: 'Hello from FibreFlow',
    text: 'This is the plaintext version',
    html: '<p>This is the <b>HTML</b> version</p>'
  }
});
```

Email status updates in `mail/{id}/status` subcollection.

---

## Security Configuration

### API Keys
Set via Firebase Functions config:
```bash
firebase functions:config:set fireflies.api_key="your-api-key"
```

### CORS Configuration
syncMeetingsHttp allows origins:
- http://localhost:4200
- https://fibreflow.web.app
- https://fibreflow-73daf.web.app

---

## Error Handling

All callable functions throw `HttpsError` with codes:
- `unauthenticated` - User not logged in
- `permission-denied` - Insufficient permissions
- `invalid-argument` - Missing/invalid parameters
- `failed-precondition` - Missing configuration
- `internal` - Server error

Example error handling:
```typescript
try {
  const result = await getMeetings({});
} catch (error) {
  if (error.code === 'unauthenticated') {
    // Handle auth error
  }
  console.error('Function error:', error.message);
}
```

---

## Rate Limits

- Fireflies API: Subject to third-party limits
- Firestore triggers: No specific limits
- HTTP functions: Default Firebase quotas apply

---

## Deployment

Deploy all functions:
```bash
firebase deploy --only functions
```

Deploy specific function:
```bash
firebase deploy --only functions:getFirefliesMeetings
```

Check deployment:
```bash
firebase functions:list
```

---

## Testing Functions Locally

1. Start emulator:
```bash
firebase emulators:start --only functions
```

2. Set environment:
```bash
firebase functions:config:get > .runtimeconfig.json
```

3. Call local function:
```typescript
connectFunctionsEmulator(functions, 'localhost', 5001);
```