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

async function checkAllLocations() {
  console.log('🔍 Comprehensive check for uploaded files...\n');
  
  try {
    // 1. Check ALL files uploaded in last hour
    console.log('📅 Files uploaded in last hour (anywhere in bucket):');
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const [allFiles] = await bucket.getFiles();
    
    const recentFiles = [];
    for (const file of allFiles) {
      const [metadata] = await file.getMetadata();
      const uploadTime = new Date(metadata.timeCreated);
      if (uploadTime > oneHourAgo) {
        recentFiles.push({ file, metadata, uploadTime });
      }
    }
    
    if (recentFiles.length > 0) {
      console.log(`Found ${recentFiles.length} recent files:\n`);
      recentFiles.forEach(({ file, metadata, uploadTime }) => {
        console.log(`📄 ${file.name}`);
        console.log(`   Size: ${(metadata.size / 1024).toFixed(1)} KB`);
        console.log(`   Time: ${uploadTime.toLocaleString()}`);
        console.log(`   Type: ${metadata.contentType}`);
        console.log('');
      });
    } else {
      console.log('No files uploaded in the last hour\n');
    }
    
    // 2. Check Firestore logs
    console.log('📊 Checking Firestore upload logs:');
    const uploadLogs = await db.collection('upload_logs')
      .orderBy('uploadedAt', 'desc')
      .limit(10)
      .get();
      
    if (!uploadLogs.empty) {
      console.log(`Found ${uploadLogs.size} upload log entries:\n`);
      uploadLogs.forEach(doc => {
        const data = doc.data();
        console.log(`📝 ${data.fileName || 'Unknown'}`);
        console.log(`   Time: ${data.uploadedAt?.toDate?.()?.toLocaleString() || 'Unknown'}`);
        console.log(`   By: ${data.uploadedBy || 'Unknown'}`);
        console.log('');
      });
    } else {
      console.log('No upload logs found\n');
    }
    
    // 3. Check for CSV files with different patterns
    console.log('🔎 All CSV files in storage:');
    const csvFiles = allFiles.filter(f => 
      f.name.toLowerCase().endsWith('.csv') || 
      f.name.includes('lawley') ||
      f.name.includes('Lawley')
    );
    
    console.log(`Found ${csvFiles.length} CSV/Lawley files total`);
    if (csvFiles.length > 0) {
      for (const file of csvFiles) {
        const [metadata] = await file.getMetadata();
        console.log(`- ${file.name} (${new Date(metadata.timeCreated).toLocaleDateString()})`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkAllLocations();