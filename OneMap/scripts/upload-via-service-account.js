#!/usr/bin/env node

/**
 * Alternative Upload Method using Service Account
 * This bypasses authentication issues by using service account credentials
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize with service account
const serviceAccount = require('../service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'vf-onemap-data.firebasestorage.app'
});

const bucket = admin.storage().bucket();

async function uploadFile(filePath, destinationPath) {
  try {
    console.log(`📤 Uploading ${path.basename(filePath)}...`);
    
    await bucket.upload(filePath, {
      destination: destinationPath,
      metadata: {
        contentType: 'text/csv',
        metadata: {
          uploadedBy: 'service-account',
          uploadedAt: new Date().toISOString()
        }
      }
    });
    
    console.log(`✅ Uploaded successfully to ${destinationPath}`);
    
    // Make file publicly readable (optional)
    const file = bucket.file(destinationPath);
    await file.makePublic();
    
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${destinationPath}`;
    console.log(`🌐 Public URL: ${publicUrl}`);
    
    return publicUrl;
  } catch (error) {
    console.error(`❌ Upload failed:`, error.message);
    throw error;
  }
}

// Upload test file
async function main() {
  const testFile = path.join(__dirname, '..', 'downloads', 'test.csv');
  
  if (!fs.existsSync(testFile)) {
    console.error('❌ Test file not found:', testFile);
    process.exit(1);
  }
  
  try {
    await uploadFile(testFile, 'csv-uploads/test.csv');
    console.log('\n✅ Test file uploaded successfully!');
    console.log('You can now test the import process.');
  } catch (error) {
    console.error('❌ Failed to upload test file:', error);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}