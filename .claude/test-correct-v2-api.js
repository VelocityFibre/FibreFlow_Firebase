require('dotenv').config({ path: '.env' });
const { ZepClient } = require('@getzep/zep-cloud');

async function testCorrectAPI() {
  console.log('=== Testing Correct v2.21.0 API ===\n');
  
  const zep = new ZepClient({ apiKey: process.env.ZEP_API_KEY });
  
  // Check what memory.extract actually does
  console.log('1. Testing memory.extract...');
  try {
    const result = await zep.memory.extract({
      sessionId: 'test_session',
      lastN: 10
    });
    console.log('Extract result:', result);
  } catch (e) {
    console.log('Extract failed:', e.message);
  }
  
  // Check user.getSessions - this might be the way to access memories
  console.log('\n2. Testing user.getSessions...');
  try {
    const sessions = await zep.user.getSessions('fibreflow_dev');
    console.log('User sessions:', sessions);
    
    if (sessions && sessions.length > 0) {
      console.log('✅ Found sessions!');
      console.log('Session count:', sessions.length);
      console.log('First session:', sessions[0]);
    }
  } catch (e) {
    console.log('getSessions failed:', e.message);
  }
  
  // Check if there's a different way to add memories
  console.log('\n3. Looking for other memory methods...');
  const memoryProto = Object.getPrototypeOf(zep.memory);
  Object.getOwnPropertyNames(memoryProto).forEach(method => {
    if (typeof memoryProto[method] === 'function' && method !== 'constructor') {
      console.log(`Available method: memory.${method}`);
    }
  });
  
  // The API might have changed completely - let's see what user methods can do
  console.log('\n4. Testing user.getFacts...');
  try {
    const facts = await zep.user.getFacts('fibreflow_dev');
    console.log('User facts:', facts);
  } catch (e) {
    console.log('getFacts failed:', e.message);
  }
}

testCorrectAPI();