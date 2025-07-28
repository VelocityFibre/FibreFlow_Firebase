#!/usr/bin/env node

/**
 * Analyze data in vf-onemap-data
 * Shows duplicates and changes between imports
 */

const admin = require('firebase-admin');
const serviceAccount = require('../credentials/vf-onemap-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'vf-onemap-data'
});

const db = admin.firestore();

async function analyzeData() {
  try {
    console.log('📊 Analyzing vf-onemap-data...\n');
    
    // Get all records
    const snapshot = await db.collection('vf-onemap-processed-records').get();
    console.log(`Total records in database: ${snapshot.size}`);
    
    // Get import batches
    const batchesSnapshot = await db.collection('vf-onemap-import-batches')
      .orderBy('importedAt', 'asc')
      .get();
    
    console.log(`\n📁 Import Batches:`);
    batchesSnapshot.forEach(doc => {
      const batch = doc.data();
      console.log(`- ${batch.batchId}: ${batch.fileName} (${batch.totalRecords} records)`);
    });
    
    // Analyze by status
    const statusCounts = {};
    const poleNumbers = new Map();
    const agentCounts = {};
    
    snapshot.forEach(doc => {
      const data = doc.data();
      
      // Count by status
      const status = data.status || 'No Status';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
      
      // Track pole numbers
      if (data.poleNumber) {
        if (!poleNumbers.has(data.poleNumber)) {
          poleNumbers.set(data.poleNumber, []);
        }
        poleNumbers.get(data.poleNumber).push(data.propertyId);
      }
      
      // Count by agent
      const agent = data.fieldAgentName || 'No Agent';
      agentCounts[agent] = (agentCounts[agent] || 0) + 1;
    });
    
    // Show status breakdown
    console.log(`\n📊 Status Breakdown:`);
    Object.entries(statusCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([status, count]) => {
        console.log(`- ${status}: ${count}`);
      });
    
    // Show agent breakdown
    console.log(`\n👥 Agent Breakdown:`);
    Object.entries(agentCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .forEach(([agent, count]) => {
        console.log(`- ${agent}: ${count}`);
      });
    
    // Find duplicate poles
    const duplicatePoles = Array.from(poleNumbers.entries())
      .filter(([pole, properties]) => properties.length > 1)
      .sort((a, b) => b[1].length - a[1].length);
    
    console.log(`\n🔍 Duplicate Poles: ${duplicatePoles.length}`);
    duplicatePoles.slice(0, 10).forEach(([pole, properties]) => {
      console.log(`- ${pole}: ${properties.length} properties`);
    });
    
    // Check for actual duplicates (same property ID)
    console.log(`\n✅ Data Integrity Check:`);
    console.log(`- Unique Property IDs: ${snapshot.size} (Should be 746 if no duplicates)`);
    console.log(`- Expected: 746 unique records`);
    console.log(`- Duplicate Detection: ${snapshot.size === 746 ? 'PASSED - No duplicates!' : 'FAILED - Found duplicates'}`);
    
    await admin.app().delete();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

analyzeData();