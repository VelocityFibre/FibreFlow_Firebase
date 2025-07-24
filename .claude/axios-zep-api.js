#!/usr/bin/env node

const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function saveViaAxios() {
  const apiKey = process.env.ZEP_API_KEY;
  const baseURL = 'https://api.getzep.com/api/v2';
  
  const api = axios.create({
    baseURL,
    headers: {
      'Authorization': apiKey,
      'Content-Type': 'application/json'
    }
  });
  
  try {
    // Use the existing session we know works
    const sessionId = 'fibreflow_facts_fibreflow-features';
    
    console.log('Adding memory to existing session:', sessionId);
    
    // Add memory
    const response = await api.post(`/sessions/${sessionId}/messages`, {
      messages: [{
        content: 'FibreFlow Memory System Documentation: FibreFlow uses Zep Cloud for temporal knowledge graphs. Memory updates are MANUAL - developers must prompt Claude with phrases like "Add to memory", "Remember this", or "Save fact". The system supports three types: facts (project knowledge), patterns (development practices), and episodes (problem-solution pairs). Full documentation is in CLAUDE.md section "MEMORY SYSTEM - TEMPORAL KNOWLEDGE GRAPHS". Setup completed on 2025-07-24.',
        role_type: 'system',
        metadata: {
          category: 'fibreflow-features',
          type: 'system-documentation',
          saved_via: 'direct-api',
          timestamp: new Date().toISOString()
        }
      }]
    });
    
    console.log('✅ Memory saved successfully to Zep Cloud!');
    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(response.data, null, 2));
    
    // Verify it was saved
    console.log('\nVerifying saved memory...');
    const getResponse = await api.get(`/sessions/${sessionId}/messages`);
    console.log(`Session has ${getResponse.data.messages?.length || 0} messages`);
    
    if (getResponse.data.messages && getResponse.data.messages.length > 0) {
      const latest = getResponse.data.messages[getResponse.data.messages.length - 1];
      console.log('\nLatest message preview:');
      console.log(latest.content.substring(0, 150) + '...');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

saveViaAxios();