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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncFirefliesMeetings = exports.getFirefliesTranscript = exports.getFirefliesMeetings = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const node_fetch_1 = __importDefault(require("node-fetch"));
const FIREFLIES_API_URL = 'https://api.fireflies.ai/graphql';
// Get Fireflies API key from environment
const getApiKey = () => {
    var _a;
    return ((_a = functions.config().fireflies) === null || _a === void 0 ? void 0 : _a.api_key) || process.env.FIREFLIES_API_KEY;
};
// GraphQL request helper
const makeGraphQLRequest = async (query) => {
    const apiKey = getApiKey();
    if (!apiKey) {
        throw new functions.https.HttpsError('failed-precondition', 'Fireflies API key not configured');
    }
    const response = await (0, node_fetch_1.default)(FIREFLIES_API_URL, {
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
// Get meetings from Fireflies
exports.getFirefliesMeetings = functions.https.onCall(async (data, context) => {
    // Check authentication
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const { dateFrom, dateTo } = data;
    const dateFilter = dateFrom && dateTo ?
        `date_from: "${dateFrom}", date_to: "${dateTo}"` :
        'limit: 10';
    const query = `
    query GetMeetings {
      meetings(${dateFilter}) {
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
        return { meetings: result.meetings || [] };
    }
    catch (error) {
        console.error('Error fetching meetings:', error);
        throw error;
    }
});
// Get meeting transcript
exports.getFirefliesTranscript = functions.https.onCall(async (data, context) => {
    // Check authentication
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const { meetingId } = data;
    if (!meetingId) {
        throw new functions.https.HttpsError('invalid-argument', 'Meeting ID is required');
    }
    const query = `
    query GetTranscript {
      transcript(id: "${meetingId}") {
        meeting_id
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
  `;
    try {
        const result = await makeGraphQLRequest(query);
        // Store transcript in Firebase Storage
        const bucket = admin.storage().bucket();
        const file = bucket.file(`meetings/${meetingId}/transcript.json`);
        await file.save(JSON.stringify(result.transcript), {
            metadata: {
                contentType: 'application/json',
                metadata: {
                    meetingId,
                    processedAt: new Date().toISOString(),
                }
            }
        });
        // Get signed URL for the transcript
        const [url] = await file.getSignedUrl({
            action: 'read',
            expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
        });
        return Object.assign(Object.assign({}, result.transcript), { storageUrl: url });
    }
    catch (error) {
        console.error('Error fetching transcript:', error);
        throw error;
    }
});
// Sync meetings periodically
exports.syncFirefliesMeetings = functions.pubsub
    .schedule('every 6 hours')
    .onRun(async (context) => {
    console.log('Starting Fireflies sync...');
    // Get meetings from last 24 hours
    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - 1);
    const dateTo = new Date();
    const query = `
      query GetRecentMeetings {
        meetings(date_from: "${dateFrom.toISOString()}", date_to: "${dateTo.toISOString()}") {
          id
          title
          date
          duration
          participants {
            name
            email
          }
          summary
          action_items {
            text
            assignee
            due_date
            speaker
            timestamp
          }
        }
      }
    `;
    try {
        const result = await makeGraphQLRequest(query);
        const meetings = result.meetings || [];
        console.log(`Found ${meetings.length} meetings to sync`);
        const db = admin.firestore();
        const batch = db.batch();
        for (const meeting of meetings) {
            // Check if meeting already exists
            const existingMeeting = await db.collection('meetings')
                .where('firefliesToId', '==', meeting.id)
                .get();
            if (existingMeeting.empty) {
                // Create new meeting
                const meetingRef = db.collection('meetings').doc();
                batch.set(meetingRef, {
                    firefliesToId: meeting.id,
                    title: meeting.title,
                    date: admin.firestore.Timestamp.fromDate(new Date(meeting.date)),
                    duration: meeting.duration,
                    participants: meeting.participants,
                    summary: meeting.summary,
                    actionItems: meeting.action_items.map((item, index) => (Object.assign(Object.assign({ id: `${meeting.id}_action_${index}` }, item), { dueDate: item.due_date ? admin.firestore.Timestamp.fromDate(new Date(item.due_date)) : null, priority: extractPriority(item.text), completed: false }))),
                    status: 'pending',
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
            }
        }
        await batch.commit();
        console.log('Fireflies sync completed');
        return null;
    }
    catch (error) {
        console.error('Error syncing meetings:', error);
        throw error;
    }
});
// Helper function to extract priority
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
//# sourceMappingURL=fireflies-integration.js.map