#!/usr/bin/env node

const { ZepClient } = require('@getzep/zep-cloud');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function simpleTest() {
  const apiKey = process.env.ZEP_API_KEY;
  console.log('API Key present:', !!apiKey);
  
  const zep = new ZepClient({ apiKey });
  
  try {
    // Try the simplest possible memory add
    const response = await zep.memory.add({
      sessionId: 'fibreflow_simple_test',
      messages: [{
        content: 'This is a simple test message'
      }]
    });
    
    console.log('✅ Success!', response);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Status:', error.status);
    console.error('Body:', error.body);
  }
}

simpleTest();