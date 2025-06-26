const https = require('https');

const API_KEY = '894886b5-b232-4319-95c7-1296782e9ea6';

// Get last 3 meetings with full details
const query = `
  query {
    transcripts(limit: 3) {
      id
      title
      date
      duration
      organizer_email
      summary {
        overview
        action_items
        keywords
        outline
      }
    }
  }
`;

const options = {
  hostname: 'api.fireflies.ai',
  path: '/graphql',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${API_KEY}`
  }
};

const req = https.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      if (response.data && response.data.transcripts) {
        console.log(`\n📊 Last 3 Meetings with Full Details:\n`);
        response.data.transcripts.forEach((t, idx) => {
          console.log(`\n════════════════════════════════════════`);
          console.log(`📅 ${idx + 1}. ${t.title}`);
          console.log(`Date: ${new Date(t.date).toLocaleDateString()} | Duration: ${Math.round(t.duration)} minutes`);
          console.log(`\n📝 Summary:`);
          console.log(t.summary?.overview || 'No summary available');
          console.log(`\n✅ Action Items:`);
          if (t.summary?.action_items) {
            console.log(t.summary.action_items);
          } else {
            console.log('No action items');
          }
          console.log(`\n🔑 Keywords: ${t.summary?.keywords || 'None'}`);
        });
      }
    } catch (error) {
      console.error('Error:', error);
    }
  });
});

req.on('error', (error) => {
  console.error('Request error:', error);
});

req.write(JSON.stringify({ query }));
req.end();