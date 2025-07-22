#!/usr/bin/env node

const admin = require('firebase-admin');
const serviceAccount = require('../fibreflow-service-account.json');

// Initialize admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'fibreflow-73daf.firebasestorage.app'
});

const bucket = admin.storage().bucket();

async function checkUpload() {
  console.log('🔍 Checking for uploaded CSV files...\n');
  
  try {
    // List files in csv-uploads folder
    const [files] = await bucket.getFiles({ prefix: 'csv-uploads/' });
    
    if (files.length === 0) {
      console.log('❌ No files found in csv-uploads folder');
      return;
    }
    
    console.log(`✅ Found ${files.length} file(s) in csv-uploads:\n`);
    
    for (const file of files) {
      const [metadata] = await file.getMetadata();
      console.log(`📄 File: ${file.name}`);
      console.log(`   Size: ${(metadata.size / 1024).toFixed(1)} KB`);
      console.log(`   Uploaded: ${metadata.timeCreated}`);
      console.log(`   Content Type: ${metadata.contentType}`);
      console.log(`   MD5 Hash: ${metadata.md5Hash}`);
      console.log('');
    }
    
    // Check if test-with-data.csv exists
    const testFile = files.find(f => f.name.includes('test-with-data.csv'));
    if (testFile) {
      console.log('✅ SUCCESS: test-with-data.csv confirmed uploaded!');
      console.log(`📍 Location: gs://${bucket.name}/${testFile.name}`);
    }
    
  } catch (error) {
    console.error('❌ Error checking storage:', error);
  }
}

checkUpload();