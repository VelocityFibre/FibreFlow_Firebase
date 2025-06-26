const https = require('https');
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc, serverTimestamp } = require('firebase/firestore');

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyCdpp9ViBcfb37o4V2_OCzWO9nUhCiv9Vc",
  authDomain: "fibreflow-73daf.firebaseapp.com",
  projectId: "fibreflow-73daf",
  storageBucket: "fibreflow-73daf.firebasestorage.app",
  messagingSenderId: "296054249427",
  appId: "1:296054249427:web:2f0d6482daa6beb0624126"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const API_KEY = '894886b5-b232-4319-95c7-1296782e9ea6';

// Get last 5 meetings with full details
const query = `
  query {
    transcripts(limit: 5) {
      id
      title
      date
      duration
      organizer_email
      meeting_link
      summary {
        overview
        action_items
        keywords
        outline
      }
    }
  }
`;

function fetchMeetings() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.fireflies.ai',
      path: '/graphql',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (response.data && response.data.transcripts) {
            resolve(response.data.transcripts);
          } else {
            reject(new Error('No data received'));
          }
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', reject);
    req.write(JSON.stringify({ query }));
    req.end();
  });
}

async function syncToFirestore() {
  try {
    console.log('📡 Fetching meetings from Fireflies...');
    const meetings = await fetchMeetings();
    
    console.log(`✅ Found ${meetings.length} meetings\n`);
    
    for (const meeting of meetings) {
      // Convert to our format
      const meetingData = {
        firefliesId: meeting.id,
        title: meeting.title,
        date: new Date(meeting.date),
        duration: meeting.duration,
        participants: [{
          name: meeting.organizer_email?.split('@')[0] || 'Unknown',
          email: meeting.organizer_email || '',
          isSpeaker: true
        }],
        summary: meeting.summary?.overview || '',
        actionItems: [],
        keywords: meeting.summary?.keywords || [],
        transcriptUrl: meeting.meeting_link || '',
        status: 'synced',
        syncedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      // Parse action items if they exist
      if (meeting.summary?.action_items) {
        const items = meeting.summary.action_items.split('\n').filter(item => item.trim());
        meetingData.actionItems = items.map((text, idx) => ({
          id: `${meeting.id}_action_${idx}`,
          text: text.trim(),
          completed: false,
          priority: 'medium',
          createdAt: new Date()
        }));
      }
      
      // Save to Firestore using the Fireflies ID as the document ID
      const docRef = doc(db, 'meetings', meeting.id);
      await setDoc(docRef, meetingData, { merge: true });
      
      console.log(`💾 Saved: ${meeting.title} (${new Date(meeting.date).toLocaleDateString()})`);
      console.log(`   ID: ${meeting.id}`);
      console.log(`   Action Items: ${meetingData.actionItems.length}`);
      console.log('');
    }
    
    console.log('✅ All meetings synced to Firestore!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run the sync
syncToFirestore();