const admin = require('firebase-admin');

// Initialize admin SDK (it will use default credentials from environment)
admin.initializeApp();

const db = admin.firestore();

async function checkMeetings() {
  try {
    console.log('Checking meetings in Firestore...\n');
    
    const snapshot = await db.collection('meetings').get();
    
    console.log(`Total meetings in database: ${snapshot.size}`);
    
    if (snapshot.size === 0) {
      console.log('\nNo meetings found in the database.');
      console.log('The meetings collection is empty.');
    } else {
      console.log('\nMeetings found:');
      snapshot.forEach(doc => {
        const data = doc.data();
        const date = data.dateTime ? new Date(data.dateTime) : null;
        console.log(`\n- ${data.title || 'Untitled'}`);
        if (date) {
          console.log(`  Date: ${date.toLocaleDateString()} ${date.toLocaleTimeString()}`);
        }
        console.log(`  ID: ${doc.id}`);
        console.log(`  Participants: ${data.participants?.length || 0}`);
        console.log(`  Action Items: ${data.actionItems?.length || 0}`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  process.exit(0);
}

checkMeetings();