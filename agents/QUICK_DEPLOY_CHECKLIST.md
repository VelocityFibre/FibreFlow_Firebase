# Neon Agent - Quick Deploy Checklist

## Pre-Deployment Checklist

- [ ] Google Cloud Project ID: `fibreflow-73daf`
- [ ] APIs Enabled: Cloud Run, Cloud Build, Container Registry
- [ ] Region: `us-central1`
- [ ] Service Account: Available in project

## Configuration Values to Copy

### Environment Variables
```
NEON_DATABASE_URL=postgresql://neondb_owner:FSpEqWxpXkYZ@ep-yellow-violet-a5jzr2xo-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require
PORT=8080
```

### Cloud Run Settings
- Service name: `neon-agent`
- Memory: `512 MiB`
- CPU: `1`
- Timeout: `300 seconds`
- Max concurrent requests: `80`
- Max instances: `10`
- Min instances: `0`
- Authentication: `Allow unauthenticated`

## Files to Include in ZIP

```
agents/
├── Dockerfile
├── requirements.txt
├── simple_server.py
├── .gcloudignore
└── cloudbuild.yaml (optional, for reference)
```

## Post-Deployment Tests

1. **Health Check**
   ```
   https://[YOUR-SERVICE-URL]/health
   ```
   Expected: `{"status": "healthy", "timestamp": "..."}`

2. **Database Connection**
   ```
   https://[YOUR-SERVICE-URL]/api/test-connection
   ```
   Expected: `{"status": "success", "database": "neondb"}`

3. **Test Query**
   ```
   POST https://[YOUR-SERVICE-URL]/api/query
   Body: {"query": "SELECT COUNT(*) as total FROM analytics_events"}
   ```
   Expected: `{"data": [{"total": ...}], "error": null}`

## Update Angular Service

File: `src/app/features/neon-agent/services/neon-agent.service.ts`

Replace:
```typescript
private apiUrl = 'http://localhost:8080';
```

With:
```typescript
private apiUrl = 'https://[YOUR-CLOUD-RUN-URL]';
```

## Common URLs

- Cloud Run Console: https://console.cloud.google.com/run
- Cloud Build History: https://console.cloud.google.com/cloud-build/builds
- Logs Viewer: https://console.cloud.google.com/logs/viewer

## Quick Troubleshooting

| Issue | Solution |
|-------|----------|
| 502 Bad Gateway | Check PORT env var = 8080 |
| Connection refused | Verify NEON_DATABASE_URL |
| CORS errors | Backend allows all origins, check URL |
| 404 Not Found | Verify endpoint paths match |
| Timeout errors | Increase timeout > 300s |

## Estimated Deployment Time

- First-time setup: 15-20 minutes
- Subsequent deploys: 5-10 minutes
- Build time: 3-5 minutes
- Service startup: 30-60 seconds