require('dotenv').config({ path: '.env' });
const { ZepClient } = require('@getzep/zep-cloud');

async function checkAccount() {
  console.log('=== Zep Account Status Check ===\n');
  
  const zep = new ZepClient({ apiKey: process.env.ZEP_API_KEY });
  
  console.log('API Key info:');
  console.log('- Length:', process.env.ZEP_API_KEY.length);
  console.log('- Format:', process.env.ZEP_API_KEY.includes('.') ? 'JWT-like' : 'Unknown');
  
  // Decode JWT-like API key to see metadata
  if (process.env.ZEP_API_KEY.includes('.')) {
    try {
      const parts = process.env.ZEP_API_KEY.split('.');
      if (parts.length >= 2) {
        const payload = Buffer.from(parts[1], 'base64').toString('utf8');
        console.log('\nAPI Key payload:');
        console.log(JSON.parse(payload));
      }
    } catch (e) {
      console.log('Could not decode API key');
    }
  }
  
  // Test different operations to understand limits
  console.log('\n=== Testing Operations ===');
  
  // Test user operations
  try {
    const user = await zep.user.get('fibreflow_dev');
    console.log('\n✅ User API works');
    console.log('- Session count:', user.sessionCount);
    console.log('- Created:', user.createdAt);
    console.log('- UUID:', user.uuid);
  } catch (e) {
    console.log('❌ User API failed:', e.message);
  }
  
  // Check if we can list any existing sessions
  console.log('\n=== Memory Persistence Check ===');
  console.log('Note: The session count shows 27 sessions exist, but:');
  console.log('- memory.getSession returns 404 for all sessions');
  console.log('- graph.search returns 0 results');
  console.log('- New sessions appear to create but don\'t persist');
  console.log('\nThis suggests:');
  console.log('1. The account might be in a limited/trial state');
  console.log('2. Memory storage might be disabled');
  console.log('3. There might be a data retention issue');
}

checkAccount();