# Neon Read-Only API

Secure read-only API endpoint for external developers to access Neon database data.

## Quick Start

1. **Install dependencies**:
```bash
cd api/neon-read-api
npm install
```

2. **Set environment variables**:
```bash
cp .env.example .env
# Edit .env with your Neon connection string
```

3. **Run locally**:
```bash
npm run dev
```

4. **Deploy to Firebase**:
```bash
npm run deploy
```

## API Endpoints

### Base URL
```
https://us-central1-fibreflow-73daf.cloudfunctions.net/neonReadAPI
```

### Authentication
All requests require an API key:
```
X-API-Key: your-api-key-here
```

### Available Endpoints

#### Get Poles
```
GET /api/v1/poles
GET /api/v1/poles/:id
GET /api/v1/poles?projectId=xxx&status=active
```

#### Get Projects
```
GET /api/v1/projects
GET /api/v1/projects/:id
```

#### Get Analytics
```
GET /api/v1/analytics/summary
GET /api/v1/analytics/daily-progress
```

## For External Developers

### Example Usage (JavaScript)
```javascript
const API_KEY = 'your-api-key';
const BASE_URL = 'https://your-api-url';

async function getPoles() {
  const response = await fetch(`${BASE_URL}/api/v1/poles`, {
    headers: {
      'X-API-Key': API_KEY
    }
  });
  
  const data = await response.json();
  return data;
}
```

### Example Usage (Python)
```python
import requests

API_KEY = 'your-api-key'
BASE_URL = 'https://your-api-url'

def get_poles():
    headers = {'X-API-Key': API_KEY}
    response = requests.get(f'{BASE_URL}/api/v1/poles', headers=headers)
    return response.json()
```

## Response Format

All responses follow this format:
```json
{
  "success": true,
  "data": [...],
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "timestamp": "2025-08-16T10:00:00Z"
  }
}
```

Error responses:
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid API key"
  }
}
```

## Rate Limits
- 1000 requests per hour per API key
- 100 requests per minute burst limit

## Security
- Read-only access (no write operations)
- IP whitelisting available on request
- All queries are logged for audit
- API keys can be revoked instantly