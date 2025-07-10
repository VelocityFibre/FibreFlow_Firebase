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

// Parse action items string into structured array
function parseActionItems(actionItemsString, meetingId) {
  if (!actionItemsString || typeof actionItemsString !== 'string') {
    return [];
  }

  const actionItems = [];
  let currentAssignee = '';
  
  // Split by lines and process
  const lines = actionItemsString.split('\n').filter(line => line.trim());
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Check if this is an assignee header (starts with ** and ends with **)
    if (trimmedLine.startsWith('**') && trimmedLine.endsWith('**')) {
      currentAssignee = trimmedLine.replace(/\*\*/g, '').trim();
      continue;
    }
    
    // Skip empty lines
    if (!trimmedLine) continue;
    
    // This is an action item
    // Extract timestamp if present (format: (HH:MM) at the end)
    const timestampMatch = trimmedLine.match(/\((\d+:\d+)\)\s*$/);
    const timestamp = timestampMatch ? timestampMatch[1] : '';
    const text = timestampMatch 
      ? trimmedLine.replace(/\s*\(\d+:\d+\)\s*$/, '').trim()
      : trimmedLine;
    
    // Only add if we have actual text
    if (text) {
      actionItems.push({
        id: `${meetingId}_action_${actionItems.length}`,
        text: text,
        assignee: currentAssignee,
        dueDate: null,
        priority: extractPriority(text),
        completed: false,
        speaker: currentAssignee,
        timestamp: timestamp ? convertTimestampToSeconds(timestamp) : 0
      });
    }
  }
  
  return actionItems;
}

// Convert timestamp string (MM:SS or HH:MM:SS) to seconds
function convertTimestampToSeconds(timestamp) {
  const parts = timestamp.split(':').map(p => parseInt(p, 10));
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  } else if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return 0;
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
  let totalActionItems = 0;

  for (const meeting of meetings) {
    try {
      // Check if meeting already exists
      const q = query(collection(db, 'meetings'), where('firefliesId', '==', meeting.id));
      const existingMeeting = await getDocs(q);

      // Parse action items properly
      const actionItems = parseActionItems(meeting.summary?.action_items, meeting.id);
      totalActionItems += actionItems.length;

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
        actionItems: actionItems,
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
        console.log(`✅ Created: ${meeting.title} (${actionItems.length} action items)`);
      } else {
        // Update existing meeting
        const docId = existingMeeting.docs[0].id;
        await updateDoc(doc(db, 'meetings', docId), meetingData);
        updatedMeetings++;
        console.log(`🔄 Updated: ${meeting.title} (${actionItems.length} action items)`);
      }
    } catch (error) {
      console.error(`❌ Error processing meeting "${meeting.title}":`, error.message);
    }
  }

  return { newMeetings, updatedMeetings, totalActionItems };
}

// Main sync function
async function syncMeetings() {
  console.log('🚀 Starting Improved Fireflies sync...\n');

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
    const { newMeetings, updatedMeetings, totalActionItems } = await saveMeetingsToFirebase(meetings);

    // Summary
    console.log('\n✨ Sync completed successfully!');
    console.log(`📈 Summary:`);
    console.log(`   - Total meetings processed: ${meetings.length}`);
    console.log(`   - New meetings created: ${newMeetings}`);
    console.log(`   - Existing meetings updated: ${updatedMeetings}`);
    console.log(`   - Total action items parsed: ${totalActionItems}`);
    
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