const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin with service account
const serviceAccount = require('../credentials/vf-onemap-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function findPropertiesWithMultipleStatusChanges() {
  console.log('Searching for properties with multiple status changes...\n');
  
  const propertiesWithHistory = [];
  let processedCount = 0;
  const startTime = Date.now();
  
  try {
    // Use the correct collection name
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
        
        // Check if statusHistory exists and has multiple entries
        if (data.statusHistory && Array.isArray(data.statusHistory) && data.statusHistory.length > 1) {
          propertiesWithHistory.push({
            id: doc.id,
            propertyId: data.propertyId,
            poleNumber: data.poleNumber || data['Pole Number'],
            dropNumber: data.dropNumber,
            currentStatus: data.status,
            statusHistoryCount: data.statusHistory.length,
            statusHistory: data.statusHistory,
            fileName: data.fileName,
            importedAt: data.importedAt
          });
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
    console.log(`Found ${propertiesWithHistory.length} properties with multiple status changes\n`);
    
    // Sort by number of status changes (descending)
    propertiesWithHistory.sort((a, b) => b.statusHistoryCount - a.statusHistoryCount);
    
    // Show examples
    console.log('=== TOP 10 PROPERTIES WITH MOST STATUS CHANGES ===\n');
    
    for (let i = 0; i < Math.min(10, propertiesWithHistory.length); i++) {
      const prop = propertiesWithHistory[i];
      console.log(`${i + 1}. Property ID: ${prop.propertyId}`);
      console.log(`   Document ID: ${prop.id}`);
      console.log(`   Pole Number: ${prop.poleNumber || 'N/A'}`);
      console.log(`   Drop Number: ${prop.dropNumber || 'N/A'}`);
      console.log(`   Current Status: ${prop.currentStatus || 'N/A'}`);
      console.log(`   Status Changes: ${prop.statusHistoryCount}`);
      console.log(`   Source File: ${prop.fileName || 'Unknown'}`);
      
      console.log('\n   Status History:');
      prop.statusHistory.forEach((status, index) => {
        let timestamp = 'N/A';
        try {
          if (status.timestamp) {
            if (status.timestamp._seconds) {
              timestamp = new Date(status.timestamp._seconds * 1000).toISOString();
            } else if (status.timestamp instanceof Date) {
              timestamp = status.timestamp.toISOString();
            } else if (typeof status.timestamp === 'string') {
              timestamp = status.timestamp;
            }
          }
        } catch (e) {
          timestamp = 'Invalid timestamp';
        }
        
        const source = status.source || 'Unknown';
        console.log(`   ${index + 1}. Status: "${status.status}" | Date: ${timestamp} | Source: ${source}`);
        if (status.previousStatus) {
          console.log(`      Previous: "${status.previousStatus}"`);
        }
      });
      console.log('\n' + '-'.repeat(80) + '\n');
    }
    
    // Show one complete example with all fields
    if (propertiesWithHistory.length > 0) {
      console.log('\n=== COMPLETE EXAMPLE (First Property) ===\n');
      const example = propertiesWithHistory[0];
      
      // Fetch the complete document
      const fullDoc = await recordsRef.doc(example.id).get();
      const fullData = fullDoc.data();
      
      console.log('Property Details:');
      console.log(JSON.stringify({
        id: fullDoc.id,
        propertyId: fullData.propertyId,
        poleNumber: fullData.poleNumber,
        dropNumber: fullData.dropNumber,
        status: fullData.status,
        statusHistory: fullData.statusHistory
      }, null, 2));
    }
    
    // Export results
    const outputPath = path.join(__dirname, '..', 'reports', `multiple-status-changes-${new Date().toISOString().split('T')[0]}.json`);
    
    // Ensure reports directory exists
    const fs = require('fs');
    const reportsDir = path.join(__dirname, '..', 'reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    
    fs.writeFileSync(outputPath, JSON.stringify(propertiesWithHistory, null, 2));
    console.log(`\nResults exported to: ${outputPath}`);
    
    // Statistics
    console.log('\n=== STATISTICS ===');
    const statusCounts = {};
    propertiesWithHistory.forEach(prop => {
      prop.statusHistory.forEach(status => {
        const statusName = status.status || 'Unknown';
        statusCounts[statusName] = (statusCounts[statusName] || 0) + 1;
      });
    });
    
    console.log('\nStatus types found:');
    Object.entries(statusCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([status, count]) => {
        console.log(`  "${status}": ${count} occurrences`);
      });
    
    console.log(`\nProcessing time: ${((Date.now() - startTime) / 1000).toFixed(2)} seconds`);
    
  } catch (error) {
    console.error('\nError during search:', error);
  } finally {
    console.log('\nSearch completed.');
    process.exit(0);
  }
}

// Run the search
findPropertiesWithMultipleStatusChanges().catch(console.error);