const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({ projectId: 'fibreflow-73daf' });
}

const db = admin.firestore();

async function checkSkippedRecords() {
  console.log('🔍 Checking why records were skipped...\n');
  
  // Get first 5 records to see what was processed
  const snapshot = await db.collection('onemap-processing-staging')
    .limit(5)
    .get();
  
  console.log('First 5 records in staging:\n');
  
  snapshot.forEach((doc, index) => {
    const data = doc.data();
    console.log(`${index + 1}. Property: ${data.propertyId}`);
    console.log(`   Status: ${data.status}`);
    console.log(`   Pole Number: ${data.poleNumber || 'MISSING'}`);
    console.log(`   Field Agent: ${data.fieldAgentPolePermission || 'No agent'}`);
    console.log(`   Has Missing Flag: ${data._processingFlags?.isMissingStatus || false}`);
    console.log('---');
  });
  
  // Check specifically for records without pole numbers
  const missingPoles = await db.collection('onemap-processing-staging')
    .limit(10)
    .get();
  
  let withoutPoles = 0;
  missingPoles.forEach(doc => {
    if (!doc.data().poleNumber) withoutPoles++;
  });
  
  console.log(`\nOut of first 10 records, ${withoutPoles} have no pole number.`);
}

checkSkippedRecords();