const fetch = require('node-fetch');

async function checkDatabaseViaAPI() {
  console.log('Checking database by calling the sync function with days=0...\n');
  
  try {
    const response = await fetch('https://us-central1-fibreflow-73daf.cloudfunctions.net/tempSyncMeetings?days=0', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0.4472.124'
      }
    });
    
    const text = await response.text();
    
    if (response.ok) {
      const data = JSON.parse(text);
      console.log('Response from function:');
      console.log(JSON.stringify(data, null, 2));
      
      if (data.stats) {
        console.log(`\nDatabase has ${data.stats.totalMeetings || 0} meetings`);
      }
    } else {
      console.log('Error:', response.status, text);
    }
  } catch (error) {
    console.error('Failed:', error.message);
  }
}

checkDatabaseViaAPI();