# FibreFlow API Access - Complete Package

## Available APIs

1. **Read-Only API** - Get data from Neon database
2. **Staging API** - Submit new data for validation
3. **Offline Field App API** - Mobile field data capture with offline support

## 1. Read-Only API (Get Data from Neon)

### Base URL
```
https://us-central1-fibreflow-73daf.cloudfunctions.net/neonReadAPI
```

### Endpoints
- `GET /health` - Health check
- `GET /api/v1/poles` - Get poles data
- `GET /api/v1/analytics/summary` - Get analytics summary

### Example - Read Poles
```javascript
fetch('https://us-central1-fibreflow-73daf.cloudfunctions.net/neonReadAPI/api/v1/poles', {
  headers: {
    'X-API-Key': 'fibreflow-api-key-2025-prod-001'
  }
})
.then(r => r.json())
.then(data => console.log('Poles:', data));
```

## 2. Staging API (Submit New Data)

### Base URL
```
https://us-central1-fibreflow-73daf.cloudfunctions.net/stagingAPI
```

### Endpoints
- `GET /health` - Health check
- `POST /api/v1/submit/pole` - Submit new pole data
- `GET /api/v1/status/:submissionId` - Check submission status

### Example - Submit New Pole
```javascript
const newPole = {
  data: {
    poleNumber: "LAW.P.B999",
    projectId: "project123",
    gps: {
      latitude: -26.123456,
      longitude: 28.123456,
      accuracy: 10
    },
    status: "installed",
    contractorId: "contractor123",
    photos: [
      { type: "front", url: "https://..." },
      { type: "side", url: "https://..." }
    ],
    notes: "Installation completed successfully"
  },
  metadata: {
    sourceApp: "YourAppName",
    version: "1.0.0"
  }
};

fetch('https://us-central1-fibreflow-73daf.cloudfunctions.net/stagingAPI/api/v1/submit/pole', {
  method: 'POST',
  headers: {
    'X-API-Key': 'fibreflow-api-key-2025-prod-001',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(newPole)
})
.then(r => r.json())
.then(data => {
  console.log('Submission ID:', data.data.submissionId);
  // Save this ID to check status later
});
```

### Example - Check Submission Status
```javascript
const submissionId = 'stg_pole_1692345678_abc123';

fetch(`https://us-central1-fibreflow-73daf.cloudfunctions.net/stagingAPI/api/v1/status/${submissionId}`, {
  headers: {
    'X-API-Key': 'fibreflow-api-key-2025-prod-001'
  }
})
.then(r => r.json())
.then(data => {
  console.log('Status:', data.data.status);
  // Status can be: pending_validation, approved, rejected, completed
});
```

## 3. Complete Workflow

```
1. READ current data → neonReadAPI
2. SUBMIT new data → stagingAPI → Goes to staging
3. We VALIDATE the data
4. If approved → Moves to Neon database
5. READ updated data → neonReadAPI shows new data
```

## Authentication

### Production API Key
```
fibreflow-api-key-2025-prod-001
```

Include in all requests as header:
```
X-API-Key: fibreflow-api-key-2025-prod-001
```

## Data Flow Diagram

```
Your App → Staging API → Staging DB → Validation → Neon DB
    ↑                                                    ↓
    └──────────── Read API ←────────────────────────────┘
```

## Response Formats

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "timestamp": "2025-08-16T12:00:00Z"
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid pole number format"
  }
}
```

## Rate Limits
- 1000 requests per hour per API key
- Maximum 10MB per request

## Full Example - Complete Flow

```javascript
const API_KEY = 'fibreflow-api-key-2025-prod-001';
const READ_API = 'https://us-central1-fibreflow-73daf.cloudfunctions.net/neonReadAPI';
const STAGING_API = 'https://us-central1-fibreflow-73daf.cloudfunctions.net/stagingAPI';

// 1. Read current poles
async function getCurrentPoles() {
  const response = await fetch(`${READ_API}/api/v1/poles`, {
    headers: { 'X-API-Key': API_KEY }
  });
  return response.json();
}

// 2. Submit new pole
async function submitNewPole(poleData) {
  const response = await fetch(`${STAGING_API}/api/v1/submit/pole`, {
    method: 'POST',
    headers: {
      'X-API-Key': API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      data: poleData,
      metadata: {
        sourceApp: 'ExternalApp',
        submittedBy: 'user@example.com'
      }
    })
  });
  return response.json();
}

// 3. Check submission status
async function checkStatus(submissionId) {
  const response = await fetch(`${STAGING_API}/api/v1/status/${submissionId}`, {
    headers: { 'X-API-Key': API_KEY }
  });
  return response.json();
}

// Usage
async function main() {
  // Get current data
  const currentPoles = await getCurrentPoles();
  console.log('Current poles:', currentPoles.data.length);
  
  // Submit new pole
  const submission = await submitNewPole({
    poleNumber: 'LAW.P.Z001',
    gps: { latitude: -26.123, longitude: 28.456 },
    status: 'planned'
  });
  console.log('Submitted:', submission.data.submissionId);
  
  // Check status after 5 seconds
  setTimeout(async () => {
    const status = await checkStatus(submission.data.submissionId);
    console.log('Current status:', status.data.status);
  }, 5000);
}
```

## What Happens to Submitted Data?

1. **Immediate**: Goes to staging database
2. **Within 5 minutes**: Automatic validation runs
3. **If valid**: Auto-approved and moved to production
4. **If issues**: Held for manual review
5. **Once approved**: Available in read API

## 3. Offline Field App API (Mobile Pole Capture)

### Base URL
```
https://us-central1-fibreflow-73daf.cloudfunctions.net/offlineFieldAppAPI
```

### Authentication
Requires TWO headers:
- `X-API-Key`: Your field app key
- `X-Device-ID`: Unique device identifier

### Key Endpoints
- `POST /api/v1/poles/capture` - Single pole capture
- `POST /api/v1/poles/batch` - Batch sync (max 100)
- `POST /api/v1/photos/upload` - Upload photos
- `GET /api/v1/poles/status/:id` - Check status
- `GET /api/v1/sync/pending` - Pending count

### Example - Field Pole Capture
```javascript
const fieldCapture = {
  pole: {
    poleNumber: "LAW.P.B999",
    projectId: "project123",
    gps: {
      latitude: -26.123456,
      longitude: 28.123456,
      accuracy: 5.2
    },
    status: "installed",
    notes: "Good installation"
  },
  photos: {
    before: "https://storage...",
    front: "https://storage...",
    side: "https://storage..."
  }
};

fetch('https://us-central1-fibreflow-73daf.cloudfunctions.net/offlineFieldAppAPI/api/v1/poles/capture', {
  method: 'POST',
  headers: {
    'X-API-Key': 'field-app-prod-key-2025-001',
    'X-Device-ID': 'android_device_123',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(fieldCapture)
})
.then(r => r.json())
.then(data => console.log('Captured:', data.data.submissionId));
```

### Field App Workflow
1. Capture pole data offline
2. Upload photos when online
3. Sync captures in batches
4. Data validated automatically
5. Synced to Neon for analytics

## API Keys

### Production Keys
- **Read/Staging APIs**: `fibreflow-api-key-2025-prod-001`
- **Field App API**: `field-app-prod-key-2025-001`

### Test Keys
- **Read/Staging APIs**: `dev-api-key-12345`
- **Field App API**: `field-app-dev-key-2025`

## Complete Data Flow

```
Field App → Firebase → Validation → Staging → Neon → Read API
    ↑                                                      ↓
    └──────────────── Status Checks ←─────────────────────┘
```

## Support

- Test all APIs with health endpoints first
- Ensure correct API keys and headers
- For field app: include device ID
- Contact us for additional endpoints

## Full Documentation

- **Read API & Staging API**: See sections above
- **Field App API**: Request `OFFLINE_FIELD_APP_API_DOCS.md`
- **Neon Table Schema**: Request `neon-staging-table.sql`

---
*All three APIs are now LIVE and ready for use!*