#!/usr/bin/env node

/**
 * Test accessing FibreFlow Storage from VF OneMap scripts
 * This verifies we can read files without authentication issues
 */

const { Storage } = require('@google-cloud/storage');

// Test 1: Using service account to read from FibreFlow
async function testServiceAccountAccess() {
  console.log('🧪 Test 1: Service Account Access to FibreFlow Storage\n');
  
  try {
    const storage = new Storage({
      projectId: 'fibreflow-73daf',
      keyFilename: '../credentials/vf-onemap-service-account.json'
    });
    
    const bucket = storage.bucket('fibreflow-73daf.firebasestorage.app');
    
    // List files
    const [files] = await bucket.getFiles({
      prefix: 'csv-uploads/',
      maxResults: 5
    });
    
    console.log('✅ Successfully accessed FibreFlow storage!');
    console.log(`📁 Found ${files.length} files in csv-uploads/:`);
    files.forEach(file => {
      console.log(`   - ${file.name}`);
    });
    
    return true;
  } catch (error) {
    console.error('❌ Failed to access FibreFlow storage:', error.message);
    return false;
  }
}

// Test 2: Using public URL access (if files are public)
async function testPublicAccess() {
  console.log('\n🧪 Test 2: Public URL Access\n');
  
  const testUrl = 'https://storage.googleapis.com/fibreflow-73daf.firebasestorage.app/csv-uploads/test.csv';
  
  try {
    const response = await fetch(testUrl);
    
    if (response.ok) {
      console.log('✅ Files are publicly accessible!');
      console.log(`   URL: ${testUrl}`);
      const text = await response.text();
      console.log(`   File size: ${text.length} bytes`);
    } else {
      console.log('⚠️  Files are not publicly accessible (status:', response.status, ')');
      console.log('   This is OK - we\'ll use service account access');
    }
  } catch (error) {
    console.log('⚠️  Cannot access via public URL - will use service account');
  }
}

// Main test runner
async function main() {
  console.log('🔧 Testing FibreFlow Storage Access Methods\n');
  console.log('This tests if VF OneMap scripts can read from FibreFlow storage\n');
  
  // Run tests
  const serviceAccountWorks = await testServiceAccountAccess();
  await testPublicAccess();
  
  console.log('\n📊 Summary:');
  if (serviceAccountWorks) {
    console.log('✅ Service account can read from FibreFlow storage');
    console.log('✅ Import script will work correctly');
    console.log('\n🎉 Ready to import! Run: node import-from-fibreflow-storage.js');
  } else {
    console.log('❌ Cannot access FibreFlow storage');
    console.log('\n💡 Solutions:');
    console.log('1. Check service account permissions');
    console.log('2. Use signed URLs instead');
    console.log('3. Have FibreFlow generate temporary access tokens');
  }
}

// Run tests
main().catch(console.error);