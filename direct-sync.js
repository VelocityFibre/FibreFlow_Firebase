const fetch = require('node-fetch');

// Fireflies API configuration
const FIREFLIES_API_URL = 'https://api.fireflies.ai/graphql';
const FIREFLIES_API_KEY = '894886b5-b232-4319-95c7-1296782e9ea6';

async function syncMeetings() {
  try {
    console.log('🔄 Starting direct Fireflies sync...\n');
    
    // Set date range for last 30 days
    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - 30);
    const dateTo = new Date();
    
    console.log(`📅 Date range: ${dateFrom.toISOString().split('T')[0]} to ${dateTo.toISOString().split('T')[0]}`);
    
    // GraphQL query to get transcripts (Fireflies uses 'transcripts' not 'meetings')
    const query = `
      query {
        transcripts(
          fromDate: "${dateFrom.toISOString()}"
          toDate: "${dateTo.toISOString()}"
        ) {
          id
          title
          date
          duration
          participants
          organizer_email
          meeting_link
          summary {
            keywords
            action_items
            outline
            shorthand_bullet
            overview
            bullet_gist
            gist
            short_summary
          }
        }
      }
    `;
    
    console.log('📡 Calling Fireflies API...');
    
    const response = await fetch(FIREFLIES_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${FIREFLIES_API_KEY}`,
      },
      body: JSON.stringify({ query }),
    });
    
    const responseText = await response.text();
    
    if (!response.ok) {
      console.error('Response:', responseText);
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    
    const data = JSON.parse(responseText);
    
    if (data.errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
    }
    
    const meetings = data.data?.transcripts || [];
    console.log(`\n✅ Found ${meetings.length} meetings from Fireflies\n`);
    
    if (meetings.length > 0) {
      console.log('📋 Meeting Summary:');
      meetings.forEach((meeting, index) => {
        const date = new Date(meeting.date);
        console.log(`\n${index + 1}. ${meeting.title}`);
        console.log(`   📅 Date: ${date.toLocaleDateString()} ${date.toLocaleTimeString()}`);
        console.log(`   ⏱️  Duration: ${meeting.duration} minutes`);
        console.log(`   👥 Participants: ${meeting.participants?.join(', ') || 'N/A'}`);
        console.log(`   📝 Action Items: ${meeting.summary?.action_items?.length || 0}`);
      });
      
      console.log('\n\n🎉 Meetings are available in Fireflies!');
      console.log('To sync them to Firebase:');
      console.log('1. Open the FibreFlow app in your browser');
      console.log('2. Navigate to the Meetings page');
      console.log('3. Click the "Sync Meetings" button');
      console.log('\nThe app will use the Firebase SDK to call the sync function and store these meetings.');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('\nFull error:', error);
  }
}

// Check if node-fetch is available
try {
  require.resolve('node-fetch');
  syncMeetings();
} catch(e) {
  console.log('Installing node-fetch...');
  const { execSync } = require('child_process');
  execSync('npm install node-fetch@2', { stdio: 'inherit' });
  console.log('\nPlease run the script again: node direct-sync.js');
}