#!/usr/bin/env node

const admin = require('firebase-admin');
const serviceAccount = require('../fibreflow-service-account.json');

// Initialize admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'fibreflow-73daf.firebasestorage.app'
});

const bucket = admin.storage().bucket();
const db = admin.firestore();

async function verifyJaniceUpload() {
  console.log('🔍 Comprehensive verification of Janice\'s upload...\n');
  
  try {
    // 1. Check Storage for the exact file
    const fileName = '1753281884373_Lawley May Week 3 22052025 - First Report (1).csv';
    const filePath = `csv-uploads/${fileName}`;
    const file = bucket.file(filePath);
    
    // Check if file exists
    const [exists] = await file.exists();
    
    if (exists) {
      console.log('✅ FILE CONFIRMED IN FIREBASE STORAGE!\n');
      
      // Get file metadata
      const [metadata] = await file.getMetadata();
      console.log('📄 File Details:');
      console.log(`   Name: ${metadata.name}`);
      console.log(`   Size: ${(metadata.size / 1024 / 1024).toFixed(2)} MB`);
      console.log(`   Created: ${new Date(metadata.timeCreated).toLocaleString()}`);
      console.log(`   Content Type: ${metadata.contentType}`);
      console.log(`   MD5 Hash: ${metadata.md5Hash}`);
      console.log(`   Generation: ${metadata.generation}`);
      console.log(`   Bucket: ${metadata.bucket}`);
      
      // Generate signed URL for download (expires in 1 hour)
      const [url] = await file.getSignedUrl({
        action: 'read',
        expires: Date.now() + 60 * 60 * 1000 // 1 hour
      });
      
      console.log('\n🔗 Temporary Download URL (valid for 1 hour):');
      console.log(url);
      
    } else {
      console.log('❌ File NOT found in storage');
    }
    
    // 2. Check Firestore logs
    console.log('\n📊 Checking Firestore upload logs...');
    const logs = await db.collection('upload_logs')
      .where('fileName', '==', 'Lawley May Week 3 22052025 - First Report (1).csv')
      .get();
      
    if (!logs.empty) {
      console.log(`Found ${logs.size} log entry(s):`);
      logs.forEach(doc => {
        const data = doc.data();
        console.log(`\n   Log ID: ${doc.id}`);
        console.log(`   Uploaded By: ${data.uploadedBy}`);
        console.log(`   Uploaded At: ${data.uploadedAt?.toDate?.()?.toLocaleString() || 'Unknown'}`);
        console.log(`   Status: ${data.status}`);
        console.log(`   Storage Path: ${data.storagePath}`);
      });
    } else {
      console.log('No upload logs found');
    }
    
    // 3. List all CSV files to double-check
    console.log('\n📂 All CSV files in storage:');
    const [allFiles] = await bucket.getFiles({ prefix: 'csv-uploads/' });
    const csvFiles = allFiles.filter(f => f.name.endsWith('.csv'));
    
    console.log(`Total CSV files: ${csvFiles.length}`);
    csvFiles.forEach(f => {
      console.log(`   - ${f.name}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

verifyJaniceUpload();