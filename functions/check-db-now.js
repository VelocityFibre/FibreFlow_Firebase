const admin = require('firebase-admin');
const functions = require('firebase-functions');

// Initialize admin (it will use the default credentials in functions environment)
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

async function checkMeetingsNow() {
  console.log('Connecting to Firestore...\n');
  
  try {
    const meetingsRef = db.collection('meetings');
    const snapshot = await meetingsRef.get();
    
    console.log(`MEETINGS IN DATABASE: ${snapshot.size}`);
    console.log('================================\n');
    
    if (snapshot.empty) {
      console.log('❌ NO MEETINGS FOUND - DATABASE IS EMPTY');
      return;
    }
    
    snapshot.forEach(doc => {
      const data = doc.data();
      console.log(`Title: ${data.title}`);
      console.log(`Date: ${new Date(data.dateTime).toLocaleDateString()}`);
      console.log(`Doc ID: ${doc.id}`);
      console.log('---');
    });
    
  } catch (error) {
    console.error('ERROR:', error.message);
  }
  
  process.exit(0);
}

checkMeetingsNow();