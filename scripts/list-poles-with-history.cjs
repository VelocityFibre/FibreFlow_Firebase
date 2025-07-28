#!/usr/bin/env node

/**
 * List all poles with status history that can be viewed in the UI
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin for FibreFlow production
admin.initializeApp({
  projectId: 'fibreflow-73daf'
});

const db = admin.firestore();

async function listPolesWithHistory() {
  try {
    console.log('🔍 Finding all poles with viewable status history...\n');
    console.log('📊 Database: fibreflow-73daf (Production)');
    console.log('=' .repeat(60) + '\n');
    
    // Get all poles with multiple status records
    const polesWithHistory = await db.collection('planned-poles')
      .where('totalStatusRecords', '>', 1)
      .get();
    
    console.log(`✅ Found ${polesWithHistory.size} poles with status history!\n`);
    
    if (polesWithHistory.size > 0) {
      console.log('📋 POLES YOU CAN VIEW IN THE UI:\n');
      
      for (const poleDoc of polesWithHistory.docs) {
        const poleData = poleDoc.data();
        console.log(`🔸 Pole ID: ${poleDoc.id}`);
        console.log(`   VF Pole ID: ${poleData.vfPoleId || 'N/A'}`);
        console.log(`   Current Status: ${poleData.importStatus || poleData.status}`);
        console.log(`   Field Agent: ${poleData.fieldAgent || 'Not assigned'}`);
        console.log(`   Total Status Changes: ${poleData.totalStatusRecords}`);
        console.log(`   Project: ${poleData.projectName || poleData.projectCode || 'N/A'}`);
        
        // Get actual history entries
        const history = await db
          .collection('planned-poles')
          .doc(poleDoc.id)
          .collection('statusHistory')
          .orderBy('timestamp', 'desc')
          .get();
        
        if (history.size > 0) {
          console.log(`   📜 Status History (${history.size} entries):`);
          history.docs.forEach((doc, index) => {
            const entry = doc.data();
            const date = entry.timestamp?.toDate?.();
            const dateStr = date ? date.toLocaleDateString() + ' ' + date.toLocaleTimeString() : 'Unknown date';
            console.log(`      ${index + 1}. ${entry.status} - ${dateStr}`);
            console.log(`         Agent: ${entry.fieldAgent || 'Unknown'}`);
          });
        }
        
        console.log(`\n   🔗 View in UI: https://fibreflow-73daf.web.app/pole-tracker/${poleDoc.id}\n`);
        console.log('-'.repeat(60) + '\n');
      }
      
      console.log('💡 HOW TO VIEW IN THE UI:\n');
      console.log('1. Go to https://fibreflow-73daf.web.app');
      console.log('2. Navigate to Analytics > Pole Detail Report');
      console.log('3. Search for one of these pole IDs');
      console.log('4. You\'ll see the "Status History" section with timeline');
      console.log('\nOR directly visit the pole detail page using the URLs above.');
      
    } else {
      console.log('❌ No poles found with status history.\n');
      console.log('To create status history:');
      console.log('1. Import historical data with status changes');
      console.log('2. Run the sync process from the sync/ directory');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit();
  }
}

// Run the listing
listPolesWithHistory();