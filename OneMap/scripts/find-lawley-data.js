#!/usr/bin/env node

/**
 * Find where Lawley data is stored in Firebase
 */

const admin = require('firebase-admin');
const serviceAccount = require('../credentials/vf-onemap-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'vf-onemap-data'
});

const db = admin.firestore();

async function findLawleyData() {
  console.log('🔍 SEARCHING FOR LAWLEY DATA IN FIREBASE\n');

  // Check main collections
  const collections = ['properties', 'poles', 'planned-poles', 'staging', 'imports'];
  
  for (const collection of collections) {
    console.log(`\nChecking collection: ${collection}`);
    console.log('-'.repeat(40));
    
    try {
      // Try different query approaches
      let snapshot;
      
      // Check for Lawley in different fields
      const queries = [
        db.collection(collection).where('projectId', '==', 'oAigmUjSbjWHmH80AMxc').limit(5),
        db.collection(collection).where('Site', '==', 'Lawley').limit(5),
        db.collection(collection).where('Pole Number', '>=', 'LAW.P.').where('Pole Number', '<', 'LAW.Q.').limit(5)
      ];
      
      for (let i = 0; i < queries.length; i++) {
        try {
          snapshot = await queries[i].get();
          if (!snapshot.empty) {
            console.log(`✅ Found ${snapshot.size} documents with query ${i + 1}`);
            
            // Show sample document
            const sample = snapshot.docs[0].data();
            console.log('\nSample document:');
            console.log(`- Property ID: ${sample['Property ID'] || 'N/A'}`);
            console.log(`- Pole Number: ${sample['Pole Number'] || 'N/A'}`);
            console.log(`- Drop Number: ${sample['Drop Number'] || 'N/A'}`);
            console.log(`- Site: ${sample.Site || 'N/A'}`);
            console.log(`- Status: ${sample.Status || 'N/A'}`);
            console.log(`- GPS: ${sample.Latitude || 'N/A'}, ${sample.Longitude || 'N/A'}`);
            
            // Check for status history
            if (sample.statusHistory) {
              console.log(`- Status History: ${sample.statusHistory.length} entries`);
            }
            
            break; // Found data, move to next collection
          }
        } catch (queryError) {
          // Query might fail if field doesn't exist in collection
          continue;
        }
      }
      
      if (!snapshot || snapshot.empty) {
        console.log('❌ No Lawley data found in this collection');
      }
      
    } catch (error) {
      console.log(`⚠️  Error checking ${collection}: ${error.message}`);
    }
  }
  
  // Check recent import batches
  console.log('\n\n📦 RECENT IMPORT BATCHES:');
  console.log('-'.repeat(40));
  
  const batchesSnap = await db.collection('imports')
    .orderBy('timestamp', 'desc')
    .limit(5)
    .get();
  
  if (!batchesSnap.empty) {
    batchesSnap.forEach(doc => {
      const batch = doc.data();
      console.log(`\nBatch: ${doc.id}`);
      console.log(`- File: ${batch.fileName}`);
      console.log(`- Records: ${batch.totalRecords}`);
      console.log(`- Date: ${batch.timestamp?.toDate().toISOString()}`);
    });
  }
  
  process.exit(0);
}

// Run search
findLawleyData().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});