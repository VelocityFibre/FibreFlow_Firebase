const admin = require('firebase-admin');
const serviceAccount = require('../credentials/vf-onemap-service-account.json');

// Initialize admin SDK for vf-onemap-data
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'vf-onemap-data'
});

const db = admin.firestore();

async function findPropertiesWithMultipleStatuses() {
  console.log('Finding properties with multiple status changes in vf-onemap-data...\n');
  
  try {
    // Query the vf-onemap-processed-records collection
    const recordsSnapshot = await db.collection('vf-onemap-processed-records')
      .limit(500) // Check first 500 records
      .get();
    
    console.log(`Analyzing ${recordsSnapshot.size} records...\n`);
    
    const propertiesWithMultipleChanges = [];
    
    recordsSnapshot.forEach(doc => {
      const data = doc.data();
      
      // Check if has statusHistory array with multiple entries
      if (data.statusHistory && Array.isArray(data.statusHistory) && data.statusHistory.length > 3) {
        propertiesWithMultipleChanges.push({
          propertyId: doc.id,
          currentStatus: data.currentStatus || data.status || 'Unknown',
          changeCount: data.statusHistory.length,
          statusHistory: data.statusHistory,
          lastModified: data.lastModifiedDate,
          agent: data.agent || 'Unknown',
          address: data.locationAddress || 'No address'
        });
      }
    });
    
    // Sort by number of changes
    propertiesWithMultipleChanges.sort((a, b) => b.changeCount - a.changeCount);
    
    console.log(`Found ${propertiesWithMultipleChanges.length} properties with >3 status changes\n`);
    
    // Show top 5-6 properties
    const topProperties = propertiesWithMultipleChanges.slice(0, 6);
    
    topProperties.forEach((prop, index) => {
      console.log(`${index + 1}. Property ID: ${prop.propertyId}`);
      console.log(`   Address: ${prop.address}`);
      console.log(`   Agent: ${prop.agent}`);
      console.log(`   Current Status: ${prop.currentStatus}`);
      console.log(`   Total Status Changes: ${prop.changeCount}`);
      console.log('   Status History:');
      
      prop.statusHistory.forEach((status, idx) => {
        const date = status.timestamp ? 
          new Date(status.timestamp._seconds * 1000).toISOString().split('T')[0] : 
          (status.date || status.changeDate || 'No date');
        const statusValue = status.status || status.value || 'Unknown';
        const source = status.source || status.importBatch || 'Unknown source';
        console.log(`     ${idx + 1}. [${date}] ${statusValue} (source: ${source})`);
      });
      console.log('');
    });
    
    // Also check the status changes collection for these properties
    if (topProperties.length > 0) {
      console.log('\nCross-checking with vf-onemap-status-changes collection:');
      
      for (const prop of topProperties.slice(0, 3)) {
        console.log(`\nProperty ${prop.propertyId}:`);
        
        const statusChanges = await db.collection('vf-onemap-status-changes')
          .where('propertyId', '==', prop.propertyId)
          .orderBy('changeDate', 'asc')
          .get();
        
        console.log(`Found ${statusChanges.size} status change records`);
        
        statusChanges.forEach(doc => {
          const change = doc.data();
          console.log(`  - [${change.changeDate}] ${change.fromStatus} → ${change.toStatus} (${change.sourceFile || 'unknown file'})`);
        });
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  }
  
  process.exit(0);
}

findPropertiesWithMultipleStatuses();