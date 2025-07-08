const https = require('https');

// Firebase Functions URL
const functionUrl = 'https://us-central1-fibreflow-73daf.cloudfunctions.net/syncFirefliesMeetingsManually';

// Prepare the request data
const data = JSON.stringify({
  data: {
    days: 30  // Sync last 30 days of meetings
  }
});

const options = {
  hostname: 'us-central1-fibreflow-73daf.cloudfunctions.net',
  path: '/syncFirefliesMeetingsManually',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

console.log('Calling Fireflies sync function...');

const req = https.request(options, (res) => {
  let responseData = '';

  res.on('data', (chunk) => {
    responseData += chunk;
  });

  res.on('end', () => {
    console.log('Status Code:', res.statusCode);
    console.log('Response:', responseData);
    
    try {
      const result = JSON.parse(responseData);
      if (result.result) {
        console.log('\nSync Results:');
        console.log('- Success:', result.result.success);
        console.log('- Total Meetings:', result.result.stats.totalMeetings);
        console.log('- New Meetings:', result.result.stats.newMeetings);
        console.log('- Updated Meetings:', result.result.stats.updatedMeetings);
        console.log('- Date Range:', result.result.stats.dateRange.from, 'to', result.result.stats.dateRange.to);
      }
    } catch (e) {
      console.log('Could not parse response:', e.message);
    }
  });
});

req.on('error', (error) => {
  console.error('Error calling function:', error);
});

req.write(data);
req.end();