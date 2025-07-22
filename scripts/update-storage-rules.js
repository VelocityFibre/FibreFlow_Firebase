#!/usr/bin/env node

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize admin SDK with service account
const serviceAccount = require('../fibreflow-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'fibreflow-73daf.firebasestorage.app'
});

async function updateStorageRules() {
  console.log('🚀 Updating Firebase Storage Rules...\n');
  
  const rulesContent = fs.readFileSync(path.join(__dirname, '..', 'storage.rules'), 'utf8');
  
  console.log('📋 Current rules content:');
  console.log(rulesContent);
  
  console.log('\n⚠️  Note: Storage rules can only be updated via Firebase Console or Firebase CLI.');
  console.log('\n📝 To fix the upload issue, please:');
  console.log('1. Go to: https://console.firebase.google.com/project/fibreflow-73daf/storage/rules');
  console.log('2. Replace the current rules with the content shown above');
  console.log('3. Click "Publish"');
  
  console.log('\n🔧 Alternative: Use Firebase CLI with proper authentication:');
  console.log('1. Run: firebase login:ci');
  console.log('2. Save the token');
  console.log('3. Run: FIREBASE_TOKEN=your-token firebase deploy --only storage');
}

// Run the update
updateStorageRules().catch(console.error);