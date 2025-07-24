#!/usr/bin/env node

const { ZepClient } = require('@getzep/zep-cloud');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function completeWorkingExample() {
  const zep = new ZepClient({ 
    apiKey: process.env.ZEP_API_KEY 
  });
  
  const userId = 'fibreflow_dev';
  const sessionId = `fibreflow_memory_system_${Date.now()}`;
  
  try {
    console.log('🚀 Creating complete working example...\n');
    
    // Step 1: Create session
    console.log('1. Creating session:', sessionId);
    await zep.memory.addSession({
      sessionId: sessionId,
      userId: userId,
      metadata: {
        purpose: 'FibreFlow Memory System Documentation',
        category: 'system-features'
      }
    });
    console.log('✅ Session created');
    
    // Step 2: Add memory using CORRECT method signature
    console.log('\n2. Adding memory to session...');
    const addResult = await zep.memory.add(sessionId, {
      messages: [{
        content: "FibreFlow Memory System: FibreFlow has an integrated memory system using Zep Cloud for temporal knowledge graphs. Memory updates are MANUAL, not automatic. Developers must explicitly prompt Claude with phrases like 'Add to memory', 'Remember this', or 'Save fact'. The system supports three types: facts (project knowledge), patterns (development practices), and episodes (problem-solution pairs). Full documentation is in CLAUDE.md section 'MEMORY SYSTEM - TEMPORAL KNOWLEDGE GRAPHS'. System setup completed on 2025-07-24.",
        roleType: "system",
        metadata: {
          category: 'fibreflow-features',
          type: 'system-documentation',
          timestamp: new Date().toISOString()
        }
      }]
    });
    console.log('✅ Memory added successfully');
    console.log('Add result:', addResult);
    
    // Step 3: Verify the memory was saved
    console.log('\n3. Verifying memory was saved...');
    const messages = await zep.memory.getSessionMessages({ sessionId });
    console.log(`Found ${messages.messages?.length || 0} messages in session`);
    
    if (messages.messages && messages.messages.length > 0) {
      console.log('\n📝 Message content preview:');
      console.log(messages.messages[0].content.substring(0, 200) + '...');
      console.log('\n📊 Message metadata:');
      console.log(JSON.stringify(messages.messages[0].metadata, null, 2));
    }
    
    console.log('\n🎉 SUCCESS! FibreFlow memory system info saved to Zep Cloud!');
    console.log(`Session ID: ${sessionId}`);
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.body) {
      console.error('Error details:', error.body);
    }
  }
}

completeWorkingExample();