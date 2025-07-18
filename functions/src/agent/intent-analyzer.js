class IntentAnalyzer {
  constructor() {
    // Define intent patterns
    this.intents = {
      // Project queries
      project_status: {
        patterns: [
          /status.*project/i,
          /project.*status/i,
          /how.*project.*doing/i,
          /update.*project/i
        ],
        entities: ['projectCode']
      },
      
      pole_count: {
        patterns: [
          /how many.*pole/i,
          /total.*pole/i,
          /pole.*count/i,
          /number.*pole/i,
          /poles.*installed/i,
          /installed.*poles/i
        ],
        entities: ['projectCode', 'poleType']
      },
      
      // Contractor queries
      contractor_info: {
        patterns: [
          /contractor.*working/i,
          /who.*contractor/i,
          /contractor.*assigned/i,
          /list.*contractor/i
        ],
        entities: ['projectCode', 'contractorName']
      },
      
      // Stock/inventory queries
      stock_check: {
        patterns: [
          /stock.*available/i,
          /inventory.*status/i,
          /materials.*left/i,
          /check.*stock/i
        ],
        entities: ['materialType', 'projectCode']
      },
      
      // Daily progress
      daily_progress: {
        patterns: [
          /daily.*progress/i,
          /today.*work/i,
          /what.*done.*today/i,
          /progress.*report/i
        ],
        entities: ['date', 'projectCode']
      },
      
      // Task management
      task_status: {
        patterns: [
          /task.*status/i,
          /pending.*task/i,
          /task.*complete/i,
          /overdue.*task/i
        ],
        entities: ['projectCode', 'assignee']
      },
      
      // General help
      help: {
        patterns: [
          /help/i,
          /what.*can.*do/i,
          /how.*use/i,
          /guide/i
        ],
        entities: []
      }
    };
    
    // Entity extraction patterns
    this.entityPatterns = {
      projectCode: /\b([A-Za-z]{2,4}-\d{3}|lawley|mohadin|moh-\d{3}|law-\d{3})\b/gi,
      date: /\b(today|yesterday|tomorrow|\d{4}-\d{2}-\d{2})\b/gi,
      poleType: /\b(wooden|concrete|steel|composite)\s*pole/gi,
      materialType: /\b(cable|fiber|connector|enclosure|pole)\b/gi
    };
  }

  analyze(input) {
    const analysis = {
      input: input,
      intent: null,
      confidence: 0,
      entities: {},
      keywords: this.extractKeywords(input)
    };

    // Find matching intent
    let bestMatch = null;
    let highestScore = 0;

    for (const [intentName, intentConfig] of Object.entries(this.intents)) {
      const score = this.calculateIntentScore(input, intentConfig);
      if (score > highestScore) {
        highestScore = score;
        bestMatch = intentName;
      }
    }

    if (highestScore > 0.3) { // Threshold for intent matching
      analysis.intent = bestMatch;
      analysis.confidence = highestScore;
      
      // Extract entities for this intent
      const intentConfig = this.intents[bestMatch];
      for (const entityType of intentConfig.entities) {
        const extracted = this.extractEntity(input, entityType);
        if (extracted) {
          analysis.entities[entityType] = extracted;
        }
      }
    }

    return analysis;
  }

  calculateIntentScore(input, intentConfig) {
    const inputLower = input.toLowerCase();
    let maxScore = 0;

    for (const pattern of intentConfig.patterns) {
      if (pattern.test(input)) {
        // Calculate score based on pattern match
        const matches = input.match(pattern);
        const score = matches ? matches[0].length / input.length : 0;
        maxScore = Math.max(maxScore, Math.min(score * 2, 1)); // Scale and cap at 1
      }
    }

    return maxScore;
  }

  extractEntity(input, entityType) {
    const pattern = this.entityPatterns[entityType];
    if (!pattern) return null;

    const matches = input.match(pattern);
    if (matches && matches.length > 0) {
      // Return the first match, cleaned up
      let entity = matches[0].trim();
      
      // Special handling for project codes
      if (entityType === 'projectCode') {
        // Normalize common project names
        if (entity.toLowerCase() === 'lawley') {
          entity = 'Law-001';
        } else if (entity.toLowerCase() === 'mohadin') {
          entity = 'Moh-001';
        }
      }
      
      return entity;
    }

    return null;
  }

  extractKeywords(input) {
    // Remove common words and extract meaningful keywords
    const stopWords = new Set([
      'the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'but',
      'in', 'with', 'to', 'for', 'of', 'as', 'by', 'that', 'this',
      'it', 'from', 'be', 'are', 'been', 'being', 'have', 'has', 'had',
      'do', 'does', 'did', 'will', 'would', 'should', 'could', 'may',
      'might', 'must', 'can', 'shall', 'me', 'we', 'us', 'our'
    ]);

    const words = input.toLowerCase()
      .replace(/[^\w\s-]/g, '') // Remove punctuation except hyphens
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word));

    return [...new Set(words)]; // Remove duplicates
  }

  // Get suggested response based on intent
  getSuggestedAction(intent) {
    const actions = {
      project_status: 'fetch_project_details',
      pole_count: 'count_poles',
      contractor_info: 'list_contractors',
      stock_check: 'check_inventory',
      daily_progress: 'fetch_daily_progress',
      task_status: 'fetch_tasks',
      help: 'show_help_menu'
    };

    return actions[intent] || 'general_response';
  }
}

module.exports = IntentAnalyzer;