#!/usr/bin/env node

/**
 * List all files in Firebase Storage
 * Quick way to see what's uploaded
 */

require('dotenv').config({ path: '../.env' });
const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('../credentials/vf-onemap-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'vf-onemap-data.firebasestorage.app'
});

const bucket = admin.storage().bucket();

async function listFiles() {
  try {
    console.log('📂 Files in Firebase Storage:\n');
    
    const [files] = await bucket.getFiles();
    
    if (files.length === 0) {
      console.log('No files found in storage.');
      return;
    }
    
    // Group by directory
    const filesByDir = {};
    
    files.forEach(file => {
      const parts = file.name.split('/');
      const dir = parts.length > 1 ? parts[0] : '/';
      const fileName = parts[parts.length - 1];
      
      if (!filesByDir[dir]) {
        filesByDir[dir] = [];
      }
      filesByDir[dir].push({
        name: fileName,
        size: (file.metadata.size / 1024).toFixed(2) + ' KB',
        updated: new Date(file.metadata.updated).toLocaleString()
      });
    });
    
    // Display files
    Object.entries(filesByDir).forEach(([dir, dirFiles]) => {
      console.log(`📁 ${dir}/`);
      dirFiles.forEach(file => {
        console.log(`   📄 ${file.name} (${file.size}) - ${file.updated}`);
      });
      console.log('');
    });
    
    console.log(`Total files: ${files.length}`);
    
  } catch (error) {
    console.error('❌ Error listing files:', error.message);
  }
}

listFiles();