#!/usr/bin/env node

/**
 * Setup Guide for vf-onemap-data Firebase Connection
 * ==================================================
 */

console.log('📋 vf-onemap-data Firebase Setup Guide');
console.log('=====================================');
console.log('');
console.log('To connect to the actual vf-onemap-data Firebase database, follow these steps:');
console.log('');
console.log('1️⃣  Generate Service Account Key:');
console.log('   a. Go to Firebase Console: https://console.firebase.google.com');
console.log('   b. Select the "vf-onemap-data" project');
console.log('   c. Click the gear icon → Project Settings');
console.log('   d. Go to "Service Accounts" tab');
console.log('   e. Click "Generate new private key"');
console.log('   f. Save the downloaded JSON file');
console.log('');
console.log('2️⃣  Place the Key File:');
console.log('   Save the JSON file as:');
console.log('   /home/ldp/VF/Apps/FibreFlow/.keys/vf-onemap-data-firebase-key.json');
console.log('');
console.log('3️⃣  Verify Setup:');
console.log('   Run: node scripts/vf-onemap-firebase-config.js');
console.log('');
console.log('4️⃣  Run Import:');
console.log('   Run: node scripts/vf-onemap-import-with-reports.js');
console.log('');
console.log('⚠️  SECURITY NOTES:');
console.log('   - The .keys/ directory is gitignored');
console.log('   - NEVER commit service account keys');
console.log('   - Keep keys secure and local only');
console.log('');
console.log('📝 Current Status:');
const fs = require('fs');
const path = require('path');

const keyPath = path.join(__dirname, '../.keys/vf-onemap-data-firebase-key.json');
if (fs.existsSync(keyPath)) {
  console.log('   ✅ Service account key found!');
  console.log('   Ready to connect to vf-onemap-data');
} else {
  console.log('   ❌ Service account key NOT found');
  console.log('   Please follow steps 1-2 above');
}
console.log('');