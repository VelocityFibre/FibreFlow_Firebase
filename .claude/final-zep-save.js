#!/usr/bin/env node

const { ZepClient } = require('@getzep/zep-cloud');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function saveMemorySystem() {
  const apiKey = process.env.ZEP_API_KEY;
  const zep = new ZepClient({ apiKey });
  const userId = 'fibreflow_dev';
  
  try {
    // Create a new session specifically for this memory
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
    
    // Add the memory content
    console.log('Adding memory content...');
    await zep.memory.add({
      sessionId: sessionId,
      messages: [{
        content: 'FibreFlow Memory System Documentation: FibreFlow has an integrated memory system using Zep Cloud for temporal knowledge graphs. Memory updates are MANUAL, not automatic. Developers must explicitly prompt Claude with phrases like \"Add to memory\", \"Remember this\", or \"Save fact\". The system supports three types: facts (project knowledge), patterns (dev practices), and episodes (problem-solution pairs). Full documentation is in CLAUDE.md section \"MEMORY SYSTEM - TEMPORAL KNOWLEDGE GRAPHS\". The system was set up on 2025-07-24 and includes both Zep Cloud integration and local JSON backup.',\n        role_type: 'system'\n      }]\n    });\n    \n    console.log('✅ Successfully saved FibreFlow memory system info to Zep Cloud!');\n    console.log('Session ID:', sessionId);\n    \n  } catch (error) {\n    console.error('❌ Failed to save:', error.message);\n    if (error.body) {\n      console.error('Error details:', JSON.stringify(error.body, null, 2));\n    }\n  }\n}\n\nsaveMemorySystem();