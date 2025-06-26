const functions = require('firebase-functions');
const fetch = require('node-fetch');

// Simple HTTP endpoint that returns meetings
exports.simpleMeetings = functions.https.onRequest((req, res) => {
  // Set CORS headers
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }
  
  // Return test data
  const testMeetings = [
    {
      id: '1',
      title: 'Test Meeting 1',
      date: new Date().toISOString(),
      duration: 30,
      participants: [{ name: 'John Doe', email: 'john@example.com' }],
      summary: 'This is a test meeting',
      action_items: []
    },
    {
      id: '2', 
      title: 'Test Meeting 2',
      date: new Date().toISOString(),
      duration: 45,
      participants: [{ name: 'Jane Smith', email: 'jane@example.com' }],
      summary: 'Another test meeting',
      action_items: []
    }
  ];
  
  res.json({ meetings: testMeetings });
});

// Real Fireflies endpoint
exports.firefliesMeetings = functions.https.onRequest(async (req, res) => {
  // Set CORS headers
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }
  
  try {
    // Make request to Fireflies API
    const response = await fetch('https://api.fireflies.ai/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer 894886b5-b232-4319-95c7-1296782e9ea6'
      },
      body: JSON.stringify({
        query: `
          query {
            transcripts(limit: 10) {
              id
              title
              date
              duration
              organizer_email
              summary {
                overview
                action_items
              }
            }
          }
        `
      })
    });
    
    const data = await response.json();
    
    if (data.errors) {
      console.error('GraphQL errors:', data.errors);
      res.status(500).json({ error: 'Failed to fetch meetings' });
      return;
    }
    
    // Convert transcripts to meetings format
    const meetings = (data.data?.transcripts || []).map(t => ({
      id: t.id,
      title: t.title,
      date: new Date(t.date).toISOString(),
      duration: t.duration,
      participants: [{
        name: t.organizer_email?.split('@')[0] || 'Unknown',
        email: t.organizer_email || ''
      }],
      summary: t.summary?.overview || '',
      action_items: t.summary?.action_items ? 
        t.summary.action_items.split('\n').filter(item => item.trim()).map(text => ({
          text,
          assignee: '',
          due_date: '',
          speaker: '',
          timestamp: 0
        })) : []
    }));
    
    res.json({ meetings });
    
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});