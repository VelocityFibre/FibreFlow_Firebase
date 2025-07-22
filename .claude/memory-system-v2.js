#!/usr/bin/env node

/**
 * Claude Memory System v2 - Enhanced with conflict resolution and time relevance
 * 
 * New features:
 * - Conflict detection and resolution
 * - Time-based relevance
 * - Category management
 * - Memory updates instead of duplicates
 * - Archive old/conflicting memories
 */

const fs = require('fs').promises;
const path = require('path');
const readline = require('readline');

class ClaudeMemoryV2 {
  constructor(basePath = '.claude/memory') {
    this.basePath = basePath;
    this.memoryFile = path.join(basePath, 'memory.json');
    this.graphFile = path.join(basePath, 'knowledge-graph.json');
    this.sessionsFile = path.join(basePath, 'sessions.json');
    this.archiveFile = path.join(basePath, 'archive.json');
  }

  async init() {
    await fs.mkdir(this.basePath, { recursive: true });
    
    // Initialize files if they don't exist
    const files = [
      { path: this.memoryFile, default: { facts: [], patterns: {}, preferences: [] } },
      { path: this.graphFile, default: { entities: {}, relationships: [] } },
      { path: this.sessionsFile, default: { sessions: [] } },
      { path: this.archiveFile, default: { archived: [] } }
    ];

    for (const file of files) {
      try {
        await fs.access(file.path);
      } catch {
        await fs.writeFile(file.path, JSON.stringify(file.default, null, 2));
      }
    }
  }

  // Check for conflicting facts
  async checkConflicts(newFact, category) {
    const memory = await this.loadMemory();
    const conflicts = [];
    
    // Check facts for conflicts
    for (const fact of memory.facts) {
      if (fact.category === category && fact.active !== false) {
        // Simple conflict detection - can be enhanced
        const similarity = this.calculateSimilarity(fact.content, newFact);
        if (similarity > 0.6) {
          conflicts.push(fact);
        }
      }
    }
    
    return conflicts;
  }

  // Simple similarity calculation
  calculateSimilarity(str1, str2) {
    const words1 = str1.toLowerCase().split(/\s+/);
    const words2 = str2.toLowerCase().split(/\s+/);
    const common = words1.filter(w => words2.includes(w));
    return common.length / Math.max(words1.length, words2.length);
  }

  // Interactive conflict resolution
  async resolveConflict(newContent, conflicts) {
    console.log('\n⚠️  Potential conflicts detected:');
    conflicts.forEach((c, i) => {
      console.log(`${i + 1}. [${new Date(c.timestamp).toLocaleDateString()}] ${c.content}`);
    });
    
    console.log(`\nNew fact: ${newContent}`);
    console.log('\nOptions:');
    console.log('1. Replace old fact(s) with new one');
    console.log('2. Keep both (mark old as historical)');
    console.log('3. Cancel adding new fact');
    console.log('4. Update existing fact');
    
    const answer = await this.prompt('Choose option (1-4): ');
    return answer;
  }

  // Prompt helper
  async prompt(question) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    return new Promise(resolve => {
      rl.question(question, answer => {
        rl.close();
        resolve(answer);
      });
    });
  }

  // Enhanced add fact with conflict detection
  async addFact(fact) {
    const conflicts = await this.checkConflicts(fact.content, fact.category);
    
    if (conflicts.length > 0) {
      const choice = await this.resolveConflict(fact.content, conflicts);
      
      switch(choice) {
        case '1': // Replace
          await this.archiveMemories(conflicts);
          await this.addNewFact(fact);
          break;
        case '2': // Keep both
          conflicts.forEach(c => c.historical = true);
          await this.addNewFact(fact);
          break;
        case '3': // Cancel
          console.log('❌ Cancelled adding new fact');
          return;
        case '4': // Update
          await this.updateFact(conflicts[0].id, fact.content);
          break;
      }
    } else {
      await this.addNewFact(fact);
    }
  }

  // Add new fact (internal)
  async addNewFact(fact) {
    const memory = await this.loadMemory();
    memory.facts.push({
      id: `fact_${Date.now()}`,
      content: fact.content,
      category: fact.category,
      metadata: fact.metadata || {},
      timestamp: new Date().toISOString(),
      confidence: fact.confidence || 1.0,
      active: true,
      version: 1
    });
    await this.saveMemory(memory);
    console.log(`✅ Added fact: ${fact.content}`);
  }

  // Update existing fact
  async updateFact(factId, newContent) {
    const memory = await this.loadMemory();
    const fact = memory.facts.find(f => f.id === factId);
    if (fact) {
      // Archive old version
      await this.archiveMemory(fact);
      
      // Update fact
      fact.content = newContent;
      fact.timestamp = new Date().toISOString();
      fact.version = (fact.version || 1) + 1;
      fact.updated = true;
      
      await this.saveMemory(memory);
      console.log(`✅ Updated fact: ${newContent}`);
    }
  }

  // Archive memories
  async archiveMemories(memories) {
    const archive = await this.loadArchive();
    memories.forEach(m => {
      m.archivedAt = new Date().toISOString();
      m.active = false;
      archive.archived.push(m);
    });
    await this.saveArchive(archive);
    
    // Remove from active memory
    const memory = await this.loadMemory();
    memories.forEach(m => {
      const index = memory.facts.findIndex(f => f.id === m.id);
      if (index > -1) memory.facts.splice(index, 1);
    });
    await this.saveMemory(memory);
  }

  // Archive single memory
  async archiveMemory(memory) {
    await this.archiveMemories([memory]);
  }

  // List memories by category
  async listByCategory(category) {
    const memory = await this.loadMemory();
    const results = {
      facts: [],
      patterns: []
    };
    
    // Filter facts by category
    results.facts = memory.facts.filter(f => 
      f.category === category && f.active !== false
    ).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    // Get patterns for category
    if (memory.patterns[category]) {
      results.patterns = memory.patterns[category];
    }
    
    return results;
  }

  // List all categories
  async listCategories() {
    const memory = await this.loadMemory();
    const categories = new Set();
    
    // From facts
    memory.facts.forEach(f => {
      if (f.active !== false) categories.add(f.category);
    });
    
    // From patterns
    Object.keys(memory.patterns).forEach(c => categories.add(c));
    
    return Array.from(categories).sort();
  }

  // Review memories for potential cleanup
  async reviewMemories(criteria = 'all') {
    const memory = await this.loadMemory();
    const reviewCandidates = [];
    
    switch(criteria) {
      case 'duplicates':
        // Find potential duplicates
        const seen = new Map();
        memory.facts.forEach(f => {
          if (f.active !== false) {
            const key = f.category;
            if (!seen.has(key)) seen.set(key, []);
            seen.get(key).push(f);
          }
        });
        
        for (const [category, facts] of seen) {
          if (facts.length > 1) {
            // Check for similar content
            for (let i = 0; i < facts.length; i++) {
              for (let j = i + 1; j < facts.length; j++) {
                const similarity = this.calculateSimilarity(facts[i].content, facts[j].content);
                if (similarity > 0.7) {
                  reviewCandidates.push({
                    type: 'duplicate',
                    facts: [facts[i], facts[j]],
                    reason: `Similar facts in category '${category}'`
                  });
                }
              }
            }
          }
        }
        break;
        
      case 'outdated':
        // Find facts that might be outdated (user decides)
        memory.facts.forEach(f => {
          if (f.active !== false && !f.important) {
            // Check for keywords that suggest time-sensitive info
            const outdatedKeywords = ['currently', 'now', 'temporary', 'workaround', 'TODO', 'FIXME'];
            const hasOutdatedKeyword = outdatedKeywords.some(kw => 
              f.content.toLowerCase().includes(kw.toLowerCase())
            );
            
            if (hasOutdatedKeyword) {
              reviewCandidates.push({
                type: 'potentially-outdated',
                fact: f,
                reason: 'Contains time-sensitive keywords'
              });
            }
          }
        });
        break;
        
      case 'unused':
        // Find patterns that haven't been used
        for (const [category, patterns] of Object.entries(memory.patterns)) {
          patterns.forEach(p => {
            if (p.usage_count === 0) {
              reviewCandidates.push({
                type: 'unused-pattern',
                pattern: p,
                category,
                reason: 'Pattern never used'
              });
            }
          });
        }
        break;
        
      case 'all':
        // Interactive review of all memories by category
        console.log('\n📚 Memory Review by Category\n');
        const categories = await this.listCategories();
        
        for (const category of categories) {
          const catMemories = await this.listByCategory(category);
          if (catMemories.facts.length > 0) {
            console.log(`\n📁 Category: ${category} (${catMemories.facts.length} facts)`);
            const answer = await this.prompt('Review this category? (y/n/skip all): ');
            
            if (answer === 'skip all') break;
            if (answer.toLowerCase() === 'y') {
              await this.reviewCategory(category, catMemories);
            }
          }
        }
        return;
    }
    
    // Show review candidates
    if (reviewCandidates.length === 0) {
      console.log('✨ No memories need review based on criteria:', criteria);
      return;
    }
    
    console.log(`\n🔍 Found ${reviewCandidates.length} items to review:\n`);
    
    for (let i = 0; i < reviewCandidates.length; i++) {
      const candidate = reviewCandidates[i];
      console.log(`\n[${i + 1}/${reviewCandidates.length}] ${candidate.type.toUpperCase()}`);
      console.log(`Reason: ${candidate.reason}`);
      
      if (candidate.type === 'duplicate') {
        console.log('Facts:');
        candidate.facts.forEach((f, idx) => {
          console.log(`  ${idx + 1}. [${new Date(f.timestamp).toLocaleDateString()}] ${f.content}`);
        });
      } else if (candidate.fact) {
        console.log(`Fact: [${new Date(candidate.fact.timestamp).toLocaleDateString()}] ${candidate.fact.content}`);
      } else if (candidate.pattern) {
        console.log(`Pattern: ${candidate.pattern.pattern}`);
      }
      
      const action = await this.prompt('Action? (a)rchive, (k)eep, (m)ark important, (s)kip: ');
      
      if (action === 'a') {
        if (candidate.facts) {
          await this.archiveMemories(candidate.facts);
        } else if (candidate.fact) {
          await this.archiveMemory(candidate.fact);
        }
        console.log('✅ Archived');
      } else if (action === 'm') {
        if (candidate.fact) {
          candidate.fact.important = true;
          await this.saveMemory(memory);
          console.log('✅ Marked as important');
        }
      }
    }
  }
  
  // Review a specific category interactively
  async reviewCategory(category, catMemories) {
    console.log(`\nReviewing ${catMemories.facts.length} facts in '${category}':\n`);
    
    for (let i = 0; i < catMemories.facts.length; i++) {
      const fact = catMemories.facts[i];
      console.log(`\n[${i + 1}/${catMemories.facts.length}]`);
      console.log(`Date: ${new Date(fact.timestamp).toLocaleDateString()}`);
      console.log(`Content: ${fact.content}`);
      if (fact.important) console.log('⭐ IMPORTANT');
      if (fact.version > 1) console.log(`Version: ${fact.version}`);
      
      const action = await this.prompt('(k)eep, (a)rchive, (m)ark important, (e)dit, (s)kip rest: ');
      
      if (action === 's') break;
      
      switch(action) {
        case 'a':
          await this.archiveMemory(fact);
          console.log('✅ Archived');
          break;
        case 'm':
          fact.important = true;
          const memory = await this.loadMemory();
          await this.saveMemory(memory);
          console.log('✅ Marked as important');
          break;
        case 'e':
          const newContent = await this.prompt('New content: ');
          await this.updateFact(fact.id, newContent);
          console.log('✅ Updated');
          break;
      }
    }
  }

  // Enhanced pattern management
  async addPattern(category, pattern, context) {
    const memory = await this.loadMemory();
    if (!memory.patterns[category]) {
      memory.patterns[category] = [];
    }
    
    // Check for similar patterns
    const existing = memory.patterns[category].find(p => 
      this.calculateSimilarity(p.pattern, pattern) > 0.8
    );
    
    if (existing) {
      console.log('⚠️  Similar pattern exists:');
      console.log(`Existing: ${existing.pattern}`);
      console.log(`New: ${pattern}`);
      const answer = await this.prompt('Replace (r), Keep both (k), or Cancel (c)? ');
      
      if (answer === 'r') {
        existing.pattern = pattern;
        existing.context = context;
        existing.timestamp = new Date().toISOString();
        existing.version = (existing.version || 1) + 1;
      } else if (answer === 'c') {
        return;
      }
    } else {
      memory.patterns[category].push({
        pattern,
        context,
        timestamp: new Date().toISOString(),
        usage_count: 0,
        version: 1
      });
    }
    
    await this.saveMemory(memory);
    console.log(`✅ Added pattern in ${category}: ${pattern}`);
  }

  // Time-aware search
  async searchRecent(query, daysBack = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysBack);
    
    const memory = await this.loadMemory();
    const results = {
      facts: [],
      patterns: []
    };
    
    // Search recent facts
    results.facts = memory.facts.filter(f => 
      new Date(f.timestamp) > cutoffDate &&
      f.active !== false &&
      (f.content.toLowerCase().includes(query.toLowerCase()) ||
       f.category.toLowerCase().includes(query.toLowerCase()))
    ).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    return results;
  }

  // Show memory timeline
  async timeline(days = 7) {
    const memory = await this.loadMemory();
    const sessions = await this.loadSessions();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const events = [];
    
    // Add facts
    memory.facts.forEach(f => {
      if (new Date(f.timestamp) > cutoffDate) {
        events.push({
          type: 'fact',
          date: f.timestamp,
          content: f.content,
          category: f.category
        });
      }
    });
    
    // Add sessions
    sessions.sessions.forEach(s => {
      if (new Date(s.timestamp) > cutoffDate) {
        events.push({
          type: 'session',
          date: s.timestamp,
          content: s.title
        });
      }
    });
    
    // Sort by date
    events.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    return events;
  }

  // Mark memory as important (won't be auto-cleaned)
  async markImportant(query) {
    const memory = await this.loadMemory();
    const results = await this.search(query);
    
    if (results.facts.length > 0) {
      console.log('Found facts:');
      results.facts.forEach((f, i) => {
        console.log(`${i + 1}. ${f.content}`);
      });
      
      const answer = await this.prompt('Mark which as important? (number or "all"): ');
      
      if (answer === 'all') {
        results.facts.forEach(f => {
          const fact = memory.facts.find(mf => mf.id === f.id);
          if (fact) fact.important = true;
        });
      } else {
        const index = parseInt(answer) - 1;
        if (index >= 0 && index < results.facts.length) {
          const fact = memory.facts.find(f => f.id === results.facts[index].id);
          if (fact) fact.important = true;
        }
      }
      
      await this.saveMemory(memory);
      console.log('✅ Marked as important');
    }
  }

  // Enhanced stats with categories
  async stats() {
    const memory = await this.loadMemory();
    const graph = await this.loadGraph();
    const sessions = await this.loadSessions();
    const archive = await this.loadArchive();
    const categories = await this.listCategories();
    
    console.log('\n📊 Memory Statistics:');
    console.log(`- Active Facts: ${memory.facts.filter(f => f.active !== false).length}`);
    console.log(`- Historical Facts: ${memory.facts.filter(f => f.historical).length}`);
    console.log(`- Archived Facts: ${archive.archived.length}`);
    console.log(`- Pattern Categories: ${Object.keys(memory.patterns).length}`);
    console.log(`- Total Patterns: ${Object.values(memory.patterns).flat().length}`);
    console.log(`- Preferences: ${memory.preferences.length}`);
    console.log(`- Entities: ${Object.values(graph.entities).reduce((sum, e) => sum + Object.keys(e).length, 0)}`);
    console.log(`- Relationships: ${graph.relationships.length}`);
    console.log(`- Sessions: ${sessions.sessions.length}`);
    
    console.log('\n📁 Categories:');
    categories.forEach(cat => {
      const catMemories = memory.facts.filter(f => f.category === cat && f.active !== false);
      const catPatterns = memory.patterns[cat] || [];
      console.log(`- ${cat}: ${catMemories.length} facts, ${catPatterns.length} patterns`);
    });
    
    // Recent activity
    const recentEvents = await this.timeline(7);
    console.log(`\n📅 Recent Activity (last 7 days): ${recentEvents.length} events`);
  }

  // Original methods remain...
  async search(query) {
    const memory = await this.loadMemory();
    const results = {
      facts: [],
      patterns: [],
      preferences: []
    };

    // Search active facts only
    results.facts = memory.facts.filter(f => 
      f.active !== false &&
      (f.content.toLowerCase().includes(query.toLowerCase()) ||
       f.category.toLowerCase().includes(query.toLowerCase()))
    );

    // Search patterns
    for (const [category, patterns] of Object.entries(memory.patterns)) {
      const matches = patterns.filter(p =>
        p.pattern.toLowerCase().includes(query.toLowerCase()) ||
        p.context.toLowerCase().includes(query.toLowerCase())
      );
      if (matches.length > 0) {
        results.patterns.push({ category, matches });
      }
    }

    // Search preferences
    results.preferences = memory.preferences.filter(p =>
      p.rule.toLowerCase().includes(query.toLowerCase())
    );

    return results;
  }

  // Helper methods
  async loadMemory() {
    const data = await fs.readFile(this.memoryFile, 'utf8');
    return JSON.parse(data);
  }

  async saveMemory(memory) {
    await fs.writeFile(this.memoryFile, JSON.stringify(memory, null, 2));
  }

  async loadGraph() {
    const data = await fs.readFile(this.graphFile, 'utf8');
    return JSON.parse(data);
  }

  async saveGraph(graph) {
    await fs.writeFile(this.graphFile, JSON.stringify(graph, null, 2));
  }

  async loadSessions() {
    const data = await fs.readFile(this.sessionsFile, 'utf8');
    return JSON.parse(data);
  }

  async saveSessions(sessions) {
    await fs.writeFile(this.sessionsFile, JSON.stringify(sessions, null, 2));
  }

  async loadArchive() {
    try {
      const data = await fs.readFile(this.archiveFile, 'utf8');
      return JSON.parse(data);
    } catch {
      return { archived: [] };
    }
  }

  async saveArchive(archive) {
    await fs.writeFile(this.archiveFile, JSON.stringify(archive, null, 2));
  }

  // Other original methods remain the same...
  async addPreference(preference) {
    const memory = await this.loadMemory();
    memory.preferences.push({
      rule: preference,
      timestamp: new Date().toISOString(),
      active: true
    });
    await this.saveMemory(memory);
    console.log(`✅ Added preference: ${preference}`);
  }

  async addEntity(type, name, properties = {}) {
    const graph = await this.loadGraph();
    if (!graph.entities[type]) {
      graph.entities[type] = {};
    }
    graph.entities[type][name] = {
      properties,
      created: new Date().toISOString(),
      updated: new Date().toISOString()
    };
    await this.saveGraph(graph);
    console.log(`✅ Added ${type}: ${name}`);
  }

  async addRelationship(from, to, type, metadata = {}) {
    const graph = await this.loadGraph();
    graph.relationships.push({
      from,
      to,
      type,
      metadata,
      timestamp: new Date().toISOString()
    });
    await this.saveGraph(graph);
    console.log(`✅ Added relationship: ${from} ${type} ${to}`);
  }

  async addSession(title, summary, learnings = []) {
    const sessions = await this.loadSessions();
    sessions.sessions.push({
      id: `session_${Date.now()}`,
      title,
      summary,
      learnings,
      timestamp: new Date().toISOString()
    });
    await this.saveSessions(sessions);
    console.log(`✅ Added session: ${title}`);
  }

  async getContext(task) {
    const searchResults = await this.search(task);
    const recentResults = await this.searchRecent(task, 30);
    const graph = await this.loadGraph();
    const sessions = await this.loadSessions();

    const relevantSessions = sessions.sessions.filter(s =>
      s.title.toLowerCase().includes(task.toLowerCase()) ||
      s.summary.toLowerCase().includes(task.toLowerCase())
    );

    return {
      facts: searchResults.facts,
      recentFacts: recentResults.facts,
      patterns: searchResults.patterns,
      preferences: searchResults.preferences,
      sessions: relevantSessions,
      advice: this.generateAdvice(searchResults)
    };
  }

  generateAdvice(searchResults) {
    const advice = [];
    
    if (searchResults.facts.length > 0) {
      advice.push(`Found ${searchResults.facts.length} relevant facts. Key insights:`);
      searchResults.facts.slice(0, 3).forEach(f => {
        advice.push(`- ${f.content} [${new Date(f.timestamp).toLocaleDateString()}]`);
      });
    }

    if (searchResults.patterns.length > 0) {
      advice.push(`\nRelevant patterns to follow:`);
      searchResults.patterns.forEach(p => {
        p.matches.slice(0, 2).forEach(m => {
          advice.push(`- ${p.category}: ${m.pattern}`);
        });
      });
    }

    return advice.join('\n');
  }
}

// CLI Interface
async function main() {
  const memory = new ClaudeMemoryV2();
  await memory.init();

  const command = process.argv[2];
  const args = process.argv.slice(3);

  switch (command) {
    case 'fact':
      await memory.addFact({
        content: args.join(' '),
        category: args[0] || 'general',
        metadata: { source: 'cli' }
      });
      break;

    case 'pattern':
      const [category, ...patternParts] = args;
      await memory.addPattern(category, patternParts.join(' '), 'CLI input');
      break;

    case 'preference':
      await memory.addPreference(args.join(' '));
      break;

    case 'entity':
      const [type, name, ...props] = args;
      await memory.addEntity(type, name, { description: props.join(' ') });
      break;

    case 'relationship':
      const [from, relType, to] = args;
      await memory.addRelationship(from, to, relType);
      break;

    case 'session':
      const title = args[0];
      const summary = args.slice(1).join(' ');
      await memory.addSession(title, summary);
      break;

    case 'search':
      const results = await memory.search(args.join(' '));
      console.log('\n🔍 Search Results:');
      console.log(JSON.stringify(results, null, 2));
      break;

    case 'search-recent':
      const days = parseInt(args[0]) || 30;
      const query = args.slice(1).join(' ');
      const recentResults = await memory.searchRecent(query, days);
      console.log(`\n🔍 Results from last ${days} days:`);
      console.log(JSON.stringify(recentResults, null, 2));
      break;

    case 'context':
      const context = await memory.getContext(args.join(' '));
      console.log('\n🧠 Context for task:');
      console.log(JSON.stringify(context, null, 2));
      break;

    case 'stats':
      await memory.stats();
      break;

    case 'list-category':
      const catResults = await memory.listByCategory(args[0]);
      console.log(`\n📁 Memories in category '${args[0]}':`);
      console.log('Facts:', catResults.facts.length);
      catResults.facts.forEach(f => {
        console.log(`- [${new Date(f.timestamp).toLocaleDateString()}] ${f.content}`);
      });
      if (catResults.patterns.length > 0) {
        console.log('\nPatterns:', catResults.patterns.length);
        catResults.patterns.forEach(p => {
          console.log(`- ${p.pattern}`);
        });
      }
      break;

    case 'list-categories':
      const categories = await memory.listCategories();
      console.log('\n📁 All Categories:');
      categories.forEach(cat => console.log(`- ${cat}`));
      break;

    case 'review':
      const reviewCriteria = args[0] || 'all';
      await memory.reviewMemories(reviewCriteria);
      break;

    case 'mark-important':
      await memory.markImportant(args.join(' '));
      break;

    case 'timeline':
      const timelineDays = parseInt(args[0]) || 7;
      const events = await memory.timeline(timelineDays);
      console.log(`\n📅 Timeline (last ${timelineDays} days):`);
      events.forEach(e => {
        const date = new Date(e.date).toLocaleDateString();
        console.log(`[${date}] ${e.type}: ${e.content}`);
      });
      break;

    default:
      console.log(`
Claude Memory System v2 - Enhanced with Conflict Resolution

Commands:
  fact <content>                      Add a fact (checks for conflicts)
  pattern <category> <pattern>        Add a pattern (checks for duplicates)
  preference <rule>                   Add a preference
  entity <type> <name> [props]        Add an entity
  relationship <from> <type> <to>     Add a relationship
  session <title> <summary>           Add a session summary
  search <query>                      Search all memories
  search-recent <days> <query>        Search recent memories
  context <task>                      Get context for a task
  stats                               Show memory statistics
  list-category <category>            List memories in a category
  list-categories                     List all categories
  review [criteria]                   Review memories (all/duplicates/outdated/unused)
  mark-important <query>              Mark memories as important
  timeline <days>                     Show memory timeline

Examples:
  node memory-system-v2.js fact "FibreFlow uses Firebase project fibreflow-73daf"
  node memory-system-v2.js search-recent 7 "firebase"
  node memory-system-v2.js list-category routing
  node memory-system-v2.js clean 90
  node memory-system-v2.js timeline 14
      `);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = ClaudeMemoryV2;