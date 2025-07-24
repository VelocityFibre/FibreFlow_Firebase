#!/usr/bin/env node

const { ZepClient } = require('@getzep/zep-cloud');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function debugUser() {
  const zep = new ZepClient({ 
    apiKey: process.env.ZEP_API_KEY 
  });
  
  try {
    console.log('🔍 Debugging user and sessions...\n');
    
    // Check if user exists
    console.log('1. Checking user...');
    const user = await zep.user.get('fibreflow_dev');
    console.log('✅ User found:', JSON.stringify(user, null, 2));
    
    // Create a new test session with minimal metadata
    console.log('\n2. Creating minimal session...');
    const testSessionId = `debug_${Date.now()}`;
    
    const sessionResult = await zep.memory.addSession({
      sessionId: testSessionId,
      userId: 'fibreflow_dev'
      // No metadata - keep it minimal
    });
    
    console.log('✅ Session creation result:', sessionResult);
    
    // Immediately check if the session appears
    console.log('\n3. Checking sessions immediately after creation...');
    const sessions = await zep.user.getSessions('fibreflow_dev');
    console.log(`Found ${sessions.sessions?.length || 0} sessions`);
    
    if (sessions.sessions && sessions.sessions.length > 0) {
      sessions.sessions.forEach(s => {
        console.log(`- ${s.sessionId} (created: ${s.createdAt})`);
      });
      
      // Try adding a message to the newest session
      console.log('\n4. Adding message to latest session...');
      const latestSession = sessions.sessions[0];
      
      await zep.memory.add(latestSession.sessionId, {
        messages: [{
          content: "Test message",
          roleType: "user"
        }]
      });
      
      console.log('✅ Message added');
      
      // Check if messages appear now
      console.log('\n5. Checking messages...');
      const messages = await zep.memory.getSessionMessages({ sessionId: latestSession.sessionId });
      console.log(`Messages found: ${messages.messages?.length || 0}`);
      
      if (messages.messages && messages.messages.length > 0) {
        console.log('First message:', messages.messages[0].content);
      }
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.body) {
      console.error('Error body:', error.body);
    }
  }
}

debugUser();