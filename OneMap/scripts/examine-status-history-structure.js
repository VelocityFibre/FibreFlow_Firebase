const admin = require('firebase-admin');
const serviceAccount = require('../credentials/vf-onemap-service-account.json');

// Initialize admin SDK for vf-onemap-data
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'vf-onemap-data'
});

const db = admin.firestore();

async function examineStatusHistoryStructure() {
  console.log('Examining status history structure in vf-onemap-data...\n');
  
  try {
    // Get a few records that have statusHistory
    const recordsSnapshot = await db.collection('vf-onemap-processed-records')
      .where('statusHistory', '!=', null)
      .limit(10)
      .get();
    
    console.log(`Found ${recordsSnapshot.size} records with statusHistory field\n`);
    
    if (recordsSnapshot.empty) {
      // Try another approach - just get any records and check their structure
      console.log('No records found with statusHistory. Checking general structure...\n');
      
      const generalSnapshot = await db.collection('vf-onemap-processed-records')
        .limit(10)
        .get();
      
      generalSnapshot.forEach(doc => {
        const data = doc.data();
        console.log(`Property ${doc.id}:`);
        console.log('- Has statusHistory:', 'statusHistory' in data);
        console.log('- Has currentStatus:', 'currentStatus' in data);
        console.log('- Has status:', 'status' in data);
        console.log('- Has hadStatusChangeInImport:', data.hadStatusChangeInImport);
        
        // Show all fields that might contain status info
        const statusRelatedFields = Object.keys(data).filter(key => 
          key.toLowerCase().includes('status')
        );
        console.log('- Status-related fields:', statusRelatedFields.join(', '));
        
        // If statusHistory exists, show its structure
        if (data.statusHistory) {
          console.log('- statusHistory type:', typeof data.statusHistory);
          console.log('- statusHistory value:', JSON.stringify(data.statusHistory, null, 2));
        }
        console.log('');
      });
    } else {
      // Examine the structure of statusHistory
      recordsSnapshot.forEach(doc => {
        const data = doc.data();
        console.log(`Property ${doc.id}:`);
        console.log('- Current Status:', data.currentStatus || data.status);
        console.log('- Status History type:', typeof data.statusHistory);
        console.log('- Is Array:', Array.isArray(data.statusHistory));
        
        if (data.statusHistory) {
          console.log('- Status History:', JSON.stringify(data.statusHistory, null, 2));
        }
        console.log('');
      });
    }
    
    // Let's also check the status changes collection to understand the tracking
    console.log('\nChecking vf-onemap-status-changes collection structure:');
    
    const statusChangesSnapshot = await db.collection('vf-onemap-status-changes')
      .limit(5)
      .get();
    
    console.log(`Found ${statusChangesSnapshot.size} status change records\n`);
    
    // Group by property to see which properties have multiple changes
    const propertyChangeCounts = {};
    
    // Get more records to find properties with multiple changes
    const moreChanges = await db.collection('vf-onemap-status-changes')
      .orderBy('propertyId')
      .limit(1000)
      .get();
    
    moreChanges.forEach(doc => {
      const data = doc.data();
      const propId = data.propertyId;
      if (!propertyChangeCounts[propId]) {
        propertyChangeCounts[propId] = 0;
      }
      propertyChangeCounts[propId]++;
    });
    
    // Find properties with multiple changes
    const multipleChanges = Object.entries(propertyChangeCounts)
      .filter(([id, count]) => count > 3)
      .sort((a, b) => b[1] - a[1]);
    
    console.log(`\nProperties with multiple status changes (from status-changes collection):`);
    console.log(`Found ${multipleChanges.length} properties with >3 changes\n`);
    
    // Show top 5
    multipleChanges.slice(0, 5).forEach(([propId, count]) => {
      console.log(`Property ${propId}: ${count} status changes`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  }
  
  process.exit(0);
}

examineStatusHistoryStructure();