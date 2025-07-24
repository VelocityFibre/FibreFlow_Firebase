#!/usr/bin/env node

const { ZepClient } = require('@getzep/zep-cloud');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function verifySessions() {
  const zep = new ZepClient({ 
    apiKey: process.env.ZEP_API_KEY 
  });
  
  try {
    // List all sessions for user
    console.log('Checking all sessions for user fibreflow_dev...\n');
    
    const sessions = await zep.user.getSessions('fibreflow_dev');
    console.log(`Found ${sessions.sessions?.length || 0} sessions:`);
    
    if (sessions.sessions && sessions.sessions.length > 0) {
      for (const session of sessions.sessions) {
        console.log(`\nSession: ${session.sessionId}`);
        console.log(`Created: ${session.createdAt}`);
        console.log(`Metadata:`, session.metadata);
        
        // Get messages for this session
        try {
          const messages = await zep.memory.getSessionMessages({ sessionId: session.sessionId });
          console.log(`Messages: ${messages.messages?.length || 0}`);
          
          if (messages.messages && messages.messages.length > 0) {
            console.log('First message preview:', messages.messages[0].content?.substring(0, 100) + '...');
          }
        } catch (e) {
          console.log('Error getting messages:', e.message);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

verifySessions();