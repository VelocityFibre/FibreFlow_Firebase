require('dotenv').config({ path: '.claude/.env' });
const { ZepClient } = require('@getzep/zep-cloud');

async function testWithAuth() {
  console.log('=== Testing with .claude/.env ===\n');
  
  console.log('Environment loaded:');
  console.log('ZEP_API_KEY:', process.env.ZEP_API_KEY ? 'Present (length: ' + process.env.ZEP_API_KEY.length + ')' : 'Missing');
  
  if (!process.env.ZEP_API_KEY) {
    console.log('❌ No API key loaded');
    return;
  }
  
  const client = new ZepClient({ apiKey: process.env.ZEP_API_KEY });
  const userId = 'fibreflow_dev';
  
  try {
    console.log('\nTesting user API...');
    const user = await client.user.get(userId);
    console.log('✅ User found:', user.userId);
    
    console.log('\nTesting graph search...');
    const results = await client.graph.search({
      query: 'test',
      userId: userId,
      limit: 5
    });
    console.log('✅ Graph search successful, results:', results?.results?.length || 0);
    
  } catch (error) {
    console.log('❌ API Error:', error.message);
    console.log('Status:', error.status || error.statusCode);
    if (error.body) console.log('Body:', error.body);
  }
}

testWithAuth();