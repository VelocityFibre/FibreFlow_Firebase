# Offline Field App API Documentation

## Overview

The Offline Field App API is designed specifically for field workers capturing pole installation data. It follows a Firebase-first approach to ensure atomic operations with photos and GPS data, with background synchronization to Neon for analytics.

## Base URL
```
https://us-central1-fibreflow-73daf.cloudfunctions.net/offlineFieldAppAPI
```

## Authentication

All requests require two headers:
- `X-API-Key`: Your field app API key
- `X-Device-ID`: Unique device identifier

### Example Headers
```javascript
{
  'X-API-Key': 'field-app-prod-key-2025-001',
  'X-Device-ID': 'android_abc123def456'
}
```

## Endpoints

### 1. Health Check
**GET** `/health`

Check API status and verify authentication.

**Response:**
```json
{
  "status": "healthy",
  "service": "offline-field-app-api",
  "timestamp": "2025-08-16T12:00:00.000Z",
  "deviceId": "android_abc123def456"
}
```

### 2. Single Pole Capture
**POST** `/api/v1/poles/capture`

Capture a single pole with photos and GPS data.

**Request Body:**
```json
{
  "pole": {
    "poleNumber": "LAW.P.B167",
    "projectId": "project123",
    "gps": {
      "latitude": -26.123456,
      "longitude": 28.123456,
      "accuracy": 5.2,
      "timestamp": "2025-08-16T10:30:00.000Z"
    },
    "status": "installed",
    "contractorId": "contractor123",
    "notes": "Installation completed, good signal strength"
  },
  "photos": {
    "before": "https://storage.googleapis.com/...",
    "front": "https://storage.googleapis.com/...",
    "side": "https://storage.googleapis.com/...",
    "depth": "https://storage.googleapis.com/...",
    "concrete": "https://storage.googleapis.com/...",
    "compaction": "https://storage.googleapis.com/..."
  },
  "offline_created_at": "2025-08-16T10:25:00.000Z"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "submissionId": "field_android_abc123_1692345678",
    "status": "captured",
    "message": "Pole captured successfully"
  }
}
```

### 3. Batch Sync
**POST** `/api/v1/poles/batch`

Sync multiple poles captured offline. Maximum 100 poles per batch.

**Request Body:**
```json
{
  "poles": [
    {
      "pole": {
        "poleNumber": "LAW.P.B168",
        "projectId": "project123",
        "gps": { ... }
      },
      "photos": { ... },
      "metadata": {
        "offlineCreatedAt": "2025-08-16T09:00:00.000Z"
      }
    },
    // ... more poles
  ],
  "syncBatchId": "batch_android_abc123_1692345678"
}
```

**Response (207 Multi-Status):**
```json
{
  "success": true,
  "data": {
    "batchId": "batch_android_abc123_1692345678",
    "total": 50,
    "successful": 48,
    "failed": 2,
    "results": {
      "successful": [
        {
          "index": 0,
          "submissionId": "field_android_abc123_1692345678_0",
          "poleNumber": "LAW.P.B168"
        }
      ],
      "failed": [
        {
          "index": 15,
          "poleNumber": "LAW.P.B183",
          "error": "Invalid GPS coordinates"
        }
      ]
    }
  }
}
```

### 4. Photo Upload
**POST** `/api/v1/photos/upload`

Upload a photo and get a storage URL. Accepts base64 encoded images.

**Request Body:**
```json
{
  "poleNumber": "LAW.P.B167",
  "photoType": "front",
  "photoData": "base64_encoded_image_data...",
  "mimeType": "image/jpeg"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "url": "https://storage.googleapis.com/fibreflow-73daf.appspot.com/poles/LAW.P.B167/front_1692345678.jpg",
    "path": "poles/LAW.P.B167/front_1692345678.jpg",
    "photoType": "front"
  }
}
```

### 5. Check Submission Status
**GET** `/api/v1/poles/status/:submissionId`

Check the status of a previously submitted pole.

**Response:**
```json
{
  "success": true,
  "data": {
    "submissionId": "field_android_abc123_1692345678",
    "poleNumber": "LAW.P.B167",
    "validationStatus": "approved",
    "neonSyncStatus": "synced",
    "capturedAt": "2025-08-16T10:25:00.000Z",
    "deviceId": "android_abc123def456"
  }
}
```

### 6. Check Pending Syncs
**GET** `/api/v1/sync/pending`

Get count of poles pending sync for your device.

**Response:**
```json
{
  "success": true,
  "data": {
    "deviceId": "android_abc123def456",
    "pendingCount": 12,
    "timestamp": "2025-08-16T12:00:00.000Z"
  }
}
```

## Photo Requirements

Each pole capture should include these photo types:
- `before` - Site before installation
- `front` - Front view of installed pole
- `side` - Side angle view
- `depth` - Shows installation depth
- `concrete` - Base/foundation
- `compaction` - Ground compaction

## Data Flow

1. **Field Capture** → Firebase (immediate)
2. **Firebase** → Validation Queue (automatic)
3. **Validation** → Neon Staging (every 5 minutes)
4. **Neon Staging** → Production (after approval)

## Error Codes

| Code | Description | Action |
|------|-------------|--------|
| `UNAUTHORIZED` | Invalid API key | Check API key |
| `MISSING_DEVICE_ID` | Device ID not provided | Include X-Device-ID header |
| `VALIDATION_ERROR` | Required fields missing | Check request body |
| `CAPTURE_ERROR` | Failed to save data | Retry request |
| `BATCH_TOO_LARGE` | More than 100 poles | Split into smaller batches |
| `UPLOAD_ERROR` | Photo upload failed | Retry upload |

## Best Practices

### 1. Offline Queue Management
```javascript
// Store failed requests locally
const offlineQueue = [];

async function captureWithRetry(poleData) {
  try {
    const response = await capturePole(poleData);
    return response;
  } catch (error) {
    // Add to offline queue
    offlineQueue.push({
      timestamp: new Date().toISOString(),
      data: poleData
    });
    // Retry later
  }
}
```

### 2. Batch Sync Strategy
```javascript
// Sync in batches when online
async function syncOfflineData() {
  const batches = chunk(offlineQueue, 50); // Max 100, use 50 for safety
  
  for (const batch of batches) {
    try {
      await syncBatch(batch);
      // Remove synced items from queue
    } catch (error) {
      // Keep in queue for next attempt
    }
  }
}
```

### 3. Photo Optimization
```javascript
// Compress photos before upload
async function optimizePhoto(base64Data) {
  // Resize to max 1920x1080
  // Compress to ~500KB
  // Convert to JPEG if needed
  return optimizedBase64;
}
```

### 4. GPS Accuracy
```javascript
// Wait for good GPS signal
async function getAccurateLocation() {
  let bestLocation = null;
  let attempts = 0;
  
  while (attempts < 5) {
    const location = await getCurrentLocation();
    if (location.accuracy < 10) { // 10 meters
      return location;
    }
    if (!bestLocation || location.accuracy < bestLocation.accuracy) {
      bestLocation = location;
    }
    attempts++;
    await wait(2000); // Wait 2 seconds
  }
  
  return bestLocation;
}
```

## Rate Limits

- Single capture: 1000 requests/hour per device
- Batch sync: 100 requests/hour per device
- Photo upload: 500 uploads/hour per device
- Maximum request size: 50MB

## Integration Example

```javascript
class FieldAppAPI {
  constructor(apiKey, deviceId) {
    this.apiKey = apiKey;
    this.deviceId = deviceId;
    this.baseUrl = 'https://us-central1-fibreflow-73daf.cloudfunctions.net/offlineFieldAppAPI';
  }
  
  async capturePole(poleData, photos) {
    // Upload photos first
    const photoUrls = {};
    for (const [type, data] of Object.entries(photos)) {
      const upload = await this.uploadPhoto(poleData.poleNumber, type, data);
      photoUrls[type] = upload.data.url;
    }
    
    // Capture pole with photo URLs
    const response = await fetch(`${this.baseUrl}/api/v1/poles/capture`, {
      method: 'POST',
      headers: {
        'X-API-Key': this.apiKey,
        'X-Device-ID': this.deviceId,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        pole: poleData,
        photos: photoUrls,
        offline_created_at: poleData.capturedAt
      })
    });
    
    return response.json();
  }
  
  async uploadPhoto(poleNumber, photoType, base64Data) {
    const response = await fetch(`${this.baseUrl}/api/v1/photos/upload`, {
      method: 'POST',
      headers: {
        'X-API-Key': this.apiKey,
        'X-Device-ID': this.deviceId,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        poleNumber,
        photoType,
        photoData: base64Data,
        mimeType: 'image/jpeg'
      })
    });
    
    return response.json();
  }
}

// Usage
const api = new FieldAppAPI('field-app-prod-key-2025-001', 'android_abc123');
const result = await api.capturePole(poleData, photos);
```

## Testing

### Test API Key
For development/testing: `field-app-dev-key-2025`

### Test with cURL
```bash
# Health check
curl -H "X-API-Key: field-app-dev-key-2025" \
     -H "X-Device-ID: test-device-001" \
     https://us-central1-fibreflow-73daf.cloudfunctions.net/offlineFieldAppAPI/health

# Capture pole
curl -X POST \
     -H "X-API-Key: field-app-dev-key-2025" \
     -H "X-Device-ID: test-device-001" \
     -H "Content-Type: application/json" \
     -d '{
       "pole": {
         "poleNumber": "TEST.P.001",
         "gps": {
           "latitude": -26.123,
           "longitude": 28.456
         }
       }
     }' \
     https://us-central1-fibreflow-73daf.cloudfunctions.net/offlineFieldAppAPI/api/v1/poles/capture
```

## Support

For additional support or to request changes:
- Contact the FibreFlow development team
- Include your device ID in support requests
- Provide submission IDs for troubleshooting