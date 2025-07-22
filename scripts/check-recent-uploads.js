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

async function checkRecentActivity() {
  console.log('🔍 Checking recent upload activity...\n');
  
  try {
    // Check Firestore upload logs
    console.log('📊 Checking Firestore upload logs:');
    const logsSnapshot = await db.collection('csv_uploads')
      .orderBy('uploadedAt', 'desc')
      .limit(5)
      .get();
      
    if (!logsSnapshot.empty) {
      console.log(`Found ${logsSnapshot.size} recent uploads in csv_uploads collection:\n`);
      logsSnapshot.forEach(doc => {
        const data = doc.data();
        console.log(`📄 ${data.fileName}`);
        console.log(`   Size: ${(data.fileSize / 1024).toFixed(1)} KB`);
        console.log(`   Uploaded: ${data.uploadedAt?.toDate?.()?.toLocaleString() || 'Unknown'}`);
        console.log(`   By: ${data.uploadedBy}`);
        console.log('');
      });
    } else {
      console.log('No documents in csv_uploads collection\n');
    }
    
    // Check storage for ANY csv files
    console.log('📂 Checking Storage for CSV files:');
    const [allFiles] = await bucket.getFiles();
    const csvFiles = allFiles.filter(f => f.name.endsWith('.csv'));
    
    if (csvFiles.length > 0) {
      console.log(`Found ${csvFiles.length} CSV files:\n`);
      for (const file of csvFiles) {
        const [metadata] = await file.getMetadata();
        console.log(`📄 ${file.name}`);
        console.log(`   Size: ${(metadata.size / 1024).toFixed(1)} KB`);
        console.log(`   Uploaded: ${new Date(metadata.timeCreated).toLocaleString()}`);
      }
    } else {
      console.log('No CSV files found in storage');
    }
    
  } catch (error) {
    console.error('❌ Error checking activity:', error);
  }
}

checkRecentActivity();