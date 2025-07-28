#!/usr/bin/env node

/**
 * List Last Sync Results
 * Shows what was synced in the most recent sync operation
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin for production
const productionApp = admin.initializeApp({
  credential: admin.credential.cert(
    require('../config/service-accounts/fibreflow-73daf-key.json')
  ),
  projectId: 'fibreflow-73daf'
}, 'production');

const productionDb = productionApp.firestore();

async function listLastSync() {
  console.log('🔍 Checking Last Sync Results\n');
  
  try {
    // Get poles synced today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const syncedPoles = await productionDb
      .collection('planned-poles')
      .where('lastSyncedFrom', '==', 'vf-onemap-data')
      .where('lastSyncDate', '>=', today)
      .get();
    
    console.log(`✅ Found ${syncedPoles.size} poles synced today\n`);
    
    // Group by project
    const polesByProject = {};
    
    syncedPoles.forEach(doc => {
      const data = doc.data();
      const project = data.projectName || 'Unknown';
      
      if (!polesByProject[project]) {
        polesByProject[project] = [];
      }
      
      polesByProject[project].push({
        poleNumber: data.poleNumber,
        status: data.importStatus,
        address: data.address?.substring(0, 50) + '...',
        statusRecords: data.totalStatusRecords || 1
      });
    });
    
    // Display by project
    Object.entries(polesByProject).forEach(([project, poles]) => {
      console.log(`📁 Project: ${project} (${poles.length} poles)`);
      console.log('─'.repeat(60));
      
      poles.forEach(pole => {
        console.log(`  ${pole.poleNumber}`);
        console.log(`    Status: ${pole.status}`);
        console.log(`    Address: ${pole.address}`);
        if (pole.statusRecords > 1) {
          console.log(`    ⚠️  Has ${pole.statusRecords} status records`);
        }
        console.log('');
      });
    });
    
    // Show poles with multiple statuses
    const multiStatusPoles = [];
    syncedPoles.forEach(doc => {
      const data = doc.data();
      if (data.totalStatusRecords > 1) {
        multiStatusPoles.push(data.poleNumber);
      }
    });
    
    if (multiStatusPoles.length > 0) {
      console.log('\n📊 Poles with Multiple Status Records:');
      console.log(multiStatusPoles.join(', '));
      console.log('\nUse verify-status-history.js to see their full history');
    }
    
    // Find latest report
    const reportsDir = path.join(__dirname, '../reports');
    const files = fs.readdirSync(reportsDir);
    const syncReports = files.filter(f => f.startsWith('sync-history-'));
    
    if (syncReports.length > 0) {
      const latest = syncReports.sort().pop();
      console.log(`\n📄 Latest sync report: ${latest}`);
      console.log(`   View with: cat reports/${latest} | jq '.'`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run
listLastSync().then(() => {
  console.log('\n✨ Done!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});