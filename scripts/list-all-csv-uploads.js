#!/usr/bin/env node

const admin = require('firebase-admin');
const serviceAccount = require('../fibreflow-service-account.json');

// Initialize admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'fibreflow-73daf.firebasestorage.app'
});

const bucket = admin.storage().bucket();

async function listAllCSVs() {
  console.log('📂 Listing ALL files in csv-uploads folder...\n');
  
  try {
    // List files specifically in csv-uploads prefix
    const [files] = await bucket.getFiles({ prefix: 'csv-uploads/' });
    
    if (files.length === 0) {
      console.log('No files found in csv-uploads folder');
      return;
    }
    
    console.log(`Found ${files.length} file(s):\n`);
    
    // Sort by upload time (newest first)
    const filesWithMetadata = await Promise.all(
      files.map(async (file) => {
        const [metadata] = await file.getMetadata();
        return { file, metadata };
      })
    );
    
    filesWithMetadata
      .sort((a, b) => new Date(b.metadata.timeCreated) - new Date(a.metadata.timeCreated))
      .forEach(({ file, metadata }) => {
        console.log(`📄 ${file.name}`);
        console.log(`   Size: ${(metadata.size / 1024).toFixed(1)} KB`);
        console.log(`   Uploaded: ${new Date(metadata.timeCreated).toLocaleString()}`);
        console.log(`   Type: ${metadata.contentType || 'Unknown'}`);
        console.log('');
      });
      
    // Summary
    const totalSize = filesWithMetadata.reduce((sum, { metadata }) => sum + parseInt(metadata.size), 0);
    console.log(`📊 Summary:`);
    console.log(`   Total files: ${files.length}`);
    console.log(`   Total size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
    
  } catch (error) {
    console.error('❌ Error listing files:', error);
  }
}

listAllCSVs();