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

async function debugUploadIssue() {
  console.log('🔍 Debugging Upload Issue...\n');
  
  try {
    // 1. Check ALL storage files uploaded today
    console.log('📅 All files uploaded today:');
    const [allFiles] = await bucket.getFiles();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let todayCount = 0;
    for (const file of allFiles) {
      const [metadata] = await file.getMetadata();
      const uploadDate = new Date(metadata.timeCreated);
      if (uploadDate >= today) {
        console.log(`- ${file.name} (${uploadDate.toLocaleTimeString()})`);
        todayCount++;
      }
    }
    console.log(`Total files uploaded today: ${todayCount}\n`);
    
    // 2. Check Firestore collections that might log uploads
    console.log('📊 Checking Firestore collections:');
    
    // Check various possible collections
    const collections = [
      'csv_uploads',
      'upload_logs', 
      'csv_queue',
      'uploads',
      'onemap_uploads'
    ];
    
    for (const collName of collections) {
      try {
        const snapshot = await db.collection(collName).limit(5).get();
        if (!snapshot.empty) {
          console.log(`\n✅ Collection '${collName}' has ${snapshot.size} documents:`);
          snapshot.forEach(doc => {
            const data = doc.data();
            console.log(`  - ${doc.id}: ${data.fileName || data.name || 'No filename'}`);
          });
        }
      } catch (e) {
        // Collection might not exist
      }
    }
    
    // 3. Check if there's a different storage bucket
    console.log('\n🪣 Storage bucket info:');
    console.log(`Bucket name: ${bucket.name}`);
    console.log(`Bucket URL: gs://${bucket.name}`);
    
    // 4. List ALL paths/folders in storage
    console.log('\n📁 All folders/paths in storage:');
    const paths = new Set();
    allFiles.forEach(file => {
      const parts = file.name.split('/');
      if (parts.length > 1) {
        paths.add(parts[0]);
      }
    });
    
    console.log('Folders found:', Array.from(paths).join(', '));
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

debugUploadIssue();