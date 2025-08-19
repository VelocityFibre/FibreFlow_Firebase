const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors')({ origin: true });
const Anthropic = require('@anthropic-ai/sdk');
const winston = require('winston');
const _ = require('lodash');

// Initialize admin SDK
admin.initializeApp();

// Import agent functions
const agentFunctions = require('./src/agent');

// Initialize logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => {
      return `${timestamp} [${level.toUpperCase()}] ${message}`;
    })
  ),
  transports: [
    new winston.transports.Console()
  ]
});

// Initialize Anthropic client
let anthropic = null;
function getAnthropicClient() {
  if (!anthropic) {
    const apiKey = functions.config().anthropic?.api_key || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('Anthropic API key not configured. Set functions:config:set anthropic.api_key="your_key"');
    }
    anthropic = new Anthropic({ apiKey });
  }
  return anthropic;
}

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

// =============================================================================
// FIBREFLOW ORCHESTRATOR AGENT API
// =============================================================================

// User configuration with data permissions (from orchestrator)
const AGENT_USERS = {
  'lead-dev-key': {
    name: 'Lead Dev',
    role: 'lead',
    canWrite: true,
    canLearn: true,
    dataAccess: ['projects', 'contractors', 'inventory', 'admin']
  },
  'dept-head-key': {
    name: 'Dept Head',
    role: 'developer',
    canWrite: false,
    canLearn: false,
    dataAccess: ['projects', 'contractors', 'reports']
  },
  'project-manager-key': {
    name: 'Project Manager',
    role: 'manager',
    canWrite: false,
    canLearn: false,
    dataAccess: ['projects', 'contractors', 'scheduling']
  },
  'admin-user-key': {
    name: 'Admin User',
    role: 'admin',
    canWrite: false,
    canLearn: false,
    dataAccess: ['inventory', 'reports']
  },
  'app-ui-key': {
    name: 'FibreFlow App',
    role: 'app',
    canWrite: false,
    canLearn: false,
    dataAccess: ['projects', 'contractors', 'inventory']
  }
};

// Auth helper for orchestrator
function authenticateAgent(req) {
  const apiKey = req.headers['x-api-key'] || req.query.key || req.body?.apiKey;
  const user = AGENT_USERS[apiKey];
  
  if (!user) {
    throw new Error('Invalid API key');
  }
  
  return user;
}

// Main orchestrator chat endpoint (Callable Function with HTTP support)
exports.orchestratorChat = functions
  .runWith({
    // Allow unauthenticated access
    invoker: 'allUsers'
  })
  .https.onCall(async (data, context) => {
  console.log('orchestratorChat called with data:', data);
  console.log('orchestratorChat context auth:', context?.auth);
  console.log('orchestratorChat raw request:', context?.rawRequest?.headers);
  
  try {
    // Handle both direct calls and hosting proxy calls
    let message, apiKey, contextData;
    
    // Check if data is wrapped (from hosting proxy)
    if (data.data) {
      ({ message, apiKey, contextData } = data.data);
    } else {
      ({ message, apiKey, contextData } = data);
    }
    
    if (!message) {
      console.error('No message provided');
      throw new functions.https.HttpsError('invalid-argument', 'Message is required');
    }

    // Authenticate using API key (don't require Firebase auth)
    const user = AGENT_USERS[apiKey || 'app-ui-key'];
    if (!user) {
      console.error('Invalid API key:', apiKey);
      throw new functions.https.HttpsError('unauthenticated', 'Invalid API key');
    }

    logger.info(`📨 [${user.name}] ${user.canWrite ? '✏️' : '👁️'} "${message}"`);

    let anthropicClient;
    try {
      anthropicClient = getAnthropicClient();
    } catch (error) {
      console.error('Failed to get Anthropic client:', error);
      throw new functions.https.HttpsError('failed-precondition', 'Anthropic API key not configured');
    }
    
    // Search for relevant patterns first
    const patterns = await searchPatterns(message, { limit: 3 });
    const firestoreContext = await searchFirestoreContext(message, user.dataAccess, { limit: 3 });
    
    // Build system prompt with role-based context
    let systemPrompt = `You are the FibreFlow Orchestrator Agent. Help with project management, contractors, inventory, and technical issues.

USER CONTEXT:
- Name: ${user.name}
- Role: ${user.role}
- Permissions: ${user.canWrite ? 'Read/Write' : 'Read-only'}
- Data Access: ${user.dataAccess.join(', ')}

RELEVANT PATTERNS:
${patterns.map(p => `- ${p.problem}: ${p.solution}`).join('\n')}

RELEVANT FIBREFLOW DATA:
${firestoreContext.map(c => `- ${c.collection}: ${c.name || c.title || c.id} (${c.status || 'active'})`).join('\n')}

Instructions:
- Be concise and practical
- Respect user's data access permissions
- ${user.canWrite ? 'You can suggest changes and updates' : 'Provide read-only insights only'}
- Focus on FibreFlow project management context`;

    // Enhanced context for agent decisions
    const enrichedContext = {
      ...contextData,
      user: user.name,
      role: user.role,
      readOnly: !user.canWrite,
      dataAccess: user.dataAccess,
      timestamp: new Date().toISOString()
    };

    const response = await anthropicClient.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4096,
      temperature: 0.1,
      system: systemPrompt,
      messages: [{ role: 'user', content: message }]
    });

    // Store conversation if user has write permissions
    if (user.canWrite) {
      const conversation = {
        sessionId: `orchestrator-${Date.now()}`,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        userMessage: message,
        claudeResponse: response.content[0].text,
        context: enrichedContext,
        patterns: patterns,
        user: user.name,
        role: user.role,
        source: 'orchestrator'
      };

      await admin.firestore()
        .collection('orchestrator-conversations')
        .add(conversation);
    }

    // Return data in callable function format
    return {
      success: true,
      response: response.content[0].text,
      context: enrichedContext,
      mode: user.canWrite ? 'full-access' : 'read-only',
      user: user.name,
      patternsUsed: patterns.length,
      contextUsed: firestoreContext.length
    };

  } catch (error) {
    logger.error('Orchestrator chat error:', error);
    if (error.code) {
      // Already an HttpsError
      throw error;
    }
    // Convert to HttpsError
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// Data query endpoint with role-based filtering
exports.orchestratorDataQuery = functions.https.onRequest(async (req, res) => {
  // Set CORS headers explicitly
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');
  res.set('Access-Control-Max-Age', '3600');

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  return cors(req, res, async () => {
    try {
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
      }

      const user = authenticateAgent(req);
      const { query, context = {} } = req.body;
      
      if (!query) {
        return res.status(400).json({ error: 'Query is required' });
      }

      logger.info(`🔍 [${user.name}] Data query: "${query}"`);
      
      // Check if user has data access permissions
      if (!user.dataAccess || user.dataAccess.length === 0) {
        return res.status(403).json({ 
          error: 'No data access permissions',
          message: 'Contact admin for data access'
        });
      }
      
      // Query Firestore based on user's permissions
      const results = await queryFirestoreWithPermissions(query, user.dataAccess);
      
      res.json({
        success: true,
        query,
        results: results,
        user: user.name,
        dataAccess: user.dataAccess,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Orchestrator data query error:', error);
      if (error.message === 'Invalid API key') {
        return res.status(401).json({ error: 'Invalid API key' });
      }
      res.status(500).json({ 
        error: 'Data query failed',
        details: error.message 
      });
    }
  });
});

// Health check with user info
exports.orchestratorHealth = functions.https.onRequest(async (req, res) => {
  // Set CORS headers explicitly
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');
  res.set('Access-Control-Max-Age', '3600');

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  return cors(req, res, async () => {
    try {
      const user = authenticateAgent(req);
      
      res.json({ 
        status: 'ok',
        service: 'FibreFlow Orchestrator',
        user: user.name,
        role: user.role,
        permissions: {
          canWrite: user.canWrite,
          canLearn: user.canLearn,
          dataAccess: user.dataAccess
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      if (error.message === 'Invalid API key') {
        return res.status(401).json({ error: 'Invalid API key' });
      }
      res.status(500).json({ error: error.message });
    }
  });
});

// Quick ask endpoint for Cursor integration
exports.orchestratorAsk = functions.https.onRequest(async (req, res) => {
  // Set CORS headers explicitly
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');
  res.set('Access-Control-Max-Age', '3600');

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  return cors(req, res, async () => {
    try {
      const question = req.params?.[0] || req.query.q || req.body?.question;
      if (!question) {
        return res.status(400).json({ error: 'Question parameter required' });
      }

      // Default to read-only unless valid write key
      let user;
      try {
        user = authenticateAgent(req);
      } catch {
        user = { 
          name: 'Anonymous', 
          role: 'guest',
          canWrite: false, 
          canLearn: false,
          dataAccess: ['projects'] // Limited access for anonymous
        };
      }
      
      logger.info(`🔍 [${user.name}] Quick query: "${question}"`);
      
      const anthropicClient = getAnthropicClient();
      
      // Get basic context
      const contextData = await searchFirestoreContext(question, user.dataAccess, { limit: 2 });
      
      const systemPrompt = `You are a helpful FibreFlow assistant. Provide concise, practical answers.
      
Available data: ${contextData.map(c => `${c.collection}: ${c.name || c.id}`).join(', ')}

Keep responses brief and actionable.`;

      const response = await anthropicClient.messages.create({
        model: 'claude-3-haiku-20240307', // Faster model for quick queries
        max_tokens: 1024,
        temperature: 0.1,
        system: systemPrompt,
        messages: [{ role: 'user', content: question }]
      });

      // Return plain text for Cursor compatibility
      res.type('text/plain');
      res.send(response.content[0].text || 'Completed successfully');
      
    } catch (error) {
      logger.error('Orchestrator ask error:', error);
      res.status(500).send(`Error: ${error.message}`);
    }
  });
});

// =============================================================================
// CLAUDE AGENT API ENDPOINTS (Updated)
// =============================================================================

// Main Claude agent chat endpoint
exports.claudeChat = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
      }

      const { message, sessionId, context } = req.body;
      if (!message) {
        return res.status(400).json({ error: 'Message is required' });
      }

      const anthropicClient = getAnthropicClient();
      
      // Search for relevant patterns first
      const patterns = await searchPatterns(message, { limit: 3 });
      const contextData = await searchProjectContext(message, { limit: 3 });
      
      // Build system prompt with context
      let systemPrompt = `You are a FibreFlow assistant. Help with project management, contractors, inventory, and technical issues.

RELEVANT PATTERNS:
${patterns.map(p => `- ${p.problem}: ${p.solution}`).join('\n')}

RELEVANT CONTEXT:
${contextData.map(c => `- ${c.name}: ${c.description || c.status}`).join('\n')}

Be concise and practical in your responses.`;

      const response = await anthropicClient.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4096,
        temperature: 0.1,
        system: systemPrompt,
        messages: [{ role: 'user', content: message }]
      });

      // Store conversation
      const conversation = {
        sessionId: sessionId || `session-${Date.now()}`,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        userMessage: message,
        claudeResponse: response.content[0].text,
        context: context || {},
        patterns: patterns,
        source: 'claude-functions'
      };

      await admin.firestore()
        .collection('claude-conversations')
        .add(conversation);

      res.json({
        success: true,
        response: response.content[0].text,
        sessionId: conversation.sessionId,
        patternsUsed: patterns.length,
        contextUsed: contextData.length
      });

    } catch (error) {
      logger.error('Claude chat error:', error);
      res.status(500).json({ 
        error: 'Claude chat failed',
        details: error.message 
      });
    }
  });
});

// Search patterns endpoint
exports.searchPatterns = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      const { query, limit = 5 } = req.query;
      if (!query) {
        return res.status(400).json({ error: 'Query parameter required' });
      }

      const patterns = await searchPatterns(query, { limit: parseInt(limit) });
      
      res.json({
        success: true,
        patterns: patterns,
        count: patterns.length,
        query: query
      });

    } catch (error) {
      logger.error('Pattern search error:', error);
      res.status(500).json({ 
        error: 'Pattern search failed',
        details: error.message 
      });
    }
  });
});

// Store new pattern endpoint  
exports.storePattern = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
      }

      const { problem, solution, type, context, confidence = 0.8 } = req.body;
      if (!problem || !solution) {
        return res.status(400).json({ error: 'Problem and solution are required' });
      }

      const pattern = {
        problem,
        solution,
        type: type || 'general',
        context: context || {},
        confidence,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        source: 'claude-functions',
        usageCount: 0
      };

      const docRef = await admin.firestore()
        .collection('claude-patterns')
        .add(pattern);

      res.json({
        success: true,
        patternId: docRef.id,
        pattern: pattern
      });

    } catch (error) {
      logger.error('Store pattern error:', error);
      res.status(500).json({ 
        error: 'Store pattern failed',
        details: error.message 
      });
    }
  });
});

// Search project context endpoint
exports.searchContext = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      const { query, collections = 'projects,contractors,inventory', limit = 5 } = req.query;
      if (!query) {
        return res.status(400).json({ error: 'Query parameter required' });
      }

      const searchCollections = collections.split(',');
      const context = await searchProjectContext(query, { 
        collections: searchCollections, 
        limit: parseInt(limit) 
      });
      
      res.json({
        success: true,
        context: context,
        count: context.length,
        query: query,
        collections: searchCollections
      });

    } catch (error) {
      logger.error('Context search error:', error);
      res.status(500).json({ 
        error: 'Context search failed',
        details: error.message 
      });
    }
  });
});

// Get conversation history endpoint
exports.getConversations = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      const { sessionId, limit = 10 } = req.query;
      
      let query = admin.firestore()
        .collection('claude-conversations')
        .orderBy('timestamp', 'desc')
        .limit(parseInt(limit));
      
      if (sessionId) {
        query = query.where('sessionId', '==', sessionId);
      }

      const snapshot = await query.get();
      const conversations = [];
      
      snapshot.forEach(doc => {
        conversations.push({
          id: doc.id,
          ...doc.data()
        });
      });

      res.json({
        success: true,
        conversations: conversations,
        count: conversations.length
      });

    } catch (error) {
      logger.error('Get conversations error:', error);
      res.status(500).json({ 
        error: 'Get conversations failed',
        details: error.message 
      });
    }
  });
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

// Enhanced Firestore search with permissions
async function searchFirestoreContext(query, dataAccess, options = {}) {
  try {
    const { limit = 5 } = options;
    const results = [];
    
    // Define collection mappings
    const collectionMappings = {
      'projects': 'projects',
      'contractors': 'contractors',
      'inventory': 'stockItems',
      'admin': ['audit-logs', 'system-config'],
      'reports': ['dailyProgress', 'audit-logs'],
      'scheduling': ['projects', 'contractors']
    };
    
    // Get actual collections based on permissions
    const allowedCollections = [];
    for (const permission of dataAccess) {
      if (collectionMappings[permission]) {
        if (Array.isArray(collectionMappings[permission])) {
          allowedCollections.push(...collectionMappings[permission]);
        } else {
          allowedCollections.push(collectionMappings[permission]);
        }
      }
    }
    
    // Remove duplicates
    const uniqueCollections = [...new Set(allowedCollections)];
    
    for (const collection of uniqueCollections) {
      try {
        const snapshot = await admin.firestore()
          .collection(collection)
          .limit(Math.ceil(limit / uniqueCollections.length))
          .get();

        snapshot.forEach(doc => {
          const data = doc.data();
          const text = JSON.stringify(data).toLowerCase();
          if (text.includes(query.toLowerCase())) {
            results.push({
              id: doc.id,
              collection: collection,
              name: data.name || data.title || data.projectName,
              status: data.status,
              ...data
            });
          }
        });
      } catch (collectionError) {
        logger.warn(`Collection ${collection} search failed:`, collectionError);
      }
    }

    return results.slice(0, limit);
  } catch (error) {
    logger.error('Search Firestore context error:', error);
    return [];
  }
}

// Query Firestore with user permissions
async function queryFirestoreWithPermissions(query, dataAccess) {
  try {
    const results = {};
    
    // Define what each permission can access
    const permissionToCollections = {
      'projects': ['projects', 'phases', 'tasks'],
      'contractors': ['contractors', 'contractor-projects'],
      'inventory': ['stockItems', 'stockMovements', 'materials'],
      'admin': ['audit-logs', 'system-config', 'users'],
      'reports': ['dailyProgress', 'audit-logs'],
      'scheduling': ['projects', 'contractors']
    };
    
    // Get collections user can access
    const allowedCollections = [];
    for (const permission of dataAccess) {
      if (permissionToCollections[permission]) {
        allowedCollections.push(...permissionToCollections[permission]);
      }
    }
    
    // Remove duplicates
    const uniqueCollections = [...new Set(allowedCollections)];
    
    // Query each allowed collection
    for (const collection of uniqueCollections) {
      try {
        const snapshot = await admin.firestore()
          .collection(collection)
          .limit(20)
          .get();
        
        const documents = [];
        snapshot.forEach(doc => {
          const data = doc.data();
          // Simple text search
          if (JSON.stringify(data).toLowerCase().includes(query.toLowerCase())) {
            documents.push({
              id: doc.id,
              ...data
            });
          }
        });
        
        if (documents.length > 0) {
          results[collection] = documents;
        }
      } catch (collectionError) {
        logger.warn(`Collection ${collection} query failed:`, collectionError);
      }
    }
    
    return results;
  } catch (error) {
    logger.error('Query Firestore with permissions error:', error);
    return {};
  }
}

async function searchPatterns(query, options = {}) {
  try {
    const { limit = 5 } = options;
    const snapshot = await admin.firestore()
      .collection('claude-patterns')
      .orderBy('confidence', 'desc')
      .limit(limit * 3) // Get more to filter
      .get();

    const patterns = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      const text = `${data.problem} ${data.solution} ${data.type}`.toLowerCase();
      if (text.includes(query.toLowerCase())) {
        patterns.push({
          id: doc.id,
          ...data
        });
      }
    });

    return patterns.slice(0, limit);
  } catch (error) {
    logger.error('Search patterns helper error:', error);
    return [];
  }
}

async function searchProjectContext(query, options = {}) {
  try {
    const { collections = ['projects', 'contractors', 'inventory'], limit = 5 } = options;
    const results = [];
    
    for (const collection of collections) {
      try {
        const snapshot = await admin.firestore()
          .collection(collection)
          .limit(limit)
          .get();

        snapshot.forEach(doc => {
          const data = doc.data();
          const text = JSON.stringify(data).toLowerCase();
          if (text.includes(query.toLowerCase())) {
            results.push({
              id: doc.id,
              collection: collection,
              ...data
            });
          }
        });
      } catch (collectionError) {
        logger.warn(`Collection ${collection} search failed:`, collectionError);
      }
    }

    return results.slice(0, limit);
  } catch (error) {
    logger.error('Search context helper error:', error);
    return [];
  }
}

// Test orchestrator deployment
exports.testOrchestrator = functions.https.onRequest(async (req, res) => {
  try {
    res.json({ 
      success: true, 
      message: 'Orchestrator agent is deployed and working!',
      timestamp: new Date().toISOString(),
      availableEndpoints: [
        'orchestratorChat',
        'orchestratorDataQuery', 
        'orchestratorHealth',
        'orchestratorAsk'
      ]
    });
  } catch (error) {
    console.error('Test orchestrator error:', error);
    res.status(500).json({ 
      error: error.message,
      stack: error.stack 
    });
  }
});

// Simple test callable function
exports.testCallable = functions
  .runWith({
    invoker: 'allUsers'
  })
  .https.onCall(async (data, context) => {
    console.log('testCallable invoked with:', data);
    return {
      success: true,
      message: 'Callable function is working!',
      receivedData: data,
      timestamp: new Date().toISOString()
    };
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
// Export agent functions
exports.agentChat = agentFunctions.agentChat;
exports.agentChatHttp = agentFunctions.agentChatHttp;
exports.searchAgentMemory = agentFunctions.searchAgentMemory;
exports.getAgentStats = agentFunctions.getAgentStats;

// =============================================================================
// NEON AI QUERY FUNCTIONS (Simple Firebase Functions approach)
// =============================================================================

const neonAIFunctions = require('./src/neon-ai-query');
exports.testNeonConnection = neonAIFunctions.testNeonConnection;
exports.getNeonDatabaseInfo = neonAIFunctions.getNeonDatabaseInfo;
exports.processNeonQuery = neonAIFunctions.processNeonQuery;
exports.getNeonAgentHealth = neonAIFunctions.getNeonAgentHealth;
exports.executeNeonSQL = neonAIFunctions.executeNeonSQL;

// Test function for debugging
const testFunctions = require('./src/test-agent-db');
exports.testAgentDatabase = testFunctions.testAgentDatabase;

// =============================================================================
// POWERBI NEON SYNC FUNCTIONS
// =============================================================================

// Import Neon sync functions
const neonSyncFunctions = require('./src/sync-to-neon');
exports.syncToNeon = neonSyncFunctions.syncToNeon;
exports.retryFailedSyncs = neonSyncFunctions.retryFailedSyncs;
exports.syncHealthCheck = neonSyncFunctions.syncHealthCheck;

// =============================================================================
// SCHEDULED ACTION ITEMS SYNC
// =============================================================================

// Scheduled function to sync action items daily at 9 AM
exports.syncActionItemsDaily = functions.pubsub
  .schedule('0 9 * * *') // 9 AM daily (UTC)
  .timeZone('Africa/Johannesburg') // Set to South Africa timezone
  .onRun(async (context) => {
    logger.info('🔄 Starting daily action items sync...');
    
    try {
      const db = admin.firestore();
      
      // Get all meetings with action items
      const meetingsSnapshot = await db.collection('meetings').get();
      logger.info(`📊 Found ${meetingsSnapshot.size} meetings to check`);
      
      // Get existing managed action items
      const managedSnapshot = await db.collection('actionItemsManagement').get();
      logger.info(`📋 Existing managed action items: ${managedSnapshot.size}`);
      
      // Build existing items map for deduplication
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
            
            // Only import if not already exists (prevents duplicates)
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
                  notes: 'Action item imported from meeting (daily sync)'
                }],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                createdBy: 'system',
                updatedBy: 'system'
              };
              
              // Add to Firestore
              await db.collection('actionItemsManagement').add(managedItem);
              importCount++;
            }
          }
        }
      }
      
      logger.info(`✅ Daily sync complete!`);
      logger.info(`📊 Total action items in meetings: ${totalActionItems}`);
      logger.info(`📋 Previously managed: ${managedSnapshot.size}`);
      logger.info(`🆕 Newly imported: ${importCount}`);
      logger.info(`📈 Total now managed: ${managedSnapshot.size + importCount}`);
      
      // Log sync results to a collection for monitoring
      await db.collection('sync-logs').add({
        type: 'action-items-sync',
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        results: {
          totalMeetings: meetingsSnapshot.size,
          totalActionItems,
          previouslyManaged: managedSnapshot.size,
          newlyImported: importCount,
          totalManaged: managedSnapshot.size + importCount
        },
        status: 'success'
      });
      
      return null;
    } catch (error) {
      logger.error('❌ Daily action items sync error:', error);
      
      // Log error to collection for monitoring
      await admin.firestore().collection('sync-logs').add({
        type: 'action-items-sync',
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        error: error.message,
        status: 'error'
      });
      
      throw error;
    }
  });

// Manual trigger for action items sync (for testing)
exports.syncActionItemsManual = functions.https.onCall(async (data, context) => {
  logger.info('🔄 Manual action items sync triggered');
  
  try {
    const db = admin.firestore();
    
    // Get all meetings with action items
    const meetingsSnapshot = await db.collection('meetings').get();
    
    // Get existing managed action items
    const managedSnapshot = await db.collection('actionItemsManagement').get();
    
    // Build existing items map for deduplication
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
                userId: context.auth?.uid || 'system',
                userEmail: context.auth?.token?.email || 'system@fibreflow.com',
                action: 'created',
                notes: 'Action item imported from meeting (manual sync)'
              }],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              createdBy: context.auth?.uid || 'system',
              updatedBy: context.auth?.uid || 'system'
            };
            
            // Add to Firestore
            await db.collection('actionItemsManagement').add(managedItem);
            importCount++;
          }
        }
      }
    }
    
    return {
      success: true,
      results: {
        totalMeetings: meetingsSnapshot.size,
        totalActionItems,
        previouslyManaged: managedSnapshot.size,
        newlyImported: importCount,
        totalManaged: managedSnapshot.size + importCount
      }
    };
    
  } catch (error) {
    logger.error('❌ Manual action items sync error:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// Export Neon Read API
const neonReadAPI = require('./src/neon-read-api');
exports.neonReadAPI = neonReadAPI.neonReadAPI;

// Export Staging API
const stagingAPI = require('./src/staging-api');
exports.stagingAPI = stagingAPI.stagingAPI;

// Export Offline Field App API with public access
const offlineFieldAppAPI = require('./src/offline-field-app-api');
// Wrap the function to ensure public access and proper CORS
exports.offlineFieldAppAPI = functions
  .runWith({
    memory: '1GB',
    timeoutSeconds: 540
  })
  .https
  .onRequest((req, res) => {
    // Set CORS headers for public access
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, X-API-Key, X-Device-ID');
    
    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }
    
    // Call the original function
    return offlineFieldAppAPI.offlineFieldAppAPI(req, res);
  });

// Export Neon Sync Worker
const neonSyncWorker = require('./src/neon-sync-worker');
exports.syncFieldCapturesToNeon = neonSyncWorker.syncFieldCapturesToNeon;

// Export Pole Analytics API
const poleAnalyticsAPI = require('./src/pole-analytics-api');

// Make pole analytics functions publicly accessible
exports.poleAnalytics = functions
  .runWith({
    memory: '512MB',
    timeoutSeconds: 60
  })
  .https
  .onRequest((req, res) => {
    // Set CORS headers for public access
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }
    
    // Call the original function
    return poleAnalyticsAPI.poleAnalytics(req, res);
  });

exports.poleAnalyticsSummary = functions
  .runWith({
    memory: '256MB',
    timeoutSeconds: 30
  })
  .https
  .onRequest((req, res) => {
    // Set CORS headers for public access
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }
    
    // Call the original function
    return poleAnalyticsAPI.poleAnalyticsSummary(req, res);
  });

// Public Pole Analytics API (Simplified version that works)
const poleAnalyticsPublic = require('./src/pole-analytics-public');
exports.poleAnalyticsPublic = functions
  .runWith({
    memory: '256MB',
    timeoutSeconds: 60
  })
  .https
  .onRequest(poleAnalyticsPublic.poleAnalyticsPublic);

exports.poleAnalyticsSummaryPublic = functions
  .runWith({
    memory: '256MB',
    timeoutSeconds: 30
  })
  .https
  .onRequest(poleAnalyticsPublic.poleAnalyticsSummaryPublic);

// Open API endpoint - no authentication required
const poleAnalyticsOpen = require('./src/pole-analytics-open');
exports.poleAnalyticsOpen = functions.https.onRequest(poleAnalyticsOpen.handler);

// Pole Analytics Express API - same pattern as neonReadAPI and offlineFieldAppAPI
const poleAnalyticsExpress = require('./src/pole-analytics-express');
exports.poleAnalyticsExpress = poleAnalyticsExpress.poleAnalyticsExpress;

// Pole Analytics Working - Testing Firestore permissions
const poleAnalyticsWorking = require('./src/pole-analytics-working');
exports.poleAnalyticsWorking = poleAnalyticsWorking.poleAnalyticsWorking;

// Neon Data Warehouse API - Complete access to all Neon tables for Power BI
const neonDataWarehouse = require('./src/neon-data-warehouse-api');
exports.neonDataWarehouse = neonDataWarehouse.neonDataWarehouse;

// Firebase Data Warehouse API - Complete access to all Firestore collections for Power BI
const firebaseDataWarehouse = require('./src/firebase-data-warehouse-api');
exports.firebaseDataWarehouse = firebaseDataWarehouse.firebaseDataWarehouse;
