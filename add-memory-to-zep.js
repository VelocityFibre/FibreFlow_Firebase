#!/usr/bin/env node

const { ZepClient } = require('@getzep/zep-cloud');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.claude/.env') });

async function addMemory() {
  const apiKey = process.env.ZEP_API_KEY;
  if (!apiKey) {
    console.error('ZEP_API_KEY not found in .claude/.env');
    process.exit(1);
  }

  const zep = new ZepClient({ apiKey });
  const userId = 'fibreflow_dev';
  const projectId = 'fibreflow';
  
  // Memory to add
  const memoryType = 'fact';
  const category = 'fibreflow-features';
  const content = "FibreFlow has an integrated memory system using Zep Cloud for temporal knowledge graphs. Memory updates are MANUAL, not automatic. Developers must explicitly prompt Claude with phrases like 'Add to memory', 'Remember this', or 'Save fact'. The system supports three types: facts (project knowledge), patterns (dev practices), and episodes (problem-solution pairs). Full documentation in CLAUDE.md section 'MEMORY SYSTEM - TEMPORAL KNOWLEDGE GRAPHS'.";
  
  const sessionId = `${projectId}_facts_${category}`;
  
  try {
    await zep.memory.add(sessionId, {
      messages: [{
        role_type: 'system',
        content: content,
        metadata: {
          type: memoryType,
          category: category,
          timestamp: new Date().toISOString(),
          source: 'claude_direct',
          importance: 'high'
        }
      }],
      metadata: {
        user_id: userId,
        type: memoryType,
        category: category
      }
    });
    
    console.log('✅ Successfully added memory to Zep Cloud');
    console.log(`   Type: ${memoryType}`);
    console.log(`   Category: ${category}`);
    console.log(`   Session ID: ${sessionId}`);
    console.log(`   Content: ${content.substring(0, 100)}...`);
  } catch (error) {
    console.error('❌ Failed to add memory:', error.message);
    process.exit(1);
  }
}

addMemory().then(() => {
  console.log('\n✨ Memory operation complete');
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});