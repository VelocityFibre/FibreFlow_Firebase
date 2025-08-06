#!/usr/bin/env node

/**
 * Verify Sync Script
 * Checks what was synced to production and validates field mappings
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin for production
const productionApp = admin.initializeApp({
  credential: admin.credential.cert(
    require('../config/service-accounts/fibreflow-73daf-key.json')
  ),
  projectId: 'fibreflow-73daf'
}, 'production');

const productionDb = productionApp.firestore();

async function verifySync() {
  console.log('🔍 Verifying Sync Results in Production\n');
  
  try {
    // Check the poles we synced
    const polesToCheck = ['LAW.P.C654', 'LAW.P.C442'];
    
    console.log('📊 Checking synced poles in production:\n');
    
    for (const poleNumber of polesToCheck) {
      const poleDoc = await productionDb
        .collection('planned-poles')
        .doc(poleNumber)
        .get();
      
      if (poleDoc.exists) {
        const data = poleDoc.data();
        console.log(`✅ Pole ${poleNumber} found in production!`);
        console.log('   Synced fields:');
        console.log(`   - Address: ${data.address || 'Not set'}`);
        console.log(`   - Location: ${JSON.stringify(data.location) || 'Not set'}`);
        console.log(`   - PON Number: ${data.ponNumber || 'Not set'}`);
        console.log(`   - Zone Number: ${data.zoneNumber || 'Not set'}`);
        console.log(`   - Project: ${data.projectName || 'Not set'}`);
        console.log(`   - Import Status: ${data.importStatus || 'Not set'}`);
        console.log(`   - Workflow Group: ${data.workflowGroup || 'Not set'}`);
        console.log(`   - Property ID: ${data.propertyId || 'Not set'}`);
        console.log(`   - Last Modified in OneMap: ${data.lastModifiedInOnemap || 'Not set'}`);
        console.log(`   - Status Change Date: ${data.statusChangeDate || 'Not set'}`);
        console.log(`   - Drop Number: ${data.dropNumber || 'Not set'}`);
        console.log(`   - Last Synced From: ${data.lastSyncedFrom || 'Not set'}`);
        console.log(`   - Last Sync Date: ${data.lastSyncDate ? data.lastSyncDate.toDate() : 'Not set'}`);
        console.log(`   - Staging Doc ID: ${data.stagingDocId || 'Not set'}`);
        console.log('\n   All fields in document:', Object.keys(data).join(', '));
        console.log('');
      } else {
        console.log(`❌ Pole ${poleNumber} NOT found in production`);
      }
    }
    
    // Check for any status history subcollection
    console.log('\n📜 Checking for status history tracking:\n');
    
    for (const poleNumber of polesToCheck) {
      try {
        const statusHistory = await productionDb
          .collection('planned-poles')
          .doc(poleNumber)
          .collection('statusHistory')
          .orderBy('timestamp', 'desc')
          .limit(5)
          .get();
        
        if (!statusHistory.empty) {
          console.log(`✅ Pole ${poleNumber} has status history (${statusHistory.size} entries):`);
          statusHistory.forEach(doc => {
            const history = doc.data();
            console.log(`   - ${history.timestamp?.toDate() || 'No date'}: ${history.previousStatus} → ${history.newStatus}`);
          });
        } else {
          console.log(`📝 Pole ${poleNumber} has no status history yet`);
        }
      } catch (error) {
        console.log(`📝 Pole ${poleNumber} - Status history collection not found`);
      }
      console.log('');
    }
    
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
  }
}

// Run verification
verifySync().then(() => {
  console.log('✨ Verification completed!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});