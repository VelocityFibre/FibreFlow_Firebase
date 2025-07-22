const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({ projectId: 'fibreflow-73daf' });
}

const db = admin.firestore();

async function verifyFlags() {
  console.log('🔍 Verifying missing status flags...\n');
  
  // Check a few flagged records
  const flaggedRecords = await db.collection('onemap-processing-staging')
    .where('_processingFlags.isMissingStatus', '==', true)
    .limit(5)
    .get();
  
  console.log(`Found ${flaggedRecords.size} flagged records (showing first 5):\n`);
  
  flaggedRecords.forEach(doc => {
    const data = doc.data();
    console.log(`Property: ${data.propertyId}`);
    console.log(`Status: ${data.status}`);
    console.log(`Flags: ${JSON.stringify(data._processingFlags, null, 2)}`);
    console.log('---');
  });
  
  // Count total flagged
  const allFlagged = await db.collection('onemap-processing-staging')
    .where('_processingFlags.isMissingStatus', '==', true)
    .get();
  
  console.log(`\nTotal flagged records: ${allFlagged.size}`);
}

verifyFlags();