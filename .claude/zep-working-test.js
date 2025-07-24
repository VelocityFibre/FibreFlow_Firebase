#!/usr/bin/env node

const { ZepClient } = require('@getzep/zep-cloud');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function workingTest() {
  const zep = new ZepClient({ 
    apiKey: process.env.ZEP_API_KEY 
  });
  
  try {
    // Use the CORRECT method signature!
    const sessionId = 'fibreflow_facts_fibreflow-features';
    
    console.log('Adding to session:', sessionId);
    
    // CORRECT: sessionId is first parameter, not in the object!
    const result = await zep.memory.add(sessionId, {
      messages: [{
        content: "FibreFlow Memory System: Uses Zep Cloud for temporal knowledge graphs. Manual updates via prompts like 'Add to memory', 'Remember this', or 'Save fact'. The system supports three types: facts (project knowledge), patterns (development practices), and episodes (problem-solution pairs). Full documentation in CLAUDE.md section MEMORY SYSTEM - TEMPORAL KNOWLEDGE GRAPHS.",
        roleType: "system"
      }]
    });
    
    console.log('✅ Success! Memory added to Zep Cloud');
    console.log('Result:', result);
    
    // Verify it was saved
    console.log('\nVerifying...');
    const messages = await zep.memory.getSessionMessages({ sessionId });
    console.log(`Session now has ${messages.messages?.length || 0} messages`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

workingTest();