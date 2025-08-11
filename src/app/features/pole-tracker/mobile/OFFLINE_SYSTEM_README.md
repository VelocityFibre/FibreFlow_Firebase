# Offline-Capable Mobile Pole Tracking System

## Overview
This is a complete offline-first mobile solution for field agents to capture pole GPS locations and photos without internet connectivity. The system automatically syncs data when connection is restored.

## Features

### 🔄 Offline Capabilities
- **Full offline operation** - Capture GPS, photos, and pole data without internet
- **IndexedDB storage** - Local storage for offline data with queued sync
- **Service Worker** - Cache essential resources for offline access
- **Auto-sync** - Automatically sync when connection is restored
- **Conflict resolution** - Handle data conflicts gracefully

### 📍 GPS & Location
- **5m accuracy requirement** - Enforces minimum GPS accuracy of 5 meters
- **High accuracy mode** - Uses device GPS with maximum precision
- **Multiple attempts** - Retries up to 5 times for better accuracy
- **Visual feedback** - Shows GPS accuracy and status in real-time
- **Location validation** - Ensures coordinates meet quality standards

### 📱 Photo Management  
- **6 photo types** - Before, Front, Side, Depth, Concrete, Compaction
- **Image compression** - Automatically compresses photos to save storage
- **Multiple photos** - Support for multiple photos per pole
- **Base64 storage** - Efficient storage in IndexedDB
- **Preview functionality** - Review photos before saving

### 🔄 Sync Management
- **Progress tracking** - Real-time sync progress with detailed status
- **Error handling** - Comprehensive error reporting and retry logic
- **Selective sync** - Sync individual poles or batch operations
- **Status indicators** - Visual indicators for online/offline status
- **Queue management** - Manages sync queue with automatic retry

## Architecture

### Core Services

#### OfflinePoleService
- **Location**: `mobile/services/offline-pole.service.ts`
- **Purpose**: Manages offline pole data storage and retrieval
- **Features**:
  - IndexedDB database management
  - Pole data CRUD operations
  - Photo storage and retrieval
  - Sync queue management

#### EnhancedGPSService
- **Location**: `mobile/services/enhanced-gps.service.ts`
- **Purpose**: High-precision GPS capture with accuracy requirements
- **Features**:
  - 5m accuracy enforcement
  - Multiple attempt strategy
  - Real-time position tracking
  - Error handling and recovery

#### PhotoCompressionService
- **Location**: `mobile/services/photo-compression.service.ts`
- **Purpose**: Image compression and optimization
- **Features**:
  - Automatic image compression
  - Multiple format support
  - Size optimization
  - Quality preservation

#### OfflineSyncService
- **Location**: `mobile/services/offline-sync.service.ts`
- **Purpose**: Synchronization with Firebase when online
- **Features**:
  - Automatic sync detection
  - Progress tracking
  - Error handling and retry
  - Photo upload to Firebase Storage

### UI Components

#### OfflineCaptureComponent
- **Location**: `mobile/pages/offline-capture/offline-capture.component.ts`
- **Purpose**: Main capture interface with stepper workflow
- **Route**: `/pole-tracker/mobile/offline-capture`
- **Features**:
  - 4-step wizard interface
  - Form validation
  - GPS capture integration
  - Photo capture workflow
  - Review and save functionality

#### OfflineIndicatorComponent
- **Location**: `mobile/components/offline-indicator/offline-indicator.component.ts`
- **Purpose**: Shows online/offline status with pending count
- **Features**:
  - Real-time connectivity status
  - Offline data count badge
  - Visual status indicators

#### SyncStatusComponent  
- **Location**: `mobile/components/sync-status/sync-status.component.ts`
- **Purpose**: Detailed sync progress and management
- **Features**:
  - Progress bar for sync operations
  - Error list with details
  - Manual sync triggers
  - Retry failed operations

#### GPSAccuracyComponent
- **Location**: `mobile/components/gps-accuracy/gps-accuracy.component.ts`
- **Purpose**: GPS accuracy display and status
- **Features**:
  - Real-time accuracy display
  - Visual accuracy indicators
  - Tooltip with detailed GPS info

#### OfflinePhotoCaptureComponent
- **Location**: `mobile/components/offline-photo-capture/offline-photo-capture.component.ts`
- **Purpose**: Complete photo capture workflow
- **Features**:
  - 6 photo type support
  - Image compression preview
  - Photo gallery management
  - Required photo validation

## Database Schema

### IndexedDB Structure
```javascript
Database: fibreflow-offline
Version: 1

Object Stores:
- poles: { keyPath: 'id', indices: ['syncStatus', 'projectId', 'capturedAt'] }
- photos: { keyPath: 'id', indices: ['poleId', 'type'] }
- syncQueue: { keyPath: 'id', indices: ['type', 'attempts'] }
```

### Data Models

#### OfflinePoleData
```typescript
interface OfflinePoleData {
  id: string;
  syncStatus: 'pending' | 'syncing' | 'synced' | 'error';
  capturedOffline: boolean;
  capturedAt: Date;
  photos: OfflinePhoto[];
  projectId?: string;
  poleNumber?: string;
  gpsLocation?: { latitude: number; longitude: number };
  gpsAccuracy?: number;
  // ... additional fields
}
```

#### OfflinePhoto
```typescript
interface OfflinePhoto {
  id: string;
  data: string; // Base64 encoded
  type: 'before' | 'front' | 'side' | 'depth' | 'concrete' | 'compaction';
  timestamp: Date;
  size: number;
  compressed: boolean;
}
```

## Usage Workflow

### Field Agent Workflow
1. **Open Application** - Navigate to offline capture page
2. **Enter Basic Info** - Select project, enter pole number, add notes
3. **Capture GPS** - Get location with 5m accuracy requirement
4. **Take Photos** - Capture required photos (before, front, side)
5. **Review Data** - Review all captured information
6. **Save Offline** - Store in IndexedDB for later sync
7. **Auto-sync** - System syncs when connection available

### Administrator Monitoring
1. **Check Sync Status** - View pending offline captures
2. **Monitor Progress** - Track sync operations
3. **Handle Errors** - Retry failed syncs
4. **Data Validation** - Verify synced data integrity

## Configuration

### Service Worker Configuration
- **File**: `ngsw-config.json`
- **Strategy**: Freshness first with performance fallback
- **Cache**: Essential app resources and API responses
- **Update Strategy**: Register when stable

### GPS Requirements
- **Minimum Accuracy**: 5 meters
- **Maximum Attempts**: 5 retries
- **Timeout**: 10 seconds per attempt
- **High Accuracy**: Enabled by default

### Photo Compression
- **Max Width**: 1920px
- **Max Height**: 1080px
- **Quality**: 80%
- **Format**: JPEG
- **Base64 Encoding**: For IndexedDB storage

## Deployment

### Prerequisites
1. Angular Service Worker installed
2. Firebase project configured
3. IndexedDB support in browser
4. GPS capability on device

### Build Configuration
```bash
npm run build  # Service worker automatically included in production
```

### Environment Variables
- Service worker enabled in production only
- Firebase configuration for sync
- Storage bucket for photo uploads

## Testing

### Offline Testing
1. **Enable Airplane Mode** - Test full offline capability
2. **Capture Data** - Create poles, take photos, store locally
3. **Verify Storage** - Check IndexedDB for data persistence
4. **Restore Connection** - Re-enable internet connection
5. **Verify Sync** - Confirm automatic synchronization

### GPS Testing
1. **Indoor Testing** - Verify graceful handling of poor GPS
2. **Accuracy Validation** - Test 5m accuracy requirement
3. **Multiple Attempts** - Verify retry logic for better accuracy
4. **Error Handling** - Test GPS unavailable scenarios

### Photo Testing
1. **Capture Quality** - Test photo compression and quality
2. **Storage Limits** - Test with multiple large photos
3. **Upload Process** - Verify photo upload to Firebase Storage
4. **Type Validation** - Test required photo types

## Monitoring & Debugging

### Browser DevTools
- **Application Tab** - Check IndexedDB storage
- **Network Tab** - Monitor sync requests
- **Service Worker** - Verify offline functionality
- **Console** - Debug error messages

### Firebase Console
- **Firestore** - Verify synced pole data
- **Storage** - Check uploaded photos
- **Functions** - Monitor sync operations

## Security Considerations

### Data Protection
- No sensitive data in IndexedDB
- Photos encrypted during storage
- User authentication for sync
- Firestore security rules enforced

### Privacy
- GPS coordinates stored securely
- User data isolated per project
- Photo access restricted by role
- Audit trail for all operations

## Performance

### Storage Management
- Automatic cleanup after sync
- Compressed photos to minimize storage
- Efficient IndexedDB queries
- Background sync operations

### Battery Optimization
- GPS capture on demand only
- Service worker efficient caching
- Minimal background processing
- User-initiated sync operations

## Troubleshooting

### Common Issues

#### GPS Not Working
1. Check device location permissions
2. Verify GPS hardware functionality
3. Try outdoor location for better signal
4. Increase timeout in GPS service

#### Photos Not Saving
1. Check browser storage quota
2. Verify image compression settings
3. Test with smaller images
4. Clear IndexedDB if corrupted

#### Sync Failures
1. Verify internet connectivity
2. Check Firebase authentication
3. Review sync queue for errors
4. Retry failed operations manually

#### Service Worker Issues
1. Hard refresh browser (Ctrl+Shift+R)
2. Clear browser cache and data
3. Verify service worker registration
4. Check for console errors

## Future Enhancements

### Planned Features
- **Batch Photo Upload** - Upload multiple photos simultaneously
- **Advanced GPS Filtering** - Smart accuracy improvement
- **Offline Maps** - Cached map tiles for offline viewing
- **Voice Notes** - Audio capture with photos
- **Team Sync** - Share data between team members offline

### Performance Improvements
- **Smart Sync** - Only sync changed data
- **Background Sync** - Sync during idle time
- **Compression Levels** - User-selectable photo quality
- **Storage Optimization** - Better IndexedDB management

## Support

### Documentation
- Implementation plan: `OFFLINE_IMPLEMENTATION_PLAN.md`
- Architecture overview: This file
- API documentation: Service and component files

### Contact
- Development team: Check project contributors
- Issues: GitHub issues in project repository
- Feature requests: Project management system