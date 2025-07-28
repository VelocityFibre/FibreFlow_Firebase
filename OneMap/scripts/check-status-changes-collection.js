#!/usr/bin/env node

/**
 * Check Status of Status Changes Collection and Test Queries
 */

const admin = require('firebase-admin');
const serviceAccount = require('../credentials/vf-onemap-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'vf-onemap-data'
});

const db = admin.firestore();

async function checkCollectionStatus() {
  console.log('🔍 Checking Status Changes Collection...\n');
  
  try {
    // 1. Check collection exists and count documents
    console.log('📊 Collection Statistics:');
    const snapshot = await db.collection('vf-onemap-status-changes').get();
    console.log(`✅ Total documents: ${snapshot.size}`);
    
    // 2. Get a sample document to check structure
    if (!snapshot.empty) {
      const sampleDoc = snapshot.docs[0].data();
      console.log('\n📄 Sample Document Structure:');
      console.log(`   Property ID: ${sampleDoc.propertyId}`);
      console.log(`   Status Change: ${sampleDoc.fromStatus} → ${sampleDoc.toStatus}`);
      console.log(`   Date: ${sampleDoc.changeDate}`);
      console.log(`   Agent: ${sampleDoc.agent}`);
      console.log(`   Days in Previous Status: ${sampleDoc.daysInPreviousStatus || 'N/A'}`);
    }
    
    // 3. Test simple queries (no index required)
    console.log('\n🧪 Testing Simple Queries:');
    
    // Test by date
    const dateTest = await db.collection('vf-onemap-status-changes')
      .where('changeDate', '==', '2025-06-23')
      .limit(1)
      .get();
    console.log(`✅ Query by date: ${dateTest.empty ? 'No results' : 'Working'}`);
    
    // Test by property
    const propTest = await db.collection('vf-onemap-status-changes')
      .where('propertyId', '==', '291411')
      .limit(1)
      .get();
    console.log(`✅ Query by property: ${propTest.empty ? 'No results' : 'Working'}`);
    
    // 4. Test complex queries (require indexes)
    console.log('\n🧪 Testing Complex Queries (Index Status):');
    
    // Test 1: Agent + Date (requires index)
    try {
      const agentDateTest = await db.collection('vf-onemap-status-changes')
        .where('agent', '==', 'nathan')
        .orderBy('changeDate', 'desc')
        .limit(1)
        .get();
      console.log('✅ Agent + Date query: Index READY');
    } catch (error) {
      if (error.code === 9) {
        console.log('⏳ Agent + Date query: Index BUILDING');
      } else {
        console.log('❌ Agent + Date query: Error -', error.message);
      }
    }
    
    // Test 2: Status Transitions (requires index)
    try {
      const transitionTest = await db.collection('vf-onemap-status-changes')
        .where('fromStatus', '==', 'Pole Permission: Approved')
        .where('toStatus', '==', 'Home Installation: In Progress')
        .limit(1)
        .get();
      console.log('✅ Status Transition query: Index READY');
    } catch (error) {
      if (error.code === 9) {
        console.log('⏳ Status Transition query: Index BUILDING');
      } else {
        console.log('❌ Status Transition query: Error -', error.message);
      }
    }
    
    // Test 3: Pole + Date (requires index)
    try {
      const poleTest = await db.collection('vf-onemap-status-changes')
        .where('poleNumber', '==', 'LAW.P.C328')
        .orderBy('changeDate', 'asc')
        .limit(1)
        .get();
      console.log('✅ Pole + Date query: Index READY');
    } catch (error) {
      if (error.code === 9) {
        console.log('⏳ Pole + Date query: Index BUILDING');
      } else {
        console.log('❌ Pole + Date query: Error -', error.message);
      }
    }
    
    // 5. Summary statistics
    console.log('\n📈 Quick Statistics:');
    
    // Count by status
    const statusCounts = {};
    let sampleSize = 0;
    snapshot.forEach(doc => {
      if (sampleSize < 1000) { // Sample first 1000
        const data = doc.data();
        const status = data.toStatus || 'No Status';
        statusCounts[status] = (statusCounts[status] || 0) + 1;
        sampleSize++;
      }
    });
    
    console.log('   Top Status Changes (sample):');
    Object.entries(statusCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .forEach(([status, count]) => {
        console.log(`   - ${status}: ${count}`);
      });
    
    console.log('\n✨ Collection check complete!');
    
  } catch (error) {
    console.error('❌ Error checking collection:', error.message);
  }
}

// Run the check
checkCollectionStatus()
  .then(() => process.exit())
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });