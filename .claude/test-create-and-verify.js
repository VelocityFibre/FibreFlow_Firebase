require('dotenv').config({ path: '.env' });
const { ZepClient } = require('@getzep/zep-cloud');

async function createAndVerify() {
  console.log('=== Create and Immediately Verify Memory ===\n');
  
  const zep = new ZepClient({ apiKey: process.env.ZEP_API_KEY });
  const userId = 'fibreflow_dev';
  const testSessionId = `test_session_${Date.now()}`;
  
  try {
    // Step 1: Create session
    console.log('1. Creating session:', testSessionId);
    const sessionData = {
      sessionId: testSessionId,
      userId: userId,
      metadata: {
        type: 'test',
        created: new Date().toISOString()
      }
    };
    
    await zep.memory.addSession(sessionData);
    console.log('✅ Session created');
    
    // Step 2: Add memory
    console.log('\n2. Adding memory to session...');
    const messageData = {
      messages: [{
        roleType: 'user',
        content: 'This is a test message to verify memory persistence'
      }]
    };
    
    await zep.memory.add(testSessionId, messageData);
    console.log('✅ Memory added');
    
    // Step 3: Immediately retrieve
    console.log('\n3. Retrieving memory...');
    const retrieved = await zep.memory.getSessionMessages({ sessionId: testSessionId });
    
    if (retrieved && retrieved.messages && retrieved.messages.length > 0) {
      console.log('✅ Memory successfully retrieved!');
      console.log('Messages:', retrieved.messages.length);
      console.log('Content:', retrieved.messages[0].content);
    } else {
      console.log('❌ No messages retrieved');
    }
    
    // Step 4: Check session
    console.log('\n4. Checking session exists...');
    const session = await zep.memory.getSession({ sessionId: testSessionId });
    console.log('✅ Session exists:', session.sessionId);
    
  } catch (error) {
    console.log('❌ Error:', error.message);
    if (error.response?.data) {
      console.log('Response:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

createAndVerify();