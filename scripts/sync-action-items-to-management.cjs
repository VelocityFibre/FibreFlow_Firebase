const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, addDoc, query, where } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: 'AIzaSyCxuTGHa2F5UBHlJHWnojP1dB6GrmhNuB8',
  authDomain: 'fibreflow-73daf.firebaseapp.com',
  projectId: 'fibreflow-73daf',
  storageBucket: 'fibreflow-73daf.appspot.com',
  messagingSenderId: '577623296588',
  appId: '1:577623296588:web:f842f54c9c0f8da0a88bcd'
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function syncActionItems() {
  try {
    // Get all existing action items in management to check for duplicates
    const existingRef = collection(db, 'actionItemsManagement');
    const existingSnapshot = await getDocs(existingRef);
    const existingMap = new Map();
    
    existingSnapshot.forEach(doc => {
      const data = doc.data();
      const key = `${data.meetingId}-${data.originalActionItem.text.substring(0, 50)}`;
      existingMap.set(key, true);
    });
    
    console.log(`Found ${existingMap.size} existing managed action items`);
    
    // Get meetings with action items from July 15 onwards
    const meetingsRef = collection(db, 'meetings');
    const q = query(meetingsRef, where('dateTime', '>=', '2025-07-15'));
    const snapshot = await getDocs(q);
    
    console.log(`Found ${snapshot.size} meetings since July 15`);
    
    let totalActionItems = 0;
    let imported = 0;
    
    for (const doc of snapshot.docs) {
      const meeting = doc.data();
      if (meeting.actionItems && meeting.actionItems.length > 0) {
        for (const actionItem of meeting.actionItems) {
          totalActionItems++;
          
          // Create a key to check if exists
          const key = `${doc.id}-${actionItem.text.substring(0, 50)}`;
          
          if (!existingMap.has(key)) {
            // Import it
            const managementItem = {
              meetingId: doc.id,
              meetingTitle: meeting.title,
              meetingDate: meeting.dateTime,
              originalActionItem: actionItem,
              updates: {
                priority: actionItem.priority || 'medium',
                assignee: actionItem.assignee || '',
                assigneeEmail: actionItem.assigneeEmail || '',
                dueDate: actionItem.dueDate || null,
                status: actionItem.completed ? 'completed' : 'pending',
                notes: '',
                tags: []
              },
              status: actionItem.completed ? 'completed' : 'pending',
              history: [{
                id: Date.now().toString(36) + Math.random().toString(36).substr(2),
                timestamp: new Date().toISOString(),
                userId: 'system',
                userEmail: 'system@fibreflow.com',
                action: 'created',
                notes: 'Imported from meetings via command line sync'
              }],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              createdBy: 'system',
              updatedBy: 'system'
            };
            
            await addDoc(collection(db, 'actionItemsManagement'), managementItem);
            imported++;
            console.log(`Imported: ${actionItem.text.substring(0, 60)}... from ${meeting.title}`);
          }
        }
      }
    }
    
    console.log(`\nSummary:`);
    console.log(`Total action items found: ${totalActionItems}`);
    console.log(`New items imported: ${imported}`);
    console.log(`Already existed: ${totalActionItems - imported}`);
    
  } catch (error) {
    console.error('Error:', error);
  }
  
  process.exit(0);
}

syncActionItems();