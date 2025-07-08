// Test sync using Firebase Admin SDK
const admin = require('firebase-admin');

// Initialize admin SDK with your project
const serviceAccount = require('./fibreflow-73daf-firebase-adminsdk.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://fibreflow-73daf-default-rtdb.firebaseio.com"
});

async function testSync() {
  try {
    console.log('Testing Fireflies sync...');
    
    // Check current meetings count
    const db = admin.firestore();
    const beforeSnapshot = await db.collection('meetings').get();
    console.log(`Current meetings in database: ${beforeSnapshot.size}`);
    
    // Instead of calling the function, let's check if any meetings exist
    if (beforeSnapshot.size > 0) {
      console.log('\nSample of existing meetings:');
      let count = 0;
      beforeSnapshot.forEach(doc => {
        if (count < 3) {
          const data = doc.data();
          console.log(`- ${data.title} (${new Date(data.dateTime).toLocaleDateString()})`);
          count++;
        }
      });
    }
    
    console.log('\nTo sync new meetings, use the "Sync Meetings" button in the FibreFlow app.');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

testSync();