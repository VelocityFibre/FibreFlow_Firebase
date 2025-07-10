const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const path = require('path');

// Initialize Firebase Admin
const serviceAccount = require(path.join(__dirname, '../functions/service-account-key.json'));

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function inspectMeeting(meetingId) {
  try {
    const doc = await db.collection('meetings').doc(meetingId).get();
    
    if (!doc.exists) {
      console.log('Meeting not found!');
      return;
    }
    
    const data = doc.data();
    console.log('\n📄 Meeting Title:', data.title);
    console.log('📅 Date:', data.dateTime);
    console.log('\n📋 Action Items:');
    console.log('Type:', typeof data.actionItems);
    console.log('Is Array:', Array.isArray(data.actionItems));
    console.log('Count:', data.actionItems ? data.actionItems.length : 0);
    
    if (data.actionItems) {
      console.log('\n🔍 Action Items Details:');
      data.actionItems.forEach((item, index) => {
        console.log(`\n--- Item ${index + 1} ---`);
        console.log('Type:', typeof item);
        if (typeof item === 'string') {
          console.log('String value:', item.substring(0, 100) + '...');
        } else {
          console.log('Structure:', JSON.stringify(item, null, 2));
        }
      });
    }
    
    // Also check raw summary data
    if (data.insights || data.summary) {
      console.log('\n📊 Raw Summary/Insights:');
      console.log(JSON.stringify({
        summary: data.summary,
        insights: data.insights
      }, null, 2));
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// Get meeting ID from command line
const meetingId = process.argv[2] || 'r5Q6bcoohO93fh7OnVSX';
console.log(`\n🔍 Inspecting meeting: ${meetingId}\n`);

inspectMeeting(meetingId).then(() => {
  console.log('\n✅ Done!');
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});