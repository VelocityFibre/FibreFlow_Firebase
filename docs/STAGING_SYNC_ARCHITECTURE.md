# Staging Sync Architecture for Offline Pole Capture

*Last Updated: 2025-01-30*

## Overview

The staging sync architecture implements a multi-stage synchronization process for offline pole capture data, ensuring data quality and validation before it reaches production databases.

## Architecture Flow

```
[Mobile Device] → [Offline Storage] → [Staging Collection] → [Production Database]
                    (IndexedDB)        (Firebase)            (Firebase)
```

## Components

### 1. Offline Storage Layer

**Service**: `OfflinePoleService`
- Stores pole data in IndexedDB
- Manages sync queue
- Tracks sync status for each pole
- Generates unique device IDs for tracking

**Sync Statuses**:
- `draft` - Saved but not ready for sync
- `pending` - Ready to sync
- `syncing` - Currently uploading
- `staged` - Uploaded to staging
- `synced` - In production
- `error` - Sync failed

### 2. Staging Sync Service

**Service**: `StagingSyncService`
- Uploads photos to Firebase Storage
- Creates staging documents with metadata
- Runs basic validation
- Tracks sync progress

**Staging Collection**: `staging-field-captures`

**Staging Document Structure**:
```typescript
{
  // Original pole data
  poleNumber?: string;
  projectId: string;
  gpsLocation?: { latitude: number; longitude: number };
  gpsAccuracy?: number;
  notes?: string;
  capturedBy: string;
  capturedAt: Date | Timestamp;
  
  // Staging metadata
  validation_status: 'pending' | 'validating' | 'validated' | 'rejected';
  validation_errors: ValidationError[];
  submitted_at: Date | Timestamp;
  validated_at?: Date | Timestamp;
  synced_to_production: boolean;
  production_id?: string;
  
  // References
  offline_id: string;
  device_id?: string;
  photoUrls?: { [key: string]: string };
}
```

### 3. Offline Sync Service

**Service**: `OfflineSyncService`
- Orchestrates sync process
- Delegates to staging sync
- Provides sync status summaries
- Handles retry logic

### 4. Staging Sync UI Component

**Component**: `StagingSyncUiComponent`
- Displays sync progress
- Shows queue status
- Manual sync trigger
- Error display and retry

## Sync Process

### 1. Capture Phase
1. User captures pole data offline
2. Data stored in IndexedDB with status `pending`
3. Photos stored as base64 in IndexedDB

### 2. Upload to Staging
1. When online, sync process starts
2. Photos uploaded to Firebase Storage
3. Staging document created in Firebase
4. Offline status updated to `staged`

### 3. Validation Phase
1. Basic validation runs on staged data
2. Validation status updated
3. Errors logged if validation fails

### 4. Production Sync
1. Validated items synced to production
2. Production ID recorded in staging
3. Offline data can be deleted

## Benefits

### Data Quality
- Nothing reaches production without validation
- Clear visibility of what failed and why
- Ability to fix and retry failed items

### Performance
- Validation doesn't block field operations
- Batch processing capabilities
- Async photo uploads

### Reliability
- Full audit trail of sync attempts
- Device tracking for debugging
- Graceful error handling

### User Experience
- Clear sync status visibility
- Manual sync control
- Offline-first design

## Usage

### Manual Sync
```typescript
// In component
await this.offlineSyncService.syncAllPendingPoles();
```

### Check Sync Status
```typescript
const summary = await this.offlineSyncService.getSyncSummary();
// Returns counts for offline, staging, and validation states
```

### Retry Failed Syncs
```typescript
await this.offlineSyncService.retryFailedSyncs();
```

## Future Enhancements

1. **Auto-validation Rules**
   - GPS boundary checking
   - Pole number format validation
   - Project assignment verification

2. **Conflict Resolution**
   - Handle duplicate pole numbers
   - Merge multiple captures of same pole
   - Version control for updates

3. **Batch Operations**
   - Bulk validation approval
   - Mass retry for failures
   - Export validation reports

4. **Advanced Monitoring**
   - Sync performance metrics
   - Device-specific analytics
   - Network quality adaptation

## Related Documentation

- [Multi-Database Architecture](./dbase/MULTI_DATABASE_ARCHITECTURE_WITH_STAGING.md)
- [Offline Capture Design Decision](./OFFLINE_CAPTURE_DESIGN_DECISION.md)
- [GPS Permission Handling](./GPS_PERMISSION_HANDLING.md)