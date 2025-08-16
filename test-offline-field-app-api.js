#!/usr/bin/env node

/**
 * Test script for Offline Field App API endpoints
 * Tests all API endpoints with various scenarios
 */

const https = require('https');

// Configuration
const CONFIG = {
  baseUrl: 'https://us-central1-fibreflow-73daf.cloudfunctions.net',
  apiKey: 'field-app-dev-key-2025', // Development API key
  deviceId: 'test-device-001',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'field-app-dev-key-2025',
    'X-Device-ID': 'test-device-001',
    'X-App-Version': '1.0.0-test'
  }
};

// Test data
const TEST_DATA = {
  pole: {
    poleNumber: `TEST-POLE-${Date.now()}`,
    projectId: 'test-project-001',
    gps: {
      latitude: -26.2041,
      longitude: 28.0473,
      accuracy: 10,
      timestamp: new Date().toISOString()
    },
    status: 'captured',
    contractorId: 'test-contractor-001',
    notes: 'Test pole capture from API test script'
  },
  photos: {
    before: 'https://example.com/test-photo-before.jpg',
    front: 'https://example.com/test-photo-front.jpg',
    side: 'https://example.com/test-photo-side.jpg'
  },
  offline_created_at: new Date().toISOString()
};

// Utility function to make HTTPS request
function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${CONFIG.baseUrl}${path}`);
    
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      method: method,
      headers: {
        ...CONFIG.headers,
        'Content-Length': data ? Buffer.byteLength(JSON.stringify(data)) : 0
      },
      timeout: 30000
    };

    console.log(`\n🔄 ${method} ${path}`);
    
    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: parsed
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: responseData
          });
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// Test functions
async function testHealthCheck() {
  console.log('\n📋 Testing Health Check Endpoint');
  console.log('================================');
  
  try {
    const response = await makeRequest('GET', '/offlineFieldAppAPI/health');
    console.log(`✅ Status: ${response.status}`);
    console.log('📦 Response:', JSON.stringify(response.data, null, 2));
    
    if (response.status === 200 && response.data.status === 'healthy') {
      console.log('✅ Health check passed');
      return true;
    } else {
      console.log('❌ Health check failed');
      return false;
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  }
}

async function testSinglePoleCapture() {
  console.log('\n📋 Testing Single Pole Capture');
  console.log('================================');
  
  try {
    const response = await makeRequest('POST', '/offlineFieldAppAPI/api/v1/poles/capture', {
      pole: TEST_DATA.pole,
      photos: TEST_DATA.photos,
      offline_created_at: TEST_DATA.offline_created_at
    });
    
    console.log(`✅ Status: ${response.status}`);
    console.log('📦 Response:', JSON.stringify(response.data, null, 2));
    
    if (response.status === 201 && response.data.success) {
      console.log('✅ Single pole capture successful');
      console.log(`📌 Submission ID: ${response.data.data.submissionId}`);
      return response.data.data.submissionId;
    } else {
      console.log('❌ Single pole capture failed');
      return null;
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    return null;
  }
}

async function testBatchSync() {
  console.log('\n📋 Testing Batch Sync');
  console.log('======================');
  
  const batchPoles = [];
  for (let i = 0; i < 3; i++) {
    batchPoles.push({
      pole: {
        ...TEST_DATA.pole,
        poleNumber: `BATCH-POLE-${Date.now()}-${i}`
      },
      photos: TEST_DATA.photos,
      metadata: {
        offlineCreatedAt: new Date().toISOString()
      }
    });
  }
  
  try {
    const response = await makeRequest('POST', '/offlineFieldAppAPI/api/v1/poles/batch', {
      poles: batchPoles,
      syncBatchId: `test-batch-${Date.now()}`
    });
    
    console.log(`✅ Status: ${response.status}`);
    console.log('📦 Response:', JSON.stringify(response.data, null, 2));
    
    if (response.status === 207 && response.data.data) {
      console.log(`✅ Batch sync completed: ${response.data.data.successful} successful, ${response.data.data.failed} failed`);
      return true;
    } else {
      console.log('❌ Batch sync failed');
      return false;
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  }
}

async function testPhotoUpload() {
  console.log('\n📋 Testing Photo Upload');
  console.log('========================');
  
  // Create a small test image (1x1 pixel red PNG)
  const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  
  try {
    const response = await makeRequest('POST', '/offlineFieldAppAPI/api/v1/photos/upload', {
      poleNumber: TEST_DATA.pole.poleNumber,
      photoType: 'test',
      photoData: testImageBase64,
      mimeType: 'image/png'
    });
    
    console.log(`✅ Status: ${response.status}`);
    console.log('📦 Response:', JSON.stringify(response.data, null, 2));
    
    if (response.status === 200 && response.data.success) {
      console.log('✅ Photo upload successful');
      console.log(`📸 Photo URL: ${response.data.data.url}`);
      return true;
    } else {
      console.log('❌ Photo upload failed');
      return false;
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  }
}

async function testStatusCheck(submissionId) {
  console.log('\n📋 Testing Status Check');
  console.log('========================');
  
  if (!submissionId) {
    console.log('⚠️  No submission ID available, skipping status check');
    return false;
  }
  
  try {
    const response = await makeRequest('GET', `/offlineFieldAppAPI/api/v1/poles/status/${submissionId}`);
    
    console.log(`✅ Status: ${response.status}`);
    console.log('📦 Response:', JSON.stringify(response.data, null, 2));
    
    if (response.status === 200 && response.data.success) {
      console.log('✅ Status check successful');
      return true;
    } else {
      console.log('❌ Status check failed');
      return false;
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  }
}

async function testPendingSync() {
  console.log('\n📋 Testing Pending Sync Count');
  console.log('==============================');
  
  try {
    const response = await makeRequest('GET', '/offlineFieldAppAPI/api/v1/sync/pending');
    
    console.log(`✅ Status: ${response.status}`);
    console.log('📦 Response:', JSON.stringify(response.data, null, 2));
    
    if (response.status === 200 && response.data.success) {
      console.log('✅ Pending sync check successful');
      console.log(`📊 Pending count: ${response.data.data.pendingCount}`);
      return true;
    } else {
      console.log('❌ Pending sync check failed');
      return false;
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  }
}

async function testInvalidApiKey() {
  console.log('\n📋 Testing Invalid API Key');
  console.log('===========================');
  
  const originalApiKey = CONFIG.headers['X-API-Key'];
  CONFIG.headers['X-API-Key'] = 'invalid-key-12345';
  
  try {
    const response = await makeRequest('GET', '/offlineFieldAppAPI/health');
    console.log(`✅ Status: ${response.status}`);
    console.log('📦 Response:', JSON.stringify(response.data, null, 2));
    
    if (response.status === 401) {
      console.log('✅ Correctly rejected invalid API key');
      return true;
    } else {
      console.log('❌ Failed to reject invalid API key');
      return false;
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  } finally {
    CONFIG.headers['X-API-Key'] = originalApiKey;
  }
}

async function testMissingDeviceId() {
  console.log('\n📋 Testing Missing Device ID');
  console.log('=============================');
  
  const originalDeviceId = CONFIG.headers['X-Device-ID'];
  delete CONFIG.headers['X-Device-ID'];
  
  try {
    const response = await makeRequest('GET', '/offlineFieldAppAPI/health');
    console.log(`✅ Status: ${response.status}`);
    console.log('📦 Response:', JSON.stringify(response.data, null, 2));
    
    if (response.status === 400) {
      console.log('✅ Correctly rejected missing device ID');
      return true;
    } else {
      console.log('❌ Failed to reject missing device ID');
      return false;
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  } finally {
    CONFIG.headers['X-Device-ID'] = originalDeviceId;
  }
}

async function test404Endpoint() {
  console.log('\n📋 Testing 404 Handler');
  console.log('=======================');
  
  try {
    const response = await makeRequest('GET', '/offlineFieldAppAPI/api/v1/invalid/endpoint');
    console.log(`✅ Status: ${response.status}`);
    console.log('📦 Response:', JSON.stringify(response.data, null, 2));
    
    if (response.status === 404) {
      console.log('✅ 404 handler working correctly');
      return true;
    } else {
      console.log('❌ 404 handler not working');
      return false;
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  }
}

// Neon API Tests
async function testNeonHealthCheck() {
  console.log('\n📋 Testing Neon API Health Check');
  console.log('=================================');
  
  const neonHeaders = {
    ...CONFIG.headers,
    'X-API-Key': 'dev-api-key-12345' // Neon API uses different key
  };
  
  // Update headers temporarily
  const originalHeaders = CONFIG.headers;
  CONFIG.headers = neonHeaders;
  
  try {
    const response = await makeRequest('GET', '/neonReadAPI/health');
    console.log(`✅ Status: ${response.status}`);
    console.log('📦 Response:', JSON.stringify(response.data, null, 2));
    
    if (response.status === 200 && response.data.status === 'healthy') {
      console.log('✅ Neon health check passed');
      return true;
    } else {
      console.log('❌ Neon health check failed');
      return false;
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  } finally {
    CONFIG.headers = originalHeaders;
  }
}

async function testNeonPolesList() {
  console.log('\n📋 Testing Neon Poles List');
  console.log('===========================');
  
  const neonHeaders = {
    ...CONFIG.headers,
    'X-API-Key': 'dev-api-key-12345'
  };
  
  const originalHeaders = CONFIG.headers;
  CONFIG.headers = neonHeaders;
  
  try {
    const response = await makeRequest('GET', '/neonReadAPI/api/v1/poles?page=1&limit=5');
    console.log(`✅ Status: ${response.status}`);
    console.log('📦 Response:', JSON.stringify(response.data, null, 2));
    
    if (response.status === 200 && response.data.success) {
      console.log('✅ Neon poles list successful');
      console.log(`📊 Retrieved ${response.data.data.length} poles`);
      return true;
    } else {
      console.log('❌ Neon poles list failed');
      return false;
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  } finally {
    CONFIG.headers = originalHeaders;
  }
}

async function testNeonAnalytics() {
  console.log('\n📋 Testing Neon Analytics Summary');
  console.log('==================================');
  
  const neonHeaders = {
    ...CONFIG.headers,
    'X-API-Key': 'dev-api-key-12345'
  };
  
  const originalHeaders = CONFIG.headers;
  CONFIG.headers = neonHeaders;
  
  try {
    const response = await makeRequest('GET', '/neonReadAPI/api/v1/analytics/summary');
    console.log(`✅ Status: ${response.status}`);
    console.log('📦 Response:', JSON.stringify(response.data, null, 2));
    
    if (response.status === 200 && response.data.success) {
      console.log('✅ Neon analytics summary successful');
      return true;
    } else {
      console.log('❌ Neon analytics summary failed');
      return false;
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  } finally {
    CONFIG.headers = originalHeaders;
  }
}

// Main test runner
async function runAllTests() {
  console.log('🚀 Starting Offline Field App API Tests');
  console.log('=======================================');
  console.log(`📍 Base URL: ${CONFIG.baseUrl}`);
  console.log(`🔑 API Key: ${CONFIG.apiKey}`);
  console.log(`📱 Device ID: ${CONFIG.deviceId}`);
  console.log(`🕐 Timestamp: ${new Date().toISOString()}`);
  
  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };
  
  // Run tests in sequence
  const tests = [
    { name: 'Health Check', fn: testHealthCheck },
    { name: 'Invalid API Key', fn: testInvalidApiKey },
    { name: 'Missing Device ID', fn: testMissingDeviceId },
    { name: 'Single Pole Capture', fn: testSinglePoleCapture },
    { name: 'Batch Sync', fn: testBatchSync },
    { name: 'Photo Upload', fn: testPhotoUpload },
    { name: 'Pending Sync', fn: testPendingSync },
    { name: '404 Handler', fn: test404Endpoint },
    { name: 'Neon Health Check', fn: testNeonHealthCheck },
    { name: 'Neon Poles List', fn: testNeonPolesList },
    { name: 'Neon Analytics', fn: testNeonAnalytics }
  ];
  
  let submissionId = null;
  
  for (const test of tests) {
    try {
      let result;
      
      if (test.name === 'Single Pole Capture') {
        submissionId = await test.fn();
        result = !!submissionId;
      } else if (test.name === 'Status Check' && submissionId) {
        result = await testStatusCheck(submissionId);
      } else {
        result = await test.fn();
      }
      
      results.tests.push({ name: test.name, passed: result });
      if (result) {
        results.passed++;
      } else {
        results.failed++;
      }
    } catch (error) {
      console.error(`❌ Test "${test.name}" crashed:`, error.message);
      results.tests.push({ name: test.name, passed: false });
      results.failed++;
    }
  }
  
  // Add status check if we have a submission ID
  if (submissionId) {
    try {
      const statusResult = await testStatusCheck(submissionId);
      results.tests.push({ name: 'Status Check', passed: statusResult });
      if (statusResult) {
        results.passed++;
      } else {
        results.failed++;
      }
    } catch (error) {
      console.error('❌ Status Check crashed:', error.message);
      results.tests.push({ name: 'Status Check', passed: false });
      results.failed++;
    }
  }
  
  // Print summary
  console.log('\n\n📊 TEST RESULTS SUMMARY');
  console.log('=======================');
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📋 Total: ${results.passed + results.failed}`);
  console.log('\nDetailed Results:');
  results.tests.forEach(test => {
    console.log(`  ${test.passed ? '✅' : '❌'} ${test.name}`);
  });
  
  if (results.failed === 0) {
    console.log('\n🎉 All tests passed!');
  } else {
    console.log('\n⚠️  Some tests failed. Please check the logs above.');
  }
  
  return results;
}

// Run tests if executed directly
if (require.main === module) {
  runAllTests()
    .then(results => {
      process.exit(results.failed > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('💥 Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { runAllTests, makeRequest };