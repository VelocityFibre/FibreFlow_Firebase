require('dotenv').config({ path: '.claude/.env' });
const { ZepClient } = require('@getzep/zep-cloud');

async function testZepV3API() {
  console.log('=== Testing Zep v3.2.0 API ===\n');
  
  const client = new ZepClient({ apiKey: process.env.ZEP_API_KEY });
  const userId = 'fibreflow_dev';
  
  try {
    // Test user API
    console.log('1. Testing User API...');
    console.log('User methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(client.user)));
    
    try {
      const user = await client.user.get(userId);
      console.log('✅ User exists:', user.userId);
    } catch (e) {
      console.log('❌ User not found:', e.message);
    }
    
    // Test graph API
    console.log('\n2. Testing Graph API...');
    console.log('Graph methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(client.graph)));
    
    try {
      const results = await client.graph.search({
        query: 'test',
        userId: userId,
        limit: 5
      });
      console.log('✅ Graph search works, results:', results?.results?.length || 0);
    } catch (e) {
      console.log('❌ Graph search failed:', e.message);
      console.log('Status:', e.status || e.statusCode);
    }
    
  } catch (error) {
    console.error('Main error:', error.message);
  }
}

testZepV3API();