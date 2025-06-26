// Simple sync script that works
const https = require('https');

const API_KEY = '894886b5-b232-4319-95c7-1296782e9ea6';

const query = `
  query {
    transcripts(limit: 10) {
      id
      title
      date
      duration
      organizer_email
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
        console.log(`\n✅ Found ${response.data.transcripts.length} meetings:\n`);
        response.data.transcripts.forEach((t, idx) => {
          console.log(`${idx + 1}. ${t.title}`);
          console.log(`   Date: ${new Date(t.date).toLocaleDateString()}`);
          console.log(`   Duration: ${t.duration} minutes`);
          console.log(`   Organizer: ${t.organizer_email}`);
          console.log('');
        });
      } else if (response.errors) {
        console.error('GraphQL Errors:', response.errors);
      }
    } catch (error) {
      console.error('Parse error:', error);
      console.log('Raw response:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('Request error:', error);
});

req.write(JSON.stringify({ query }));
req.end();