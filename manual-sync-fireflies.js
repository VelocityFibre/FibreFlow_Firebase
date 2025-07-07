#!/usr/bin/env node

const admin = require('firebase-admin');
const fetch = require('node-fetch');

// Initialize Firebase Admin SDK
const serviceAccount = require('./fibreflow-service-account.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://fibreflow-73daf.firebaseio.com'
});

const FIREFLIES_API_URL = 'https://api.fireflies.ai/graphql';
const FIREFLIES_API_KEY = '894886b5-b232-4319-95c7-1296782e9ea6';

// GraphQL request helper
async function makeGraphQLRequest(query) {
  const response = await fetch(FIREFLIES_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${FIREFLIES_API_KEY}`,
    },
    body: JSON.stringify({ query }),
  });

  if (!response.ok) {
    throw new Error(`Fireflies API error: ${response.statusText}`);
  }

  const data = await response.json();
  if (data.errors) {
    throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
  }

  return data.data;
}

// Helper function to extract priority
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

async function syncFirefliesMeetings() {
  console.log('Starting manual Fireflies sync...');
  
  // Get meetings from last 7 days
  const dateFrom = new Date();
  dateFrom.setDate(dateFrom.getDate() - 7);
  const dateTo = new Date();

  const query = `
    query GetRecentMeetings {
      meetings(date_from: "${dateFrom.toISOString()}", date_to: "${dateTo.toISOString()}") {
        id
        title
        date
        duration
        participants {
          name
          email
        }
        summary
        action_items {
          text
          assignee
          due_date
          speaker
          timestamp
        }
        video_url
        audio_url
        transcript_url
      }
    }
  `;

  try {
    console.log('Fetching meetings from Fireflies API...');
    const result = await makeGraphQLRequest(query);
    const meetings = result.meetings || [];
    
    console.log(`Found ${meetings.length} meetings to sync`);

    const db = admin.firestore();
    const batch = db.batch();
    let newMeetings = 0;

    for (const meeting of meetings) {
      // Check if meeting already exists
      const existingMeeting = await db.collection('meetings')
        .where('firefliesId', '==', meeting.id)
        .get();

      if (existingMeeting.empty) {
        // Create new meeting
        const meetingRef = db.collection('meetings').doc();
        batch.set(meetingRef, {
          firefliesId: meeting.id,
          title: meeting.title,
          date: admin.firestore.Timestamp.fromDate(new Date(meeting.date)),
          duration: meeting.duration,
          participants: meeting.participants || [],
          summary: meeting.summary,
          actionItems: (meeting.action_items || []).map((item, index) => ({
            id: `${meeting.id}_action_${index}`,
            ...item,
            dueDate: item.due_date ? admin.firestore.Timestamp.fromDate(new Date(item.due_date)) : null,
            priority: extractPriority(item.text),
            completed: false,
          })),
          videoUrl: meeting.video_url,
          audioUrl: meeting.audio_url,
          transcriptUrl: meeting.transcript_url,
          status: 'pending',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        newMeetings++;
      } else {
        console.log(`Meeting already exists: ${meeting.title}`);
      }
    }

    if (newMeetings > 0) {
      await batch.commit();
      console.log(`Successfully synced ${newMeetings} new meetings`);
    } else {
      console.log('No new meetings to sync');
    }
    
    return { success: true, newMeetings, totalMeetings: meetings.length };
  } catch (error) {
    console.error('Error syncing meetings:', error);
    throw error;
  }
}

// Run the sync
syncFirefliesMeetings()
  .then(result => {
    console.log('Sync completed successfully:', result);
    process.exit(0);
  })
  .catch(error => {
    console.error('Sync failed:', error);
    process.exit(1);
  });