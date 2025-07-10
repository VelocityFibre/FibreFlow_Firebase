const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc } = require('firebase/firestore');

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCQ-BqKGqOzGlpBgtqA-wFNcNVCiV2EZBY",
  authDomain: "fibreflow-73daf.firebaseapp.com",
  projectId: "fibreflow-73daf",
  storageBucket: "fibreflow-73daf.appspot.com",
  messagingSenderId: "493732862141",
  appId: "1:493732862141:web:50f74a2f1fcdcdbf12ab77",
  measurementId: "G-JCPHP7SW7D"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkMeeting(meetingId) {
  try {
    const docRef = doc(db, 'meetings', meetingId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      console.log('Meeting not found!');
      return;
    }
    
    const data = docSnap.data();
    console.log('\n📄 Meeting Title:', data.title);
    console.log('📅 Date:', data.dateTime);
    console.log('\n📋 Action Items Analysis:');
    console.log('- Field exists:', 'actionItems' in data);
    console.log('- Type:', typeof data.actionItems);
    console.log('- Is Array:', Array.isArray(data.actionItems));
    console.log('- Length:', data.actionItems ? data.actionItems.length : 'N/A');
    
    if (data.actionItems && data.actionItems.length > 0) {
      console.log('\n🔍 First 3 Action Items:');
      data.actionItems.slice(0, 3).forEach((item, index) => {
        console.log(`\n--- Item ${index + 1} ---`);
        if (typeof item === 'string') {
          console.log('⚠️  STRING VALUE:', item.substring(0, 200) + (item.length > 200 ? '...' : ''));
        } else if (typeof item === 'object') {
          console.log('✅ OBJECT STRUCTURE:');
          console.log('  - text:', item.text?.substring(0, 100) + (item.text?.length > 100 ? '...' : ''));
          console.log('  - assignee:', item.assignee || 'None');
          console.log('  - priority:', item.priority || 'None');
          console.log('  - completed:', item.completed || false);
          console.log('  - id:', item.id || 'None');
        } else {
          console.log('❌ UNEXPECTED TYPE:', typeof item);
        }
      });
    }
    
    // Also check if data might be in summary
    if (data.summary) {
      console.log('\n📝 Summary field:', typeof data.summary === 'string' ? data.summary.substring(0, 100) + '...' : data.summary);
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// Get meeting ID from command line or use the one from screenshot
const meetingId = process.argv[2] || 'r5Q6bcoohO93fh7OnVSX';
console.log(`\n🔍 Checking meeting: ${meetingId}\n`);

checkMeeting(meetingId).then(() => {
  console.log('\n✅ Done!');
  process.exit(0);
});