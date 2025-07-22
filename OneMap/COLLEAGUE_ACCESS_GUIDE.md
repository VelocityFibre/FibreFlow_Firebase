# Colleague Access Guide - Domain Restriction Workaround

## Problem
Organization policy restricts adding users outside your domain to the Firebase project.

## Solution: Service Account Access

### For You (Project Owner):

1. Run the script to create service account:
```bash
chmod +x create-colleague-access.sh
./create-colleague-access.sh
```

2. This creates a file: `colleague-service-account-key.json`

3. Share this file securely with your colleague (encrypted email, secure file transfer, etc.)

### For Your Colleague:

1. Save the `colleague-service-account-key.json` file in their OneMap directory

2. Update their `.env` file:
```
GOOGLE_APPLICATION_CREDENTIALS=./colleague-service-account-key.json
PROJECT_ID=vf-onemap-data
STORAGE_BUCKET=vf-onemap-data.firebasestorage.app
```

3. They can now use all the scripts:
```bash
# List files in storage
node scripts/list-storage-files.js

# Import CSVs
node scripts/import-raw-from-storage.js

# Process data
node scripts/process-pole-permissions.js
```

## Alternative: Firebase Admin SDK Sharing

If you trust your colleague completely, you can share your existing service account key:
- File: `vf-onemap-service-account.json`
- This gives them the same access level as you

## Security Notes

⚠️ **Service account keys provide full access to the resources**
- Don't commit to Git
- Don't share publicly
- Rotate keys periodically
- Delete keys when access no longer needed

## Revoking Access

To revoke colleague's access later:
```bash
# List keys
gcloud iam service-accounts keys list \
    --iam-account=colleague-onemap-access@vf-onemap-data.iam.gserviceaccount.com

# Delete specific key
gcloud iam service-accounts keys delete KEY_ID \
    --iam-account=colleague-onemap-access@vf-onemap-data.iam.gserviceaccount.com
```