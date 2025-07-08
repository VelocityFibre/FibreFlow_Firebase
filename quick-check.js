const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// Initialize with project ID only
initializeApp({
  projectId: 'fibreflow-73daf'
});

const db = getFirestore();

async function checkMeetings() {
  try {
    const snapshot = await db.collection('meetings').get();
    console.log(`\nTotal meetings in database: ${snapshot.size}\n`);
    
    if (snapshot.size === 0) {
      console.log('❌ No meetings found - the database is empty.');
    } else {
      console.log('✅ Meetings found:');
      snapshot.forEach(doc => {
        const data = doc.data();
        console.log(`- ${data.title || 'Untitled'} (${new Date(data.dateTime).toLocaleDateString()})`);
      });
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkMeetings();