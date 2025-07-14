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

// Check data since July 1st, 2025
async function checkRecentData() {
  const cutoffDate = new Date('2025-07-01T00:00:00Z');
  console.log(`\n📊 Checking data since ${cutoffDate.toLocaleDateString()}\n`);
  
  const collections = [
    'projects', 'tasks', 'dailyProgress', 'meetings', 
    'contractors', 'staff', 'rfqs', 'quotes'
  ];
  
  for (const collection of collections) {
    try {
      const snapshot = await db.collection(collection).get();
      let total = 0;
      let recent = 0;
      
      snapshot.forEach(doc => {
        total++;
        const data = doc.data();
        
        // Check various date fields
        const dateFields = ['createdAt', 'updatedAt', 'date', 'timestamp'];
        let docDate = null;
        
        for (const field of dateFields) {
          if (data[field]) {
            if (data[field].toDate) {
              docDate = data[field].toDate();
            } else if (data[field] instanceof Date) {
              docDate = data[field];
            }
            break;
          }
        }
        
        if (docDate && docDate >= cutoffDate) {
          recent++;
        }
      });
      
      console.log(`${collection}:`);
      console.log(`  Total: ${total} documents`);
      console.log(`  Since July 1st: ${recent} documents`);
      console.log(`  Older: ${total - recent} documents\n`);
      
    } catch (error) {
      console.log(`${collection}: Error - ${error.message}\n`);
    }
  }
}

checkRecentData()
  .then(() => process.exit(0))
  .catch(console.error);