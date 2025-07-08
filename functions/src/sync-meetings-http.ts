import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import fetch from 'node-fetch';

const FIREFLIES_API_URL = 'https://api.fireflies.ai/graphql';

// Get Fireflies API key from environment
const getApiKey = () => {
  return functions.config().fireflies?.api_key || process.env.FIREFLIES_API_KEY;
};

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

// HTTP function for syncing meetings (works around CORS issues)
export const syncMeetingsHttp = functions.https.onRequest(async (req, res) => {
  // Enable CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }
  
  try {
    console.log('HTTP sync function called');
    
    const apiKey = getApiKey();
    if (!apiKey) {
      throw new Error('Fireflies API key not configured');
    }
    
    // Get date range from query params or default to last 30 days
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

    console.log('Fetching from Fireflies API...');
    const response = await fetch(FIREFLIES_API_URL, {
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

    const meetings = data.data?.transcripts || [];
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

    const responseData = {
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

    console.log('HTTP sync completed:', responseData);
    res.json(responseData);
    
  } catch (error: any) {
    console.error('Error in HTTP sync:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to sync meetings'
    });
  }
});