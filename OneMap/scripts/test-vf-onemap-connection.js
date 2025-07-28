#!/usr/bin/env node

/**
 * Test connection to vf-onemap-data
 */

require('dotenv').config({ path: '../.env.local' });
const admin = require('firebase-admin');
const path = require('path');

// Initialize vf-onemap-data app
function getVfOnemapApp() {
  const serviceAccountPath = process.env.VF_ONEMAP_SA_PATH || 
    path.join(process.env.HOME, '.firebase-keys', 'fibreflow-to-onemap-key.json');
  
  if (!require('fs').existsSync(serviceAccountPath)) {
    throw new Error(`Service account key not found at: ${serviceAccountPath}`);
  }
  
  const serviceAccount = require(serviceAccountPath);
  
  return admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: process.env.VF_ONEMAP_STORAGE_BUCKET || 'vf-onemap-data.firebasestorage.app'
  }, 'vf-onemap-test');
}

async function testConnection() {
  try {
    console.log('🔌 Testing connection to vf-onemap-data...\n');
    
    const app = getVfOnemapApp();
    const db = app.firestore();
    const storage = app.storage();
    
    // Test Firestore access
    console.log('📊 Testing Firestore access...');
    const testDoc = await db.collection('connection-test').add({
      timestamp: new Date(),
      source: 'fibreflow-integration-test'
    });
    console.log('✅ Firestore write successful:', testDoc.id);
    
    // Clean up test document
    await db.collection('connection-test').doc(testDoc.id).delete();
    console.log('🧹 Cleaned up test document');
    
    // Test Storage access
    console.log('\n📁 Testing Storage access...');
    const bucket = storage.bucket();
    const [files] = await bucket.getFiles({ maxResults: 1 });
    console.log('✅ Storage read successful:', files.length, 'files found');
    
    console.log('\n🎉 Connection test passed! Ready for data import.');
    
  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
    console.error('\nMake sure:');
    console.error('1. Service account key exists at the path specified in .env.local');
    console.error('2. Service account has proper permissions (datastore.user, storage.objectAdmin)');
    console.error('3. You have run all the gcloud commands listed in the setup');
  }
  
  process.exit(0);
}

testConnection();
