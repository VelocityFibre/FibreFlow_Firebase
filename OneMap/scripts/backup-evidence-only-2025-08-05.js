const admin = require('firebase-admin');
const serviceAccount = require('../credentials/vf-onemap-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'vf-onemap-data'
});

const db = admin.firestore();

async function backupEvidence() {
  console.log('📸 BACKING UP CORRUPTION EVIDENCE ONLY');
  console.log('=====================================\n');
  
  // Properties we investigated
  const evidenceProperties = ['308025', '291411', '292578', '307935', '308220'];
  
  try {
    // Create evidence collection
    const batch = db.batch();
    let count = 0;
    
    // Backup status changes for these properties
    for (const propId of evidenceProperties) {
      const statusChanges = await db.collection('vf-onemap-status-changes')
        .where('propertyId', '==', propId)
        .get();
      
      console.log(`Property ${propId}: ${statusChanges.size} status changes`);
      
      statusChanges.forEach(doc => {
        const evidenceDoc = db.collection('EVIDENCE_2025-08-05_phantom-changes').doc(doc.id);
        batch.set(evidenceDoc, {
          ...doc.data(),
          _evidenceProperty: propId,
          _backupDate: new Date()
        });
        count++;
      });
    }
    
    await batch.commit();
    console.log(`\n✅ Backed up ${count} evidence documents`);
    console.log('📁 Collection: EVIDENCE_2025-08-05_phantom-changes');
    
  } catch (error) {
    console.error('Error:', error);
  }
  
  process.exit(0);
}

backupEvidence();