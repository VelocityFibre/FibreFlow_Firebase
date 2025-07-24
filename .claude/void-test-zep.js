#!/usr/bin/env node

const { ZepClient } = require('@getzep/zep-cloud');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function testVoidReturn() {
  const apiKey = process.env.ZEP_API_KEY;
  const zep = new ZepClient({ apiKey });
  const userId = 'fibreflow_dev';
  
  try {
    // Use existing session
    const sessionId = 'fibreflow_facts_fibreflow-features';
    
    console.log('Adding to existing session:', sessionId);
    
    // Don't expect a return value - it might be void
    await zep.memory.add({
      sessionId: sessionId,
      messages: [{
        content: 'FibreFlow Memory System: Integrated with Zep Cloud for temporal knowledge graphs. Manual updates via prompts like "Add to memory". Supports facts, patterns, and episodes. Documented in CLAUDE.md.',
        roleType: 'system'
      }]
    });
    
    // If we get here without error, it worked!
    console.log('✅ Memory added successfully (no error thrown)');
    
    // Verify by getting messages
    console.log('\nVerifying by retrieving messages...');
    const messages = await zep.memory.getSessionMessages({ sessionId });
    console.log(`Session has ${messages.messages?.length || 0} messages`);
    
    if (messages.messages && messages.messages.length > 0) {
      const latest = messages.messages[messages.messages.length - 1];
      console.log('\nLatest message:');
      console.log('- Content:', latest.content.substring(0, 100) + '...');
      console.log('- Role:', latest.roleType);
      console.log('- Created:', latest.createdAt);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Type:', error.constructor.name);
    if (error.body) {
      console.error('Body:', error.body);
    }
  }
}

testVoidReturn();