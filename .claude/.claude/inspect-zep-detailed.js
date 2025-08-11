require('dotenv').config({ path: '.claude/.env' });

try {
  const zepCloud = require('@getzep/zep-cloud');
  console.log('=== Zep Cloud SDK Analysis ===\n');
  
  console.log('Exported classes/functions:');
  Object.keys(zepCloud).forEach(key => {
    console.log(`  ${key}: ${typeof zepCloud[key]}`);
  });
  
  console.log('\n=== ZepClient Instance ===');
  const { ZepClient } = zepCloud;
  const client = new ZepClient({ apiKey: process.env.ZEP_API_KEY });
  
  console.log('Instance properties:');
  Object.getOwnPropertyNames(client).forEach(prop => {
    console.log(`  ${prop}: ${typeof client[prop]}`);
  });
  
  console.log('\nPrototype methods:');
  let proto = Object.getPrototypeOf(client);
  while (proto && proto.constructor !== Object) {
    Object.getOwnPropertyNames(proto).forEach(method => {
      if (method !== 'constructor' && typeof proto[method] === 'function') {
        console.log(`  ${method}()`);
      }
    });
    proto = Object.getPrototypeOf(proto);
  }
  
  // Check if there's a different way to access memory
  console.log('\n=== Checking for memory/session APIs ===');
  if (client.memory) console.log('✅ client.memory exists');
  if (client.session) console.log('✅ client.session exists');
  if (client.sessions) console.log('✅ client.sessions exists');
  if (client.user) console.log('✅ client.user exists');
  if (client.users) console.log('✅ client.users exists');
  if (client.graph) console.log('✅ client.graph exists');
  
} catch (error) {
  console.error('Error:', error.message);
}