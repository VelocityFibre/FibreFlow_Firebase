require('dotenv').config({ path: '.env' });
const { ZepClient } = require('@getzep/zep-cloud');

async function testV2Memory() {
  console.log('=== Testing Zep v2.21.0 Memory API ===\n');
  
  const zep = new ZepClient({ apiKey: process.env.ZEP_API_KEY });
  const sessionId = 'fibreflow_episode_1755158099445';
  
  try {
    // Try to get session messages
    console.log('Testing memory.getSessionMessages...');
    const messages = await zep.memory.getSessionMessages({ sessionId });
    
    if (messages && messages.messages) {
      console.log(`✅ Found ${messages.messages.length} messages in session`);
      messages.messages.forEach((msg, i) => {
        console.log(`\nMessage ${i + 1}:`);
        console.log('Role:', msg.roleType);
        console.log('Content preview:', msg.content.substring(0, 100) + '...');
      });
    } else {
      console.log('❌ No messages found');
    }
    
    // Try to get session info
    console.log('\n\nTesting memory.getSession...');
    const session = await zep.memory.getSession({ sessionId });
    console.log('✅ Session found:', session);
    
  } catch (error) {
    console.log('❌ Error:', error.message);
    if (error.status) console.log('Status:', error.status);
    if (error.body) console.log('Body:', error.body);
  }
}

testV2Memory();