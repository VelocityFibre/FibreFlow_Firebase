#!/usr/bin/env node

const { exec } = require('child_process');
const path = require('path');

console.log('🔧 Fixing Service Account Permissions for Firebase Functions Deployment');
console.log('=====================================================================\n');

const SERVICE_ACCOUNT_PATH = path.join(__dirname, '..', 'fibreflow-service-account.json');
const PROJECT_ID = 'fibreflow-73daf';

// Read service account to get email
const serviceAccount = require(SERVICE_ACCOUNT_PATH);
const serviceAccountEmail = serviceAccount.client_email;

console.log(`📧 Service Account: ${serviceAccountEmail}`);
console.log(`🔑 Project ID: ${PROJECT_ID}\n`);

// IAM roles needed for Firebase Functions deployment
const requiredRoles = [
  'roles/iam.serviceAccountUser',
  'roles/cloudfunctions.admin',
  'roles/storage.admin'
];

console.log('🚀 Required IAM Roles:');
requiredRoles.forEach(role => console.log(`   - ${role}`));
console.log('\n');

// Create a shell script to add permissions
const shellScript = `#!/bin/bash
# This script needs to be run by someone with project owner permissions

PROJECT_ID="${PROJECT_ID}"
SERVICE_ACCOUNT="${serviceAccountEmail}"
DEFAULT_SERVICE_ACCOUNT="${PROJECT_ID}@appspot.gserviceaccount.com"

echo "Adding permissions for Firebase Functions deployment..."
echo ""

# Add Service Account User role on the default App Engine service account
echo "1. Adding Service Account User role..."
gcloud iam service-accounts add-iam-policy-binding \\
  $DEFAULT_SERVICE_ACCOUNT \\
  --member="serviceAccount:$SERVICE_ACCOUNT" \\
  --role="roles/iam.serviceAccountUser" \\
  --project=$PROJECT_ID

# Add Cloud Functions Admin role
echo ""
echo "2. Adding Cloud Functions Admin role..."
gcloud projects add-iam-policy-binding $PROJECT_ID \\
  --member="serviceAccount:$SERVICE_ACCOUNT" \\
  --role="roles/cloudfunctions.admin"

# Add Storage Admin role (for uploading function code)
echo ""
echo "3. Adding Storage Admin role..."
gcloud projects add-iam-policy-binding $PROJECT_ID \\
  --member="serviceAccount:$SERVICE_ACCOUNT" \\
  --role="roles/storage.admin"

echo ""
echo "✅ Permissions added successfully!"
echo ""
echo "You can now deploy Firebase Functions using:"
echo "export GOOGLE_APPLICATION_CREDENTIALS='${SERVICE_ACCOUNT_PATH}'"
echo "firebase deploy --only functions"
`;

// Save the shell script
const fs = require('fs');
const scriptPath = path.join(__dirname, 'add-iam-permissions.sh');
fs.writeFileSync(scriptPath, shellScript, { mode: 0o755 });

console.log('📝 Created permission script: scripts/add-iam-permissions.sh\n');

// Try using Firebase Admin SDK approach
console.log('🔍 Attempting to add permissions using Firebase Admin SDK...\n');

process.env.GOOGLE_APPLICATION_CREDENTIALS = SERVICE_ACCOUNT_PATH;

// Check if we can use gcloud with service account in a temp directory
const tempDir = '/tmp/gcloud-' + Date.now();
fs.mkdirSync(tempDir, { recursive: true });

const gcloudEnv = {
  ...process.env,
  CLOUDSDK_CONFIG: tempDir,
  GOOGLE_APPLICATION_CREDENTIALS: SERVICE_ACCOUNT_PATH
};

console.log('📋 Instructions:\n');
console.log('Since we need project owner permissions to add IAM roles, you have two options:\n');
console.log('Option 1: Run this command locally on your machine (if you have project owner access):');
console.log('--------------------------------------------------------------------------');
console.log(`bash scripts/add-iam-permissions.sh`);
console.log('\n');
console.log('Option 2: Ask a project owner to run these commands:');
console.log('---------------------------------------------------');
requiredRoles.forEach((role, index) => {
  if (role === 'roles/iam.serviceAccountUser') {
    console.log(`${index + 1}. Grant Service Account User role:`);
    console.log(`   gcloud iam service-accounts add-iam-policy-binding \\`);
    console.log(`     ${PROJECT_ID}@appspot.gserviceaccount.com \\`);
    console.log(`     --member="serviceAccount:${serviceAccountEmail}" \\`);
    console.log(`     --role="${role}" \\`);
    console.log(`     --project=${PROJECT_ID}\n`);
  } else {
    console.log(`${index + 1}. Grant ${role}:`);
    console.log(`   gcloud projects add-iam-policy-binding ${PROJECT_ID} \\`);
    console.log(`     --member="serviceAccount:${serviceAccountEmail}" \\`);
    console.log(`     --role="${role}"\n`);
  }
});

console.log('\n🎯 Quick Copy-Paste Commands for Project Owner:');
console.log('============================================');
console.log(`
# Run these commands to fix permissions:
gcloud iam service-accounts add-iam-policy-binding ${PROJECT_ID}@appspot.gserviceaccount.com --member="serviceAccount:${serviceAccountEmail}" --role="roles/iam.serviceAccountUser" --project=${PROJECT_ID}
gcloud projects add-iam-policy-binding ${PROJECT_ID} --member="serviceAccount:${serviceAccountEmail}" --role="roles/cloudfunctions.admin"
gcloud projects add-iam-policy-binding ${PROJECT_ID} --member="serviceAccount:${serviceAccountEmail}" --role="roles/storage.admin"
`);

// Clean up temp directory
try {
  fs.rmSync(tempDir, { recursive: true, force: true });
} catch (e) {}

console.log('\n✅ After permissions are added, you can deploy with:');
console.log('   firebase deploy --only functions:neonReadAPI');