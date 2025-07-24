#!/usr/bin/env node

const { ZepClient } = require('@getzep/zep-cloud');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function saveZepStatus() {
  const zep = new ZepClient({ 
    apiKey: process.env.ZEP_API_KEY 
  });
  
  const userId = 'fibreflow_dev';
  const sessionId = `fibreflow_zep_integration_complete_${Date.now()}`;
  
  try {
    console.log('💾 Saving Zep integration status to memory...\n');
    
    // Create session
    console.log('1. Creating session:', sessionId);
    await zep.memory.addSession({
      sessionId: sessionId,
      userId: userId,
      metadata: {
        purpose: 'Zep Integration Completion Status',
        category: 'system-integration',
        date: '2025-07-24'
      }
    });
    console.log('✅ Session created');
    
    // Add comprehensive memory about the integration
    console.log('\n2. Adding integration status memory...');
    const result = await zep.memory.add(sessionId, {
      messages: [{
        content: `ZEP CLOUD INTEGRATION COMPLETE - FibreFlow Memory System (2025-07-24)

INTEGRATION STATUS: ✅ SUCCESSFUL

KEY ACHIEVEMENTS:
• Fixed critical SDK method signature: zep.memory.add(sessionId, {messages}) ✅
• Updated zep-bridge.js with correct API calls throughout ✅  
• Verified memory addition works (returns empty {} but succeeds) ✅
• Created working CLI tools for manual memory management ✅
• Documented complete setup in CLAUDE.md ✅

TECHNICAL DETAILS:
• SDK Version: @getzep/zep-cloud (latest)
• API Key: Configured in .env file
• User ID: fibreflow_dev  
• Integration Method: CLI bridge + MCP server ready
• Memory Types: Facts, Patterns, Episodes supported

USAGE INSTRUCTIONS:
• Manual updates only - Claude must be prompted with "Add to memory"
• Use: node zep-bridge.js add-fact <category> <content>
• Search: node zep-bridge.js search <query>
• Full commands: node zep-bridge.js help

FILES CREATED:
• zep-bridge.js (CLI tool) ✅
• zep-mcp-bridge.js (MCP server) ✅  
• zep-complete-working.js (test suite) ✅
• setup-zep.sh (automated setup) ✅
• Updated CLAUDE.md with memory guidance ✅

INTEGRATION COMPLETE: FibreFlow now has working Zep Cloud temporal knowledge graphs!`,
        roleType: "system",
        metadata: {
          category: 'zep-integration',
          type: 'completion-status',
          timestamp: new Date().toISOString(),
          priority: 'high',
          status: 'complete'
        }
      }],
      returnContext: true
    });
    
    console.log('✅ Memory saved to Zep Cloud');
    console.log('Session ID:', sessionId);
    
    console.log('\n🎉 ZEP INTEGRATION COMPLETE!');
    console.log('FibreFlow memory system is now operational with Zep Cloud.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

saveZepStatus();