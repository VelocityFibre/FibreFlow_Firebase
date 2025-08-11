const { exec } = require('child_process');
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs, addDoc, updateDoc, doc } = require('firebase/firestore');

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

const FIREFLIES_API_KEY = '894886b5-b232-4319-95c7-1296782e9ea6';

// Helper to extract priority
function extractPriority(text) {
  const lowercaseText = text.toLowerCase();
  if (lowercaseText.includes('urgent') || lowercaseText.includes('asap') || 
      lowercaseText.includes('critical') || lowercaseText.includes('immediately')) {
    return 'high';
  }
  if (lowercaseText.includes('important') || lowercaseText.includes('priority')) {
    return 'medium';
  }
  return 'low';
}

// Fetch meetings using curl
function fetchMeetingsFromFireflies(daysBack = 30) {
  return new Promise((resolve, reject) => {
    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - daysBack);
    const dateTo = new Date();

    console.log(`📅 Fetching meetings from ${dateFrom.toLocaleDateString()} to ${dateTo.toLocaleDateString()}`);

    const graphqlQuery = `
      query {
        transcripts {
          id
          title
          date
          duration
          participants
          organizer_email
          meeting_link
          summary {
            keywords
            action_items
            outline
            overview
            short_summary
            bullet_gist
          }
        }
      }
    `.replace(/\n/g, ' ').replace(/\s+/g, ' ');

    const curlCommand = `curl -s -X POST https://api.fireflies.ai/graphql \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer ${FIREFLIES_API_KEY}" \
      -d '{"query":"${graphqlQuery}"}'`;

    exec(curlCommand, (error, stdout, stderr) => {
      if (error) {
        console.error('❌ Error executing curl:', error);
        reject(error);
        return;
      }

      try {
        const data = JSON.parse(stdout);
        if (data.errors) {
          console.error('❌ GraphQL errors:', data.errors);
          reject(new Error('GraphQL errors'));
          return;
        }
        resolve(data.data?.transcripts || []);
      } catch (parseError) {
        console.error('❌ Error parsing response:', parseError);
        reject(parseError);
      }
    });
  });
}

// Save meetings to Firebase
async function saveMeetingsToFirebase(meetings) {
  let newMeetings = 0;
  let updatedMeetings = 0;

  for (const meeting of meetings) {
    try {
      // Check if meeting already exists
      const q = query(collection(db, 'meetings'), where('firefliesId', '==', meeting.id));
      const existingMeeting = await getDocs(q);

      const meetingData = {
        firefliesId: meeting.id,
        title: meeting.title || 'Untitled Meeting',
        dateTime: typeof meeting.date === 'number' ? new Date(meeting.date).toISOString() : meeting.date,
        duration: meeting.duration || 0,
        participants: meeting.participants ? meeting.participants.map(email => ({
          name: email.split('@')[0],
          email: email
        })) : [],
        organizer: meeting.organizer_email || '',
        meetingUrl: meeting.meeting_link || '',
        summary: meeting.summary?.overview || meeting.summary?.short_summary || '',
        actionItems: meeting.summary?.action_items ? 
          (Array.isArray(meeting.summary.action_items) 
            ? meeting.summary.action_items 
            : [meeting.summary.action_items]
          ).map((item, index) => ({
            id: `${meeting.id}_action_${index}`,
            text: typeof item === 'string' ? item : JSON.stringify(item),
            assignee: '',
            dueDate: null,
            priority: extractPriority(typeof item === 'string' ? item : JSON.stringify(item)),
            completed: false,
            speaker: '',
            timestamp: 0
          })) : [],
        insights: {
          keywords: meeting.summary?.keywords || [],
          outline: meeting.summary?.outline || '',
          bulletPoints: meeting.summary?.bullet_gist || ''
        },
        status: 'synced',
        updatedAt: new Date().toISOString(),
      };

      if (existingMeeting.empty) {
        // Create new meeting
        meetingData.createdAt = new Date().toISOString();
        await addDoc(collection(db, 'meetings'), meetingData);
        newMeetings++;
        console.log(`✅ Created: ${meeting.title}`);
      } else {
        // Update existing meeting
        const docId = existingMeeting.docs[0].id;
        await updateDoc(doc(db, 'meetings', docId), meetingData);
        updatedMeetings++;
        console.log(`🔄 Updated: ${meeting.title}`);
      }
    } catch (error) {
      console.error(`❌ Error processing meeting "${meeting.title}":`, error.message);
    }
  }

  return { newMeetings, updatedMeetings };
}

// Main sync function
async function syncMeetings() {
  console.log('🚀 Starting Fireflies sync...\n');

  try {
    // Get number of days from command line argument
    const daysBack = parseInt(process.argv[2]) || 30;
    
    // Fetch meetings from Fireflies
    const meetings = await fetchMeetingsFromFireflies(daysBack);
    console.log(`\n📊 Found ${meetings.length} meetings in Fireflies\n`);

    if (meetings.length === 0) {
      console.log('No meetings to sync.');
      return;
    }

    // Save to Firebase
    const { newMeetings, updatedMeetings } = await saveMeetingsToFirebase(meetings);

    // Summary
    console.log('\n✨ Sync completed successfully!');
    console.log(`📈 Summary:`);
    console.log(`   - Total meetings processed: ${meetings.length}`);
    console.log(`   - New meetings created: ${newMeetings}`);
    console.log(`   - Existing meetings updated: ${updatedMeetings}`);
    
  } catch (error) {
    console.error('\n❌ Sync failed:', error.message);
    process.exit(1);
  }
}

// Run the sync
syncMeetings().then(() => {
  console.log('\n👋 Done!');
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});