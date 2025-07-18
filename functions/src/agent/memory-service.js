const admin = require('firebase-admin');
const db = admin.firestore();

class MemoryService {
  constructor() {
    this.conversationsRef = db.collection('agent-memory').doc('data').collection('conversations');
    this.patternsRef = db.collection('agent-memory').doc('data').collection('patterns');
    this.contextsRef = db.collection('agent-memory').doc('data').collection('contexts');
  }

  // Store a conversation with full orchestrator structure
  async storeConversation(data) {
    try {
      const conversation = {
        sessionId: data.sessionId,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        userInput: data.message,
        agentResponse: data.response,
        intent: data.intent || {
          primary: null,
          actions: [],
          confidence: 0
        },
        actionPlan: data.actionPlan || {
          actions: [],
          executed: [],
          failed: []
        },
        results: {
          success: true,
          insights: data.insights || [],
          dataUsed: data.dataUsed || []
        },
        patterns: data.patterns || [],
        context: data.context || {},
        projectCode: data.projectCode || null,
        userId: data.userId || 'anonymous',
        version: '1.0.0',
        type: 'conversation'
      };

      const docRef = await this.conversationsRef.add(conversation);
      
      // Extract and store patterns if any were learned
      if (conversation.patterns && conversation.patterns.length > 0) {
        await this.storePatternsFromConversation(conversation.patterns, {
          sessionId: data.sessionId,
          conversationId: docRef.id
        });
      }
      
      return { id: docRef.id, ...conversation };
    } catch (error) {
      console.error('Error storing conversation:', error);
      throw error;
    }
  }

  // Get recent conversations for context
  async getRecentConversations(sessionId, limit = 10) {
    try {
      const snapshot = await this.conversationsRef
        .where('sessionId', '==', sessionId)
        .orderBy('timestamp', 'desc')
        .limit(limit)
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).reverse(); // Reverse to get chronological order
    } catch (error) {
      console.error('Error getting conversations:', error);
      return [];
    }
  }

  // Store patterns from conversation (orchestrator style)
  async storePatternsFromConversation(patterns, metadata) {
    try {
      const patternDoc = {
        patterns: patterns.map(p => ({
          type: p.type || 'general',
          problem: p.problem,
          solution: p.solution,
          context: p.context || 'general',
          tags: p.tags || [],
          confidence: p.confidence || 0.8
        })),
        context: {
          sessionId: metadata.sessionId,
          conversationId: metadata.conversationId,
          domain: patterns[0]?.context || 'general',
          storedAt: admin.firestore.FieldValue.serverTimestamp()
        },
        version: '1.0.0',
        type: 'pattern'
      };

      const docRef = await this.patternsRef.add(patternDoc);
      
      // Update pattern index for search
      await this.updatePatternIndex(patterns);
      
      return { id: docRef.id, ...patternDoc };
    } catch (error) {
      console.error('Error storing patterns:', error);
      throw error;
    }
  }

  // Update searchable pattern index
  async updatePatternIndex(patterns) {
    try {
      const batch = db.batch();
      const indexRef = db.collection('agent-memory').doc('pattern-index');
      
      for (const pattern of patterns) {
        // Extract keywords from problem and solution
        const keywords = this.extractKeywords(
          `${pattern.problem} ${pattern.solution} ${(pattern.tags || []).join(' ')}`
        );
        
        // Update index for each keyword
        for (const keyword of keywords) {
          const keywordRef = indexRef.collection('keywords').doc(keyword);
          batch.set(keywordRef, {
            patterns: admin.firestore.FieldValue.arrayUnion({
              problem: pattern.problem,
              solution: pattern.solution,
              confidence: pattern.confidence || 0.8,
              timestamp: admin.firestore.FieldValue.serverTimestamp()
            })
          }, { merge: true });
        }
      }
      
      await batch.commit();
    } catch (error) {
      console.error('Error updating pattern index:', error);
    }
  }

  // Extract keywords for indexing
  extractKeywords(text) {
    const stopWords = new Set([
      'the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'but',
      'in', 'with', 'to', 'for', 'of', 'as', 'by', 'that', 'this'
    ]);
    
    return text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word))
      .slice(0, 10); // Limit keywords per pattern
  }

  // Search for patterns matching input
  async searchPatterns(input) {
    try {
      const snapshot = await this.patternsRef
        .orderBy('frequency', 'desc')
        .limit(50)
        .get();

      const patterns = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        if (this.matchesPattern(input, data.pattern)) {
          patterns.push({
            id: doc.id,
            ...data,
            matchScore: this.calculateMatchScore(input, data.pattern)
          });
        }
      });

      // Sort by match score
      return patterns.sort((a, b) => b.matchScore - a.matchScore);
    } catch (error) {
      console.error('Error searching patterns:', error);
      return [];
    }
  }

  // Store project context for caching
  async storeContext(projectCode, contextData) {
    try {
      const context = {
        projectCode: projectCode,
        data: contextData,
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        usage: admin.firestore.FieldValue.increment(1)
      };

      await this.contextsRef.doc(projectCode).set(context, { merge: true });
      return context;
    } catch (error) {
      console.error('Error storing context:', error);
      throw error;
    }
  }

  // Get cached context
  async getCachedContext(projectCode) {
    try {
      const doc = await this.contextsRef.doc(projectCode).get();
      if (!doc.exists) return null;

      const data = doc.data();
      const lastUpdated = data.lastUpdated?.toDate();
      const now = new Date();
      
      // Cache is valid for 1 hour
      if (lastUpdated && (now - lastUpdated) < 3600000) {
        return data.data;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting cached context:', error);
      return null;
    }
  }

  // Search conversations by content
  async searchConversations(query, limit = 20) {
    try {
      // Note: Full-text search would require Algolia or similar
      // For now, we'll do basic filtering
      const snapshot = await this.conversationsRef
        .orderBy('timestamp', 'desc')
        .limit(100)
        .get();

      const results = [];
      const queryLower = query.toLowerCase();
      
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.userMessage?.toLowerCase().includes(queryLower) ||
            data.agentResponse?.toLowerCase().includes(queryLower)) {
          results.push({
            id: doc.id,
            ...data
          });
        }
      });

      return results.slice(0, limit);
    } catch (error) {
      console.error('Error searching conversations:', error);
      return [];
    }
  }

  // Helper methods
  matchesPattern(input, pattern) {
    const inputLower = input.toLowerCase();
    const patternLower = pattern.toLowerCase();
    
    // Simple substring match for now
    return inputLower.includes(patternLower) || patternLower.includes(inputLower);
  }

  calculateMatchScore(input, pattern) {
    const inputLower = input.toLowerCase();
    const patternLower = pattern.toLowerCase();
    
    // Simple scoring based on similarity
    if (inputLower === patternLower) return 1.0;
    if (inputLower.includes(patternLower)) return 0.8;
    if (patternLower.includes(inputLower)) return 0.6;
    
    // Calculate word overlap
    const inputWords = inputLower.split(/\s+/);
    const patternWords = patternLower.split(/\s+/);
    const commonWords = inputWords.filter(word => patternWords.includes(word));
    
    return commonWords.length / Math.max(inputWords.length, patternWords.length);
  }
}

module.exports = MemoryService;