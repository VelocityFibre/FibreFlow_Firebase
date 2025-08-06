const admin = require('firebase-admin');
const serviceAccount = require('../credentials/vf-onemap-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'vf-onemap-data'
});

const db = admin.firestore();

async function trackStatusChanges() {
  console.log('📊 Creating status change tracking...\n');
  
  try {
    // Get all current records
    const snapshot = await db.collection('vf-onemap-processed-records').get();
    console.log(`Total records: ${snapshot.size}`);
    
    // Group by import batch to see progression
    const batches = {};
    snapshot.forEach(doc => {
      const data = doc.data();
      const batch = data.importBatch || 'Unknown';
      if (!batches[batch]) {
        batches[batch] = { count: 0, sourceFile: data.sourceFile };
      }
      batches[batch].count++;
    });
    
    console.log('\nImport batches:');
    Object.entries(batches).forEach(([batch, info]) => {
      console.log(`- ${batch}: ${info.count} records (${info.sourceFile || 'Unknown file'})`);
    });
    
    // Check for any status changes
    const statusChanges = await db.collection('vf-onemap-status-changes').count().get();
    console.log(`\nStatus changes recorded: ${statusChanges.data().count}`);
    
    // If we have status changes, show a few
    if (statusChanges.data().count > 0) {
      const changes = await db.collection('vf-onemap-status-changes').limit(5).get();
      console.log('\nSample status changes:');
      changes.forEach(doc => {
        const change = doc.data();
        console.log(`- Property ${change.propertyId}: ${change.fromStatus} → ${change.toStatus} (${change.changeDate})`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  process.exit(0);
}

trackStatusChanges();