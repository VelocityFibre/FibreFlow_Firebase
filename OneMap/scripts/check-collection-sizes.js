const admin = require('firebase-admin');
const serviceAccount = require('../credentials/vf-onemap-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'vf-onemap-data'
});

const db = admin.firestore();

async function checkSizes() {
  console.log('📊 Checking collection sizes...\n');
  
  try {
    // Check processed records
    const processedSnapshot = await db.collection('vf-onemap-processed-records').limit(1).get();
    const processedCount = await db.collection('vf-onemap-processed-records').count().get();
    console.log(`vf-onemap-processed-records: ${processedCount.data().count.toLocaleString()} documents`);
    
    // Check status changes
    const statusSnapshot = await db.collection('vf-onemap-status-changes').limit(1).get();
    const statusCount = await db.collection('vf-onemap-status-changes').count().get();
    console.log(`vf-onemap-status-changes: ${statusCount.data().count.toLocaleString()} documents`);
    
    // Check import tracking
    const importSnapshot = await db.collection('import-tracking').limit(1).get();
    const importCount = await db.collection('import-tracking').count().get();
    console.log(`import-tracking: ${importCount.data().count.toLocaleString()} documents`);
    
    // Check if backup already exists
    const backupCollections = await db.listCollections();
    const backupExists = backupCollections.some(col => col.id.startsWith('BACKUP_2025-08-05'));
    console.log(`\nBackup collections exist: ${backupExists}`);
    
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  process.exit(0);
}

checkSizes();