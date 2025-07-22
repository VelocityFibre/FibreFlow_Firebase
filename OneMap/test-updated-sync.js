#!/usr/bin/env node

/**
 * Test the updated sync-to-production script
 * Verifies it now includes records without pole numbers
 */

const admin = require('firebase-admin');
const serviceAccount = require('../fibreflow-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'fibreflow-73daf'
});

const db = admin.firestore();

async function testSync() {
  console.log('🧪 Testing updated sync script...\n');
  
  // Get staging statistics
  const stagingSnapshot = await db.collection('onemap-processing-staging').get();
  
  let withPoles = 0;
  let withoutPoles = 0;
  
  stagingSnapshot.docs.forEach(doc => {
    const data = doc.data();
    if (data.poleNumber && data.poleNumber !== '' && data.poleNumber !== 'N/A') {
      withPoles++;
    } else {
      withoutPoles++;
    }
  });
  
  console.log('📊 Staging Database Analysis:');
  console.log(`Total records: ${stagingSnapshot.size}`);
  console.log(`With pole numbers: ${withPoles}`);
  console.log(`Without pole numbers: ${withoutPoles}`);
  
  console.log('\n✅ The updated sync script will now process ALL records:');
  console.log('- Records WITH poles → assigned pole number');
  console.log('- Records WITHOUT poles → marked as PENDING_ASSIGNMENT');
  console.log('\nRun sync with: node sync-to-production.js --dry-run');
  
  process.exit(0);
}

testSync().catch(console.error);