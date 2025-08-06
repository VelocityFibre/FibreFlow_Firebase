const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin with service account
const serviceAccount = require('../credentials/vf-onemap-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function getPropertyDetails(propertyId) {
  console.log(`Fetching details for property: ${propertyId}\n`);
  
  try {
    const recordsRef = db.collection('vf-onemap-processed-records');
    const doc = await recordsRef.doc(propertyId).get();
    
    if (!doc.exists) {
      console.log('Property not found!');
      return;
    }
    
    const data = doc.data();
    
    console.log('=== PROPERTY DETAILS ===\n');
    console.log('Document ID:', doc.id);
    console.log('Property ID:', data.propertyId);
    console.log('Pole Number:', data.poleNumber || 'N/A');
    console.log('Drop Number:', data.dropNumber || 'N/A');
    console.log('Current Status:', data.status || 'N/A');
    console.log('Address:', data.address || 'N/A');
    console.log('GPS Latitude:', data['GPS Latitude'] || 'N/A');
    console.log('GPS Longitude:', data['GPS Longitude'] || 'N/A');
    
    if (data.statusHistory && Array.isArray(data.statusHistory)) {
      console.log('\n=== STATUS HISTORY ===');
      console.log('Total status changes:', data.statusHistory.length);
      console.log('\nDetailed History:\n');
      
      data.statusHistory.forEach((entry, index) => {
        console.log(`Change #${index + 1}:`);
        console.log('  Status:', entry.status);
        console.log('  Date in CSV:', entry.date || 'N/A');
        console.log('  Timestamp:', entry.timestamp || 'N/A');
        console.log('  Previous Status:', entry.previousStatus || 'N/A');
        console.log('  Agent:', entry.agent || 'N/A');
        console.log('  Source File:', entry.fileName || 'N/A');
        console.log('  Batch ID:', entry.batchId || 'N/A');
        console.log('  Notes:', entry.notes || 'N/A');
        console.log('');
      });
    } else {
      console.log('\nNo status history found for this property.');
    }
    
    // Save to file for easy viewing
    const outputPath = path.join(__dirname, '..', 'reports', `property-${propertyId}-details.json`);
    const fs = require('fs');
    const reportsDir = path.join(__dirname, '..', 'reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    
    fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
    console.log(`\nFull details saved to: ${outputPath}`);
    
  } catch (error) {
    console.error('Error fetching property:', error);
  } finally {
    process.exit(0);
  }
}

// Get property ID from command line argument
const propertyId = process.argv[2];

if (!propertyId) {
  console.log('Usage: node get-property-details.js <propertyId>');
  console.log('Example: node get-property-details.js 308025');
  process.exit(1);
}

getPropertyDetails(propertyId).catch(console.error);