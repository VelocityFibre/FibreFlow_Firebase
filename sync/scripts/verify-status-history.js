#!/usr/bin/env node

/**
 * Verify Status History
 * Checks that status history was properly created for poles
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

async function verifyStatusHistory() {
  console.log('🔍 Verifying Status History in Production\n');
  
  try {
    // Check poles with multiple status records
    const polesToCheck = ['LAW.P.C654', 'LAW.P.C328'];
    
    for (const poleNumber of polesToCheck) {
      console.log(`\n📊 Checking ${poleNumber}:`);
      
      // Get pole document
      const poleDoc = await productionDb
        .collection('planned-poles')
        .doc(poleNumber)
        .get();
      
      if (poleDoc.exists) {
        const data = poleDoc.data();
        console.log(`✅ Pole found`);
        console.log(`   Current Status: ${data.importStatus}`);
        console.log(`   Total Status Records: ${data.totalStatusRecords || 0}`);
        console.log(`   Field Agent: ${data.fieldAgent || 'Not set'}`);
        
        // Get status history
        const historySnapshot = await productionDb
          .collection('planned-poles')
          .doc(poleNumber)
          .collection('statusHistory')
          .orderBy('timestamp', 'desc')
          .get();
        
        console.log(`\n   📜 Status History (${historySnapshot.size} entries):`);
        
        historySnapshot.forEach((doc, index) => {
          const history = doc.data();
          console.log(`\n   ${index + 1}. Entry ID: ${doc.id}`);
          console.log(`      Status: ${history.status}`);
          console.log(`      Field Agent: ${history.fieldAgent || 'Unknown'}`);
          console.log(`      Property ID: ${history.propertyId}`);
          console.log(`      Drop Number: ${history.dropNumber || 'None'}`);
          console.log(`      Timestamp: ${history.timestamp ? history.timestamp.toDate() : 'Not set'}`);
          console.log(`      OneMap Modified: ${history.lastModifiedInOnemap || 'Not set'}`);
          console.log(`      Source: ${history.source}`);
        });
      } else {
        console.log(`❌ Pole ${poleNumber} not found`);
      }
      
      console.log('\n' + '='.repeat(60));
    }
    
    // Summary statistics
    console.log('\n📈 Overall Statistics:\n');
    
    // Count poles with status history
    const polesWithHistory = await productionDb
      .collection('planned-poles')
      .where('totalStatusRecords', '>', 1)
      .get();
    
    console.log(`   Poles with multiple status records: ${polesWithHistory.size}`);
    
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
  }
}

// Run verification
verifyStatusHistory().then(() => {
  console.log('\n✨ Status history verification completed!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});