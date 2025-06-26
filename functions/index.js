const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors')({ origin: true });

// Initialize admin SDK
admin.initializeApp();

// Map collection names to entity types
const COLLECTION_TO_ENTITY_MAP = {
  'projects': 'project',
  'tasks': 'task',
  'clients': 'client',
  'suppliers': 'supplier',
  'contractors': 'contractor',
  'staff': 'staff',
  'stock': 'stock',
  'stockMovements': 'stock',
  'materials': 'material',
  'boq': 'boq',
  'boqItems': 'boq',
  'quotes': 'quote',
  'rfqs': 'quote',
  'phases': 'phase',
  'steps': 'step',
  'roles': 'role',
  'emailLogs': 'email',
  'contractor-projects': 'contractor',
  'daily-progress': 'project',
  'daily-kpis': 'project',
  'mail': 'email',
};

// Collections to exclude from tracking
const EXCLUDED_COLLECTIONS = [
  'audit-logs',
  'debug-logs',
  'system-config'
];

// Helper to extract entity name from document data
function getEntityName(data) {
  return data?.name || 
         data?.title || 
         data?.projectName || 
         data?.clientName || 
         data?.email || 
         data?.subject ||
         data?.id || 
         'Unknown';
}

// Helper to get user info from document
function getUserInfo(data) {
  return {
    userId: data?.updatedBy || data?.createdBy || data?.userId || 'system',
    userEmail: data?.updatedByEmail || data?.createdByEmail || data?.userEmail || 'system@fibreflow.com',
    userDisplayName: data?.updatedByName || data?.createdByName || data?.userDisplayName || 'System'
  };
}

// Single universal audit function for all collections
exports.universalAuditTrail = functions.firestore
  .document('{collection}/{documentId}')
  .onWrite(async (change, context) => {
    try {
      const { collection, documentId } = context.params;
      
      // Skip excluded collections
      if (EXCLUDED_COLLECTIONS.includes(collection)) {
        return null;
      }
      
      const beforeData = change.before.exists ? change.before.data() : null;
      const afterData = change.after.exists ? change.after.data() : null;
      
      // Determine action type
      let action = 'update';
      if (!beforeData) {
        action = 'create';
      } else if (!afterData) {
        action = 'delete';
      }
      
      // Get user info from the document
      const userInfo = getUserInfo(afterData || beforeData);
      
      // Calculate field changes for updates
      let changes = undefined;
      if (action === 'update' && beforeData && afterData) {
        changes = [];
        const allKeys = new Set([...Object.keys(beforeData), ...Object.keys(afterData)]);
        
        allKeys.forEach(key => {
          // Skip system fields
          if (['updatedAt', 'createdAt', 'updatedBy', 'createdBy'].includes(key)) return;
          
          const oldValue = beforeData[key];
          const newValue = afterData[key];
          
          if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
            changes.push({
              field: key,
              oldValue: oldValue,
              newValue: newValue,
              dataType: typeof newValue,
              displayOldValue: String(oldValue || ''),
              displayNewValue: String(newValue || '')
            });
          }
        });
        
        if (changes.length === 0) changes = undefined;
      }
      
      // Create audit log
      const auditLog = {
        id: context.eventId, // Use event ID to prevent duplicates
        entityType: COLLECTION_TO_ENTITY_MAP[collection] || collection,
        entityId: documentId,
        entityName: getEntityName(afterData || beforeData),
        action: action,
        changes: changes,
        userId: userInfo.userId,
        userEmail: userInfo.userEmail,
        userDisplayName: userInfo.userDisplayName,
        actionType: userInfo.userId === 'system' ? 'system' : 'user',
        status: 'success',
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        metadata: {
          collection: collection,
          cloudFunction: true,
          eventId: context.eventId
        },
        source: 'audit'
      };
      
      // Write to audit-logs collection
      await admin.firestore()
        .collection('audit-logs')
        .doc(context.eventId) // Use eventId as doc ID to prevent duplicates
        .set(auditLog, { merge: true });
        
      console.log(`Audit log created for ${collection}/${documentId} - ${action}`);
      return null;
      
    } catch (error) {
      console.error('Error creating audit log:', error);
      // Don't throw - we don't want to fail the original operation
      return null;
    }
  });

// Audit function for nested subcollections
exports.auditSubcollections = functions.firestore
  .document('{collection}/{documentId}/{subcollection}/{subdocumentId}')
  .onWrite(async (change, context) => {
    try {
      const { collection, documentId, subcollection, subdocumentId } = context.params;
      
      // Skip if it's the audit-logs collection itself
      if (collection === 'audit-logs' || subcollection === 'audit-logs') return null;
      
      const beforeData = change.before.exists ? change.before.data() : null;
      const afterData = change.after.exists ? change.after.data() : null;
      
      // Determine action type
      let action = 'update';
      if (!beforeData) {
        action = 'create';
      } else if (!afterData) {
        action = 'delete';
      }
      
      const userInfo = getUserInfo(afterData || beforeData);
      
      // Create audit log
      const auditLog = {
        id: context.eventId,
        entityType: COLLECTION_TO_ENTITY_MAP[subcollection] || subcollection,
        entityId: subdocumentId,
        entityName: getEntityName(afterData || beforeData),
        action: action,
        userId: userInfo.userId,
        userEmail: userInfo.userEmail,
        userDisplayName: userInfo.userDisplayName,
        actionType: userInfo.userId === 'system' ? 'system' : 'user',
        status: 'success',
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        metadata: {
          parentCollection: collection,
          parentId: documentId,
          collection: subcollection,
          cloudFunction: true,
          eventId: context.eventId
        },
        source: 'audit'
      };
      
      await admin.firestore()
        .collection('audit-logs')
        .doc(context.eventId)
        .set(auditLog, { merge: true });
      
      return null;
    } catch (error) {
      console.error('Error creating subcollection audit log:', error);
      return null;
    }
  });

// Test function to verify deployment
exports.testAuditSystem = functions.https.onRequest(async (req, res) => {
  try {
    const testLog = {
      entityType: 'test',
      entityId: 'test-' + Date.now(),
      entityName: 'Test Audit Log Entry',
      action: 'create',
      userId: 'cloud-function',
      userEmail: 'test@fibreflow.com',
      userDisplayName: 'Cloud Function Test',
      actionType: 'system',
      status: 'success',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      metadata: {
        test: true,
        cloudFunction: true,
        testMessage: 'This is a test audit log created by Cloud Functions'
      },
      source: 'audit'
    };
    
    const docRef = await admin.firestore()
      .collection('audit-logs')
      .add(testLog);
      
    res.json({ 
      success: true, 
      message: 'Test audit log created successfully',
      documentId: docRef.id,
      checkUrl: 'https://fibreflow-73daf.web.app/audit-trail'
    });
  } catch (error) {
    console.error('Test function error:', error);
    res.status(500).json({ 
      error: error.message,
      stack: error.stack 
    });
  }
});

// =================
// FIREFLIES INTEGRATION FUNCTIONS
// =================

const FIREFLIES_API_URL = 'https://api.fireflies.ai/graphql';

// Get Fireflies API key from environment
const getApiKey = () => {
  return functions.config().fireflies?.api_key || process.env.FIREFLIES_API_KEY;
};

// GraphQL request helper
const makeGraphQLRequest = async (query) => {
  const fetch = require('node-fetch');
  const apiKey = getApiKey();
  console.log('API Key configured:', apiKey ? 'yes' : 'no');
  if (!apiKey) {
    throw new functions.https.HttpsError('failed-precondition', 'Fireflies API key not configured');
  }

  const response = await fetch(FIREFLIES_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ query }),
  });

  if (!response.ok) {
    throw new functions.https.HttpsError('internal', `Fireflies API error: ${response.statusText}`);
  }

  const data = await response.json();
  if (data.errors) {
    throw new functions.https.HttpsError('internal', `GraphQL errors: ${JSON.stringify(data.errors)}`);
  }

  return data.data;
};

// Get meetings from Fireflies - wrapped as callable function
exports.getFirefliesMeetings = functions.https.onCall(async (data, context) => {
  console.log('getFirefliesMeetings called with data:', data);
  
  const { dateFrom, dateTo } = data;
  
  const dateFilter = dateFrom && dateTo ? 
    `date_from: "${dateFrom}", date_to: "${dateTo}"` : 
    'limit: 10';
  
  const query = `
    query {
      transcripts(limit: ${dateFilter === 'limit: 10' ? 10 : 50}) {
        id
        title
        date
        duration
        organizer_email
        transcript_url
        summary {
          overview
          action_items
          outline
          shorthand_bullet
        }
        sentences {
          text
          speaker_name
        }
      }
    }
  `;

  try {
    console.log('Making GraphQL request with query:', query);
    const result = await makeGraphQLRequest(query);
    console.log('GraphQL response:', result);
    const transcripts = result.transcripts || [];
    console.log(`Returning ${transcripts.length} transcripts`);
    
    // Convert transcripts to meetings format
    const meetings = transcripts.map(t => ({
      id: t.id,
      title: t.title,
      date: new Date(t.date).toISOString(),
      duration: t.duration,
      participants: [{
        name: t.organizer_email?.split('@')[0] || 'Unknown',
        email: t.organizer_email || ''
      }],
      transcript_url: t.transcript_url || '',
      summary: t.summary?.overview || '',
      action_items: t.summary?.action_items ? 
        t.summary.action_items.split('\n').filter(item => item.trim()).map((item, idx) => ({
          text: item,
          assignee: '',
          due_date: '',
          speaker: '',
          timestamp: 0
        })) : [],
      video_url: '',
      audio_url: ''
    }));
    
    return { meetings };
  } catch (error) {
    console.error('Error fetching meetings:', error);
    console.error('Error details:', error.message);
    throw new functions.https.HttpsError('internal', `Failed to fetch meetings: ${error.message}`);
  }
});

// Test function to verify Fireflies API connectivity
exports.testFirefliesConnection = functions.https.onRequest(async (req, res) => {
  // Enable CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }
  
  try {
    const apiKey = getApiKey();
    if (!apiKey) {
      res.status(500).json({ error: 'Fireflies API key not configured' });
      return;
    }
    
    // Test basic query
    const query = `
      query {
        user {
          email
          name
        }
      }
    `;
    
    const result = await makeGraphQLRequest(query);
    res.json({ 
      success: true, 
      message: 'Fireflies API connection successful',
      user: result.user,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Test function error:', error);
    res.status(500).json({ 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Get meeting transcript - wrapped as callable function
exports.getFirefliesTranscript = functions.https.onCall(async (data, context) => {
  const { meetingId } = data;
  if (!meetingId) {
    throw new functions.https.HttpsError('invalid-argument', 'Meeting ID is required');
  }

  const query = `
    query GetTranscript($meetingId: String!) {
      meeting(id: $meetingId) {
        transcript {
          sentences {
            text
            speaker_name
            speaker_email
            start_time
            end_time
          }
          summary
          keywords
          action_items {
            text
            assignee
            due_date
            speaker
            timestamp
          }
        }
      }
    }
  `;

  try {
    const result = await makeGraphQLRequest(query);
    return { transcript: result.meeting?.transcript || null };
  } catch (error) {
    console.error('Error fetching transcript:', error);
    throw error;
  }
});

// Import test functions
const testFunctions = require('./test-meetings');
exports.simpleMeetings = testFunctions.simpleMeetings;
exports.firefliesMeetings = testFunctions.firefliesMeetings;

// Sync meetings from Fireflies - can be called on schedule
exports.syncFirefliesMeetings = functions.pubsub.schedule('every 6 hours').onRun(async (context) => {
  console.log('Starting Fireflies sync...');
  
  // Get meetings from last 7 days
  const dateFrom = new Date();
  dateFrom.setDate(dateFrom.getDate() - 7);
  const dateTo = new Date();
  
  const query = `
    query GetMeetings {
      meetings(date_from: "${dateFrom.toISOString()}", date_to: "${dateTo.toISOString()}") {
        id
        title
        date
        duration
        participants {
          name
          email
        }
        transcript_url
        summary
        action_items {
          text
          assignee
          due_date
          speaker
          timestamp
        }
        video_url
        audio_url
      }
    }
  `;

  try {
    const result = await makeGraphQLRequest(query);
    const meetings = result.meetings || [];
    
    console.log(`Found ${meetings.length} meetings to sync`);
    
    // Save meetings to Firestore
    const batch = admin.firestore().batch();
    
    for (const meeting of meetings) {
      const meetingRef = admin.firestore()
        .collection('meetings')
        .doc(meeting.id);
      
      batch.set(meetingRef, {
        ...meeting,
        syncedAt: admin.firestore.FieldValue.serverTimestamp(),
        source: 'fireflies',
      }, { merge: true });
    }
    
    await batch.commit();
    console.log('Fireflies sync completed successfully');
    
    return null;
  } catch (error) {
    console.error('Error syncing meetings:', error);
    throw error;
  }
});