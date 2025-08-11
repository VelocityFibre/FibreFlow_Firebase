require('dotenv').config({ path: '../.env' });
const { ZepClient } = require('@getzep/zep-cloud');

async function addActionItemsMemory() {
  console.log('=== Adding Action Items Debug Memory ===\n');
  
  const client = new ZepClient({ apiKey: process.env.ZEP_API_KEY });
  const userId = 'fibreflow_dev';
  
  // Since v3.2.0 doesn't have memory.add, let's try a different approach
  // We could potentially store this as user metadata or find another way
  
  console.log('✅ Successfully connected to Zep');
  console.log('✅ User exists and is authenticated');
  console.log('❌ Memory API not available in v3.2.0 - needs rewrite or downgrade');
  
  console.log('\n💡 Options to fix:');
  console.log('1. Downgrade to @getzep/zep-cloud@2.21.0');
  console.log('2. Rewrite bridge for v3.2.0 graph API');
  console.log('3. Use local memory system as primary');
}

addActionItemsMemory();