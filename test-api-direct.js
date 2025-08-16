// Direct API test using fetch
const fetch = require('node-fetch');

async function testAPIs() {
  console.log('🧪 Testing Offline Field App APIs directly\n');
  
  const endpoints = [
    {
      name: 'Offline Field App Health',
      url: 'https://us-central1-fibreflow-73daf.cloudfunctions.net/offlineFieldAppAPI/health',
      method: 'GET',
      headers: {
        'X-API-Key': 'field-app-dev-key-2025',
        'X-Device-ID': 'test-device-001',
        'Content-Type': 'application/json'
      }
    },
    {
      name: 'Neon API Health',
      url: 'https://us-central1-fibreflow-73daf.cloudfunctions.net/neonReadAPI/health',
      method: 'GET',
      headers: {
        'X-API-Key': 'dev-api-key-12345',
        'X-Device-ID': 'test-device-001',
        'Content-Type': 'application/json'
      }
    },
    {
      name: 'Staging API Health',
      url: 'https://us-central1-fibreflow-73daf.cloudfunctions.net/stagingAPI/health',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    }
  ];
  
  for (const endpoint of endpoints) {
    console.log(`\n📍 Testing: ${endpoint.name}`);
    console.log(`   URL: ${endpoint.url}`);
    console.log(`   Method: ${endpoint.method}`);
    
    try {
      const response = await fetch(endpoint.url, {
        method: endpoint.method,
        headers: endpoint.headers,
        timeout: 10000
      });
      
      const text = await response.text();
      console.log(`   Status: ${response.status} ${response.statusText}`);
      
      if (response.status === 200) {
        try {
          const json = JSON.parse(text);
          console.log(`   ✅ Success:`, JSON.stringify(json, null, 2));
        } catch {
          console.log(`   ✅ Response:`, text);
        }
      } else {
        console.log(`   ❌ Error Response:`, text.substring(0, 200));
      }
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }
  
  // Test a simple pole capture
  console.log('\n\n📍 Testing Pole Capture');
  try {
    const captureResponse = await fetch(
      'https://us-central1-fibreflow-73daf.cloudfunctions.net/offlineFieldAppAPI/api/v1/poles/capture',
      {
        method: 'POST',
        headers: {
          'X-API-Key': 'field-app-dev-key-2025',
          'X-Device-ID': 'test-device-001',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          pole: {
            poleNumber: `TEST-${Date.now()}`,
            projectId: 'test-project',
            gps: {
              latitude: -26.2041,
              longitude: 28.0473,
              accuracy: 10
            },
            status: 'captured'
          },
          photos: {},
          offline_created_at: new Date().toISOString()
        }),
        timeout: 10000
      }
    );
    
    const captureText = await captureResponse.text();
    console.log(`   Status: ${captureResponse.status}`);
    
    if (captureResponse.status === 201) {
      const json = JSON.parse(captureText);
      console.log(`   ✅ Success:`, JSON.stringify(json, null, 2));
    } else {
      console.log(`   ❌ Error:`, captureText.substring(0, 200));
    }
    
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }
}

// Check if node-fetch is installed
try {
  require.resolve('node-fetch');
  testAPIs();
} catch {
  console.log('❌ node-fetch not installed. Installing...');
  const { execSync } = require('child_process');
  execSync('npm install node-fetch@2', { stdio: 'inherit' });
  console.log('✅ Installed. Please run the script again.');
}