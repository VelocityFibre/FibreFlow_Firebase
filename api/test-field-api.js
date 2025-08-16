// Test script for the Offline Field App API

const API_URL = 'https://us-central1-fibreflow-73daf.cloudfunctions.net/offlineFieldAppAPI';
const API_KEY = 'field-app-dev-key-2025';
const DEVICE_ID = 'test-device-001';

async function testAPI() {
  console.log('Testing Offline Field App API...\n');
  
  // Test 1: Health Check
  console.log('1. Testing Health Check...');
  try {
    const healthResponse = await fetch(`${API_URL}/health`, {
      headers: {
        'X-API-Key': API_KEY,
        'X-Device-ID': DEVICE_ID
      }
    });
    const healthData = await healthResponse.json();
    console.log('Health Check Response:', healthData);
  } catch (error) {
    console.error('Health Check Error:', error.message);
  }
  
  // Test 2: Capture Pole
  console.log('\n2. Testing Pole Capture...');
  try {
    const poleData = {
      pole: {
        poleNumber: `TEST.P.${Date.now().toString(36)}`,
        projectId: 'test-project-001',
        gps: {
          latitude: -26.123456,
          longitude: 28.123456,
          accuracy: 5.2,
          timestamp: new Date().toISOString()
        },
        status: 'installed',
        contractorId: 'test-contractor',
        notes: 'Test capture from API test script'
      },
      photos: {
        before: 'https://example.com/test-photo-before.jpg',
        front: 'https://example.com/test-photo-front.jpg',
        side: 'https://example.com/test-photo-side.jpg'
      },
      offline_created_at: new Date().toISOString()
    };
    
    const captureResponse = await fetch(`${API_URL}/api/v1/poles/capture`, {
      method: 'POST',
      headers: {
        'X-API-Key': API_KEY,
        'X-Device-ID': DEVICE_ID,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(poleData)
    });
    const captureData = await captureResponse.json();
    console.log('Capture Response:', captureData);
    
    if (captureData.success && captureData.data.submissionId) {
      // Test 3: Check Status
      console.log('\n3. Testing Status Check...');
      const statusResponse = await fetch(`${API_URL}/api/v1/poles/status/${captureData.data.submissionId}`, {
        headers: {
          'X-API-Key': API_KEY,
          'X-Device-ID': DEVICE_ID
        }
      });
      const statusData = await statusResponse.json();
      console.log('Status Response:', statusData);
    }
  } catch (error) {
    console.error('Capture Error:', error.message);
  }
  
  // Test 4: Check Pending Syncs
  console.log('\n4. Testing Pending Syncs...');
  try {
    const pendingResponse = await fetch(`${API_URL}/api/v1/sync/pending`, {
      headers: {
        'X-API-Key': API_KEY,
        'X-Device-ID': DEVICE_ID
      }
    });
    const pendingData = await pendingResponse.json();
    console.log('Pending Syncs Response:', pendingData);
  } catch (error) {
    console.error('Pending Syncs Error:', error.message);
  }
}

// Run tests
testAPI().catch(console.error);