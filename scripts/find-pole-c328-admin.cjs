#!/usr/bin/env node

/**
 * Find pole LAW.P.C328 using Firebase Admin SDK
 */

const admin = require('firebase-admin');
const path = require('path');

// Try to use the sync config service account
const serviceAccountPath = path.join(__dirname, '../sync/config/service-accounts/fibreflow-73daf-key.json');

try {
  const serviceAccount = require(serviceAccountPath);
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'fibreflow-73daf'
  });
  
  console.log('✅ Firebase Admin initialized');
} catch (error) {
  console.error('❌ Failed to initialize Firebase Admin:', error.message);
  console.log('\nTrying alternative path...');
  
  // Try OneMap credentials
  try {
    const altPath = path.join(__dirname, '../OneMap/credentials/vf-onemap-service-account.json');
    const altServiceAccount = require(altPath);
    
    admin.initializeApp({
      credential: admin.credential.cert(altServiceAccount),
      projectId: 'fibreflow-73daf'
    });
    
    console.log('✅ Firebase Admin initialized with alternative credentials');
  } catch (altError) {
    console.error('❌ Could not find service account. Please ensure service account exists.');
    process.exit(1);
  }
}

const db = admin.firestore();

async function findPole() {
  console.log('\n🔍 Searching for pole LAW.P.C328...\n');
  
  try {
    // Method 1: Search by pole number field
    const query = await db.collection('planned-poles')
      .where('poleNumber', '==', 'LAW.P.C328')
      .get();
    
    if (!query.empty) {
      console.log(`✅ Found ${query.size} document(s) with pole number LAW.P.C328:`);
      
      for (const doc of query.docs) {
        const data = doc.data();
        console.log(`\n📄 Document ID: ${doc.id}`);
        console.log(`   Pole Number: ${data.poleNumber}`);
        console.log(`   Project: ${data.projectName || 'N/A'}`);
        console.log(`   Status: ${data.status || data.importStatus || 'N/A'}`);
        console.log(`   Address: ${data.address || 'N/A'}`);
        console.log(`   Created: ${data.createdAt?.toDate() || 'N/A'}`);
        
        // Check status history
        console.log('\n   📊 Checking status history...');
        const historyRef = doc.ref.collection('statusHistory');
        const history = await historyRef.orderBy('timestamp', 'desc').limit(5).get();
        
        if (history.empty) {
          console.log('   ❌ No status history found');
        } else {
          console.log(`   ✅ Found ${history.size} status history entries:`);
          history.forEach(histDoc => {
            const histData = histDoc.data();
            console.log(`      - ${histData.timestamp?.toDate() || 'N/A'}: ${histData.status} (${histData.fieldAgent || 'N/A'})`);
          });
        }
        
        console.log(`\n🔗 URL: https://fibreflow-73daf.web.app/pole-tracker/${doc.id}`);
      }
    } else {
      console.log('❌ No documents found with pole number LAW.P.C328');
      
      // Method 2: Try by document ID
      console.log('\n🔍 Trying by document ID (using pole number as ID)...');
      const docRef = db.collection('planned-poles').doc('LAW.P.C328');
      const docSnap = await docRef.get();
      
      if (docSnap.exists) {
        const data = docSnap.data();
        console.log('\n✅ Found document with ID LAW.P.C328:');
        console.log(`   Pole Number: ${data.poleNumber}`);
        console.log(`   Project: ${data.projectName || 'N/A'}`);
        console.log(`   Status: ${data.status || data.importStatus || 'N/A'}`);
        console.log(`\n🔗 URL: https://fibreflow-73daf.web.app/pole-tracker/LAW.P.C328`);
      } else {
        console.log('❌ No document found with ID LAW.P.C328');
      }
      
      // Method 3: Check what the suspect document contains
      console.log('\n🔍 Checking suspect document A7LuDrS5gxDrMcaYRbaI...');
      const suspectRef = db.collection('planned-poles').doc('A7LuDrS5gxDrMcaYRbaI');
      const suspectSnap = await suspectRef.get();
      
      if (suspectSnap.exists) {
        const data = suspectSnap.data();
        console.log('\n📄 Suspect document contains:');
        console.log(`   Pole Number: ${data.poleNumber}`);
        console.log(`   Project: ${data.projectName || 'N/A'}`);
        console.log(`   Status: ${data.status || data.importStatus || 'N/A'}`);
      }
    }
    
    // Check if sync script ran recently
    console.log('\n📅 Checking recent sync activity...');
    const recentPoles = await db.collection('planned-poles')
      .where('lastSyncedFrom', '==', 'vf-onemap-data')
      .orderBy('lastSyncDate', 'desc')
      .limit(5)
      .get();
    
    if (!recentPoles.empty) {
      console.log(`\n✅ Found ${recentPoles.size} recently synced poles:`);
      recentPoles.forEach(doc => {
        const data = doc.data();
        console.log(`   ${data.poleNumber} - synced ${data.lastSyncDate?.toDate() || 'N/A'}`);
      });
    } else {
      console.log('\n❌ No poles found with sync metadata. The sync script may not have run yet.');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
  
  console.log('\n✅ Search complete');
  process.exit(0);
}

findPole();