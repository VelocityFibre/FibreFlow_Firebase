# Offline Pole Tracking Mobile App Implementation Plan

## Overview
Enhance existing pole-tracker/mobile implementation with offline capabilities for field agents to capture pole GPS locations and photos without internet connection.

## Requirements
1. **Offline Functionality**: App must work without internet - capture GPS, photos, pole data
2. **5m GPS Accuracy**: Use device GPS with high accuracy mode
3. **Photo Management**: Multiple photos per pole, compressed for storage
4. **Pole Number Linking**: Associate captures with existing pole IDs
5. **Sync When Online**: Auto-sync to Firebase when connection restored

## Technical Architecture

### 1. Service Worker Configuration
- Angular Service Workers for offline capability
- Cache essential resources
- Handle offline/online state transitions

### 2. Offline Storage (IndexedDB)
```typescript
export class OfflinePoleService extends BaseFirestoreService<PoleData> {
  private db: IDBDatabase;
  
  async storeOffline(poleData: PoleData): Promise<void> {
    // Store in IndexedDB with photos
    // Mark as pending sync
  }
  
  async syncWhenOnline(): Promise<void> {
    // Get all pending records
    // Upload to Firebase/Firestore  
    // Clear local storage after sync
  }
}
```

### 3. GPS Capture (5m Accuracy)
```typescript
navigator.geolocation.getCurrentPosition(
  position => {
    const coords = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy // Must be <5m
    };
  },
  error => console.error(error),
  {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 0
  }
);
```

### 4. Photo Capture & Compression
- HTML5 Camera API or Capacitor
- Compress images for storage
- Store as base64 or blob
- Multiple photos per pole

### 5. UI Enhancements
- Large touch-friendly buttons
- Offline indicator
- Sync status display
- Photo preview thumbnails
- GPS accuracy indicator

## Implementation Steps

### Phase 1: Service Worker Setup
1. Configure Angular Service Worker in `angular.json`
2. Create service worker configuration
3. Register service worker in app module
4. Test offline resource caching

### Phase 2: IndexedDB Storage
1. Create database schema for poles, photos, sync queue
2. Implement OfflinePoleService
3. Add storage methods for pole data
4. Create sync queue management

### Phase 3: GPS & Photo Capture
1. Enhance existing GPS capture with accuracy requirements
2. Add photo capture with compression
3. Store photos in IndexedDB
4. Link photos to pole records

### Phase 4: Sync Mechanism
1. Detect online/offline state
2. Queue changes when offline
3. Auto-sync when connection restored
4. Handle sync conflicts

### Phase 5: UI Updates
1. Add offline indicator component
2. Show sync status and queue count
3. Add GPS accuracy display
4. Update forms for offline mode

## File Structure
```
src/app/features/pole-tracker/mobile/
├── services/
│   ├── offline-pole.service.ts
│   ├── offline-sync.service.ts
│   └── photo-compression.service.ts
├── components/
│   ├── offline-indicator/
│   ├── sync-status/
│   └── gps-accuracy/
└── models/
    ├── offline-pole.model.ts
    └── sync-queue.model.ts
```

## Testing Strategy
1. Test in airplane mode
2. Verify GPS accuracy meets 5m requirement
3. Test photo capture and storage
4. Verify sync works when online
5. Test with poor/intermittent connectivity

## Performance Considerations
- Limit IndexedDB storage size
- Compress photos before storage
- Batch sync operations
- Clear synced data promptly

## Security
- Encrypt sensitive data in IndexedDB
- Validate data before sync
- Handle authentication offline

## Deployment
1. Deploy service worker
2. Test with field agents
3. Monitor sync performance
4. Iterate based on feedback