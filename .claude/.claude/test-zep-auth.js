require('dotenv').config({ path: '.claude/.env' });
const { ZepClient } = require('@getzep/zep-cloud');

console.log('=== Zep Authentication Debug ===\n');

console.log('Environment variables:');
console.log('ZEP_API_KEY:', process.env.ZEP_API_KEY ? 'Set (length: ' + process.env.ZEP_API_KEY.length + ')' : 'Not set');
console.log('ZEP_USER_ID:', process.env.ZEP_USER_ID);
console.log('ZEP_PROJECT_ID:', process.env.ZEP_PROJECT_ID);

console.log('\nAPI Key format analysis:');
const apiKey = process.env.ZEP_API_KEY;
if (apiKey) {
  console.log('Starts with:', apiKey.substring(0, 10) + '...');
  console.log('Contains dots:', apiKey.includes('.'));
  console.log('Parts (split by dot):', apiKey.split('.').length);
}

// Test basic client creation
try {
  const client = new ZepClient({ apiKey });
  console.log('\n✅ ZepClient created successfully');
  console.log('Client options:', JSON.stringify(client._options, null, 2));
} catch (e) {
  console.log('\n❌ ZepClient creation failed:', e.message);
}

// Test if it's environment specific
console.log('\nTesting different environments...');
const environments = ['production', 'dev', 'staging'];

environments.forEach(env => {
  try {
    const client = new ZepClient({ 
      apiKey,
      environment: env
    });
    console.log(`✅ ${env} client created`);
  } catch (e) {
    console.log(`❌ ${env} client failed:`, e.message);
  }
});