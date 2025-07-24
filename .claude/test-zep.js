#!/usr/bin/env node

const { ZepClient } = require('@getzep/zep-cloud');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const apiKey = process.env.ZEP_API_KEY;
const zep = new ZepClient({ apiKey });
const userId = 'fibreflow_dev';

async function test() {
  console.log('Testing Zep Cloud API...\n');
  
  try {
    // 1. Get user
    console.log('1. Getting user...');
    const user = await zep.user.get(userId);
    console.log('User found:', user.userId);
    
    // 2. List sessions
    console.log('\n2. Listing sessions...');
    try {
      const sessions = await zep.user.getSessions(userId);
      console.log('Sessions:', sessions.sessions?.length || 0);
      if (sessions.sessions) {
        sessions.sessions.forEach(s => console.log('  -', s.sessionId));
      }
    } catch (e) {
      console.log('Error listing sessions:', e.message);
    }
    
    // 3. Create a test session
    const testSessionId = `fibreflow_test_${Date.now()}`;
    console.log('\n3. Creating test session:', testSessionId);
    await zep.memory.addSession({
      sessionId: testSessionId,
      userId: userId,
      metadata: {
        type: 'test'
      }
    });
    console.log('Session created');
    
    // 4. Add a message
    console.log('\n4. Adding message to session...');
    await zep.memory.add({
      sessionId: testSessionId,
      messages: [{
        roleType: 'user',
        content: 'This is a test message'
      }]
    });
    console.log('Message added');
    
    // 5. Get session messages
    console.log('\n5. Getting session messages...');
    const messages = await zep.memory.getSessionMessages({ 
      sessionId: testSessionId 
    });
    console.log('Messages:', messages.messages?.length || 0);
    
    // 6. Search (using memory context)
    console.log('\n6. Getting memory context...');
    try {
      const context = await zep.memory.get({
        sessionId: testSessionId
      });
      console.log('Context retrieved');
      if (context.facts) {
        console.log('Facts:', context.facts.length);
      }
    } catch (e) {
      console.log('Error getting context:', e.message);
    }
    
    // 7. Delete test session
    console.log('\n7. Cleaning up test session...');
    await zep.memory.deleteSession({ sessionId: testSessionId });
    console.log('Test session deleted');
    
    console.log('\n✅ All tests passed!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.body) {
      console.error('Details:', error.body);
    }
  }
}

test();