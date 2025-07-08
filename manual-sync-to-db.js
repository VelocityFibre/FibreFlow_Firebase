const fetch = require('node-fetch');

// Fireflies API configuration
const FIREFLIES_API_URL = 'https://api.fireflies.ai/graphql';
const FIREFLIES_API_KEY = '894886b5-b232-4319-95c7-1296782e9ea6';

// Firebase REST API endpoint for your project
const FIREBASE_PROJECT_ID = 'fibreflow-73daf';
const FIREBASE_COLLECTION = 'meetings';

async function manualSyncToFirebase() {
  try {
    console.log('🔄 Fetching meetings from Fireflies...\n');
    
    // Set date range for last 30 days
    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - 30);
    const dateTo = new Date();
    
    // GraphQL query to get transcripts
    const query = `
      query {
        transcripts(
          fromDate: "${dateFrom.toISOString()}"
          toDate: "${dateTo.toISOString()}"
        ) {
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
            shorthand_bullet
            overview
            bullet_gist
            gist
            short_summary
          }
        }
      }
    `;
    
    const response = await fetch(FIREFLIES_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${FIREFLIES_API_KEY}`,
      },
      body: JSON.stringify({ query }),
    });
    
    const data = await response.json();
    const meetings = data.data?.transcripts || [];
    
    console.log(`✅ Found ${meetings.length} meetings from Fireflies\n`);
    
    if (meetings.length > 0) {
      console.log('📋 Latest meetings:');
      meetings.slice(0, 5).forEach((meeting, index) => {
        const date = new Date(meeting.date);
        console.log(`${index + 1}. ${meeting.title} - ${date.toLocaleDateString()}`);
      });
      
      console.log(`
MANUAL SYNC INSTRUCTIONS:
========================

Since the automatic sync is experiencing CORS issues, you can manually add meetings:

1. Go to Firebase Console: https://console.firebase.google.com
2. Select your FibreFlow project
3. Go to Firestore Database
4. Click "Start collection" or open the "meetings" collection
5. Click "Add document"
6. Use "Auto-ID" for document ID
7. Add these fields for each meeting:

Example for the latest meeting:
`);
      
      const latestMeeting = meetings[0];
      console.log(JSON.stringify({
        firefliesId: latestMeeting.id,
        title: latestMeeting.title,
        dateTime: latestMeeting.date,
        duration: latestMeeting.duration,
        participants: latestMeeting.participants ? latestMeeting.participants.map(email => ({
          name: email.split('@')[0],
          email: email
        })) : [],
        organizer: latestMeeting.organizer_email || '',
        meetingUrl: latestMeeting.meeting_link || '',
        summary: latestMeeting.summary?.overview || latestMeeting.summary?.short_summary || '',
        actionItems: latestMeeting.summary?.action_items ? 
          (Array.isArray(latestMeeting.summary.action_items) 
            ? latestMeeting.summary.action_items 
            : [latestMeeting.summary.action_items]
          ).map((item, index) => ({
            id: `${latestMeeting.id}_action_${index}`,
            text: typeof item === 'string' ? item : JSON.stringify(item),
            assignee: '',
            dueDate: null,
            priority: 'medium',
            completed: false,
            speaker: '',
            timestamp: 0
          })) : [],
        insights: {
          keywords: latestMeeting.summary?.keywords || [],
          outline: latestMeeting.summary?.outline || '',
          bulletPoints: latestMeeting.summary?.bullet_gist || ''
        },
        status: 'synced',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }, null, 2));
      
      console.log(`
Once you add meetings manually, they will appear in your app.

The CORS issue needs to be fixed by:
1. Ensuring Firebase Functions are deployed in the same region as your app
2. Checking that the Firebase SDK is properly initialized
3. Verifying the Functions service is provided in app.config.ts (which it is)
`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Check if node-fetch is available
try {
  require.resolve('node-fetch');
  manualSyncToFirebase();
} catch(e) {
  console.log('Run: npm install node-fetch@2');
}