const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
if (!admin.apps.length) {
  const serviceAccountPath = path.join(__dirname, '../fibreflow-service-account.json');
  const serviceAccount = require(serviceAccountPath);
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'fibreflow-73daf'
  });
}

const db = admin.firestore();

async function deletePoleEntry(poleId) {
  console.log(`🗑️  Deleting pole tracker entry: ${poleId}\n`);
  
  try {
    // First, check if the pole exists
    const poleDoc = await db.collection('pole-trackers').doc(poleId).get();
    
    if (!poleDoc.exists) {
      console.log('❌ Pole entry not found!');
      console.log(`   ID: ${poleId}`);
      return;
    }
    
    const poleData = poleDoc.data();
    console.log('📋 Pole Details:');
    console.log(`   ID: ${poleId}`);
    console.log(`   Project: ${poleData.projectName || 'Unknown'}`);
    console.log(`   Pole Number: ${poleData.poleNumber || 'Unknown'}`);
    console.log(`   Status: ${poleData.status || 'Unknown'}`);
    console.log(`   Location: ${poleData.location || 'Unknown'}`);
    
    // Delete the pole entry
    await db.collection('pole-trackers').doc(poleId).delete();
    
    console.log('\n✅ Pole entry deleted successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Get pole ID from command line argument
const poleId = process.argv[2];

if (!poleId) {
  console.log('❌ Please provide a pole ID');
  console.log('\nUsage:');
  console.log('  node scripts/delete-pole-entry.js <pole-id>');
  console.log('\nExample:');
  console.log('  node scripts/delete-pole-entry.js ocftxy4ALSL9tImqVoDa');
  process.exit(1);
}

// Run the deletion
deletePoleEntry(poleId)
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });