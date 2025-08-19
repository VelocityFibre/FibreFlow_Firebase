const https = require('https');

// Test the pole analytics API
const testAPI = async () => {
  console.log('Testing Pole Analytics API...\n');

  // Test summary endpoint
  const summaryUrl = 'https://us-central1-fibreflow-73daf.cloudfunctions.net/poleAnalyticsSummaryPublic';
  
  return new Promise((resolve, reject) => {
    https.get(summaryUrl, (res) => {
      console.log(`Summary endpoint status: ${res.statusCode}`);
      console.log(`Headers:`, res.headers);
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log('\nResponse body:');
        console.log(data);
        
        // Try to parse as JSON
        try {
          const json = JSON.parse(data);
          console.log('\nParsed JSON:');
          console.log(JSON.stringify(json, null, 2));
        } catch (e) {
          console.log('Not valid JSON - showing raw response above');
        }
        
        resolve();
      });
    }).on('error', (err) => {
      console.error('Request error:', err);
      reject(err);
    });
  });
};

// Run the test
testAPI()
  .then(() => console.log('\nTest complete'))
  .catch(err => console.error('\nTest failed:', err));