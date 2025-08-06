const admin = require('firebase-admin');
const serviceAccount = require('../config/service-accounts/vf-onemap-data-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'vf-onemap-data'
});

const db = admin.firestore();

async function checkStatuses() {
  try {
    console.log('Checking available data in vf-onemap-data...\n');
    
    // Check processed records
    const processedSnapshot = await db.collection('vf-onemap-processed-records')
      .limit(10)
      .get();
    
    console.log(`vf-onemap-processed-records: ${processedSnapshot.size} sample docs`);
    
    if (!processedSnapshot.empty) {
      const statuses = new Set();
      processedSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.Status) statuses.add(data.Status);
      });
      console.log('Sample statuses:', Array.from(statuses));
      
      // Show a sample document structure
      console.log('\nSample document structure:');
      const sampleData = processedSnapshot.docs[0].data();
      console.log('- Status:', sampleData.Status);
      console.log('- Pole Number:', sampleData['Pole Number']);
      console.log('- Document ID:', processedSnapshot.docs[0].id);
      console.log('- Keys:', Object.keys(sampleData).slice(0, 10).join(', '));
    }
    
    // Check status changes collection
    const statusChangesSnapshot = await db.collection('vf-onemap-status-changes')
      .limit(10)
      .get();
    
    console.log(`\nvf-onemap-status-changes: ${statusChangesSnapshot.size} sample docs`);
    
    if (!statusChangesSnapshot.empty) {
      console.log('Sample status change:');
      const data = statusChangesSnapshot.docs[0].data();
      console.log('- Current Status:', data.currentStatus);
      console.log('- Previous Status:', data.previousStatus);
      console.log('- Pole Number:', data.poleNumber);
    }
    
    // Check for approved poles in status changes
    const approvedCount = await db.collection('vf-onemap-status-changes')
      .where('currentStatus', '==', 'Pole Permission: Approved')
      .count()
      .get();
    
    console.log(`\nApproved poles in status changes: ${approvedCount.data().count}`);
    
  } catch (error) {
    console.error('Error:', error);
  }
  process.exit(0);
}

checkStatuses();