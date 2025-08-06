#!/usr/bin/env node

/**
 * Find Status Changes
 * Shows poles where status actually changed from one to another
 */

const admin = require('firebase-admin');

// Initialize both databases
const stagingApp = admin.initializeApp({
  credential: admin.credential.cert(
    require('../config/service-accounts/vf-onemap-data-key.json')
  ),
  projectId: 'vf-onemap-data'
}, 'staging');

const productionApp = admin.initializeApp({
  credential: admin.credential.cert(
    require('../config/service-accounts/fibreflow-73daf-key.json')
  ),
  projectId: 'fibreflow-73daf'
}, 'production');

const stagingDb = stagingApp.firestore();
const productionDb = productionApp.firestore();

async function findStatusChanges() {
  console.log('🔍 FINDING POLES WITH ACTUAL STATUS CHANGES\n');
  
  try {
    // First, let's check staging for poles with different statuses
    console.log('Checking staging database for status changes...\n');
    
    // Get some records grouped by pole
    const records = await stagingDb
      .collection('vf-onemap-processed-records')
      .limit(200)
      .get();
    
    // Group by pole and check for status differences
    const poleMap = {};
    
    records.forEach(doc => {
      const data = doc.data();
      const poleNumber = data.poleNumber;
      
      if (poleNumber) {
        if (!poleMap[poleNumber]) {
          poleMap[poleNumber] = [];
        }
        poleMap[poleNumber].push({
          id: doc.id,
          status: data.status,
          date: data.lastModifiedDate || data.dateStatusChanged,
          propertyId: data.propertyId,
          fieldAgent: data.fieldAgentName,
          dropNumber: data.dropNumber,
          flowNameGroups: data.flowNameGroups
        });
      }
    });
    
    // Find poles with different statuses
    console.log('═'.repeat(80));
    console.log('POLES WITH STATUS CHANGES');
    console.log('═'.repeat(80));
    
    let foundExample = false;
    
    for (const [poleNumber, records] of Object.entries(poleMap)) {
      // Check if statuses are different
      const uniqueStatuses = [...new Set(records.map(r => r.status))];
      
      if (uniqueStatuses.length > 1) {
        foundExample = true;
        
        console.log(`\n📍 POLE: ${poleNumber}`);
        console.log('─'.repeat(80));
        
        // Sort by date if available
        records.sort((a, b) => {
          const dateA = a.date || '0';
          const dateB = b.date || '0';
          return dateA.localeCompare(dateB);
        });
        
        console.log(`\nThis pole has ${records.length} records with ${uniqueStatuses.length} different statuses:\n`);
        
        records.forEach((record, index) => {
          console.log(`STATUS ${index + 1}:`);
          console.log(`  Status: "${record.status}"`);
          console.log(`  Property ID: ${record.propertyId}`);
          console.log(`  Field Agent: ${record.fieldAgent || 'Unknown'}`);
          console.log(`  Drop Number: ${record.dropNumber || 'None'}`);
          console.log(`  Date: ${record.date || 'No date'}`);
          console.log(`  Workflow Groups: ${record.flowNameGroups || 'None'}`);
          console.log('');
        });
        
        // Now check production for this pole
        const prodPole = await productionDb
          .collection('planned-poles')
          .doc(poleNumber)
          .get();
        
        if (prodPole.exists) {
          console.log('CURRENT STATUS IN PRODUCTION:');
          const prodData = prodPole.data();
          console.log(`  Status: "${prodData.importStatus}"`);
          console.log(`  Last Sync: ${prodData.lastSyncDate?.toDate()}`);
          
          // Get history
          const history = await productionDb
            .collection('planned-poles')
            .doc(poleNumber)
            .collection('statusHistory')
            .get();
          
          if (!history.empty) {
            console.log(`\n📜 STATUS HISTORY IN PRODUCTION (${history.size} entries):`);
            history.forEach(doc => {
              const h = doc.data();
              console.log(`  - "${h.status}" (Property: ${h.propertyId})`);
            });
          }
        }
        
        // Only show first 3 examples
        if (foundExample) break;
      }
    }
    
    // Special check for LAW.P.C654 which we know has changes
    console.log('\n\n═'.repeat(80));
    console.log('DETAILED EXAMPLE: LAW.P.C654 (Known to have status changes)');
    console.log('═'.repeat(80));
    
    const c654Records = await stagingDb
      .collection('vf-onemap-processed-records')
      .where('poleNumber', '==', 'LAW.P.C654')
      .get();
    
    console.log(`\nFound ${c654Records.size} records for LAW.P.C654:\n`);
    
    c654Records.forEach((doc, index) => {
      const data = doc.data();
      console.log(`RECORD ${index + 1} (Doc ID: ${doc.id}):`);
      console.log(`  Status: "${data.status}"`);
      console.log(`  Property ID: ${data.propertyId}`);
      console.log(`  Field Agent: ${data.fieldAgentName || 'Unknown'}`);
      console.log(`  Drop Number: ${data.dropNumber || 'None'}`);
      console.log(`  Date Modified: ${data.lastModifiedDate || 'No date'}`);
      console.log(`  Flow Name Groups: ${data.flowNameGroups || 'None'}`);
      console.log(`  Status indicates: ${data.status.includes('Approved') ? '✅ APPROVED' : '❌ DECLINED'}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run
findStatusChanges().then(() => {
  console.log('\n✨ Status change search completed!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});