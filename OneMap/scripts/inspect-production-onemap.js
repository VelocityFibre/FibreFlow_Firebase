const admin = require('firebase-admin');

// Initialize production database
const app = admin.initializeApp({
  projectId: 'fibreflow-73daf'
});

const db = app.firestore();

async function inspectProductionOneMap() {
  console.log('🔍 INSPECTING PRODUCTION ONEMAP COLLECTIONS');
  console.log('==========================================\n');
  
  try {
    // Check onemap-change-history
    console.log('📁 onemap-change-history (269 documents):');
    const changeHistory = await db.collection('onemap-change-history').limit(5).get();
    
    if (!changeHistory.empty) {
      console.log(`\nSample documents:`);
      changeHistory.forEach(doc => {
        const data = doc.data();
        console.log(`\n  Doc ID: ${doc.id}`);
        console.log(`  Property ID: ${data.propertyId || 'N/A'}`);
        console.log(`  Change Type: ${data.changeType || data.status || 'N/A'}`);
        console.log(`  Date: ${data.timestamp || data.date || 'N/A'}`);
      });
    }
    
    // Check for our corrupted properties
    console.log('\n\n🔍 Checking for our 5 corrupted properties:');
    const corruptedIds = ['308025', '291411', '292578', '307935', '308220'];
    
    for (const propId of corruptedIds) {
      const found = await db.collection('onemap-change-history')
        .where('propertyId', '==', propId)
        .limit(1)
        .get();
      
      if (!found.empty) {
        console.log(`  ⚠️  Property ${propId} FOUND in change history!`);
      } else {
        console.log(`  ✅ Property ${propId} NOT in change history`);
      }
    }
    
    // Check onemap-processing
    console.log('\n\n📁 onemap-processing (1 document):');
    const processing = await db.collection('onemap-processing').get();
    processing.forEach(doc => {
      console.log(`  Doc ID: ${doc.id}`);
      console.log(`  Data:`, JSON.stringify(doc.data(), null, 2));
    });
    
    // Check onemap-sync-tracking
    console.log('\n\n📁 onemap-sync-tracking (2 documents):');
    const syncTracking = await db.collection('onemap-sync-tracking').get();
    syncTracking.forEach(doc => {
      console.log(`\n  Doc ID: ${doc.id}`);
      console.log(`  Data:`, JSON.stringify(doc.data(), null, 2));
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  process.exit(0);
}

inspectProductionOneMap();