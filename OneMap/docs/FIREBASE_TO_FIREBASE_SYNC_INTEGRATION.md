# Firebase-to-Firebase Sync Integration for Pole Status

## Overview
This document outlines the integration approach for syncing pole status data between two Firebase databases (OneMap and FibreFlow) using real-time synchronization.

## Architecture
- **Source Database**: VF OneMap Firebase (contains status updates)
- **Target Database**: FibreFlow Firebase (pole tracker system)
- **Sync Method**: Real-time Firestore listeners (not CSV imports)
- **Matching Key**: Pole Number

## Implementation Strategy

### 1. Real-time Sync Setup
```javascript
// Listen to OneMap status changes
const oneMapDb = initializeApp(oneMapConfig, 'onemap');
const fibreFlowDb = initializeApp(fibreFlowConfig, 'fibreflow');

// Set up real-time listener
const unsubscribe = onSnapshot(
  collection(getFirestore(oneMapDb), 'pole-status-updates'),
  (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added' || change.type === 'modified') {
        syncPoleStatus(change.doc.data());
      }
    });
  }
);
```

### 2. Status Sync Function
```javascript
async function syncPoleStatus(oneMapData) {
  const { poleNumber, status, agent, timestamp, batchId } = oneMapData;
  
  // Find pole in FibreFlow by pole number
  const poleQuery = query(
    collection(getFirestore(fibreFlowDb), 'pole-trackers'),
    where('poleNumber', '==', poleNumber)
  );
  
  const snapshot = await getDocs(poleQuery);
  
  if (!snapshot.empty) {
    const poleDoc = snapshot.docs[0];
    
    // Use the updatePoleStatus method
    await poleTrackerService.updatePoleStatus(
      poleDoc.id,
      status,
      'OneMap Sync',
      `Synced from OneMap at ${timestamp}`,
      'system',
      agent,
      batchId
    );
  }
  
  // Also check planned poles
  const plannedQuery = query(
    collection(getFirestore(fibreFlowDb), 'planned-poles'),
    where('poleNumber', '==', poleNumber)
  );
  
  const plannedSnapshot = await getDocs(plannedQuery);
  
  if (!plannedSnapshot.empty) {
    const plannedDoc = plannedSnapshot.docs[0];
    
    await poleTrackerService.updatePlannedPoleStatus(
      plannedDoc.id,
      status,
      'OneMap Sync',
      `Synced from OneMap at ${timestamp}`,
      'system',
      agent,
      batchId
    );
  }
}
```

### 3. Integration Points

#### Service Methods to Use:
1. **updatePoleStatus(poleId, newStatus, source, notes, changedBy, changedByName, importBatchId)**
   - For regular poles in 'pole-trackers' collection
   
2. **updatePlannedPoleStatus(poleId, newStatus, source, notes, changedBy, changedByName, importBatchId)**
   - For planned poles in 'planned-poles' collection

#### Parameters for Sync:
- **poleId**: Document ID from FibreFlow (found by pole number)
- **newStatus**: Status from OneMap (e.g., "Pole Permission: Approved")
- **source**: "OneMap Sync" (to distinguish from manual updates)
- **notes**: Include sync timestamp and any relevant info
- **changedBy**: "system" or OneMap user ID
- **changedByName**: Agent name from OneMap
- **importBatchId**: OneMap batch ID for traceability

### 4. Status Mapping
OneMap statuses that will sync:
- "Pole Permission: Approved"
- "Pole Permission: Pending"
- "Pole Permission: Rejected"
- "Construction: In Progress"
- "Construction: Completed"
- "Quality Check: Passed"
- "Quality Check: Failed"
- "Installation: Scheduled"
- "Installation: Completed"

### 5. Error Handling
```javascript
try {
  await syncPoleStatus(data);
  console.log(`✓ Synced status for pole ${data.poleNumber}`);
} catch (error) {
  console.error(`✗ Failed to sync pole ${data.poleNumber}:`, error);
  // Log to error collection for retry
  await addDoc(collection(getFirestore(fibreFlowDb), 'sync-errors'), {
    poleNumber: data.poleNumber,
    error: error.message,
    timestamp: serverTimestamp(),
    retryCount: 0,
    data: data
  });
}
```

### 6. Sync Configuration
```javascript
// OneMap/config/sync-config.js
export const SYNC_CONFIG = {
  // Sync interval for batch updates (if needed)
  batchSyncInterval: 5 * 60 * 1000, // 5 minutes
  
  // Collections to sync
  collections: {
    source: 'pole-status-updates',
    targets: ['pole-trackers', 'planned-poles']
  },
  
  // Field mappings
  fieldMappings: {
    poleNumber: 'poleNumber',
    status: 'status',
    agent: 'changedByName',
    timestamp: 'changedAt'
  },
  
  // Retry configuration
  retry: {
    maxAttempts: 3,
    backoffMs: 1000
  }
};
```

### 7. Monitoring & Logging
```javascript
// Log all sync operations
async function logSyncOperation(operation, success, details) {
  await addDoc(collection(getFirestore(fibreFlowDb), 'sync-logs'), {
    operation,
    success,
    details,
    timestamp: serverTimestamp()
  });
}
```

### 8. Future Enhancements
1. **Bi-directional sync** - Update OneMap when FibreFlow status changes
2. **Conflict resolution** - Handle simultaneous updates
3. **Batch processing** - For initial data migration
4. **Webhook notifications** - Alert on sync failures
5. **Dashboard** - Real-time sync monitoring

## Implementation Checklist
- [ ] Set up Firebase multi-app configuration
- [ ] Create sync service with real-time listeners
- [ ] Implement pole matching by pole number
- [ ] Add error handling and retry logic
- [ ] Create sync monitoring dashboard
- [ ] Test with sample data
- [ ] Deploy to production
- [ ] Monitor initial sync performance

## Security Considerations
- Use service accounts with minimal required permissions
- Encrypt sensitive data in transit
- Implement rate limiting for sync operations
- Audit all status changes
- Regular security reviews

## Related Files
- `/src/app/features/pole-tracker/services/pole-tracker.service.ts` - Status update methods
- `/src/app/features/pole-tracker/models/pole-tracker.model.ts` - StatusHistoryEntry interface
- `.claude/agents/pole-status-tracker-agent.md` - Agent context