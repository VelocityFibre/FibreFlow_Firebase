const admin = require('firebase-admin');
const serviceAccount = require('./fibreflow-service-account.json');

// Initialize admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'fibreflow-73daf'
});

const db = admin.firestore();

async function checkMeetingsInDatabase() {
  try {
    console.log('🔍 Checking meetings collection in Firestore...\n');
    
    const snapshot = await db.collection('meetings').get();
    
    console.log(`📊 Total meetings in database: ${snapshot.size}`);
    
    if (snapshot.size === 0) {
      console.log('\n❌ No meetings found in the database.');
      console.log('The meetings collection is empty.');
    } else {
      console.log('\n📋 Meetings in database:');
      console.log('========================\n');
      
      const meetings = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        meetings.push({
          id: doc.id,
          title: data.title || 'Untitled',
          date: data.dateTime,
          firefliesId: data.firefliesId,
          participants: data.participants?.length || 0,
          actionItems: data.actionItems?.length || 0
        });
      });
      
      // Sort by date (newest first)
      meetings.sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateB - dateA;
      });
      
      meetings.forEach((meeting, index) => {
        const date = new Date(meeting.date);
        console.log(`${index + 1}. ${meeting.title}`);
        console.log(`   📅 Date: ${date.toLocaleDateString()} ${date.toLocaleTimeString()}`);
        console.log(`   🆔 Doc ID: ${meeting.id}`);
        console.log(`   🔗 Fireflies ID: ${meeting.firefliesId || 'N/A'}`);
        console.log(`   👥 Participants: ${meeting.participants}`);
        console.log(`   ✅ Action Items: ${meeting.actionItems}`);
        console.log('');
      });
      
      // Show date range
      const oldestDate = new Date(meetings[meetings.length - 1].date);
      const newestDate = new Date(meetings[0].date);
      
      console.log(`\n📅 Date Range:`);
      console.log(`   Oldest: ${oldestDate.toLocaleDateString()}`);
      console.log(`   Newest: ${newestDate.toLocaleDateString()}`);
    }
    
    console.log('\n✅ Database check complete');
    
  } catch (error) {
    console.error('❌ Error checking database:', error.message);
  } finally {
    process.exit(0);
  }
}

checkMeetingsInDatabase();