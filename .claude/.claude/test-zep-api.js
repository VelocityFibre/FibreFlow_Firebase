require('dotenv').config({ path: '.claude/.env' });
const { Zep, ZepClient } = require('@getzep/zep-cloud');

console.log('Testing Zep SDK v3.2.0...\n');

// Test ZepClient
try {
  const zepClient = new ZepClient({ apiKey: process.env.ZEP_API_KEY });
  console.log('✅ ZepClient created');
  console.log('ZepClient properties:', Object.getOwnPropertyNames(zepClient).sort());
  console.log('Memory available on ZepClient:', zepClient.memory !== undefined);
} catch (e) {
  console.log('❌ ZepClient failed:', e.message);
}

console.log('\n---\n');

// Test Zep
try {
  const zep = new Zep({ apiKey: process.env.ZEP_API_KEY });
  console.log('✅ Zep created');
  console.log('Zep properties:', Object.getOwnPropertyNames(zep).sort());
  console.log('Memory available on Zep:', zep.memory !== undefined);
} catch (e) {
  console.log('❌ Zep failed:', e.message);
}