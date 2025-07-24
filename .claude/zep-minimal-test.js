#!/usr/bin/env node

const { ZepClient } = require('@getzep/zep-cloud');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function minimalTest() {
  const zep = new ZepClient({ 
    apiKey: process.env.ZEP_API_KEY 
  });
  
  try {
    // Test 1: Can we get the user?
    console.log('1. Testing user retrieval...');
    const user = await zep.user.get('fibreflow_dev');
    console.log('✅ User exists:', user.userId);
    
    // Test 2: Create a fresh session
    const sessionId = `test_${Date.now()}`;
    console.log('\n2. Creating session:', sessionId);
    await zep.memory.addSession({
      sessionId: sessionId,
      userId: 'fibreflow_dev'
    });
    console.log('✅ Session created');
    
    // Test 3: Try the exact format from Zep docs
    console.log('\n3. Adding message...');
    
    // Most minimal format possible
    const addResult = await zep.memory.add({
      sessionId: sessionId,
      messages: [{
        content: "Test message",
        roleType: "user"
      }]
    });
    
    console.log('✅ Add result:', addResult);
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('Error type:', error.constructor.name);
    
    // Log the full error object
    console.error('\nFull error object:');
    console.log(JSON.stringify(error, null, 2));
  }
}

minimalTest();