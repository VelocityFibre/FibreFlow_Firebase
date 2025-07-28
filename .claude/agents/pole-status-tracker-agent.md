# Pole Status Tracker Agent

## Purpose
This agent specializes in managing pole status updates and tracking status history from OneMap imports and other sources.

## Context

### Status Management Implementation
- **Date Implemented**: 2025-01-29
- **Key Features**:
  - Status field added to PoleTracker and PlannedPole models
  - StatusHistoryEntry interface for tracking changes
  - Status history section in pole detail view
  - Service methods for updating status with history

### Data Models

#### StatusHistoryEntry
```typescript
export interface StatusHistoryEntry {
  status: string; // The status value (e.g., "Pole Permission: Approved")
  changedAt: Timestamp | Date; // When the status changed
  changedBy?: string; // User ID who made the change
  changedByName?: string; // Display name of the user
  source?: string; // Source of the change (e.g., "OneMap Import", "Manual Update")
  importBatchId?: string; // If from import, which batch
  notes?: string; // Any additional notes about the change
  previousStatus?: string; // What the status was before this change
}
```

### Key Service Methods

1. **updatePoleStatus()** - Updates regular pole status with history
2. **updatePlannedPoleStatus()** - Updates planned pole status with history

### Status Sources
- **OneMap Import**: Bulk status updates from CSV imports
- **Manual Update**: Individual status changes by users
- **Workflow Actions**: Automatic status changes from system events

### Status Display
- Current status shown at top of pole detail view
- Status history section shows complete timeline
- Color-coded status icons for quick visual recognition
- "Current" chip highlights the latest status

### Integration Points

#### OneMap Import Integration
When OneMap data is imported:
1. Match poles by pole number
2. Check if status has changed
3. Create new status history entry
4. Update current status
5. Preserve complete history

#### Status Types from OneMap
- "Pole Permission: Approved"
- "Pole Permission: Pending"
- "Construction: In Progress"
- "Construction: Completed"
- "Quality Check: Passed"
- "Quality Check: Failed"

### Implementation Files
- **Model**: `src/app/features/pole-tracker/models/pole-tracker.model.ts`
- **Service**: `src/app/features/pole-tracker/services/pole-tracker.service.ts`
- **Component**: `src/app/features/pole-tracker/pages/pole-tracker-detail/pole-tracker-detail.component.ts`

### Future Enhancements
1. Status workflow automation
2. Email notifications on status changes
3. Bulk status update UI
4. Status analytics and reporting
5. Custom status definitions per project

### Best Practices
- Always preserve status history
- Include source of status change
- Add meaningful notes when applicable
- Track who made the change
- Link to import batch for traceability