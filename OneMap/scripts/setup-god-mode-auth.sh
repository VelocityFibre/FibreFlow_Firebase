#!/bin/bash

# GOD MODE: Full authentication setup for vf-onemap-data
# This gives us complete access for automation

set -e

echo "🚀 GOD MODE: Setting up full authentication for vf-onemap-data"
echo "============================================================"

PROJECT_ID="vf-onemap-data"
SERVICE_ACCOUNT_NAME="vf-onemap-god-mode"
KEY_DIR="/home/ldp/VF/Apps/FibreFlow/OneMap/credentials"

# Create credentials directory
mkdir -p "$KEY_DIR"

echo "
📋 Manual Steps Required:

1. GO TO FIREBASE CONSOLE:
   https://console.firebase.google.com/project/$PROJECT_ID/settings/serviceaccounts/adminsdk

2. Click 'Generate new private key'

3. Save the file as: $KEY_DIR/vf-onemap-god-mode.json

4. OR use these gcloud commands if you have access:

# Set project
gcloud config set project $PROJECT_ID

# Create service account with ALL permissions
gcloud iam service-accounts create $SERVICE_ACCOUNT_NAME \
  --display-name='VF OneMap God Mode' \
  --project=$PROJECT_ID

# Grant OWNER role (full access)
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$SERVICE_ACCOUNT_NAME@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/owner"

# Create key
gcloud iam service-accounts keys create \
  "$KEY_DIR/vf-onemap-god-mode.json" \
  --iam-account="$SERVICE_ACCOUNT_NAME@$PROJECT_ID.iam.gserviceaccount.com"

5. Set permissions
chmod 600 "$KEY_DIR/vf-onemap-god-mode.json"
"

echo "
🔥 REMOVING ALL RESTRICTIONS:

If you're blocked by org policies, run these as the organization admin:

# List all org policies
gcloud resource-manager org-policies list --project=$PROJECT_ID

# Remove ALL constraints (use with caution)
gcloud resource-manager org-policies delete \
  constraints/iam.disableServiceAccountKeyCreation \
  --project=$PROJECT_ID

gcloud resource-manager org-policies delete \
  constraints/iam.disableServiceAccountKeyUpload \
  --project=$PROJECT_ID

# Or disable them
gcloud resource-manager org-policies set-policy policy.yaml --project=$PROJECT_ID

Where policy.yaml contains:
---
constraint: constraints/iam.disableServiceAccountKeyCreation
booleanPolicy:
  enforced: false
---
"

# Create the automation-ready import script
cat > "$KEY_DIR/../scripts/import-with-god-mode.js" << 'EOF'
#!/usr/bin/env node

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parse/sync');

// Initialize with god mode credentials
const serviceAccount = require('../credentials/vf-onemap-god-mode.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'vf-onemap-data',
  storageBucket: 'vf-onemap-data.firebasestorage.app'
});

const db = admin.firestore();
const storage = admin.storage();

async function importCSV(csvFileName) {
  console.log('🚀 GOD MODE IMPORT - Full Access Enabled\n');
  
  const csvPath = path.join(__dirname, '../downloads', csvFileName);
  const fileContent = fs.readFileSync(csvPath, 'utf-8');
  
  const records = csv.parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true
  });
  
  console.log(`📊 Found ${records.length} records to import\n`);
  
  const batch = db.batch();
  const importBatchId = `IMP_${Date.now()}`;
  let count = 0;
  
  for (const record of records) {
    const propertyId = record['Property ID'];
    if (!propertyId) continue;
    
    const docRef = db.collection('vf-onemap-processed-records').doc(propertyId);
    batch.set(docRef, {
      ...record,
      importBatchId,
      importedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    
    count++;
    
    // Commit every 500 documents
    if (count % 500 === 0) {
      await batch.commit();
      console.log(`✅ Imported ${count} records...`);
    }
  }
  
  await batch.commit();
  
  // Save import summary
  await db.collection('vf-onemap-import-batches').doc(importBatchId).set({
    batchId: importBatchId,
    fileName: csvFileName,
    totalRecords: records.length,
    importedAt: admin.firestore.FieldValue.serverTimestamp(),
    status: 'completed'
  });
  
  console.log(`\n✨ Import completed! ${count} records imported`);
  console.log(`📁 Batch ID: ${importBatchId}`);
}

// Run if called directly
if (require.main === module) {
  const csvFile = process.argv[2];
  if (!csvFile) {
    console.log('Usage: node import-with-god-mode.js <csv-filename>');
    process.exit(1);
  }
  importCSV(csvFile).catch(console.error);
}

module.exports = { importCSV };
EOF

chmod +x "$KEY_DIR/../scripts/import-with-god-mode.js"

echo "
✅ Setup complete! 

Next steps:
1. Complete the manual steps above to create the service account
2. Test with: node scripts/import-with-god-mode.js 'Lawley May Week 3 22052025 - First Report.csv'
"