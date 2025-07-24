#!/usr/bin/env node

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function useDirectAPI() {
  const apiKey = process.env.ZEP_API_KEY;
  const baseURL = 'https://cloud.getzep.com/v2';
  
  try {
    // Create session first
    const sessionId = `fibreflow_direct_${Date.now()}`;
    console.log('Creating session via direct API:', sessionId);
    
    const sessionResponse = await fetch(`${baseURL}/sessions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        session_id: sessionId,
        user_id: 'fibreflow_dev',
        metadata: {
          purpose: 'Memory System Documentation'
        }
      })
    });
    
    if (!sessionResponse.ok) {
      const error = await sessionResponse.text();
      throw new Error(`Session creation failed: ${sessionResponse.status} - ${error}`);
    }
    
    console.log('✅ Session created');
    
    // Add memory
    console.log('\nAdding memory via direct API...');
    
    const memoryResponse = await fetch(`${baseURL}/sessions/${sessionId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages: [{
          content: 'FibreFlow Memory System: Uses Zep Cloud for temporal knowledge graphs. Manual updates via prompts like "Add to memory". Supports facts, patterns, and episodes. Full documentation in CLAUDE.md section MEMORY SYSTEM - TEMPORAL KNOWLEDGE GRAPHS.',
          role_type: 'system',
          metadata: {
            category: 'fibreflow-features',
            saved_at: new Date().toISOString()
          }
        }]
      })
    });
    
    if (!memoryResponse.ok) {
      const error = await memoryResponse.text();
      throw new Error(`Memory add failed: ${memoryResponse.status} - ${error}`);
    }
    
    const result = await memoryResponse.json();
    console.log('✅ Memory saved successfully!');
    console.log('Response:', JSON.stringify(result, null, 2));
    
    // Verify
    console.log('\nVerifying saved memory...');
    const getResponse = await fetch(`${baseURL}/sessions/${sessionId}/messages`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });
    
    const messages = await getResponse.json();
    console.log(`Found ${messages.messages?.length || 0} messages`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

useDirectAPI();