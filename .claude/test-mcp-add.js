#!/usr/bin/env node

const { ZepClient } = require('@getzep/zep-cloud');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function addMemoryDirectly() {
  const apiKey = process.env.ZEP_API_KEY;
  const zep = new ZepClient({ apiKey });
  const userId = 'fibreflow_dev';
  const projectId = 'fibreflow';
  
  try {
    // Create session for facts if doesn't exist
    const sessionId = `${projectId}_facts_fibreflow-features`;
    
    console.log('Using existing session:', sessionId);
    
    // Add the memory
    console.log('Adding memory to session...');
    const messages = [{
      content: "FibreFlow has an integrated memory system using Zep Cloud for temporal knowledge graphs. Memory updates are MANUAL, not automatic. Developers must explicitly prompt Claude with phrases like 'Add to memory', 'Remember this', or 'Save fact'. The system supports three types: facts (project knowledge), patterns (dev practices), and episodes (problem-solution pairs). Full documentation in CLAUDE.md section 'MEMORY SYSTEM - TEMPORAL KNOWLEDGE GRAPHS'.",
      role_type: 'assistant',
      metadata: {
        type: 'fact',
        category: 'fibreflow-features',
        timestamp: new Date().toISOString(),
        source: 'manual_mcp_equivalent'
      }
    }];
    
    await zep.memory.add({ sessionId, messages });
    console.log('✅ Successfully added memory to Zep Cloud!');
    
    // Verify it was added
    console.log('\nVerifying memory was saved...');
    const sessionMessages = await zep.memory.getSessionMessages({ sessionId });
    console.log(`Found ${sessionMessages.messages?.length || 0} messages in session`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response?.data) {
      console.error('Details:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

addMemoryDirectly();