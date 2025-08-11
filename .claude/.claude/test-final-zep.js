require('dotenv').config({ path: '../.env' }); // Go up one level from .claude/.claude to .claude/.env
const { ZepClient } = require('@getzep/zep-cloud');

async function finalTest() {
  console.log('=== Final Zep API Test ===\n');
  
  console.log('Loading environment from ../.env');
  console.log('ZEP_API_KEY present:', process.env.ZEP_API_KEY ? 'Yes (length: ' + process.env.ZEP_API_KEY.length + ')' : 'No');
  
  if (!process.env.ZEP_API_KEY) {
    console.log('❌ Still no API key. Let\'s check what files exist:');
    const fs = require('fs');
    try {
      const files = fs.readdirSync('../');
      console.log('Files in parent directory:', files);
      
      if (files.includes('.env')) {
        const envContent = fs.readFileSync('../.env', 'utf8');
        console.log('ENV file content preview:');
        console.log(envContent.split('\n').slice(0, 3).join('\n') + '...');
      }
    } catch (e) {
      console.log('Error reading directory:', e.message);
    }
    return;
  }
  
  const client = new ZepClient({ apiKey: process.env.ZEP_API_KEY });
  const userId = 'fibreflow_dev';
  
  try {
    console.log('\n=== Testing User API (v3.2.0) ===');
    const user = await client.user.get(userId);
    console.log('✅ User found:', user);
    
  } catch (error) {
    console.log('❌ User API failed:', error.message);
    if (error.status === 401) {
      console.log('🔐 Authentication failed - API key might be invalid or expired');
    }
  }
}

finalTest();