#!/usr/bin/env node

const admin = require('firebase-admin');
const serviceAccount = require('../credentials/vf-onemap-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'vf-onemap-data'
});

const db = admin.firestore();

async function checkProperty() {
  try {
    const doc = await db.collection('vf-onemap-processed-records').doc('308025').get();
    
    if (!doc.exists) {
      console.log('Property 308025 not found!');
      return;
    }
    
    const data = doc.data();
    console.log('\n📋 Property 308025 Data:');
    console.log('Current Status:', data.currentStatus);
    console.log('Status Update:', data['Status Update']);
    console.log('Status:', data['Status']);
    
    console.log('\n📜 Status History:');
    if (data.statusHistory && data.statusHistory.length > 0) {
      data.statusHistory.forEach((entry, index) => {
        console.log(`\n  Entry ${index + 1}:`);
        console.log(`  Date: ${entry.date}`);
        console.log(`  Status: ${entry.status}`);
        console.log(`  File: ${entry.fileName}`);
        console.log(`  Timestamp: ${entry.timestamp}`);
      });
    } else {
      console.log('  No status history found');
    }
    
    console.log('\n🔍 All Status-related fields:');
    Object.keys(data).forEach(key => {
      if (key.toLowerCase().includes('status')) {
        console.log(`  ${key}: ${data[key]}`);
      }
    });
    
    await admin.app().delete();
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkProperty();