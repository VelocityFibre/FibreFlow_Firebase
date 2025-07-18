const functions = require('firebase-functions');
const cors = require('cors')({ origin: true });
const ChatHandler = require('./chat-handler');

// Initialize chat handler
let chatHandler = null;
function getChatHandler() {
  if (!chatHandler) {
    chatHandler = new ChatHandler();
  }
  return chatHandler;
}

// Main agent chat function (callable) - requires authentication
exports.agentChat = functions.https.onCall(async (data, context) => {
  try {
    const handler = getChatHandler();
    
    // Add user info from authenticated context
    if (context.auth) {
      data.userId = context.auth.uid;
      data.userEmail = context.auth.token.email;
    } else {
      // Allow unauthenticated for development
      console.warn('Unauthenticated agent chat request');
      data.userId = 'anonymous';
      data.userEmail = 'anonymous@fibreflow.app';
    }
    
    return await handler.handleChat(data);
  } catch (error) {
    console.error('Agent chat error:', error);
    throw error;
  }
});

// HTTP endpoint for authenticated requests only
exports.agentChatHttp = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed. Use POST.' });
        return;
      }

      // Simple API key check for HTTP endpoint
      const apiKey = req.headers['x-api-key'] || req.body.apiKey;
      if (!apiKey || apiKey !== 'fibreflow-agent-key') {
        res.status(401).json({ error: 'Unauthorized. Valid API key required.' });
        return;
      }
      
      const handler = getChatHandler();
      const requestData = { ...req.body };
      requestData.userId = requestData.userId || 'http-client';
      requestData.userEmail = requestData.userEmail || 'http@fibreflow.app';
      
      const result = await handler.handleChat(requestData);
      res.status(200).json(result);
      
    } catch (error) {
      console.error('Agent chat HTTP error:', error);
      res.status(500).json({
        error: error.message || 'Internal server error',
        code: error.code || 'internal'
      });
    }
  });
});

// Function to search agent memory
exports.searchAgentMemory = functions.https.onCall(async (data, context) => {
  try {
    const { query, type = 'conversations', limit = 20 } = data;
    
    if (!query) {
      throw new functions.https.HttpsError('invalid-argument', 'Query is required');
    }
    
    const handler = getChatHandler();
    const memoryService = handler.memoryService;
    
    let results = [];
    
    switch (type) {
      case 'conversations':
        results = await memoryService.searchConversations(query, limit);
        break;
      case 'patterns':
        results = await memoryService.searchPatterns(query);
        break;
      default:
        throw new functions.https.HttpsError('invalid-argument', 'Invalid search type');
    }
    
    return {
      success: true,
      results,
      count: results.length,
      type
    };
    
  } catch (error) {
    console.error('Memory search error:', error);
    throw error;
  }
});

// Function to get agent stats
exports.getAgentStats = functions.https.onCall(async (data, context) => {
  try {
    const handler = getChatHandler();
    const memoryService = handler.memoryService;
    
    // Get counts from Firestore
    const [conversationsSnapshot, patternsSnapshot] = await Promise.all([
      memoryService.conversationsRef.limit(1000).get(),
      memoryService.patternsRef.limit(1000).get()
    ]);
    
    // Get unique sessions
    const sessions = new Set();
    const intents = {};
    
    conversationsSnapshot.forEach(doc => {
      const data = doc.data();
      sessions.add(data.sessionId);
      
      if (data.intent?.intent) {
        intents[data.intent.intent] = (intents[data.intent.intent] || 0) + 1;
      }
    });
    
    return {
      success: true,
      stats: {
        totalConversations: conversationsSnapshot.size,
        uniqueSessions: sessions.size,
        totalPatterns: patternsSnapshot.size,
        intentBreakdown: intents,
        lastUpdated: new Date().toISOString()
      }
    };
    
  } catch (error) {
    console.error('Stats error:', error);
    throw error;
  }
});