#!/usr/bin/env node

/**
 * Check specific poles for status history subcollections
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin for FibreFlow production
admin.initializeApp({
  projectId: 'fibreflow-73daf'
});

const db = admin.firestore();

async function checkSpecificPoleHistory() {
  try {
    console.log('🔍 Checking specific poles with totalStatusRecords > 0...\n');
    
    // Get poles with totalStatusRecords > 1 (multiple records)
    const polesQuery = await db.collection('planned-poles')
      .where('totalStatusRecords', '>', 1)
      .limit(10)
      .get();
    
    console.log(`Found ${polesQuery.size} poles with totalStatusRecords > 1\n`);
    
    if (polesQuery.size === 0) {
      // Try poles with exactly 1 record
      console.log('Checking poles with totalStatusRecords = 1...\n');
      const singleRecordPoles = await db.collection('planned-poles')
        .where('totalStatusRecords', '==', 1)
        .limit(5)
        .get();
      
      if (singleRecordPoles.size > 0) {
        console.log(`Found ${singleRecordPoles.size} poles with exactly 1 status record`);
        console.log('These poles only have current status, no history.\n');
        
        // Show a sample
        const samplePole = singleRecordPoles.docs[0];
        const data = samplePole.data();
        console.log('Sample pole:');
        console.log(`- ID: ${samplePole.id}`);
        console.log(`- Status: ${data.importStatus || data.status}`);
        console.log(`- Field Agent: ${data.fieldAgent || 'Not set'}`);
        console.log(`- Total Records: ${data.totalStatusRecords}`);
      }
    } else {
      // Check each pole for subcollection
      for (const poleDoc of polesQuery.docs) {
        const poleData = poleDoc.data();
        console.log(`\n📊 Pole: ${poleDoc.id}`);
        console.log(`   Current Status: ${poleData.importStatus || poleData.status}`);
        console.log(`   Total Status Records: ${poleData.totalStatusRecords}`);
        console.log(`   Field Agent: ${poleData.fieldAgent || 'Not set'}`);
        
        // Check for statusHistory subcollection
        const historySnapshot = await db
          .collection('planned-poles')
          .doc(poleDoc.id)
          .collection('statusHistory')
          .orderBy('timestamp', 'desc')
          .limit(5)
          .get();
        
        if (historySnapshot.size > 0) {
          console.log(`   ✅ Has statusHistory subcollection with ${historySnapshot.size} entries:`);
          
          historySnapshot.docs.forEach((histDoc, index) => {
            const hist = histDoc.data();
            const timestamp = hist.timestamp?.toDate?.() || hist.timestamp;
            console.log(`      ${index + 1}. ${hist.status} - ${timestamp} (${hist.fieldAgent || 'Unknown agent'})`);
          });
        } else {
          console.log(`   ❌ No statusHistory subcollection found`);
        }
      }
    }
    
    // Final recommendation
    console.log('\n' + '='.repeat(60));
    console.log('💡 RECOMMENDATION:\n');
    console.log('Currently, most poles only have 1 status record (current status only).');
    console.log('To see status history in the UI, you need to:');
    console.log('\n1. Import historical data that shows status changes over time');
    console.log('2. Run: node sync/scripts/sync-with-status-history.js');
    console.log('3. This will create the statusHistory subcollections needed');
    console.log('\nAlternatively, create test data with multiple status changes.');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit();
  }
}

// Run the check
checkSpecificPoleHistory();