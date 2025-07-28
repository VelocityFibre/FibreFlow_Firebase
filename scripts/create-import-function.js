#!/usr/bin/env node

/**
 * Create Import Cloud Function for vf-onemap-data
 * ==============================================
 * 
 * This creates a Cloud Function that can import data
 */

console.log('📋 Cloud Function Solution for vf-onemap-data Import');
console.log('==================================================');
console.log('');
console.log('Since service account keys are disabled, create a Cloud Function:');
console.log('');
console.log('1. Go to Firebase Console:');
console.log('   https://console.firebase.google.com/project/vf-onemap-data/functions');
console.log('');
console.log('2. Create a new function with this code:');
console.log('');
console.log(`
const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

const db = admin.firestore();

exports.importOneMapData = functions.https.onCall(async (data, context) => {
  // Check authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
  }
  
  // Check if user is admin (your email)
  if (context.auth.token.email !== 'louis@velocityfibreapp.com') {
    throw new functions.https.HttpsError('permission-denied', 'Not authorized');
  }
  
  const { records, batchId, fileName } = data;
  
  // Import records
  const batch = db.batch();
  let count = 0;
  
  for (const record of records) {
    const docRef = db.collection('vf-onemap-processed-records').doc(record.propertyId);
    batch.set(docRef, {
      ...record,
      importDate: admin.firestore.FieldValue.serverTimestamp(),
      importBatchId: batchId,
      sourceFile: fileName
    }, { merge: true });
    count++;
    
    if (count >= 500) {
      await batch.commit();
      count = 0;
    }
  }
  
  if (count > 0) {
    await batch.commit();
  }
  
  return { success: true, imported: records.length };
});
`);
console.log('');
console.log('3. Deploy the function');
console.log('');
console.log('4. Call it from your local script using Firebase Auth');
console.log('');
console.log('This bypasses the service account restriction!');