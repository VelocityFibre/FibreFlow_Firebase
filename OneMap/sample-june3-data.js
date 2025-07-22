const admin = require('firebase-admin');
const fs = require('fs');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'fibreflow-73daf'
  });
}

const db = admin.firestore();

async function sampleJune3Data() {
  try {
    console.log('Fetching June 3rd data from staging database...');
    
    // Get sample of June 3rd data with pole permissions
    const june3Snapshot = await db.collection('onemap-processing-staging')
      .where('Status', '>=', 'Pole Permission')
      .where('Status', '<=', 'Pole Permission~')
      .limit(500)
      .get();
    
    console.log('Total June 3rd records with Pole Permission status:', june3Snapshot.size);
    
    // Extract key info for comparison
    const june3Data = [];
    june3Snapshot.forEach(doc => {
      const data = doc.data();
      june3Data.push({
        propertyId: data['Property ID'],
        poleNumber: data['Pole Number'] || '',
        dropNumber: data['Drop Number'] || '',
        status: data.Status,
        agent: data.Agent,
        address: data['Street Address'],
        gps: data.GPS,
        splicingTeam: data['Splicing Team'],
        fiberTeam: data['Fiber Team'],
        trenching: data.Trenching
      });
    });
    
    // Save sample for analysis
    fs.writeFileSync('june3-sample.json', JSON.stringify(june3Data, null, 2));
    
    // Show some examples
    console.log('\nSample June 3rd records:');
    june3Data.slice(0, 5).forEach(record => {
      console.log('- Property:', record.propertyId);
      console.log('  Pole:', record.poleNumber || 'Not assigned');
      console.log('  Status:', record.status);
      console.log('  Address:', record.address);
      console.log('  Agent:', record.agent);
      console.log('');
    });
    
    // Count by pole assignment
    const withPole = june3Data.filter(r => r.poleNumber).length;
    const withoutPole = june3Data.filter(r => !r.poleNumber).length;
    console.log('Records with pole numbers:', withPole);
    console.log('Records without pole numbers:', withoutPole);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

sampleJune3Data();