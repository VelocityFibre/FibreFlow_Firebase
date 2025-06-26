const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyCdpp9ViBcfb37o4V2_OCzWO9nUhCiv9Vc",
  authDomain: "fibreflow-73daf.firebaseapp.com",
  projectId: "fibreflow-73daf",
  storageBucket: "fibreflow-73daf.firebasestorage.app",
  messagingSenderId: "296054249427",
  appId: "1:296054249427:web:2f0d6482daa6beb0624126"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkMeetings() {
  try {
    const meetingsRef = collection(db, 'meetings');
    const snapshot = await getDocs(meetingsRef);
    
    console.log(`\n📊 Total meetings in Firestore: ${snapshot.size}\n`);
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      console.log(`📅 Meeting: ${data.title}`);
      console.log(`   ID: ${doc.id}`);
      console.log(`   Date: ${data.date?.toDate ? data.date.toDate() : data.date}`);
      console.log(`   Duration: ${data.duration} minutes`);
      console.log(`   Status: ${data.status || 'N/A'}`);
      console.log(`   Action Items: ${data.actionItems?.length || 0}`);
      console.log('---');
    });
  } catch (error) {
    console.error('Error checking meetings:', error);
  }
  
  process.exit(0);
}

checkMeetings();