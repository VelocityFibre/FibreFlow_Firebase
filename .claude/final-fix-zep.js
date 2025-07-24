#!/usr/bin/env node

const { ZepClient, RoleType } = require('@getzep/zep-cloud');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function saveWithEnum() {
  const apiKey = process.env.ZEP_API_KEY;
  const zep = new ZepClient({ apiKey });
  
  try {
    // Check if RoleType is available
    console.log('Available RoleTypes:', RoleType);
    
    // Create a clean new session
    const timestamp = Date.now();
    const sessionId = `fibreflow_system_${timestamp}`;
    
    console.log(`\nCreating session: ${sessionId}`);
    await zep.memory.addSession({
      sessionId: sessionId,
      userId: 'fibreflow_dev',
      metadata: {
        purpose: 'FibreFlow Memory System Documentation'
      }
    });
    
    console.log('Session created');
    
    // Try with the enum value
    console.log('\nAdding memory with RoleType.SystemRole...');
    
    const message = {
      content: 'FibreFlow has a memory system using Zep Cloud. Updates are MANUAL via prompts. Supports facts, patterns, episodes. Docs in CLAUDE.md.',
      roleType: RoleType?.SystemRole || 'system',
      metadata: {
        saved_at: new Date().toISOString()
      }
    };
    
    console.log('Message object:', JSON.stringify(message, null, 2));
    
    await zep.memory.add({
      sessionId: sessionId,
      messages: [message]
    });
    
    console.log('✅ Success! Memory saved to Zep Cloud');
    console.log(`Session ID: ${sessionId}`);
    
  } catch (error) {
    console.error('\n❌ Error details:');
    console.error('Message:', error.message);
    console.error('Name:', error.name);
    
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    
    if (error.cause) {
      console.error('Cause:', error.cause);
    }
  }
}

saveWithEnum();