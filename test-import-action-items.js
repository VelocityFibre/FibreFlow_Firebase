const admin = require('firebase-admin');
const serviceAccount = require('./fibreflow-service-account.json');

// Initialize admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'fibreflow-73daf'
});

const db = admin.firestore();

async function testImportActionItems() {
  console.log('🚀 Testing action items import from meetings...\n');
  
  try {
    // Get all meetings with action items
    const meetingsSnapshot = await db.collection('meetings').get();
    console.log(`📊 Found ${meetingsSnapshot.size} meetings`);
    
    // Get existing managed action items
    const managedSnapshot = await db.collection('actionItemsManagement').get();
    console.log(`📋 Existing managed action items: ${managedSnapshot.size}`);
    
    // Build existing items map
    const existingMap = new Map();
    managedSnapshot.forEach(doc => {
      const data = doc.data();
      const key = `${data.meetingId}-${data.originalActionItem.text}`;
      existingMap.set(key, data);
    });
    
    let importCount = 0;
    let totalActionItems = 0;
    
    // Process each meeting
    for (const meetingDoc of meetingsSnapshot.docs) {
      const meetingData = meetingDoc.data();
      const meetingId = meetingDoc.id;
      
      if (meetingData.actionItems && meetingData.actionItems.length > 0) {
        totalActionItems += meetingData.actionItems.length;
        
        for (const actionItem of meetingData.actionItems) {
          const key = `${meetingId}-${actionItem.text}`;
          
          // Only import if not already exists
          if (!existingMap.has(key)) {
            const managedItem = {
              meetingId,
              meetingTitle: meetingData.title,
              meetingDate: meetingData.dateTime,
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
                notes: 'Action item imported from meeting'
              }],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              createdBy: 'system',
              updatedBy: 'system'
            };
            
            // Add to Firestore
            await db.collection('actionItemsManagement').add(managedItem);
            importCount++;
            
            if (importCount % 10 === 0) {
              console.log(`📝 Imported ${importCount} action items so far...`);
            }
          }
        }
      }
    }
    
    console.log(`\n✅ Import complete!`);
    console.log(`📊 Total action items in meetings: ${totalActionItems}`);
    console.log(`📋 Previously managed: ${managedSnapshot.size}`);
    console.log(`🆕 Newly imported: ${importCount}`);
    console.log(`📈 Total now managed: ${managedSnapshot.size + importCount}`);
    
  } catch (error) {
    console.error('❌ Error during import:', error);
  } finally {
    process.exit(0);
  }
}

testImportActionItems();