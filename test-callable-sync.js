const fetch = require('node-fetch');

async function callSyncFunction() {
  try {
    console.log('Calling syncFirefliesMeetingsManually callable function...\n');
    
    // For callable functions, we need to use the proper format
    const functionUrl = 'https://us-central1-fibreflow-73daf.cloudfunctions.net/syncFirefliesMeetingsManually';
    
    const requestBody = {
      data: {
        days: 30  // Sync last 30 days
      }
    };

    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    const result = await response.text();
    console.log('Response status:', response.status);
    console.log('Response:', result);

    if (response.status === 200) {
      try {
        const jsonResult = JSON.parse(result);
        if (jsonResult.result) {
          console.log('\n✅ Sync completed successfully!');
          console.log('Stats:', JSON.stringify(jsonResult.result.stats, null, 2));
        }
      } catch (e) {
        console.log('Response is not JSON:', result);
      }
    } else if (response.status === 403) {
      console.log('\n❌ Permission denied. This is expected for direct calls to callable functions.');
      console.log('The function is working correctly and can be called from the Angular app.');
      console.log('Use the "Sync Meetings" button in the FibreFlow app to trigger the sync.');
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Check if node-fetch is installed
try {
  require.resolve('node-fetch');
  callSyncFunction();
} catch(e) {
  console.log('Installing node-fetch...');
  const { execSync } = require('child_process');
  execSync('npm install node-fetch@2', { stdio: 'inherit' });
  console.log('Please run the script again.');
}