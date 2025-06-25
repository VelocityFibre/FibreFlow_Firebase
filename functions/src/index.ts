import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Initialize admin SDK
admin.initializeApp();

// Import Fireflies integration functions
export { 
  getFirefliesMeetings, 
  getFirefliesTranscript, 
  syncFirefliesMeetings 
} from './fireflies-integration';

// Map collection names to entity types
const COLLECTION_TO_ENTITY_MAP: Record<string, string> = {
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
  'meetings': 'meeting',
  'personalTodos': 'todo',
};

// Collections to exclude from tracking
const EXCLUDED_COLLECTIONS = [
  'audit-logs',
  'debug-logs',
  'system-config'
];

// Helper to extract entity name from document data
function getEntityName(data: any): string {
  return data?.name || 
         data?.title || 
         data?.projectName || 
         data?.clientName || 
         data?.email || 
         data?.subject ||
         data?.text ||
         data?.id || 
         'Unknown';
}

// Helper to get user info from document
function getUserInfo(data: any) {
  return {
    userId: data?.updatedBy || data?.createdBy || data?.userId || 'system',
    userEmail: data?.updatedByEmail || data?.createdByEmail || data?.userEmail || 'system@fibreflow.com',
    userDisplayName: data?.updatedByName || data?.createdByName || data?.userDisplayName || 'System'
  };
}

// Single universal audit function for all collections
export const universalAuditTrail = functions.firestore
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
      let changes: any[] | undefined = undefined;
      if (action === 'update' && beforeData && afterData) {
        changes = [];
        const allKeys = new Set([...Object.keys(beforeData), ...Object.keys(afterData)]);
        
        allKeys.forEach(key => {
          // Skip system fields
          if (['updatedAt', 'createdAt', 'updatedBy', 'createdBy'].includes(key)) return;
          
          const oldValue = beforeData[key];
          const newValue = afterData[key];
          
          if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
            changes!.push({
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
export const auditSubcollections = functions.firestore
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
export const testAuditSystem = functions.https.onRequest(async (req, res) => {
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
  } catch (error: any) {
    console.error('Test function error:', error);
    res.status(500).json({ 
      error: error.message,
      stack: error.stack 
    });
  }
});