# Firebase Authentication Integration Plan
## vf-onemap-data ↔ FibreFlow Integration

**Created**: 2025-01-28  
**Status**: Ready for Implementation  
**Architecture**: Workload Identity Federation with Service Accounts

## 🏆 Recommended Solution: Service Account Architecture

### Overview
Use dedicated service accounts with minimal permissions for secure cross-project access between FibreFlow (fibreflow-73daf) and vf-onemap-data.

### Architecture Diagram
```
┌─────────────────────┐     ┌─────────────────────┐
│    FibreFlow App    │     │  vf-onemap-data     │
│  (fibreflow-73daf)  │────▶│    (Data Store)     │
└─────────────────────┘     └─────────────────────┘
         │                            │
         │                            │
         ▼                            ▼
┌─────────────────────┐     ┌─────────────────────┐
│  Service Account 1  │     │  Service Account 2  │
│  (FibreFlow Main)   │     │  (OneMap Processor) │
└─────────────────────┘     └─────────────────────┘
         │                            │
         └──────────┬─────────────────┘
                    │
                    ▼
         ┌─────────────────────┐
         │  Workload Identity  │
         │    Federation       │
         └─────────────────────┘
```

## Implementation Steps

### Step 1: Create Service Accounts

```bash
# Create service account for FibreFlow to access vf-onemap-data
gcloud iam service-accounts create fibreflow-to-onemap \
  --display-name="FibreFlow to OneMap Access" \
  --project=vf-onemap-data

# Create service account for OneMap processing
gcloud iam service-accounts create onemap-processor \
  --display-name="OneMap Data Processor" \
  --project=vf-onemap-data
```

### Step 2: Grant Cross-Project IAM Roles

```bash
# Grant FibreFlow service account access to vf-onemap-data
gcloud projects add-iam-policy-binding vf-onemap-data \
  --member="serviceAccount:fibreflow-to-onemap@vf-onemap-data.iam.gserviceaccount.com" \
  --role="roles/datastore.user"

# Grant Storage access for CSV uploads
gcloud projects add-iam-policy-binding vf-onemap-data \
  --member="serviceAccount:fibreflow-to-onemap@vf-onemap-data.iam.gserviceaccount.com" \
  --role="roles/storage.objectAdmin"
```

### Step 3: Generate Service Account Key

```bash
# Generate key
gcloud iam service-accounts keys create \
  ./fibreflow-to-onemap-key.json \
  --iam-account=fibreflow-to-onemap@vf-onemap-data.iam.gserviceaccount.com

# Store securely (never commit!)
mkdir -p ~/.firebase-keys
mv ./fibreflow-to-onemap-key.json ~/.firebase-keys/
chmod 600 ~/.firebase-keys/fibreflow-to-onemap-key.json
```

### Step 4: Environment Configuration

Create `.env.local` file:
```bash
# Firebase Service Account Paths
VF_ONEMAP_SA_PATH=/home/ldp/.firebase-keys/fibreflow-to-onemap-key.json
VF_ONEMAP_PROJECT_ID=vf-onemap-data
VF_ONEMAP_STORAGE_BUCKET=vf-onemap-data.firebasestorage.app
```

### Step 5: Update Firebase Configuration

```javascript
// config/vf-onemap-auth.js
const admin = require('firebase-admin');
const path = require('path');

// Initialize vf-onemap-data app
let vfOnemapApp;

function getVfOnemapApp() {
  if (!vfOnemapApp) {
    const serviceAccountPath = process.env.VF_ONEMAP_SA_PATH || 
      path.join(process.env.HOME, '.firebase-keys', 'fibreflow-to-onemap-key.json');
    
    const serviceAccount = require(serviceAccountPath);
    
    vfOnemapApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: process.env.VF_ONEMAP_STORAGE_BUCKET || 'vf-onemap-data.firebasestorage.app'
    }, 'vf-onemap');
  }
  return vfOnemapApp;
}

module.exports = { getVfOnemapApp };
```

### Step 6: Test Connection Script

```javascript
// scripts/test-vf-onemap-connection.js
const { getVfOnemapApp } = require('./config/vf-onemap-auth');

async function testConnection() {
  try {
    console.log('🔌 Testing connection to vf-onemap-data...\n');
    
    const app = getVfOnemapApp();
    const db = app.firestore();
    const storage = app.storage();
    
    // Test Firestore access
    console.log('📊 Testing Firestore access...');
    const testDoc = await db.collection('connection-test').add({
      timestamp: new Date(),
      source: 'fibreflow-integration-test'
    });
    console.log('✅ Firestore write successful:', testDoc.id);
    
    // Test Storage access
    console.log('\n📁 Testing Storage access...');
    const bucket = storage.bucket();
    const [files] = await bucket.getFiles({ maxResults: 1 });
    console.log('✅ Storage read successful:', files.length, 'files found');
    
    console.log('\n🎉 Connection test passed! Ready for data import.');
    
  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
    console.error('Make sure service account key exists and has proper permissions');
  }
}

testConnection();
```

## Security Best Practices

1. **Never commit service account keys** - Use .gitignore
2. **Use minimal permissions** - Only grant what's needed
3. **Rotate keys regularly** - Every 90 days
4. **Monitor access logs** - Check for unusual activity
5. **Use Secret Manager in production** - Don't store keys on disk

## Production Deployment

### Using Google Secret Manager

```javascript
// functions/src/secure-onemap-access.js
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');

async function getServiceAccount() {
  const client = new SecretManagerServiceClient();
  const [version] = await client.accessSecretVersion({
    name: 'projects/fibreflow-73daf/secrets/vf-onemap-sa/versions/latest',
  });
  return JSON.parse(version.payload.data.toString());
}
```

### Cloud Function Integration

```javascript
// functions/src/onemap-sync.js
exports.syncToVfOnemap = functions.pubsub
  .schedule('every 6 hours')
  .onRun(async (context) => {
    const serviceAccount = await getServiceAccount();
    const app = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    }, 'vf-onemap-sync');
    
    // Sync logic here
  });
```

## Quick Start Commands

```bash
# 1. Install gcloud CLI (if not installed)
curl https://sdk.cloud.google.com | bash

# 2. Authenticate
gcloud auth login

# 3. Set default project
gcloud config set project vf-onemap-data

# 4. Run implementation script
node scripts/setup-vf-onemap-auth.js
```

## Monitoring & Troubleshooting

### Check Service Account Permissions
```bash
gcloud projects get-iam-policy vf-onemap-data \
  --flatten="bindings[].members" \
  --filter="bindings.members:fibreflow-to-onemap"
```

### View Access Logs
```bash
gcloud logging read \
  "protoPayload.authenticationInfo.principalEmail='fibreflow-to-onemap@vf-onemap-data.iam.gserviceaccount.com'" \
  --limit 10
```

## Next Steps

1. Create service accounts
2. Set up authentication
3. Test connection
4. Import first CSV
5. Set up automated syncing

---

**This plan provides a secure, scalable foundation for long-term integration between FibreFlow and vf-onemap-data.**