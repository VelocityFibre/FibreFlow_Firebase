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
exports.tempSyncMeetings = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const node_fetch_1 = __importDefault(require("node-fetch"));
// Get Fireflies API key from environment
const getApiKey = () => {
    var _a;
    return ((_a = functions.config().fireflies) === null || _a === void 0 ? void 0 : _a.api_key) || process.env.FIREFLIES_API_KEY;
};
// GraphQL request helper
const makeGraphQLRequest = async (query) => {
    const apiKey = getApiKey();
    if (!apiKey) {
        throw new Error('Fireflies API key not configured');
    }
    const response = await (0, node_fetch_1.default)('https://api.fireflies.ai/graphql', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ query }),
    });
    if (!response.ok) {
        throw new Error(`Fireflies API error: ${response.statusText}`);
    }
    const data = await response.json();
    if (data.errors) {
        throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
    }
    return data.data;
};
// Temporary HTTP function for direct sync
exports.tempSyncMeetings = functions
    .runWith({
    timeoutSeconds: 300,
    memory: '512MB'
})
    .https.onRequest(async (req, res) => {
    // Enable CORS
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST');
    console.log('Starting temporary sync...');
    try {
        const daysBack = parseInt(req.query.days) || 30;
        const dateFrom = new Date();
        dateFrom.setDate(dateFrom.getDate() - daysBack);
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
        const result = await makeGraphQLRequest(query);
        const meetings = result.meetings || [];
        console.log(`Found ${meetings.length} meetings to sync`);
        const db = admin.firestore();
        let newMeetings = 0;
        let updatedMeetings = 0;
        const meetingDetails = [];
        for (const meeting of meetings) {
            const existingMeeting = await db.collection('meetings')
                .where('firefliesId', '==', meeting.id)
                .get();
            const meetingData = {
                firefliesId: meeting.id,
                title: meeting.title,
                dateTime: meeting.date,
                duration: meeting.duration,
                participants: meeting.participants,
                summary: meeting.summary || '',
                actionItems: meeting.action_items ? meeting.action_items.map((item, index) => ({
                    id: `${meeting.id}_action_${index}`,
                    text: item.text,
                    assignee: item.assignee || '',
                    dueDate: item.due_date || null,
                    priority: extractPriority(item.text),
                    completed: false,
                    speaker: item.speaker || '',
                    timestamp: item.timestamp || 0
                })) : [],
                status: 'synced',
                updatedAt: new Date().toISOString(),
            };
            if (existingMeeting.empty) {
                meetingData.createdAt = new Date().toISOString();
                const docRef = await db.collection('meetings').add(meetingData);
                newMeetings++;
                meetingDetails.push({
                    id: docRef.id,
                    title: meeting.title,
                    date: meeting.date,
                    status: 'created'
                });
            }
            else {
                const docId = existingMeeting.docs[0].id;
                await db.collection('meetings').doc(docId).update(meetingData);
                updatedMeetings++;
                meetingDetails.push({
                    id: docId,
                    title: meeting.title,
                    date: meeting.date,
                    status: 'updated'
                });
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
            },
            meetings: meetingDetails
        };
        console.log('Sync completed:', response);
        res.status(200).json(response);
    }
    catch (error) {
        console.error('Error in sync:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to sync meetings',
            details: error.toString()
        });
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
//# sourceMappingURL=temp-sync.js.map