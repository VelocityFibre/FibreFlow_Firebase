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
exports.syncFirefliesMeetingsManually = exports.syncFirefliesMeetings = exports.getFirefliesTranscript = exports.getFirefliesMeetings = void 0;
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
    // Authentication check removed - public access allowed
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
    // Authentication check removed - public access allowed
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
    var _a, _b, _c, _d, _e, _f;
    console.log('Starting Fireflies sync...');
    // Get meetings from last 24 hours
    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - 1);
    const dateTo = new Date();
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
    try {
        const result = await makeGraphQLRequest(query);
        const meetings = result.transcripts || [];
        console.log(`Found ${meetings.length} meetings to sync`);
        const db = admin.firestore();
        const batch = db.batch();
        for (const meeting of meetings) {
            // Check if meeting already exists
            const existingMeeting = await db.collection('meetings')
                .where('firefliesId', '==', meeting.id)
                .get();
            if (existingMeeting.empty) {
                // Create new meeting
                const meetingRef = db.collection('meetings').doc();
                batch.set(meetingRef, {
                    firefliesId: meeting.id,
                    title: meeting.title,
                    dateTime: meeting.date,
                    duration: meeting.duration,
                    participants: meeting.participants ? meeting.participants.map((email) => ({
                        name: email.split('@')[0],
                        email: email
                    })) : [],
                    organizer: meeting.organizer_email || '',
                    meetingUrl: meeting.meeting_link || '',
                    summary: ((_a = meeting.summary) === null || _a === void 0 ? void 0 : _a.overview) || ((_b = meeting.summary) === null || _b === void 0 ? void 0 : _b.short_summary) || '',
                    actionItems: ((_c = meeting.summary) === null || _c === void 0 ? void 0 : _c.action_items) ? meeting.summary.action_items.map((item, index) => ({
                        id: `${meeting.id}_action_${index}`,
                        text: item,
                        assignee: '',
                        dueDate: null,
                        priority: extractPriority(item),
                        completed: false,
                        speaker: '',
                        timestamp: 0
                    })) : [],
                    insights: {
                        keywords: ((_d = meeting.summary) === null || _d === void 0 ? void 0 : _d.keywords) || [],
                        outline: ((_e = meeting.summary) === null || _e === void 0 ? void 0 : _e.outline) || '',
                        bulletPoints: ((_f = meeting.summary) === null || _f === void 0 ? void 0 : _f.bullet_gist) || ''
                    },
                    status: 'synced',
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
// Manual sync function as a callable function (no IAM issues)
exports.syncFirefliesMeetingsManually = functions.https.onCall(async (data, context) => {
    var _a, _b, _c, _d, _e, _f;
    console.log('Starting manual Fireflies sync...');
    try {
        // Get date range from data or default to last 7 days
        const daysBack = data.days || 7;
        const dateFrom = new Date();
        dateFrom.setDate(dateFrom.getDate() - daysBack);
        const dateTo = new Date();
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
        const result = await makeGraphQLRequest(query);
        const meetings = result.transcripts || [];
        console.log(`Found ${meetings.length} meetings to sync`);
        const db = admin.firestore();
        let newMeetings = 0;
        let updatedMeetings = 0;
        for (const meeting of meetings) {
            // Check if meeting already exists
            const existingMeeting = await db.collection('meetings')
                .where('firefliesId', '==', meeting.id)
                .get();
            const meetingData = {
                firefliesId: meeting.id,
                title: meeting.title,
                dateTime: meeting.date,
                duration: meeting.duration,
                participants: meeting.participants ? meeting.participants.map((email) => ({
                    name: email.split('@')[0],
                    email: email
                })) : [],
                organizer: meeting.organizer_email || '',
                meetingUrl: meeting.meeting_link || '',
                summary: ((_a = meeting.summary) === null || _a === void 0 ? void 0 : _a.overview) || ((_b = meeting.summary) === null || _b === void 0 ? void 0 : _b.short_summary) || '',
                actionItems: ((_c = meeting.summary) === null || _c === void 0 ? void 0 : _c.action_items) ? meeting.summary.action_items.map((item, index) => ({
                    id: `${meeting.id}_action_${index}`,
                    text: item,
                    assignee: '',
                    dueDate: null,
                    priority: extractPriority(item),
                    completed: false,
                    speaker: '',
                    timestamp: 0
                })) : [],
                insights: {
                    keywords: ((_d = meeting.summary) === null || _d === void 0 ? void 0 : _d.keywords) || [],
                    outline: ((_e = meeting.summary) === null || _e === void 0 ? void 0 : _e.outline) || '',
                    bulletPoints: ((_f = meeting.summary) === null || _f === void 0 ? void 0 : _f.bullet_gist) || ''
                },
                status: 'synced',
                updatedAt: new Date().toISOString(),
            };
            if (existingMeeting.empty) {
                // Create new meeting
                meetingData.createdAt = new Date().toISOString();
                await db.collection('meetings').add(meetingData);
                newMeetings++;
            }
            else {
                // Update existing meeting
                const docId = existingMeeting.docs[0].id;
                await db.collection('meetings').doc(docId).update(meetingData);
                updatedMeetings++;
            }
        }
        const response = {
            success: true,
            message: 'Fireflies sync completed',
            stats: {
                totalMeetings: meetings.length,
                newMeetings,
                updatedMeetings,
                dateRange: {
                    from: dateFrom.toISOString(),
                    to: dateTo.toISOString()
                }
            }
        };
        console.log('Manual sync completed:', response);
        return response;
    }
    catch (error) {
        console.error('Error in manual sync:', error);
        throw new functions.https.HttpsError('internal', error.message || 'Failed to sync meetings');
    }
});
//# sourceMappingURL=fireflies-integration.js.map