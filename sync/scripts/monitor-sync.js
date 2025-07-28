#!/usr/bin/env node

/**
 * Monitor Sync Progress
 * Real-time monitoring of sync operations
 */

const admin = require('firebase-admin');

// Initialize production database
const productionApp = admin.initializeApp({
  credential: admin.credential.cert(
    require('../config/service-accounts/fibreflow-73daf-key.json')
  ),
  projectId: 'fibreflow-73daf'
}, 'production');

const productionDb = productionApp.firestore();

async function monitorSync() {
  console.clear();
  console.log('🔍 SYNC MONITORING DASHBOARD');
  console.log('═'.repeat(80));
  console.log(`Last Updated: ${new Date().toLocaleString()}\n`);
  
  try {
    // Count total poles
    const totalCount = await productionDb
      .collection('planned-poles')
      .count()
      .get();
    
    console.log(`📊 Total poles in production: ${totalCount.data().count}`);
    
    // Count synced from OneMap
    const syncedCount = await productionDb
      .collection('planned-poles')
      .where('lastSyncedFrom', '==', 'vf-onemap-data')
      .count()
      .get();
    
    console.log(`✅ Synced from OneMap: ${syncedCount.data().count}`);
    
    // Get recent syncs
    const recentSyncs = await productionDb
      .collection('planned-poles')
      .where('lastSyncedFrom', '==', 'vf-onemap-data')
      .orderBy('lastSyncDate', 'desc')
      .limit(5)
      .get();
    
    if (!recentSyncs.empty) {
      console.log('\n📝 Recent Syncs:');
      recentSyncs.forEach(doc => {
        const data = doc.data();
        const syncTime = data.lastSyncDate ? data.lastSyncDate.toDate().toLocaleString() : 'Unknown';
        console.log(`   - ${doc.id}: ${data.importStatus} (Synced: ${syncTime})`);
      });
    }
    
    // Check for poles with status history
    const withHistory = await productionDb
      .collection('planned-poles')
      .where('totalStatusRecords', '>', 1)
      .limit(5)
      .get();
    
    if (!withHistory.empty) {
      console.log('\n📜 Poles with Multiple Status Changes:');
      for (const doc of withHistory.docs) {
        const data = doc.data();
        const history = await productionDb
          .collection('planned-poles')
          .doc(doc.id)
          .collection('statusHistory')
          .orderBy('timestamp', 'desc')
          .limit(2)
          .get();
        
        console.log(`   - ${doc.id}: ${data.totalStatusRecords} status changes`);
        history.forEach(h => {
          const hData = h.data();
          console.log(`     • ${hData.newStatus} (${hData.timestamp?.toDate().toLocaleDateString() || 'No date'})`);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run monitoring
if (process.argv[2] === '--watch') {
  // Continuous monitoring
  setInterval(monitorSync, 5000);
  monitorSync();
} else {
  // One-time check
  monitorSync().then(() => process.exit(0));
}