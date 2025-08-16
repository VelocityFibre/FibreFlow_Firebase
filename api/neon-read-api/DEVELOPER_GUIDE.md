# Developer Guide - Neon Read-Only API

This guide is for external developers who need to access FibreFlow data.

## Getting Started

### 1. Request API Access
Contact the FibreFlow team to get:
- API Key
- API Documentation URL
- Rate limits for your use case

### 2. API Base URL
```
https://us-central1-fibreflow-73daf.cloudfunctions.net/neonReadAPI
```

### 3. Authentication
Include your API key in every request:
```
X-API-Key: your-api-key-here
```

## Complete Example - React App

```jsx
// api/fibreflow.js
const API_KEY = process.env.REACT_APP_FIBREFLOW_API_KEY;
const BASE_URL = 'https://us-central1-fibreflow-73daf.cloudfunctions.net/neonReadAPI';

class FibreFlowAPI {
  async request(endpoint, options = {}) {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'X-API-Key': API_KEY,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error?.message || 'API request failed');
    }
    
    return data;
  }
  
  // Get all poles
  async getPoles(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/api/v1/poles?${queryString}`);
  }
  
  // Get single pole
  async getPole(id) {
    return this.request(`/api/v1/poles/${id}`);
  }
  
  // Get pole statistics
  async getPoleStats() {
    return this.request('/api/v1/poles/stats/summary');
  }
}

export default new FibreFlowAPI();

// Usage in component
import { useEffect, useState } from 'react';
import api from './api/fibreflow';

function PoleList() {
  const [poles, setPoles] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    async function fetchPoles() {
      try {
        const response = await api.getPoles({
          status: 'active',
          limit: 50
        });
        setPoles(response.data);
      } catch (error) {
        console.error('Failed to fetch poles:', error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchPoles();
  }, []);
  
  if (loading) return <div>Loading...</div>;
  
  return (
    <div>
      {poles.map(pole => (
        <div key={pole.id}>
          <h3>{pole.pole_number}</h3>
          <p>Status: {pole.status}</p>
          <p>Location: {pole.location_address}</p>
        </div>
      ))}
    </div>
  );
}
```

## Submitting Data - Staging API

When your UI needs to submit new data:

### 1. Staging Endpoint
```
POST https://us-central1-fibreflow-73daf.cloudfunctions.net/stagingAPI/api/v1/submit
```

### 2. Submission Format
```javascript
const submission = {
  type: 'pole_update',
  data: {
    poleNumber: 'LAW.P.B167',
    status: 'installed',
    gps: {
      latitude: -26.123456,
      longitude: 28.123456
    },
    photos: [
      {
        type: 'front',
        url: 'https://your-storage/photo1.jpg'
      }
    ],
    notes: 'Installation completed successfully'
  },
  metadata: {
    submittedBy: 'user@example.com',
    appVersion: '1.0.0',
    timestamp: new Date().toISOString()
  }
};

const response = await fetch(STAGING_URL, {
  method: 'POST',
  headers: {
    'X-API-Key': API_KEY,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(submission)
});
```

### 3. Response
```json
{
  "success": true,
  "data": {
    "submissionId": "stg_12345",
    "status": "pending_validation",
    "message": "Data submitted for validation"
  }
}
```

## Available Endpoints

### Poles
```
GET /api/v1/poles
GET /api/v1/poles/:id
GET /api/v1/poles/stats/summary

Query parameters:
- projectId: Filter by project
- status: Filter by status (active, planned, installed)
- contractor: Filter by contractor ID
- search: Search pole numbers or addresses
- page: Page number (default: 1)
- limit: Results per page (max: 100, default: 20)
```

### Projects
```
GET /api/v1/projects
GET /api/v1/projects/:id
GET /api/v1/projects/:id/poles
```

### Analytics
```
GET /api/v1/analytics/daily-progress
GET /api/v1/analytics/contractor-performance
GET /api/v1/analytics/project-summary
```

## Error Handling

### Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid pole number format",
    "details": {
      "field": "poleNumber",
      "value": "invalid-format",
      "expected": "Pattern: XXX.P.XXXX"
    }
  }
}
```

### Common Error Codes
- `UNAUTHORIZED` - Invalid or missing API key
- `NOT_FOUND` - Resource not found
- `VALIDATION_ERROR` - Invalid input data
- `RATE_LIMIT_EXCEEDED` - Too many requests
- `SERVER_ERROR` - Internal server error

## Rate Limiting
- 1000 requests per hour per API key
- 100 requests per minute burst limit
- Headers include rate limit info:
  ```
  X-RateLimit-Limit: 1000
  X-RateLimit-Remaining: 999
  X-RateLimit-Reset: 1692345600
  ```

## Best Practices

1. **Cache responses** when possible
2. **Handle pagination** for large datasets
3. **Implement retry logic** for network failures
4. **Log API errors** for debugging
5. **Never expose API key** in client-side code

## Support

For API issues or questions:
- Email: api-support@fibreflow.com
- Documentation: This guide
- Status page: https://status.fibreflow.com

## Changelog

### v1.0.0 (2025-08-16)
- Initial release
- Read-only pole data access
- Basic authentication
- Rate limiting