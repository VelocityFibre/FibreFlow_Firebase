#!/usr/bin/env node

const { ZepClient } = require('@getzep/zep-cloud');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function testMemoryContext() {
  const zep = new ZepClient({ 
    apiKey: process.env.ZEP_API_KEY 
  });
  
  try {
    // Use the session we just created
    const sessionId = 'fibreflow_memory_system_1753365008495';
    
    console.log('Testing memory context retrieval...\n');
    
    // Try to get memory context instead of raw messages
    console.log('1. Getting memory context...');
    try {
      const memory = await zep.memory.get({ sessionId });
      console.log('✅ Memory context retrieved');
      console.log('Memory:', JSON.stringify(memory, null, 2));
    } catch (e) {
      console.log('❌ Memory context failed:', e.message);
    }
    
    // Try searching for our content
    console.log('\n2. Searching for our content...');
    try {
      const searchResults = await zep.memory.search({
        text: 'FibreFlow',
        userId: 'fibreflow_dev',
        limit: 10
      });
      console.log('✅ Search completed');
      console.log('Results:', JSON.stringify(searchResults, null, 2));
    } catch (e) {
      console.log('❌ Search failed:', e.message);
    }
    
    // Let's also try getting all sessions again with user.getSessions
    console.log('\n3. Checking all user sessions...');
    const sessions = await zep.user.getSessions('fibreflow_dev');
    console.log(`Found ${sessions.sessions?.length || 0} sessions total`);
    
    if (sessions.sessions && sessions.sessions.length > 0) {
      for (let i = 0; i < Math.min(3, sessions.sessions.length); i++) {
        const session = sessions.sessions[i];
        console.log(`\nSession ${i + 1}: ${session.sessionId}`);
        console.log(`Created: ${session.createdAt}`);
        
        // Try to get messages for each session
        try {
          const msgs = await zep.memory.getSessionMessages({ sessionId: session.sessionId });
          console.log(`Messages: ${msgs.messages?.length || 0}`);
        } catch (e) {
          console.log(`Error getting messages: ${e.message}`);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testMemoryContext();