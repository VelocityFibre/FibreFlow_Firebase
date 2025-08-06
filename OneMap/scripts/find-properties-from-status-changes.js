const admin = require('firebase-admin');
const serviceAccount = require('../credentials/vf-onemap-service-account.json');

// Initialize admin SDK for vf-onemap-data
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'vf-onemap-data'
});

const db = admin.firestore();

async function findPropertiesFromStatusChanges() {
  console.log('Finding properties with multiple status changes from vf-onemap-status-changes collection...\n');
  
  try {
    // Get all status changes to analyze
    const statusChangesSnapshot = await db.collection('vf-onemap-status-changes')
      .orderBy('propertyId')
      .get();
    
    console.log(`Total status change records: ${statusChangesSnapshot.size}\n`);
    
    // Group by property ID
    const propertyChanges = {};
    
    statusChangesSnapshot.forEach(doc => {
      const data = doc.data();
      const propId = data.propertyId;
      
      if (!propertyChanges[propId]) {
        propertyChanges[propId] = [];
      }
      
      propertyChanges[propId].push({
        id: doc.id,
        fromStatus: data.fromStatus,
        toStatus: data.toStatus,
        changeDate: data.changeDate,
        agent: data.agent,
        sourceFile: data.sourceFile,
        importBatch: data.importBatch,
        importTimestamp: data.importTimestamp
      });
    });
    
    // Find properties with multiple changes
    const multipleChanges = Object.entries(propertyChanges)
      .filter(([id, changes]) => changes.length > 3)
      .sort((a, b) => b[1].length - a[1].length);
    
    console.log(`Found ${multipleChanges.length} properties with >3 status changes\n`);
    
    if (multipleChanges.length === 0) {
      // Show properties with any changes
      const anyChanges = Object.entries(propertyChanges)
        .filter(([id, changes]) => changes.length >= 2)
        .sort((a, b) => b[1].length - a[1].length)
        .slice(0, 10);
      
      console.log('Showing properties with 2+ status changes instead:\n');
      
      for (const [propId, changes] of anyChanges) {
        console.log(`Property ID: ${propId} (${changes.length} changes)`);
        
        // Sort changes by date
        const sortedChanges = changes.sort((a, b) => 
          (a.changeDate || '').localeCompare(b.changeDate || '')
        );
        
        sortedChanges.forEach((change, idx) => {
          console.log(`  ${idx + 1}. [${change.changeDate}] ${change.fromStatus} → ${change.toStatus}`);
          console.log(`     Agent: ${change.agent || 'Unknown'}, File: ${change.sourceFile || 'Unknown'}`);
        });
        
        console.log('');
      }
    } else {
      // Show top 5 properties with most changes
      multipleChanges.slice(0, 5).forEach(([propId, changes], index) => {
        console.log(`${index + 1}. Property ID: ${propId}`);
        console.log(`   Total Status Changes: ${changes.length}`);
        console.log('   Status Progression:');
        
        // Sort changes by date
        const sortedChanges = changes.sort((a, b) => 
          (a.changeDate || '').localeCompare(b.changeDate || '')
        );
        
        sortedChanges.forEach((change, idx) => {
          console.log(`     ${idx + 1}. [${change.changeDate}] ${change.fromStatus} → ${change.toStatus}`);
          console.log(`        Agent: ${change.agent || 'Unknown'}`);
          console.log(`        Source: ${change.sourceFile || 'Unknown'}`);
        });
        
        console.log('');
      });
    }
    
    // Show summary statistics
    console.log('\nSummary Statistics:');
    const changeCounts = Object.values(propertyChanges).map(changes => changes.length);
    console.log(`- Total unique properties with changes: ${Object.keys(propertyChanges).length}`);
    console.log(`- Average changes per property: ${(changeCounts.reduce((a, b) => a + b, 0) / changeCounts.length).toFixed(2)}`);
    console.log(`- Max changes for a single property: ${Math.max(...changeCounts)}`);
    
    // Find property 308025 specifically
    if (propertyChanges['308025']) {
      console.log('\n\nProperty 308025 Status History:');
      console.log(`Total changes: ${propertyChanges['308025'].length}`);
      propertyChanges['308025'].forEach((change, idx) => {
        console.log(`  ${idx + 1}. [${change.changeDate}] ${change.fromStatus} → ${change.toStatus}`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  }
  
  process.exit(0);
}

findPropertiesFromStatusChanges();