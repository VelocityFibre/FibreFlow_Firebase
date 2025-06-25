# Fireflies Meeting Notes Integration Plan

## Overview
Integration of Fireflies.ai meeting transcription service with FibreFlow to automatically import meeting notes, extract action items, and create personal todo lists for team members.

## Requirements Summary
- **Meeting Frequency**: At least one 60-minute meeting per day with multiple participants
- **Transcript Usage**: Maintain full insights, context, and information long-term
- **Team Size**: Up to 50 staff members requiring individual todo lists
- **Integration Preference**: Auto-create tasks with manual review/edit capability
- **Email Frequency**: Daily digest of todos
- **Search Requirements**: Full-text search within meeting transcripts

## Architecture Design

### 1. Storage Strategy (Hybrid Approach)

#### Firestore Collections
```
meetings/
  - id: string
  - firefliesToId: string
  - title: string
  - date: Date
  - duration: number
  - participants: MeetingParticipant[]
  - summary: string (AI-generated)
  - actionItems: ActionItem[]
  - insights: Insight[]
  - transcriptStorageUrl: string
  - vectorEmbeddingId: string
  - projectId?: string
  - status: MeetingStatus

personalTodos/
  - id: string
  - userId: string
  - text: string
  - source: 'meeting' | 'manual'
  - meetingId?: string
  - dueDate?: Date
  - priority: 'high' | 'medium' | 'low'
  - completed: boolean
  - completedAt?: Date
  - assignedBy?: string
  - createdAt: Date
  - updatedAt: Date
```

#### Firebase Storage
```
meetings/{meetingId}/
  - transcript.json.gz (compressed full transcript)
  - audio.mp3 (optional)
  - summary.pdf (optional)
```

#### Vector Database (for semantic search)
- Meeting summaries embeddings
- Action items embeddings
- Transcript chunks for semantic search
- Options: Firebase Vector Search Extension or Pinecone integration

### 2. Data Models

#### Meeting Model
- Complete meeting metadata
- Participants with speaking duration
- Action items with assignees
- AI-extracted insights (decisions, risks, deadlines)
- Links to transcript storage

#### Personal Todo Model
- Individual todo items per staff member
- Source tracking (meeting vs manual)
- Priority and due dates
- Completion tracking

### 3. Module Structure

```
src/app/features/
├── meetings/
│   ├── services/
│   │   ├── fireflies.service.ts
│   │   ├── meeting.service.ts
│   │   ├── meeting-search.service.ts
│   │   └── transcript-processor.service.ts
│   ├── models/
│   │   └── meeting.model.ts
│   ├── pages/
│   │   ├── meeting-list/
│   │   ├── meeting-detail/
│   │   └── meeting-search/
│   └── components/
│       ├── action-item-list/
│       ├── meeting-summary/
│       └── transcript-viewer/
│
└── personal-todos/
    ├── services/
    │   ├── personal-todo.service.ts
    │   └── todo-email.service.ts
    ├── models/
    │   └── personal-todo.model.ts
    ├── pages/
    │   └── todo-management/
    └── components/
        ├── todo-list/
        └── todo-filters/
```

### 4. Implementation Phases

#### Phase 1: Core Infrastructure (Week 1)
- [x] Create meeting and personal todo models ✅ (2025-06-25)
- [ ] Set up Firebase collections and security rules
- [x] Create basic CRUD services for meetings and todos ✅ (2025-06-25)
- [ ] Implement meeting list and detail pages (placeholder created)

#### Phase 2: Fireflies Integration (Week 2)
- [x] Implement Fireflies API service ✅ (2025-06-25)
- [x] Create authentication flow for Fireflies ✅ (via Firebase Functions)
- [x] Build sync service for fetching meetings ✅ (scheduled function)
- [ ] Implement transcript compression and storage

#### Phase 3: AI Processing (Week 3)
- [x] Integrate AI for action item extraction ✅ (basic priority detection)
- [ ] Implement insight detection (decisions, risks, etc.)
- [x] Create automatic todo generation from action items ✅ (method created)
- [ ] Build manual review interface

#### Phase 4: Search & Analytics (Week 4)
- [ ] Implement vector search for semantic queries
- [ ] Create full-text search for transcripts
- [ ] Build meeting analytics dashboard
- [ ] Add trending topics and insights

#### Phase 5: Automation & Notifications (Week 5)
- [x] Set up background sync jobs ✅ (6-hour schedule)
- [ ] Implement daily email digests
- [ ] Create reminder system
- [ ] Add Slack/Teams integration (optional)

### 5. Technical Implementation Details

#### Fireflies API Integration
```typescript
// Service structure
class FirefliesService {
  - authenticate()
  - fetchMeetings(dateRange)
  - getMeetingTranscript(meetingId)
  - getActionItems(meetingId)
  - webhookHandler()
}
```

#### Transcript Processing
```typescript
// Processing pipeline
1. Fetch from Fireflies
2. Extract metadata
3. Compress transcript (gzip)
4. Store in Firebase Storage
5. Extract action items via AI
6. Generate embeddings
7. Update Firestore
```

#### Search Implementation
- Use Firebase Extensions for vector search
- Alternatively: Pinecone for more advanced capabilities
- Chunk transcripts into semantic segments
- Generate embeddings using OpenAI or similar

#### Email Digest System
```typescript
// Daily digest structure
- Personal todos due today/overdue
- New todos from yesterday's meetings
- Completed todos summary
- Upcoming deadlines
```

### 6. Security Considerations
- Fireflies API keys in Firebase Functions environment
- User-level access control for personal todos
- Meeting access based on participant list
- Encrypted storage for sensitive transcripts

### 7. Performance Optimization
- Compress transcripts (60-70% size reduction)
- Lazy load transcript content
- Cache frequently accessed meetings
- Implement pagination for meeting lists
- Use Firebase CDN for transcript delivery

### 8. Cost Estimates
Based on 365 meetings/year:
- Firestore: ~$50/month (documents + reads)
- Storage: ~$10/month (5GB compressed transcripts)
- Vector search: ~$100/month (depending on provider)
- Firebase Functions: ~$20/month
- Total: ~$180/month

### 9. Future Enhancements
- Meeting recording playback
- Real-time collaboration on action items
- Integration with calendar systems
- Advanced analytics and reporting
- Mobile app for on-the-go access
- Voice commands for todo management

### 10. Success Metrics
- Time saved per meeting: 30-45 minutes
- Action item completion rate: >80%
- Meeting insight extraction accuracy: >90%
- User adoption rate: >95%
- Search query satisfaction: >85%

## Next Steps
1. Review and approve the plan
2. Set up Fireflies API access
3. Begin Phase 1 implementation
4. Schedule weekly progress reviews