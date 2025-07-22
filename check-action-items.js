const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, limit, query } = require('firebase/firestore');

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBJll9wNz01LbN3hVaUzfqjBqDejnUKeZ0",
  authDomain: "fibreflow-73daf.firebaseapp.com",
  projectId: "fibreflow-73daf",
  storageBucket: "fibreflow-73daf.appspot.com",
  messagingSenderId: "146612359188",
  appId: "1:146612359188:web:e69f6a9b59f57bb936fc67"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkActionItems() {
  try {
    // Check actionItemsManagement collection
    const q = query(collection(db, 'actionItemsManagement'), limit(10));
    const snapshot = await getDocs(q);
    
    console.log('🔍 Checking actionItemsManagement collection...');
    console.log(`📊 Found ${snapshot.size} documents (limited to 10)\n`);
    
    if (snapshot.empty) {
      console.log('❌ No action items found in actionItemsManagement collection');
      console.log('💡 The sync function needs to be run to import items from meetings');
    } else {
      console.log('✅ Action items found:');
      snapshot.forEach((doc, index) => {
        const data = doc.data();
        console.log(`\n${index + 1}. ${doc.id}`);
        console.log(`   Text: ${data.originalActionItem?.text?.substring(0, 80)}...`);
        console.log(`   Meeting: ${data.meetingTitle}`);
        console.log(`   Status: ${data.status}`);
        console.log(`   Assignee: ${data.updates?.assignee || 'Unassigned'}`);
        console.log(`   Priority: ${data.updates?.priority || data.originalActionItem?.priority || 'medium'}`);
      });
    }
    
    // Also check meetings for comparison
    console.log('\n\n🔍 Checking meetings collection for action items...');
    const meetingsSnapshot = await getDocs(query(collection(db, 'meetings'), limit(5)));
    let actionItemCount = 0;
    
    meetingsSnapshot.forEach(doc => {
      const meeting = doc.data();
      if (meeting.actionItems && meeting.actionItems.length > 0) {
        actionItemCount += meeting.actionItems.length;
      }
    });
    
    console.log(`📊 Found ${actionItemCount} action items in first 5 meetings`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
  
  process.exit(0);
}

checkActionItems();