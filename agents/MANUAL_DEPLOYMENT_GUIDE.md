# Neon Agent Backend - Manual Deployment Guide (Google Cloud Console)

This guide provides step-by-step instructions for deploying the Neon Agent backend service to Google Cloud Run using only the Google Cloud Console (no CLI required).

## Prerequisites

1. **Google Cloud Account** with billing enabled
2. **Google Cloud Project** (fibreflow-73daf or your project ID)
3. **Permissions**: You need Cloud Run Admin and Storage Admin roles
4. **Service Account**: fibreflow-service-account.json (already configured)

## Overview

The Neon Agent backend is a Python Flask service that:
- Connects to Neon database for analytics queries
- Provides REST API endpoints for the Angular frontend
- Runs on Google Cloud Run for serverless scaling

## Step 1: Prepare the Code for Upload

### 1.1 Create a ZIP file of the agents directory

Since we can't use CLI, you'll need to:
1. Navigate to the `agents/` directory
2. Select all files (including Dockerfile, requirements.txt, simple_server.py, etc.)
3. Create a ZIP file named `neon-agent-backend.zip`

**Important files to include:**
- `Dockerfile`
- `requirements.txt`
- `simple_server.py`
- `.gcloudignore`
- `cloudbuild.yaml` (for reference)

## Step 2: Upload Code to Google Cloud Storage

### 2.1 Create a Storage Bucket (if not exists)

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to **Cloud Storage** → **Buckets**
3. Click **CREATE BUCKET**
4. Configure:
   - **Name**: `fibreflow-deployments` (or similar)
   - **Location**: Choose same region as Cloud Run (e.g., `us-central1`)
   - **Storage class**: Standard
   - Click **CREATE**

### 2.2 Upload the ZIP file

1. Open your bucket
2. Click **UPLOAD FILES**
3. Select your `neon-agent-backend.zip`
4. Wait for upload to complete

## Step 3: Create Cloud Build Trigger (One-time setup)

### 3.1 Enable Required APIs

1. Go to **APIs & Services** → **Enable APIs and services**
2. Enable these APIs:
   - Cloud Build API
   - Cloud Run API
   - Container Registry API
   - Artifact Registry API

### 3.2 Create Build Configuration

1. Go to **Cloud Build** → **Triggers**
2. Click **CREATE TRIGGER**
3. Configure:
   - **Name**: `neon-agent-manual-deploy`
   - **Event**: Manual invocation
   - **Source**: Cloud Storage
   - **Cloud Storage object**: `gs://fibreflow-deployments/neon-agent-backend.zip`
   - **Build configuration**: Inline YAML

4. Paste this build configuration:

```yaml
steps:
  # Build the container image
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'gcr.io/$PROJECT_ID/neon-agent:latest', '.']
    dir: '.'
  
  # Push the container image to Container Registry
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/$PROJECT_ID/neon-agent:latest']
  
  # Deploy container image to Cloud Run
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: gcloud
    args:
      - 'run'
      - 'deploy'
      - 'neon-agent'
      - '--image'
      - 'gcr.io/$PROJECT_ID/neon-agent:latest'
      - '--region'
      - 'us-central1'
      - '--platform'
      - 'managed'
      - '--allow-unauthenticated'
      - '--port'
      - '8080'
      - '--memory'
      - '512Mi'
      - '--cpu'
      - '1'
      - '--timeout'
      - '300'
      - '--concurrency'
      - '80'
      - '--max-instances'
      - '10'
      - '--set-env-vars'
      - 'NEON_DATABASE_URL=postgresql://neondb_owner:FSpEqWxpXkYZ@ep-yellow-violet-a5jzr2xo-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require,PORT=8080'

timeout: 1200s
```

5. Click **CREATE**

## Step 4: Deploy Using Cloud Build

### 4.1 Run the Build Trigger

1. Go to **Cloud Build** → **Triggers**
2. Find `neon-agent-manual-deploy`
3. Click **RUN**
4. Click **RUN TRIGGER**

### 4.2 Monitor the Build

1. Go to **Cloud Build** → **History**
2. Click on the running build
3. Watch the logs for any errors
4. Build should take 3-5 minutes

## Step 5: Direct Cloud Run Deployment (Alternative Method)

If you prefer to deploy directly to Cloud Run:

### 5.1 Build Container Image First

1. Go to **Artifact Registry**
2. Create a repository if needed:
   - **Name**: `neon-agent`
   - **Format**: Docker
   - **Location**: us-central1

### 5.2 Deploy to Cloud Run

1. Go to **Cloud Run**
2. Click **CREATE SERVICE**
3. Choose **Deploy one revision from an existing container image**
4. If you have a pre-built image, use: `gcr.io/fibreflow-73daf/neon-agent:latest`
5. Configure service:
   - **Service name**: `neon-agent`
   - **Region**: us-central1
   - **CPU allocation**: CPU is always allocated
   - **Autoscaling**: 0 to 10 instances
   - **Authentication**: Allow unauthenticated invocations

### 5.3 Configure Environment Variables

Click **Container, Variables & Secrets, Connections, Security**

Add these environment variables:
- **NEON_DATABASE_URL**: `postgresql://neondb_owner:FSpEqWxpXkYZ@ep-yellow-violet-a5jzr2xo-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require`
- **PORT**: `8080`

### 5.4 Configure Resources

- **Memory**: 512 MiB
- **CPU**: 1
- **Request timeout**: 300 seconds
- **Maximum concurrent requests**: 80

Click **CREATE**

## Step 6: Verify Deployment

### 6.1 Get the Service URL

1. Go to **Cloud Run**
2. Click on `neon-agent` service
3. Copy the URL (e.g., `https://neon-agent-xxxxx-uc.a.run.app`)

### 6.2 Test the Health Endpoint

Open the URL in your browser:
```
https://neon-agent-xxxxx-uc.a.run.app/health
```

You should see:
```json
{
  "status": "healthy",
  "timestamp": "2025-01-30T12:34:56Z"
}
```

### 6.3 Test Database Connection

Visit:
```
https://neon-agent-xxxxx-uc.a.run.app/api/test-connection
```

Expected response:
```json
{
  "status": "success",
  "database": "neondb",
  "message": "Successfully connected to Neon database"
}
```

## Step 7: Update Angular Frontend

### 7.1 Update the Neon Agent Service

1. Note your Cloud Run URL from Step 6.1
2. Update `src/app/features/neon-agent/services/neon-agent.service.ts`:

```typescript
export class NeonAgentService {
  // Update this URL with your Cloud Run endpoint
  private apiUrl = 'https://neon-agent-xxxxx-uc.a.run.app';
  
  // Rest of the service code...
}
```

### 7.2 Deploy Frontend

Deploy the Angular app with the updated URL:
```bash
npm run build
firebase deploy --only hosting
```

## Step 8: Troubleshooting

### 8.1 Check Cloud Run Logs

1. Go to **Cloud Run** → `neon-agent` service
2. Click **LOGS** tab
3. Look for error messages

### 8.2 Common Issues

**Issue: 502 Bad Gateway**
- Check if container is running on port 8080
- Verify PORT environment variable is set
- Check logs for startup errors

**Issue: Database Connection Failed**
- Verify NEON_DATABASE_URL is correct
- Check if Neon database is accessible
- Ensure SSL mode is set to 'require'

**Issue: CORS Errors**
- The backend includes CORS headers for all origins
- Check browser console for specific CORS error
- Verify frontend is using correct URL

### 8.3 Test with curl

From Cloud Shell or terminal:
```bash
# Test health endpoint
curl https://neon-agent-xxxxx-uc.a.run.app/health

# Test query endpoint
curl -X POST https://neon-agent-xxxxx-uc.a.run.app/api/query \
  -H "Content-Type: application/json" \
  -d '{"query": "SELECT COUNT(*) as total FROM analytics_events"}'
```

## Step 9: Monitoring and Maintenance

### 9.1 Set Up Monitoring

1. Go to **Cloud Run** → `neon-agent`
2. Click **METRICS** tab
3. Monitor:
   - Request count
   - Latency
   - Error rate
   - Container instances

### 9.2 Set Up Alerts

1. Go to **Monitoring** → **Alerting**
2. Create alerts for:
   - High error rate (> 5%)
   - High latency (> 1000ms)
   - Service downtime

### 9.3 Update Deployment

To update the service:
1. Upload new code ZIP to Cloud Storage
2. Run the build trigger again
3. Cloud Run will automatically deploy the new version

## Configuration Reference

### Environment Variables
- `NEON_DATABASE_URL`: Full PostgreSQL connection string
- `PORT`: Must be 8080 for Cloud Run

### Resource Limits
- Memory: 512 MiB (increase if needed)
- CPU: 1 vCPU
- Timeout: 300 seconds
- Max Instances: 10 (adjust based on load)

### Security Notes
- Service allows unauthenticated access (protected by CORS)
- Database credentials are in connection string (use Secret Manager for production)
- Consider adding API key authentication for production

## Cost Estimation

Cloud Run pricing (approximate):
- **Request charge**: $0.40 per million requests
- **Compute charge**: $0.00002400 per vCPU-second
- **Memory charge**: $0.00000250 per GiB-second
- **Free tier**: 2 million requests, 180,000 vCPU-seconds, 360,000 GiB-seconds per month

For light usage (< 10,000 requests/day), expect < $5/month.

## Next Steps

1. **Add Authentication**: Implement API key or Firebase Auth
2. **Use Secret Manager**: Store database credentials securely
3. **Add Custom Domain**: Map to your domain
4. **Enable Cloud CDN**: For better global performance
5. **Set Up CI/CD**: Automate deployments with GitHub

## Support Resources

- [Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Cloud Build Documentation](https://cloud.google.com/build/docs)
- [Troubleshooting Cloud Run](https://cloud.google.com/run/docs/troubleshooting)
- [Neon Database Documentation](https://neon.tech/docs/introduction)

---

**Last Updated**: 2025-01-30
**Service**: Neon Agent Backend
**Version**: 1.0.0