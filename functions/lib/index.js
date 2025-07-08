"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.testAuditSystem = exports.auditSubcollections = exports.universalAuditTrail = exports.tempSyncMeetings = exports.syncFirefliesMeetingsManually = exports.syncFirefliesMeetings = exports.getFirefliesTranscript = exports.getFirefliesMeetings = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
// Initialize admin SDK
admin.initializeApp();
// Import Fireflies integration functions
var fireflies_integration_1 = require("./fireflies-integration");
Object.defineProperty(exports, "getFirefliesMeetings", { enumerable: true, get: function () { return fireflies_integration_1.getFirefliesMeetings; } });
Object.defineProperty(exports, "getFirefliesTranscript", { enumerable: true, get: function () { return fireflies_integration_1.getFirefliesTranscript; } });
Object.defineProperty(exports, "syncFirefliesMeetings", { enumerable: true, get: function () { return fireflies_integration_1.syncFirefliesMeetings; } });
Object.defineProperty(exports, "syncFirefliesMeetingsManually", { enumerable: true, get: function () { return fireflies_integration_1.syncFirefliesMeetingsManually; } });
// Temporary sync function for testing
var temp_sync_1 = require("./temp-sync");
Object.defineProperty(exports, "tempSyncMeetings", { enumerable: true, get: function () { return temp_sync_1.tempSyncMeetings; } });
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
function getEntityName(data) {
    return (data === null || data === void 0 ? void 0 : data.name) ||
        (data === null || data === void 0 ? void 0 : data.title) ||
        (data === null || data === void 0 ? void 0 : data.projectName) ||
        (data === null || data === void 0 ? void 0 : data.clientName) ||
        (data === null || data === void 0 ? void 0 : data.email) ||
        (data === null || data === void 0 ? void 0 : data.subject) ||
        (data === null || data === void 0 ? void 0 : data.text) ||
        (data === null || data === void 0 ? void 0 : data.id) ||
        'Unknown';
}
// Helper to get user info from document
function getUserInfo(data) {
    return {
        userId: (data === null || data === void 0 ? void 0 : data.updatedBy) || (data === null || data === void 0 ? void 0 : data.createdBy) || (data === null || data === void 0 ? void 0 : data.userId) || 'system',
        userEmail: (data === null || data === void 0 ? void 0 : data.updatedByEmail) || (data === null || data === void 0 ? void 0 : data.createdByEmail) || (data === null || data === void 0 ? void 0 : data.userEmail) || 'system@fibreflow.com',
        userDisplayName: (data === null || data === void 0 ? void 0 : data.updatedByName) || (data === null || data === void 0 ? void 0 : data.createdByName) || (data === null || data === void 0 ? void 0 : data.userDisplayName) || 'System'
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
        }
        else if (!afterData) {
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
                if (['updatedAt', 'createdAt', 'updatedBy', 'createdBy'].includes(key))
                    return;
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
            if (changes.length === 0)
                changes = undefined;
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
    }
    catch (error) {
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
        if (collection === 'audit-logs' || subcollection === 'audit-logs')
            return null;
        const beforeData = change.before.exists ? change.before.data() : null;
        const afterData = change.after.exists ? change.after.data() : null;
        // Determine action type
        let action = 'update';
        if (!beforeData) {
            action = 'create';
        }
        else if (!afterData) {
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
    }
    catch (error) {
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
    }
    catch (error) {
        console.error('Test function error:', error);
        res.status(500).json({
            error: error.message,
            stack: error.stack
        });
    }
});
//# sourceMappingURL=index.js.map