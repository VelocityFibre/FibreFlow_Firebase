# API Testing Guide

## Your API is DEPLOYED! 🎉

The neonReadAPI is now live at:
```
https://us-central1-fibreflow-73daf.cloudfunctions.net/neonReadAPI
```

## Test the API

### 1. Test with Browser
Open this URL in your browser:
```
https://us-central1-fibreflow-73daf.cloudfunctions.net/neonReadAPI/health
```

You should see a 401 error (missing API key) - this is expected!

### 2. Test with JavaScript (in browser console)
```javascript
fetch('https://us-central1-fibreflow-73daf.cloudfunctions.net/neonReadAPI/health', {
  headers: {
    'X-API-Key': 'dev-api-key-12345'
  }
})
.then(r => r.json())
.then(data => console.log(data))
```

### 3. Test poles endpoint
```javascript
fetch('https://us-central1-fibreflow-73daf.cloudfunctions.net/neonReadAPI/api/v1/poles', {
  headers: {
    'X-API-Key': 'dev-api-key-12345'
  }
})
.then(r => r.json())
.then(data => console.log(data))
```

### 4. Test analytics endpoint
```javascript
fetch('https://us-central1-fibreflow-73daf.cloudfunctions.net/neonReadAPI/api/v1/analytics/summary', {
  headers: {
    'X-API-Key': 'dev-api-key-12345'
  }
})
.then(r => r.json())
.then(data => console.log(data))
```

## API Keys

### Development
- Key: `dev-api-key-12345`

### Production (configured in .env)
- Key 1: `fibreflow-api-key-2025-prod-001`
- Key 2: `fibreflow-api-key-2025-ext-001`

## For External Developers

Share this with them:
1. API Base URL: `https://us-central1-fibreflow-73daf.cloudfunctions.net/neonReadAPI`
2. API Key: `[provide specific key]`
3. Documentation: `/api/neon-read-api/DEVELOPER_GUIDE.md`

## Next Steps

1. ✅ Read-Only API - DEPLOYED!
2. ⏳ Staging API - Ready to deploy
3. ⏳ Validation Workflow - Ready to deploy
4. ⏳ Admin UI - To be created

## Monitoring

Check function performance:
https://console.cloud.google.com/functions/details/us-central1/neonReadAPI?project=fibreflow-73daf