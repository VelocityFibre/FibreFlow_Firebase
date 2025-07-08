import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import fetch from 'node-fetch';

const FIREFLIES_API_URL = 'https://api.fireflies.ai/graphql';

// Get Fireflies API key from environment
const getApiKey = () => {
  return functions.config().fireflies?.api_key || process.env.FIREFLIES_API_KEY;
};

// GraphQL request helper
const makeGraphQLRequest = async (query: string) => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new functions.https.HttpsError('failed-precondition', 'Fireflies API key not configured');
  }

  const response = await fetch(FIREFLIES_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ query }),
  });

  if (!response.ok) {
    throw new functions.https.HttpsError('internal', `Fireflies API error: ${response.statusText}`);
  }

  const data = await response.json();
  if (data.errors) {
    throw new functions.https.HttpsError('internal', `GraphQL errors: ${JSON.stringify(data.errors)}`);
  }

  return data.data;
};

// Get meetings from Fireflies
export const getFirefliesMeetings = functions.https.onCall(async (data, context) => {
  // Authentication check removed - public access allowed

  const { dateFrom, dateTo } = data;
  
  const dateFilter = dateFrom && dateTo ? 
    `fromDate: "${dateFrom}", toDate: "${dateTo}"` : 
    '';
  
  const query = `
    query GetMeetings {
      transcripts(${dateFilter}) {
        id
        title
        date
        duration
        participants {
          name
          email
        }
        transcript_url
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
      }
    }
  `;

  try {
    const result = await makeGraphQLRequest(query);
    return { meetings: result.transcripts || [] };
  } catch (error) {
    console.error('Error fetching meetings:', error);
    throw error;
  }
});

// Get meeting transcript
export const getFirefliesTranscript = functions.https.onCall(async (data, context) => {
  // Authentication check removed - public access allowed

  const { meetingId } = data;
  if (!meetingId) {
    throw new functions.https.HttpsError('invalid-argument', 'Meeting ID is required');
  }

  const query = `
    query GetTranscript {
      transcript(id: "${meetingId}") {
        meeting_id
        sentences {
          text
          speaker_name
          speaker_email
          start_time
          end_time
        }
        summary
        keywords
        action_items {
          text
          assignee
          due_date
          speaker
          timestamp
        }
      }
    }
  `;

  try {
    const result = await makeGraphQLRequest(query);
    
    // Store transcript in Firebase Storage
    const bucket = admin.storage().bucket();
    const file = bucket.file(`meetings/${meetingId}/transcript.json`);
    
    await file.save(JSON.stringify(result.transcript), {
      metadata: {
        contentType: 'application/json',
        metadata: {
          meetingId,
          processedAt: new Date().toISOString(),
        }
      }
    });

    // Get signed URL for the transcript
    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return {
      ...result.transcript,
      storageUrl: url
    };
  } catch (error) {
    console.error('Error fetching transcript:', error);
    throw error;
  }
});

// Sync meetings periodically
export const syncFirefliesMeetings = functions.pubsub
  .schedule('every 6 hours')
  .onRun(async (context) => {
    console.log('Starting Fireflies sync...');
    
    // Get meetings from last 24 hours
    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - 1);
    const dateTo = new Date();

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

    try {
      const result = await makeGraphQLRequest(query);
      const meetings = result.transcripts || [];
      
      console.log(`Found ${meetings.length} meetings to sync`);

      const db = admin.firestore();
      const batch = db.batch();

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
            dateTime: meeting.date,
            duration: meeting.duration,
            participants: meeting.participants ? meeting.participants.map((email: string) => ({
              name: email.split('@')[0],
              email: email
            })) : [],
            organizer: meeting.organizer_email || '',
            meetingUrl: meeting.meeting_link || '',
            summary: meeting.summary?.overview || meeting.summary?.short_summary || '',
            actionItems: meeting.summary?.action_items ? meeting.summary.action_items.map((item: string, index: number) => ({
              id: `${meeting.id}_action_${index}`,
              text: item,
              assignee: '',
              dueDate: null,
              priority: extractPriority(item),
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
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
      }

      await batch.commit();
      console.log('Fireflies sync completed');
      
      return null;
    } catch (error) {
      console.error('Error syncing meetings:', error);
      throw error;
    }
  });

// Helper function to extract priority
function extractPriority(text: string): 'high' | 'medium' | 'low' {
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

// Manual sync function as a callable function (no IAM issues)
export const syncFirefliesMeetingsManually = functions.https.onCall(async (data, context) => {
  console.log('Starting manual Fireflies sync...');
  
  try {
    // Get date range from data or default to last 7 days
    const daysBack = data.days || 7;
    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - daysBack);
    const dateTo = new Date();

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

    const result = await makeGraphQLRequest(query);
    const meetings = result.transcripts || [];
    
    console.log(`Found ${meetings.length} meetings to sync`);

    const db = admin.firestore();
    let newMeetings = 0;
    let updatedMeetings = 0;

    for (const meeting of meetings) {
      // Check if meeting already exists
      const existingMeeting = await db.collection('meetings')
        .where('firefliesId', '==', meeting.id)
        .get();

      const meetingData: any = {
        firefliesId: meeting.id,
        title: meeting.title,
        dateTime: meeting.date,
        duration: meeting.duration,
        participants: meeting.participants ? meeting.participants.map((email: string) => ({
          name: email.split('@')[0],
          email: email
        })) : [],
        organizer: meeting.organizer_email || '',
        meetingUrl: meeting.meeting_link || '',
        summary: meeting.summary?.overview || meeting.summary?.short_summary || '',
        actionItems: meeting.summary?.action_items ? meeting.summary.action_items.map((item: string, index: number) => ({
          id: `${meeting.id}_action_${index}`,
          text: item,
          assignee: '',
          dueDate: null,
          priority: extractPriority(item),
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
      } else {
        // Update existing meeting
        const docId = existingMeeting.docs[0].id;
        await db.collection('meetings').doc(docId).update(meetingData);
        updatedMeetings++;
      }
    }

    const response = {
      success: true,
      message: 'Fireflies sync completed',
      stats: {
        totalMeetings: meetings.length,
        newMeetings,
        updatedMeetings,
        dateRange: {
          from: dateFrom.toISOString(),
          to: dateTo.toISOString()
        }
      }
    };

    console.log('Manual sync completed:', response);
    return response;
    
  } catch (error: any) {
    console.error('Error in manual sync:', error);
    throw new functions.https.HttpsError('internal', error.message || 'Failed to sync meetings');
  }
});