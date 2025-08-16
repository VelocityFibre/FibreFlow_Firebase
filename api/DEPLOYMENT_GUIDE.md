# API Deployment Guide

## Quick Deployment Steps

### 1. Set Firebase Function Configuration

```bash
# Set Neon connection string (already in .env.local)
firebase functions:config:set neon.connection_string="postgresql://neondb_owner:npg_AlX83ojfZpBk@ep-long-breeze-a9w7xool-pooler.gwc.azure.neon.tech/neondb?sslmode=require"

# Set API keys for external developers
firebase functions:config:set api.key_1="fibreflow-api-key-2025-prod-001"
firebase functions:config:set api.key_2="fibreflow-api-key-2025-ext-001"

# Verify configuration
firebase functions:config:get
```

### 2. Deploy the Read-Only API

```bash
cd functions
firebase deploy --only functions:neonReadAPI
```

### 3. Test the API

```bash
# Test with development key
curl https://us-central1-fibreflow-73daf.cloudfunctions.net/neonReadAPI/health \
  -H "X-API-Key: dev-api-key-12345"

# Test poles endpoint
curl https://us-central1-fibreflow-73daf.cloudfunctions.net/neonReadAPI/api/v1/poles \
  -H "X-API-Key: dev-api-key-12345"
```

## API Keys for External Developers

### Development
- Key: `dev-api-key-12345`
- Use: Testing only

### Production Keys
After setting Firebase config:
- Key 1: `fibreflow-api-key-2025-prod-001`
- Key 2: `fibreflow-api-key-2025-ext-001`

## API Endpoints

Base URL: `https://us-central1-fibreflow-73daf.cloudfunctions.net/neonReadAPI`

### Available Endpoints
- `GET /health` - Health check
- `GET /api/v1/poles` - List poles
- `GET /api/v1/analytics/summary` - Analytics summary

### Request Example
```javascript
const response = await fetch('https://us-central1-fibreflow-73daf.cloudfunctions.net/neonReadAPI/api/v1/poles', {
  headers: {
    'X-API-Key': 'your-api-key-here'
  }
});

const data = await response.json();
console.log(data);
```

## Monitoring

Check function logs:
```bash
firebase functions:log --only neonReadAPI
```

## Next Steps

1. Create staging API for write operations
2. Set up validation workflow
3. Create admin UI for approval queue
4. Add more endpoints as needed