#!/usr/bin/env node

/**
 * Fix Storage Permissions for VF OneMap
 * 
 * This script updates the storage rules to allow authenticated users
 * from FibreFlow to upload CSV files
 */

const fs = require('fs');
const path = require('path');

// Storage rules that allow uploads from authenticated users
const storageRules = `rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Allow authenticated users to upload to csv-uploads folder
    match /csv-uploads/{fileName} {
      allow read: if request.auth != null;
      allow write: if request.auth != null 
        && request.resource.size < 100 * 1024 * 1024  // Max 100MB
        && request.resource.contentType == 'text/csv';
    }
    
    // Allow read access to upload logs
    match /upload_logs/{document} {
      allow read: if request.auth != null;
    }
  }
}`;

// Save rules file
const rulesPath = path.join(__dirname, '..', 'storage.rules');
fs.writeFileSync(rulesPath, storageRules);

console.log('📋 Storage Rules Created:');
console.log(storageRules);
console.log('\n✅ Rules saved to:', rulesPath);

console.log('\n📌 To deploy these rules:');
console.log('1. Add to your firebase.json:');
console.log(`
"storage": {
  "rules": "OneMap/storage.rules"
}
`);

console.log('\n2. Deploy with:');
console.log('firebase deploy --only storage --project vf-onemap-data');

console.log('\n🔧 Alternative Quick Fix:');
console.log('Use Firebase Console to temporarily allow uploads:');
console.log('1. Go to https://console.firebase.google.com/project/vf-onemap-data/storage/rules');
console.log('2. Replace rules with the content above');
console.log('3. Click "Publish"');