#!/usr/bin/env node

const { ZepClient } = require('@getzep/zep-cloud');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function debugAPI() {
  const apiKey = process.env.ZEP_API_KEY;
  const zep = new ZepClient({ apiKey });
  
  try {
    // Test 1: Get user
    console.log('1. Testing user API...');
    const user = await zep.user.get('fibreflow_dev');
    console.log('✅ User found:', user.userId);
    
    // Test 2: List sessions for user
    console.log('\n2. Testing sessions API...');
    const sessions = await zep.user.getSessions('fibreflow_dev');
    console.log('✅ Sessions found:', sessions.sessions?.length || 0);
    
    // Test 3: Create a minimal session
    console.log('\n3. Testing session creation...');
    const testSessionId = `test_${Date.now()}`;
    await zep.memory.addSession({
      sessionId: testSessionId,
      userId: 'fibreflow_dev'
    });
    console.log('✅ Session created:', testSessionId);
    
    // Test 4: Try different message formats
    console.log('\n4. Testing message formats...');
    
    // Format A: Minimal
    try {
      console.log('  A. Minimal format...');
      await zep.memory.add({
        sessionId: testSessionId,
        messages: [{
          content: 'Test message A'
        }]
      });
      console.log('  ✅ Format A works!');
    } catch (e) {
      console.log('  ❌ Format A failed:', e.message);
    }
    
    // Format B: With role_type
    try {
      console.log('  B. With role_type...');
      await zep.memory.add({
        sessionId: testSessionId,
        messages: [{
          content: 'Test message B',
          role_type: 'user'
        }]
      });
      console.log('  ✅ Format B works!');
    } catch (e) {
      console.log('  ❌ Format B failed:', e.message);
    }
    
    // Format C: With roleType
    try {
      console.log('  C. With roleType...');
      await zep.memory.add({
        sessionId: testSessionId,
        messages: [{
          content: 'Test message C',
          roleType: 'user'
        }]
      });
      console.log('  ✅ Format C works!');
    } catch (e) {
      console.log('  ❌ Format C failed:', e.message);
    }
    
    // Test 5: Check what's actually in the messages
    console.log('\n5. Checking stored messages...');
    const storedMessages = await zep.memory.getSessionMessages({ sessionId: testSessionId });
    console.log('Messages:', JSON.stringify(storedMessages, null, 2));
    
    // Cleanup
    console.log('\n6. Cleaning up test session...');
    await zep.memory.deleteSession({ sessionId: testSessionId });
    console.log('✅ Test session deleted');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    if (error.stack) {
      console.error('Stack:', error.stack);
    }
  }
}

debugAPI();