#!/usr/bin/env node

const { ZepClient } = require('@getzep/zep-cloud');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function saveToZep() {
  const apiKey = process.env.ZEP_API_KEY;
  const zep = new ZepClient({ apiKey });
  const userId = 'fibreflow_dev';
  
  try {
    // Create a session for this memory
    const sessionId = `fibreflow_memory_system_${Date.now()}`;
    
    console.log('Creating session:', sessionId);
    await zep.memory.addSession({
      sessionId: sessionId,
      userId: userId,
      metadata: {
        topic: 'FibreFlow Memory System',
        type: 'system_documentation'
      }
    });
    
    console.log('Session created successfully');
    
    // Add the memory with proper roleType
    console.log('Adding memory content...');
    const result = await zep.memory.add({
      sessionId: sessionId,
      messages: [{
        content: 'FibreFlow Memory System Documentation: FibreFlow has an integrated memory system using Zep Cloud for temporal knowledge graphs. Memory updates are MANUAL, not automatic. Developers must explicitly prompt Claude with phrases like "Add to memory", "Remember this", or "Save fact". The system supports three types: facts (project knowledge), patterns (dev practices), and episodes (problem-solution pairs). Full documentation is in CLAUDE.md section "MEMORY SYSTEM - TEMPORAL KNOWLEDGE GRAPHS". The system was set up on 2025-07-24 and includes both Zep Cloud integration and local JSON backup.',
        roleType: 'system',  // Required field with correct casing
        metadata: {
          category: 'fibreflow-features',
          type: 'documentation',
          timestamp: new Date().toISOString()
        }
      }]
    });
    
    console.log('✅ Successfully saved to Zep Cloud!');
    console.log('Session ID:', sessionId);
    
    // Verify it was saved
    console.log('\nVerifying saved memory...');
    const messages = await zep.memory.getSessionMessages({ sessionId });
    console.log(`Found ${messages.messages?.length || 0} messages`);
    if (messages.messages && messages.messages.length > 0) {
      console.log('First message preview:', messages.messages[0].content.substring(0, 100) + '...');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.body) {
      console.error('Error details:', JSON.stringify(error.body, null, 2));
    }
  }
}

saveToZep();