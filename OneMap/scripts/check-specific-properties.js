const admin = require('firebase-admin');
const serviceAccount = require('../credentials/vf-onemap-service-account.json');

// Initialize admin SDK for vf-onemap-data
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'vf-onemap-data'
});

const db = admin.firestore();

async function checkSpecificProperties() {
  console.log('Checking properties 307935, 308220 for status history...\n');
  
  const propertiesToCheck = ['307935', '308220'];
  
  try {
    for (const propId of propertiesToCheck) {
      console.log(`\n=== Property ${propId} ===`);
      
      // Check main properties collection
      const propDoc = await db.collection('properties').doc(propId).get();
      
      if (propDoc.exists) {
        const data = propDoc.data();
        console.log('Found in properties collection:');
        console.log(`Current Status: ${data.currentStatus || data.status || 'Unknown'}`);
        
        if (data.statusHistory && Array.isArray(data.statusHistory)) {
          console.log(`Status History Count: ${data.statusHistory.length}`);
          console.log('Status History:');
          data.statusHistory.forEach((status, idx) => {
            const date = status.timestamp ? 
              new Date(status.timestamp._seconds * 1000).toISOString().split('T')[0] : 
              (status.date || status.changeDate || 'No date');
            const statusValue = status.status || status.value || 'Unknown';
            console.log(`  ${idx + 1}. [${date}] ${statusValue}`);
          });
        } else {
          console.log('No statusHistory array found');
        }
      } else {
        console.log('Not found in properties collection');
      }
      
      // Also check vf-onemap-status-changes collection
      const statusChanges = await db.collection('vf-onemap-status-changes')
        .where('propertyId', '==', propId)
        .orderBy('changeDate', 'asc')
        .get();
      
      console.log(`\nStatus changes collection: ${statusChanges.size} records`);
      statusChanges.forEach(doc => {
        const change = doc.data();
        console.log(`  [${change.changeDate}] ${change.fromStatus} → ${change.toStatus} (${change.sourceFile || 'unknown'})`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  process.exit(0);
}

checkSpecificProperties();