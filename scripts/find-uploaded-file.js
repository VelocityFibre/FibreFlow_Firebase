#!/usr/bin/env node

const admin = require('firebase-admin');
const serviceAccount = require('../fibreflow-service-account.json');

// Initialize admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'fibreflow-73daf.firebasestorage.app'
});

const bucket = admin.storage().bucket();

async function findFile() {
  console.log('🔍 Searching entire storage bucket for test-with-data.csv...\n');
  
  try {
    // List ALL files in the bucket
    const [files] = await bucket.getFiles();
    
    console.log(`📊 Total files in storage: ${files.length}\n`);
    
    // Look for our test file
    const testFiles = files.filter(f => f.name.includes('test-with-data'));
    
    if (testFiles.length > 0) {
      console.log('✅ Found test-with-data.csv:\n');
      for (const file of testFiles) {
        const [metadata] = await file.getMetadata();
        console.log(`📄 Path: ${file.name}`);
        console.log(`   Size: ${(metadata.size / 1024).toFixed(1)} KB`);
        console.log(`   Uploaded: ${new Date(metadata.timeCreated).toLocaleString()}`);
        console.log(`   Download URL: https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(file.name)}?alt=media`);
        console.log('');
      }
    } else {
      // Show recent uploads
      console.log('❌ test-with-data.csv not found\n');
      console.log('📋 Recent uploads (last 10):');
      
      const recentFiles = files
        .map(f => ({ file: f, time: f.metadata.timeCreated }))
        .sort((a, b) => new Date(b.time) - new Date(a.time))
        .slice(0, 10);
        
      for (const {file} of recentFiles) {
        const [metadata] = await file.getMetadata();
        console.log(`- ${file.name} (${(metadata.size / 1024).toFixed(1)} KB) - ${new Date(metadata.timeCreated).toLocaleString()}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error searching storage:', error);
  }
}

findFile();