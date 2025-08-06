const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin with service account
const serviceAccount = require('../credentials/vf-onemap-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function findPolePermissionChanges() {
  console.log('Searching for properties with Pole Permission status changes...\n');
  
  const propertiesWithPolePermission = [];
  let processedCount = 0;
  
  try {
    const recordsRef = db.collection('vf-onemap-processed-records');
    
    // Process in batches
    const batchSize = 500;
    let lastDoc = null;
    let hasMore = true;
    
    while (hasMore) {
      let query = recordsRef
        .orderBy('__name__')
        .limit(batchSize);
      
      if (lastDoc) {
        query = query.startAfter(lastDoc);
      }
      
      const snapshot = await query.get();
      
      if (snapshot.empty) {
        hasMore = false;
        break;
      }
      
      snapshot.forEach(doc => {
        processedCount++;
        const data = doc.data();
        
        // Check if statusHistory contains any Pole Permission statuses
        if (data.statusHistory && Array.isArray(data.statusHistory)) {
          const hasPolePermission = data.statusHistory.some(entry => 
            entry.status && entry.status.includes('Pole Permission')
          );
          
          if (hasPolePermission) {
            propertiesWithPolePermission.push({
              id: doc.id,
              propertyId: data.propertyId,
              poleNumber: data.poleNumber || data['Pole Number'],
              dropNumber: data.dropNumber,
              currentStatus: data.status,
              statusHistory: data.statusHistory,
              agent: data.fieldAgentName || data['Field Agent Name (pole permission)']
            });
          }
        }
        
        // Progress indicator
        if (processedCount % 1000 === 0) {
          process.stdout.write(`\rProcessed ${processedCount} documents...`);
        }
      });
      
      lastDoc = snapshot.docs[snapshot.docs.length - 1];
      
      if (snapshot.size < batchSize) {
        hasMore = false;
      }
    }
    
    console.log(`\n\nProcessed ${processedCount} total documents`);
    console.log(`Found ${propertiesWithPolePermission.length} properties with Pole Permission status changes\n`);
    
    // Show examples
    console.log('=== TOP 5 EXAMPLES WITH POLE PERMISSION STATUS ===\n');
    
    for (let i = 0; i < Math.min(5, propertiesWithPolePermission.length); i++) {
      const prop = propertiesWithPolePermission[i];
      console.log(`${i + 1}. Property ID: ${prop.propertyId}`);
      console.log(`   Pole Number: ${prop.poleNumber || 'N/A'}`);
      console.log(`   Drop Number: ${prop.dropNumber || 'N/A'}`);
      console.log(`   Current Status: ${prop.currentStatus || 'N/A'}`);
      console.log(`   Agent: ${prop.agent || 'N/A'}`);
      
      console.log('\n   Pole Permission Status History:');
      prop.statusHistory.forEach((status, index) => {
        if (status.status && status.status.includes('Pole Permission')) {
          let timestamp = 'N/A';
          try {
            if (status.timestamp) {
              timestamp = status.timestamp;
            }
          } catch (e) {
            timestamp = 'Invalid timestamp';
          }
          
          console.log(`   - Status: "${status.status}"`);
          console.log(`     Date in CSV: ${status.date || 'N/A'}`);
          console.log(`     Timestamp: ${timestamp}`);
          console.log(`     Agent: ${status.agent || 'N/A'}`);
          console.log(`     Source File: ${status.fileName || 'N/A'}`);
          console.log('');
        }
      });
      console.log('-'.repeat(80) + '\n');
    }
    
  } catch (error) {
    console.error('\nError during search:', error);
  } finally {
    process.exit(0);
  }
}

// Run the search
findPolePermissionChanges().catch(console.error);