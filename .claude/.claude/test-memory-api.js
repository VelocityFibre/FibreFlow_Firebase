require('dotenv').config({ path: '../.env' });
const { ZepClient } = require('@getzep/zep-cloud');

async function testMemoryAPI() {
  console.log('=== Testing Zep Memory API (v3.2.0) ===\n');
  
  const client = new ZepClient({ apiKey: process.env.ZEP_API_KEY });
  const userId = 'fibreflow_dev';
  
  // The API seems to have changed - let's check what methods are available
  console.log('Available client properties:');
  console.log(Object.getOwnPropertyNames(client).filter(prop => typeof client[prop] === 'object'));
  
  // Check what's actually available on the client
  const apis = ['user', 'graph', 'memory', 'session', 'sessions'];
  apis.forEach(api => {
    if (client[api]) {
      console.log(`✅ ${api} API available`);
      console.log(`   Methods:`, Object.getOwnPropertyNames(Object.getPrototypeOf(client[api])));
    } else {
      console.log(`❌ ${api} API not available`);
    }
  });
  
  // Try to search the graph to see if we can find existing memories
  try {
    console.log('\n=== Graph Search Test ===');
    const results = await client.graph.search({
      query: '*',
      userId: userId,
      limit: 10
    });
    console.log('✅ Graph search successful');
    console.log('Results found:', results?.results?.length || 0);
    
    if (results?.results && results.results.length > 0) {
      console.log('\nFirst result:');
      console.log(JSON.stringify(results.results[0], null, 2));
    }
    
  } catch (error) {
    console.log('❌ Graph search failed:', error.message);
  }
}

testMemoryAPI();