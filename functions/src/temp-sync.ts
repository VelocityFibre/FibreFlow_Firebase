import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import fetch from 'node-fetch';

// Get Fireflies API key from environment
const getApiKey = () => {
  return functions.config().fireflies?.api_key || process.env.FIREFLIES_API_KEY;
};

// GraphQL request helper
const makeGraphQLRequest = async (query: string) => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('Fireflies API key not configured');
  }

  const response = await fetch('https://api.fireflies.ai/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
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
};

// Temporary HTTP function for direct sync
export const tempSyncMeetings = functions
  .runWith({ 
    timeoutSeconds: 300,
    memory: '512MB'
  })
  .https.onRequest(async (req, res) => {
    // Enable CORS
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST');
    
    console.log('Starting temporary sync...');
    
    try {
      const daysBack = parseInt(req.query.days as string) || 30;
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
      const meetingDetails = [];

      for (const meeting of meetings) {
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
          actionItems: meeting.summary?.action_items ? 
            (Array.isArray(meeting.summary.action_items) 
              ? meeting.summary.action_items 
              : [meeting.summary.action_items]
            ).map((item: any, index: number) => ({
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
          meetingData.createdAt = new Date().toISOString();
          const docRef = await db.collection('meetings').add(meetingData);
          newMeetings++;
          meetingDetails.push({
            id: docRef.id,
            title: meeting.title,
            date: meeting.date,
            status: 'created'
          });
        } else {
          const docId = existingMeeting.docs[0].id;
          await db.collection('meetings').doc(docId).update(meetingData);
          updatedMeetings++;
          meetingDetails.push({
            id: docId,
            title: meeting.title,
            date: meeting.date,
            status: 'updated'
          });
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
        },
        meetings: meetingDetails
      };

      console.log('Sync completed:', response);
      res.status(200).json(response);
      
    } catch (error: any) {
      console.error('Error in sync:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to sync meetings',
        details: error.toString()
      });
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