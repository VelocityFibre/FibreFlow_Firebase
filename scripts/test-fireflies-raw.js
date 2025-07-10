const { exec } = require('child_process');

const FIREFLIES_API_KEY = '894886b5-b232-4319-95c7-1296782e9ea6';

// Fetch a single meeting to see the raw structure
function fetchSingleMeeting() {
  return new Promise((resolve, reject) => {
    const graphqlQuery = `
      query {
        transcripts(limit: 1) {
          id
          title
          date
          summary {
            action_items
          }
        }
      }
    `.replace(/\n/g, ' ').replace(/\s+/g, ' ');

    const curlCommand = `curl -s -X POST https://api.fireflies.ai/graphql \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer ${FIREFLIES_API_KEY}" \
      -d '{"query":"${graphqlQuery}"}'`;

    console.log('🔍 Fetching raw data from Fireflies...\n');

    exec(curlCommand, (error, stdout, stderr) => {
      if (error) {
        console.error('❌ Error executing curl:', error);
        reject(error);
        return;
      }

      try {
        const data = JSON.parse(stdout);
        if (data.errors) {
          console.error('❌ GraphQL errors:', data.errors);
          reject(new Error('GraphQL errors'));
          return;
        }
        
        console.log('📥 Raw API Response:');
        console.log(JSON.stringify(data, null, 2));
        
        if (data.data?.transcripts?.[0]?.summary?.action_items) {
          const actionItems = data.data.transcripts[0].summary.action_items;
          console.log('\n🎯 Action Items Analysis:');
          console.log('Type:', typeof actionItems);
          console.log('Is Array:', Array.isArray(actionItems));
          if (typeof actionItems === 'string') {
            console.log('String length:', actionItems.length);
            console.log('First 500 chars:', actionItems.substring(0, 500));
          } else if (Array.isArray(actionItems)) {
            console.log('Array length:', actionItems.length);
            console.log('First item:', JSON.stringify(actionItems[0], null, 2));
          }
        }
        
        resolve(data.data?.transcripts || []);
      } catch (parseError) {
        console.error('❌ Error parsing response:', parseError);
        reject(parseError);
      }
    });
  });
}

// Run the test
fetchSingleMeeting().then(() => {
  console.log('\n✅ Done!');
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});