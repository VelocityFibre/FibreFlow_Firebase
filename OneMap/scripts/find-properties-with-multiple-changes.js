const admin = require('firebase-admin');
const serviceAccount = require('../credentials/vf-onemap-service-account.json');

// Initialize admin SDK for vf-onemap-data
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'vf-onemap-data'
});

const db = admin.firestore();

async function findPropertiesWithMultipleChanges() {
  console.log('Searching for properties with multiple status changes...');
  console.log('');
  
  try {
    // First, let's check the status-changes collection directly
    const statusChangesSnapshot = await db.collection('status-changes')
      .orderBy('timestamp', 'desc')
      .limit(1000)
      .get();
    
    console.log('Total status changes found:', statusChangesSnapshot.size);
    
    // Group by property ID to count changes per property
    const propertyChangeCounts = {};
    
    statusChangesSnapshot.forEach(doc => {
      const data = doc.data();
      const propId = data.propertyId;
      if (propId) {
        if (!propertyChangeCounts[propId]) {
          propertyChangeCounts[propId] = {
            count: 0,
            changes: []
          };
        }
        propertyChangeCounts[propId].count++;
        propertyChangeCounts[propId].changes.push({
          status: data.newStatus,
          date: data.timestamp ? new Date(data.timestamp._seconds * 1000).toISOString().split('T')[0] : 'No date',
          oldStatus: data.previousStatus || 'Unknown',
          source: data.source || 'Unknown'
        });
      }
    });
    
    // Find properties with more than 3 changes
    const multipleChanges = Object.entries(propertyChangeCounts)
      .filter(([id, data]) => data.count > 3)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 6);
    
    console.log('\nProperties with >3 status changes:\n');
    
    if (multipleChanges.length === 0) {
      console.log('No properties found with more than 3 status changes.');
    } else {
      multipleChanges.forEach(([propId, data], index) => {
        console.log(`${index + 1}. Property ID: ${propId}`);
        console.log(`   Total Status Changes: ${data.count}`);
        console.log('   Status History:');
        
        // Show first 10 changes
        data.changes.slice(0, 10).forEach((change, idx) => {
          console.log(`     ${idx + 1}. [${change.date}] ${change.oldStatus} → ${change.status} (source: ${change.source})`);
        });
        
        if (data.count > 10) {
          console.log(`     ... and ${data.count - 10} more changes`);
        }
        console.log('');
      });
    }
    
    // Also show some properties with exactly 3 or 4 changes for comparison
    const moderateChanges = Object.entries(propertyChangeCounts)
      .filter(([id, data]) => data.count >= 2 && data.count <= 4)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5);
    
    if (moderateChanges.length > 0) {
      console.log('\nAdditional properties with 2-4 status changes:');
      moderateChanges.forEach(([propId, data]) => {
        console.log(`\nProperty ID: ${propId} (${data.count} changes)`);
        data.changes.forEach((change, idx) => {
          console.log(`  ${idx + 1}. [${change.date}] ${change.oldStatus} → ${change.status}`);
        });
      });
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  process.exit(0);
}

findPropertiesWithMultipleChanges();