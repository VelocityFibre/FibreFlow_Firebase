#!/usr/bin/env node

/**
 * Dead Simple CSV Upload to Firebase Storage
 * No complexity - just upload files
 */

require('dotenv').config({ path: '../.env' });
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize with your service account
const serviceAccount = require('../credentials/vf-onemap-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'vf-onemap-data.firebasestorage.app'
});

const bucket = admin.storage().bucket();

async function uploadFile(filePath) {
  const fileName = path.basename(filePath);
  console.log(`Uploading ${fileName}...`);
  
  try {
    await bucket.upload(filePath, {
      destination: `csv-uploads/${fileName}`,
      metadata: {
        contentType: 'text/csv',
      }
    });
    console.log(`✅ Uploaded: ${fileName}`);
    console.log(`📍 Location: gs://vf-onemap-data.firebasestorage.app/csv-uploads/${fileName}`);
  } catch (error) {
    console.error(`❌ Failed: ${error.message}`);
  }
}

// Main
async function main() {
  const csvDir = path.join(__dirname, '../downloads');
  const files = fs.readdirSync(csvDir).filter(f => f.endsWith('.csv'));
  
  console.log(`Found ${files.length} CSV files\n`);
  
  // Upload first file as test
  if (files.length > 0) {
    const firstFile = path.join(csvDir, files[0]);
    await uploadFile(firstFile);
    
    console.log(`\nTo upload all files, run:`);
    console.log(`node scripts/batch-upload.js`);
  }
}

main().catch(console.error);