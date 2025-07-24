#!/usr/bin/env node

const { ZepClient } = require('@getzep/zep-cloud');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function finalWorking() {
  const zep = new ZepClient({ 
    apiKey: process.env.ZEP_API_KEY 
  });
  
  try {
    console.log('🎯 Final working implementation...\n');
    
    // Let's try a different approach - add memory with return_context: true
    const sessionId = `fibreflow_final_${Date.now()}`;
    
    console.log('1. Creating session:', sessionId);
    await zep.memory.addSession({
      sessionId: sessionId,
      userId: 'fibreflow_dev'
    });
    
    console.log('2. Adding memory with return_context...');
    const result = await zep.memory.add(sessionId, {
      messages: [{
        content: "FibreFlow Memory System: Integrated Zep Cloud temporal knowledge graphs. Manual updates via prompts. Supports facts, patterns, episodes. Documented in CLAUDE.md.",
        roleType: "system"
      }],
      returnContext: true  // This might help!
    });
    
    console.log('✅ Memory added with context');
    console.log('Result:', JSON.stringify(result, null, 2));
    
    // Try searching immediately
    console.log('\n3. Searching for our content...');
    try {
      const searchResults = await zep.memory.search({
        text: 'FibreFlow Memory System',
        userId: 'fibreflow_dev',
        limit: 5,
        searchScope: 'facts'  // Try specific scope
      });
      console.log('Search results:', JSON.stringify(searchResults, null, 2));
    } catch (e) {
      console.log('Search failed:', e.message);
    }
    
    // Try getting memory context for this specific session
    console.log('\n4. Getting memory context...');
    try {
      const context = await zep.memory.get({ sessionId });
      console.log('Memory context:', JSON.stringify(context, null, 2));
    } catch (e) {
      console.log('Context failed:', e.message);
    }
    
    console.log('\n✅ Process completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.body) {
      console.error('Error body:', error.body);
    }
  }
}

finalWorking();