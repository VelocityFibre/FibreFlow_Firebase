#!/usr/bin/env node

/**
 * Check for poles with status history in FibreFlow production database
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin for FibreFlow production
admin.initializeApp({
  projectId: 'fibreflow-73daf'
});

const db = admin.firestore();

async function checkStatusHistory() {
  try {
    console.log('🔍 Checking FibreFlow production for poles with status history...\n');
    console.log('📊 Database: fibreflow-73daf');
    console.log('📁 Collection: planned-poles\n');
    
    // First, check if we have any poles at all
    const snapshot = await db.collection('planned-poles').limit(10).get();
    console.log(`Found ${snapshot.size} poles (limited to 10 for quick check)\n`);
    
    // Check for poles with statusHistory
    const polesWithHistory = await db.collection('planned-poles')
      .where('statusHistory', '!=', null)
      .limit(10)
      .get();
    
    console.log(`Poles with statusHistory field: ${polesWithHistory.size}\n`);
    
    if (polesWithHistory.size > 0) {
      console.log('📋 Sample poles with status history:');
      polesWithHistory.docs.forEach(doc => {
        const data = doc.data();
        console.log(`\nPole ID: ${doc.id}`);
        console.log(`VF Pole ID: ${data.vfPoleId || 'N/A'}`);
        console.log(`Pole Number: ${data.poleNumber || 'N/A'}`);
        console.log(`Status History Length: ${data.statusHistory?.length || 0}`);
        
        if (data.statusHistory && data.statusHistory.length > 0) {
          console.log('Recent status changes:');
          data.statusHistory.slice(-3).forEach((change, i) => {
            const date = change.changedAt?.toDate ? change.changedAt.toDate().toISOString() : change.changedAt;
            console.log(`  ${i + 1}. ${date}: ${change.status} (by ${change.changedByName || 'Unknown'})`);
          });
        }
      });
    } else {
      console.log('❌ No poles found with statusHistory field\n');
      
      // Check a few poles to see their structure
      console.log('📋 Sample pole structure (checking first pole):');
      if (snapshot.size > 0) {
        const firstPole = snapshot.docs[0].data();
        const fields = Object.keys(firstPole);
        console.log(`Available fields: ${fields.join(', ')}`);
        
        // Check if there's any field that might contain history
        const historyFields = fields.filter(f => 
          f.toLowerCase().includes('history') || 
          f.toLowerCase().includes('status') ||
          f.toLowerCase().includes('change')
        );
        
        if (historyFields.length > 0) {
          console.log(`\nPotential history-related fields: ${historyFields.join(', ')}`);
          historyFields.forEach(field => {
            console.log(`${field}: ${JSON.stringify(firstPole[field], null, 2).substring(0, 200)}...`);
          });
        }
      }
    }
    
    // Check if pole-status-changes collection exists
    console.log('\n🔍 Checking pole-status-changes collection...');
    const statusChanges = await db.collection('pole-status-changes').limit(5).get();
    console.log(`Found ${statusChanges.size} documents in pole-status-changes collection`);
    
    if (statusChanges.size > 0) {
      console.log('\n✅ pole-status-changes collection exists with data!');
      console.log('Sample status changes:');
      statusChanges.docs.forEach(doc => {
        const data = doc.data();
        console.log(`\n- ${doc.id}`);
        console.log(`  Pole: ${data.poleNumber || data.vfPoleId}`);
        console.log(`  Change: ${data.fromStatus} → ${data.toStatus}`);
        console.log(`  Date: ${data.changeDate}`);
        console.log(`  By: ${data.changedByName}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit();
  }
}

// Run the check
checkStatusHistory();