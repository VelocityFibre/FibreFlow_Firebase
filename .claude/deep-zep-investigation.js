require('dotenv').config({ path: '.env' });
const { ZepClient } = require('@getzep/zep-cloud');

async function deepInvestigation() {
  console.log('=== Deep Zep Cloud Investigation ===\n');
  
  const zep = new ZepClient({ apiKey: process.env.ZEP_API_KEY });
  
  // Let's examine the ZepClient methods more carefully
  console.log('=== Available APIs ===');
  console.log('User methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(zep.user)));
  console.log('Memory methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(zep.memory)));
  console.log('Graph methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(zep.graph)));
  
  // Test if the issue is with our API usage
  console.log('\n=== Testing Memory API Pattern ===');
  
  const testSessionId = `debug_test_${Date.now()}`;
  const userId = 'fibreflow_dev';
  
  try {
    // Method 1: Try without creating session first
    console.log('\n1. Testing direct memory.add without session creation...');
    try {
      await zep.memory.add(testSessionId, {
        messages: [{
          roleType: 'user',
          content: 'Direct add test message'
        }]
      });
      console.log('✅ Direct add succeeded');
      
      // Immediately check
      const messages = await zep.memory.getSessionMessages({ sessionId: testSessionId });
      console.log('Messages found:', messages?.messages?.length || 0);
      
    } catch (e) {
      console.log('❌ Direct add failed:', e.message);
    }
    
    // Method 2: Try the "correct" pattern from docs
    console.log('\n2. Testing proper session creation pattern...');
    const newSessionId = `proper_test_${Date.now()}`;
    
    // Create session with proper parameters
    const sessionResponse = await zep.memory.addSession({
      sessionId: newSessionId,
      userId: userId
    });
    console.log('Session response:', sessionResponse);
    
    // Add memory with proper structure
    const memoryResponse = await zep.memory.add(newSessionId, {
      messages: [{
        roleType: 'user',
        content: 'Test message with proper pattern',
        metadata: {
          timestamp: new Date().toISOString()
        }
      }]
    });
    console.log('Memory response:', memoryResponse);
    
    // Wait a moment for processing
    console.log('Waiting 2 seconds for processing...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Try to retrieve
    const retrieved = await zep.memory.getSessionMessages({ sessionId: newSessionId });
    console.log('Retrieved messages:', retrieved?.messages?.length || 0);
    
    if (retrieved?.messages?.length > 0) {
      console.log('✅ SUCCESS! Memory was persisted');
      console.log('Message content:', retrieved.messages[0].content);
    } else {
      console.log('❌ Still no persistence');
    }
    
    // Method 3: Check if we can retrieve session metadata
    console.log('\n3. Testing session metadata retrieval...');
    try {
      const sessionMeta = await zep.memory.getSession({ sessionId: newSessionId });
      console.log('✅ Session metadata found:', sessionMeta);
    } catch (e) {
      console.log('❌ Session metadata not found:', e.message);
    }
    
  } catch (error) {
    console.log('❌ Investigation error:', error.message);
    if (error.response) {
      console.log('Response status:', error.response.status);
      console.log('Response data:', error.response.data);
    }
  }
}

deepInvestigation();