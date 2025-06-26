const { initializeApp } = require('firebase/app');
const { getFirestore, collection, doc, setDoc, serverTimestamp } = require('firebase/firestore');
const fetch = require('node-fetch');

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

async function syncFirefliesMeetings() {
  console.log('Starting Fireflies sync...');
  
  try {
    // Fetch meetings from Fireflies
    const response = await fetch('https://api.fireflies.ai/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer 894886b5-b232-4319-95c7-1296782e9ea6'
      },
      timeout: 30000, // 30 second timeout
      body: JSON.stringify({
        query: `
          query {
            transcripts(limit: 20) {
              id
              title
              date
              duration
              organizer_email
              meeting_link
              summary {
                overview
                action_items
                outline
                shorthand_bullet
              }
            }
          }
        `
      })
    });
    
    const data = await response.json();
    
    if (data.errors) {
      console.error('GraphQL errors:', data.errors);
      return;
    }
    
    const transcripts = data.data?.transcripts || [];
    console.log(`Found ${transcripts.length} meetings to sync`);
    
    // Process each transcript
    for (const transcript of transcripts) {
      const meeting = {
        firefliesId: transcript.id,
        title: transcript.title,
        date: new Date(transcript.date),
        duration: transcript.duration,
        participants: [{
          name: transcript.organizer_email?.split('@')[0] || 'Unknown',
          email: transcript.organizer_email || '',
          isSpeaker: true
        }],
        summary: transcript.summary?.overview || '',
        actionItems: transcript.summary?.action_items ? 
          transcript.summary.action_items.split('\n')
            .filter(item => item.trim())
            .map((text, idx) => ({
              id: `${transcript.id}_action_${idx}`,
              text: text.trim(),
              completed: false,
              priority: 'medium',
              createdAt: new Date()
            })) : [],
        insights: [],
        transcriptUrl: transcript.meeting_link || '',
        status: 'synced',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        syncedAt: serverTimestamp()
      };
      
      // Save to Firestore
      const meetingRef = doc(db, 'meetings', transcript.id);
      await setDoc(meetingRef, meeting, { merge: true });
      console.log(`✓ Synced meeting: ${transcript.title}`);
    }
    
    console.log('✅ Sync completed successfully!');
    
  } catch (error) {
    console.error('❌ Sync failed:', error);
  }
  
  process.exit(0);
}

// Run the sync
syncFirefliesMeetings();