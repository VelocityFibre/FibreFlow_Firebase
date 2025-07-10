#!/usr/bin/env node

const admin = require('firebase-admin');
const fetch = require('node-fetch');
const path = require('path');

// Initialize Firebase Admin
const serviceAccount = require('../functions/serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://fibreflow-73daf.firebaseio.com"
});

const db = admin.firestore();

// Fireflies API configuration
const FIREFLIES_API_URL = 'https://api.fireflies.ai/graphql';
const FIREFLIES_API_KEY = '894886b5-b232-4319-95c7-1296782e9ea6';

// Helper to extract priority from text
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

// Fetch meetings from Fireflies
async function fetchMeetingsFromFireflies(daysBack = 30) {
  const dateFrom = new Date();
  dateFrom.setDate(dateFrom.getDate() - daysBack);
  const dateTo = new Date();

  console.log(`📅 Fetching meetings from ${dateFrom.toLocaleDateString()} to ${dateTo.toLocaleDateString()}`);

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
        participants {
          name
          email
        }
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

  try {
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

    return data.data?.transcripts || [];
  } catch (error) {
    console.error('❌ Error fetching from Fireflies:', error.message);
    throw error;
  }
}

// Save meetings to Firebase
async function saveMeetingsToFirebase(meetings) {
  let newMeetings = 0;
  let updatedMeetings = 0;

  for (const meeting of meetings) {
    try {
      // Check if meeting already exists
      const existingMeeting = await db.collection('meetings')
        .where('firefliesId', '==', meeting.id)
        .get();

      const meetingData = {
        firefliesId: meeting.id,
        title: meeting.title || 'Untitled Meeting',
        dateTime: meeting.date,
        duration: meeting.duration || 0,
        participants: meeting.participants || [],
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
        await db.collection('meetings').add(meetingData);
        newMeetings++;
        console.log(`✅ Created: ${meeting.title}`);
      } else {
        // Update existing meeting
        const docId = existingMeeting.docs[0].id;
        await db.collection('meetings').doc(docId).update(meetingData);
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