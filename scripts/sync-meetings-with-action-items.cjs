const { exec } = require('child_process');
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs, addDoc, updateDoc, doc, serverTimestamp } = require('firebase/firestore');

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCQ-BqKGqOzGlpBgtqA-wFNcNVCiV2EZBY",
  authDomain: "fibreflow-73daf.firebaseapp.com",
  projectId: "fibreflow-73daf",
  storageBucket: "fibreflow-73daf.appspot.com",
  messagingSenderId: "493732862141",
  appId: "1:493732862141:web:50f74a2f1fcdcdbf12ab77",
  measurementId: "G-JCPHP7SW7D"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const FIREFLIES_API_KEY = '894886b5-b232-4319-95c7-1296782e9ea6';
const DEFAULT_USER_ID = 'system-sync';
const DEFAULT_USER_EMAIL = 'system@fibreflow.com';

// Helper to extract priority
function extractPriority(text) {
  const lowercaseText = text.toLowerCase();
  if (lowercaseText.includes('urgent') || lowercaseText.includes('asap') || 
      lowercaseText.includes('critical') || lowercaseText.includes('immediately')) {
    return 'high';
  }
  if (lowercaseText.includes('important') || lowercaseText.includes('priority')) {
    return 'medium';
  }
  return 'low';
}

// Parse action items string into structured array
function parseActionItems(actionItemsString, meetingId) {
  if (!actionItemsString || typeof actionItemsString !== 'string') {
    return [];
  }

  const actionItems = [];
  let currentAssignee = '';
  
  // Split by lines and process
  const lines = actionItemsString.split('\n').filter(line => line.trim());
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Check if this is an assignee header (starts with ** and ends with **)
    if (trimmedLine.startsWith('**') && trimmedLine.endsWith('**')) {
      currentAssignee = trimmedLine.replace(/\*\*/g, '').trim();
      continue;
    }
    
    // Skip empty lines
    if (!trimmedLine) continue;
    
    // This is an action item
    // Extract timestamp if present (format: (HH:MM) at the end)
    const timestampMatch = trimmedLine.match(/\((\d+:\d+)\)\s*$/);
    const timestamp = timestampMatch ? timestampMatch[1] : '';
    const text = timestampMatch 
      ? trimmedLine.replace(/\s*\(\d+:\d+\)\s*$/, '').trim()
      : trimmedLine;
    
    // Only add if we have actual text
    if (text) {
      actionItems.push({
        id: `${meetingId}_action_${actionItems.length}`,
        text: text,
        assignee: currentAssignee,
        dueDate: null,
        priority: extractPriority(text),
        completed: false,
        speaker: currentAssignee,
        timestamp: timestamp ? convertTimestampToSeconds(timestamp) : 0
      });
    }
  }
  
  return actionItems;
}

// Convert timestamp string (MM:SS or HH:MM:SS) to seconds
function convertTimestampToSeconds(timestamp) {
  const parts = timestamp.split(':').map(p => parseInt(p, 10));
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  } else if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return 0;
}

// Fetch meetings using curl
function fetchMeetingsFromFireflies(daysBack = 30) {
  return new Promise((resolve, reject) => {
    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - daysBack);
    const dateTo = new Date();

    const query = `
      query {
        transcripts(
          filter: {
            date_from: "${dateFrom.toISOString()}"
            date_to: "${dateTo.toISOString()}"
          }
          limit: 100
        ) {
          id
          title
          date
          duration
          participants
          organizer_email
          fireflies_users
          transcript_url
          video_url
          audio_url
          sentences {
            text
            speaker_name
            start_time
          }
          summary {
            keywords
            action_items
            overview
            shorthand_bullet
            bullet_gist
            gist
            short_summary
          }
        }
      }
    `;

    const curlCommand = `curl -s -X POST https://api.fireflies.ai/graphql \
      -H "Authorization: Bearer ${FIREFLIES_API_KEY}" \
      -H "Content-Type: application/json" \
      -d '${JSON.stringify({ query })}'`;

    exec(curlCommand, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`Curl error: ${error.message}`));
        return;
      }
      if (stderr) {
        reject(new Error(`Curl stderr: ${stderr}`));
        return;
      }

      try {
        const response = JSON.parse(stdout);
        if (response.errors) {
          reject(new Error(`GraphQL errors: ${JSON.stringify(response.errors)}`));
          return;
        }
        
        resolve(response.data?.transcripts || []);
      } catch (parseError) {
        reject(new Error(`JSON parse error: ${parseError.message}`));
      }
    });
  });
}

// Sync action items to management collection
async function syncActionItemsToManagement(meeting, actionItems) {
  const actionItemsManagementRef = collection(db, 'actionItemsManagement');
  let syncedCount = 0;

  for (const actionItem of actionItems) {
    try {
      // Check if this action item already exists in management
      const key = `${meeting.id}-${actionItem.text}`;
      const existingQuery = query(
        actionItemsManagementRef,
        where('meetingId', '==', meeting.id),
        where('originalActionItem.text', '==', actionItem.text)
      );
      
      const existingDocs = await getDocs(existingQuery);
      
      if (existingDocs.empty) {
        // Create new managed action item
        const managementItem = {
          meetingId: meeting.id,
          meetingTitle: meeting.title,
          meetingDate: meeting.dateTime,
          originalActionItem: actionItem,
          updates: {
            priority: actionItem.priority,
            assignee: actionItem.assignee,
            assigneeEmail: actionItem.assigneeEmail,
            dueDate: actionItem.dueDate,
            status: actionItem.completed ? 'completed' : 'pending',
            notes: '',
            tags: [],
          },
          status: actionItem.completed ? 'completed' : 'pending',
          history: [
            {
              id: Date.now().toString(36) + Math.random().toString(36).substr(2),
              timestamp: new Date().toISOString(),
              userId: DEFAULT_USER_ID,
              userEmail: DEFAULT_USER_EMAIL,
              action: 'created',
              notes: 'Action item imported from meeting sync',
            },
          ],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: DEFAULT_USER_ID,
          updatedBy: DEFAULT_USER_ID,
        };

        await addDoc(actionItemsManagementRef, managementItem);
        syncedCount++;
      }
    } catch (error) {
      console.error(`Error syncing action item "${actionItem.text}":`, error.message);
    }
  }

  return syncedCount;
}

// Save meetings to Firebase
async function saveMeetingsToFirebase(meetings) {
  let newMeetings = 0;
  let updatedMeetings = 0;
  let totalActionItems = 0;
  let syncedActionItems = 0;

  for (const meeting of meetings) {
    try {
      // Parse action items
      const actionItemsString = meeting.summary?.action_items || '';
      const actionItems = parseActionItems(actionItemsString, meeting.id);
      totalActionItems += actionItems.length;

      // Prepare meeting data
      const meetingData = {
        title: meeting.title || 'Untitled Meeting',
        dateTime: meeting.date,
        duration: meeting.duration,
        participants: meeting.participants || [],
        organizerEmail: meeting.organizer_email,
        firefliesUsers: meeting.fireflies_users || [],
        transcriptUrl: meeting.transcript_url,
        videoUrl: meeting.video_url,
        audioUrl: meeting.audio_url,
        summary: meeting.summary || {},
        actionItems: actionItems,
        processedAt: new Date().toISOString()
      };

      // Check if meeting already exists
      const meetingsRef = collection(db, 'meetings');
      const q = query(meetingsRef, where('transcriptUrl', '==', meeting.transcript_url));
      const existingMeeting = await getDocs(q);

      if (existingMeeting.empty) {
        // Create new meeting
        const docRef = await addDoc(meetingsRef, {
          ...meetingData,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        
        // Set the meeting ID for action items sync
        meetingData.id = docRef.id;
        
        newMeetings++;
        console.log(`✅ Created: ${meeting.title} (${actionItems.length} action items)`);
      } else {
        // Update existing meeting
        const docId = existingMeeting.docs[0].id;
        await updateDoc(doc(db, 'meetings', docId), meetingData);
        
        // Set the meeting ID for action items sync
        meetingData.id = docId;
        
        updatedMeetings++;
        console.log(`🔄 Updated: ${meeting.title} (${actionItems.length} action items)`);
      }

      // Sync action items to management collection
      if (actionItems.length > 0) {
        const syncCount = await syncActionItemsToManagement(meetingData, actionItems);
        syncedActionItems += syncCount;
        if (syncCount > 0) {
          console.log(`   📋 Synced ${syncCount} new action items to management`);
        }
      }

    } catch (error) {
      console.error(`❌ Error processing meeting "${meeting.title}":`, error.message);
    }
  }

  return { newMeetings, updatedMeetings, totalActionItems, syncedActionItems };
}

// Main sync function
async function syncMeetings() {
  console.log('🚀 Starting Enhanced Fireflies sync with Action Items Management...\n');

  try {
    // Get number of days from command line argument
    const daysBack = parseInt(process.argv[2]) || 30;
    
    // Fetch meetings from Fireflies
    const meetings = await fetchMeetingsFromFireflies(daysBack);
    console.log(`\n📊 Found ${meetings.length} meetings in Fireflies\n`);

    if (meetings.length === 0) {
      console.log('No meetings to sync.');
      return;
    }

    // Save to Firebase and sync action items
    const { newMeetings, updatedMeetings, totalActionItems, syncedActionItems } = await saveMeetingsToFirebase(meetings);

    // Summary
    console.log('\n✨ Sync completed successfully!');
    console.log(`📈 Summary:`);
    console.log(`   - Total meetings processed: ${meetings.length}`);
    console.log(`   - New meetings created: ${newMeetings}`);
    console.log(`   - Existing meetings updated: ${updatedMeetings}`);
    console.log(`   - Total action items parsed: ${totalActionItems}`);
    console.log(`   - New action items synced to management: ${syncedActionItems}`);
    
  } catch (error) {
    console.error('\n❌ Sync failed:', error.message);
    process.exit(1);
  }
}

// Run the sync
syncMeetings().then(() => {
  console.log('\n👋 Done!');
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});