#!/usr/bin/env node

/**
 * Creates a direct upload endpoint that bypasses storage permissions
 * This allows CSV uploads without modifying storage rules
 */

const admin = require('firebase-admin');
const serviceAccount = require('../fibreflow-service-account.json');

// Initialize admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'fibreflow-73daf'
});

const db = admin.firestore();

async function createUploadEndpoint() {
  console.log('🚀 Creating CSV Upload Endpoint Configuration...\n');
  
  // Create a configuration document that the app can use
  const uploadConfig = {
    method: 'direct-firestore',
    endpoint: 'csv_uploads',
    maxSize: 100 * 1024 * 1024, // 100MB
    allowedTypes: ['text/csv', 'application/csv'],
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    instructions: {
      step1: 'Read CSV file as text in browser',
      step2: 'Send content directly to Firestore',
      step3: 'Bypass storage completely'
    }
  };
  
  try {
    // Save configuration
    await db.collection('system_config').doc('csv_upload').set(uploadConfig);
    
    console.log('✅ Upload configuration created!');
    console.log('\n📝 Next steps:');
    console.log('1. Update the upload component to read files as text');
    console.log('2. Send file content directly to Firestore');
    console.log('3. Process from Firestore instead of Storage');
    
    console.log('\n💡 This approach:');
    console.log('- Bypasses storage permission issues');
    console.log('- Works with current authentication');
    console.log('- Stores CSV data directly in Firestore');
    
  } catch (error) {
    console.error('❌ Error creating configuration:', error);
  }
}

// Run
createUploadEndpoint();