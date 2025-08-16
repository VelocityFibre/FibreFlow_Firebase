# Offline Field App API Documentation

## Overview

The Offline Field App API provides endpoints for mobile field applications to synchronize pole installation data with the FibreFlow system. It supports offline-first data capture with batch synchronization capabilities.

## Base URL

```
https://us-central1-fibreflow-73daf.cloudfunctions.net/offlineFieldAppAPI
```

## Authentication

All requests require the following headers:

| Header | Required | Description |
|--------|----------|-------------|
| `X-API-Key` | Yes | API key for authentication |
| `X-Device-ID` | Yes | Unique device identifier |
| `X-App-Version` | No | App version for tracking |
| `Content-Type` | Yes | Must be `application/json` |

### Valid API Keys (Development)
- `field-app-dev-key-2025`
- `field-app-prod-key-2025-001`

## Endpoints

### 1. Health Check

Check if the API is accessible and healthy.

**Endpoint**: `GET /health`

**Response**:
```json
{
  "status": "healthy",
  "service": "offline-field-app-api",
  "timestamp": "2025-08-16T14:00:00.000Z",
  "deviceId": "test-device-001"
}
```

### 2. Single Pole Capture

Submit data for a single pole installation.

**Endpoint**: `POST /api/v1/poles/capture`

**Request Body**:
```json
{
  "pole": {
    "poleNumber": "LAW-P-001",
    "projectId": "project-123",
    "gps": {
      "latitude": -26.2041,
      "longitude": 28.0473,
      "accuracy": 10,
      "timestamp": "2025-08-16T14:00:00.000Z"
    },
    "status": "captured",
    "contractorId": "contractor-123",
    "notes": "Installation complete"
  },
  "photos": {
    "before": "https://storage.url/photo1.jpg",
    "front": "https://storage.url/photo2.jpg",
    "side": "https://storage.url/photo3.jpg",
    "depth": "https://storage.url/photo4.jpg",
    "concrete": "https://storage.url/photo5.jpg",
    "compaction": "https://storage.url/photo6.jpg"
  },
  "offline_created_at": "2025-08-16T13:30:00.000Z"
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "submissionId": "field_device001_1723814400000",
    "status": "captured",
    "message": "Pole captured successfully"
  }
}
```

### 3. Batch Sync

Synchronize multiple pole captures in a single request.

**Endpoint**: `POST /api/v1/poles/batch`

**Request Body**:
```json
{
  "poles": [
    {
      "pole": {
        "poleNumber": "LAW-P-001",
        "projectId": "project-123",
        "gps": {
          "latitude": -26.2041,
          "longitude": 28.0473,
          "accuracy": 10
        },
        "status": "captured"
      },
      "photos": {},
      "metadata": {
        "offlineCreatedAt": "2025-08-16T13:00:00.000Z"
      }
    }
  ],
  "syncBatchId": "batch_device001_1723814400000"
}
```

**Response** (207 Multi-Status):
```json
{
  "success": true,
  "data": {
    "batchId": "batch_device001_1723814400000",
    "total": 3,
    "successful": 2,
    "failed": 1,
    "results": {
      "successful": [
        {
          "index": 0,
          "submissionId": "field_device001_1723814400000_0",
          "poleNumber": "LAW-P-001"
        }
      ],
      "failed": [
        {
          "index": 2,
          "poleNumber": "LAW-P-003",
          "error": "Missing required field: gps"
        }
      ]
    }
  }
}
```

**Constraints**:
- Maximum 100 poles per batch
- Each pole must have required fields: poleNumber, gps

### 4. Photo Upload

Upload a photo and receive a storage URL.

**Endpoint**: `POST /api/v1/photos/upload`

**Request Body**:
```json
{
  "poleNumber": "LAW-P-001",
  "photoType": "before",
  "photoData": "base64_encoded_image_data",
  "mimeType": "image/jpeg"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "url": "https://storage.googleapis.com/bucket/poles/LAW-P-001/before_1723814400000.jpg",
    "path": "poles/LAW-P-001/before_1723814400000.jpg",
    "photoType": "before"
  }
}
```

**Photo Types**:
- `before` - Site before installation
- `front` - Front view of pole
- `side` - Side angle view
- `depth` - Installation depth
- `concrete` - Base/foundation
- `compaction` - Ground compaction

### 5. Check Submission Status

Check the status of a previously submitted pole capture.

**Endpoint**: `GET /api/v1/poles/status/:submissionId`

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "submissionId": "field_device001_1723814400000",
    "poleNumber": "LAW-P-001",
    "validationStatus": "pending",
    "neonSyncStatus": "completed",
    "capturedAt": "2025-08-16T13:30:00.000Z",
    "deviceId": "device001"
  }
}
```

**Validation Status Values**:
- `pending` - Awaiting validation
- `valid` - Passed validation
- `invalid` - Failed validation

**Sync Status Values**:
- `pending` - Awaiting sync to Neon
- `syncing` - Currently syncing
- `completed` - Successfully synced
- `failed` - Sync failed

### 6. Check Pending Syncs

Get the count of pending synchronizations for a device.

**Endpoint**: `GET /api/v1/sync/pending`

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "deviceId": "device001",
    "pendingCount": 5,
    "timestamp": "2025-08-16T14:00:00.000Z"
  }
}
```

## Error Responses

All endpoints use consistent error response format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message"
  }
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Invalid or missing API key |
| `MISSING_DEVICE_ID` | 400 | X-Device-ID header required |
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `BATCH_TOO_LARGE` | 400 | Batch exceeds 100 poles |
| `NOT_FOUND` | 404 | Resource not found |
| `CAPTURE_ERROR` | 500 | Failed to capture pole data |
| `UPLOAD_ERROR` | 500 | Failed to upload photo |

## Data Storage

### Firebase Collections

**field_pole_captures**:
```javascript
{
  submissionId: "field_device001_1723814400000",
  deviceId: "device001",
  pole: {
    poleNumber: "LAW-P-001",
    projectId: "project-123",
    gps: {
      latitude: -26.2041,
      longitude: 28.0473,
      accuracy: 10,
      capturedAt: "2025-08-16T14:00:00.000Z"
    },
    status: "captured",
    contractorId: "contractor-123",
    notes: "Installation complete"
  },
  photos: {
    before: "https://storage.url/photo1.jpg",
    // ... other photos
  },
  metadata: {
    apiKey: "field-app-dev-key-2025",
    deviceId: "device001",
    offlineCreatedAt: "2025-08-16T13:30:00.000Z",
    syncedAt: "2025-08-16T14:00:00.000Z",
    appVersion: "1.0.0"
  },
  validation: {
    status: "pending",
    autoValidation: null,
    manualReview: false
  },
  neonSync: {
    status: "pending",
    syncedAt: null,
    neonId: null
  }
}
```

**neon_sync_queue**:
```javascript
{
  collection: "field_pole_captures",
  documentId: "field_device001_1723814400000",
  action: "sync_pole",
  priority: "normal",
  createdAt: "2025-08-16T14:00:00.000Z"
}
```

## Implementation Notes

### Rate Limits
- Request body size limit: 50MB (for photo uploads)
- Batch size limit: 100 poles per request
- Timeout: 300 seconds per request

### Best Practices

1. **Offline Queue Management**:
   - Store captures locally when offline
   - Sync in batches when connection available
   - Handle partial batch failures gracefully

2. **Photo Management**:
   - Compress photos before base64 encoding
   - Upload photos separately from pole data
   - Store photo URLs, not base64 data

3. **Error Handling**:
   - Implement exponential backoff for retries
   - Log failed syncs for manual review
   - Provide user feedback on sync status

4. **Device Management**:
   - Generate unique device IDs on first app launch
   - Store device ID persistently
   - Include app version in requests

## Neon Database Sync

Captured poles are automatically queued for synchronization with the Neon PostgreSQL database. The sync process:

1. Validates pole data
2. Checks for duplicates
3. Syncs to Neon database
4. Updates sync status in Firebase

The sync worker runs periodically to process the queue.