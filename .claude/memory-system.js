#!/usr/bin/env node

/**
 * Claude Memory System - Local Zep-Inspired Implementation
 * 
 * This implements Zep's concepts locally:
 * - Facts: Discrete pieces of information
 * - Sessions: Conversation contexts
 * - Knowledge Graph: Relationships between entities
 * - Temporal tracking: When things were learned
 */

const fs = require('fs').promises;
const path = require('path');

class ClaudeMemory {
  constructor(basePath = '.claude/memory') {
    this.basePath = basePath;
    this.memoryFile = path.join(basePath, 'memory.json');
    this.graphFile = path.join(basePath, 'knowledge-graph.json');
    this.sessionsFile = path.join(basePath, 'sessions.json');
  }

  async init() {
    await fs.mkdir(this.basePath, { recursive: true });
    
    // Initialize files if they don't exist
    const files = [
      { path: this.memoryFile, default: { facts: [], patterns: {}, preferences: [] } },
      { path: this.graphFile, default: { entities: {}, relationships: [] } },
      { path: this.sessionsFile, default: { sessions: [] } }
    ];

    for (const file of files) {
      try {
        await fs.access(file.path);
      } catch {
        await fs.writeFile(file.path, JSON.stringify(file.default, null, 2));
      }
    }
  }

  // Add a fact (Zep-style)
  async addFact(fact) {
    const memory = await this.loadMemory();
    memory.facts.push({
      id: `fact_${Date.now()}`,
      content: fact.content,
      category: fact.category,
      metadata: fact.metadata || {},
      timestamp: new Date().toISOString(),
      confidence: fact.confidence || 1.0
    });
    await this.saveMemory(memory);
    console.log(`✅ Added fact: ${fact.content}`);
  }

  // Add a pattern
  async addPattern(category, pattern, context) {
    const memory = await this.loadMemory();
    if (!memory.patterns[category]) {
      memory.patterns[category] = [];
    }
    memory.patterns[category].push({
      pattern,
      context,
      timestamp: new Date().toISOString(),
      usage_count: 0
    });
    await this.saveMemory(memory);
    console.log(`✅ Added pattern in ${category}: ${pattern}`);
  }

  // Add user preference
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

  // Add entity to knowledge graph
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

  // Add relationship to knowledge graph
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

  // Add session memory
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

  // Search memories (simple implementation)
  async search(query) {
    const memory = await this.loadMemory();
    const results = {
      facts: [],
      patterns: [],
      preferences: []
    };

    // Search facts
    results.facts = memory.facts.filter(f => 
      f.content.toLowerCase().includes(query.toLowerCase()) ||
      f.category.toLowerCase().includes(query.toLowerCase())
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

  // Get context for a task
  async getContext(task) {
    const searchResults = await this.search(task);
    const graph = await this.loadGraph();
    const sessions = await this.loadSessions();

    // Find relevant sessions
    const relevantSessions = sessions.sessions.filter(s =>
      s.title.toLowerCase().includes(task.toLowerCase()) ||
      s.summary.toLowerCase().includes(task.toLowerCase())
    );

    return {
      facts: searchResults.facts,
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
        advice.push(`- ${f.content}`);
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

  // Display current memory stats
  async stats() {
    const memory = await this.loadMemory();
    const graph = await this.loadGraph();
    const sessions = await this.loadSessions();

    console.log('\n📊 Memory Statistics:');
    console.log(`- Facts: ${memory.facts.length}`);
    console.log(`- Pattern Categories: ${Object.keys(memory.patterns).length}`);
    console.log(`- Preferences: ${memory.preferences.length}`);
    console.log(`- Entities: ${Object.values(graph.entities).reduce((sum, e) => sum + Object.keys(e).length, 0)}`);
    console.log(`- Relationships: ${graph.relationships.length}`);
    console.log(`- Sessions: ${sessions.sessions.length}`);
  }
}

// CLI Interface
async function main() {
  const memory = new ClaudeMemory();
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

    case 'context':
      const context = await memory.getContext(args.join(' '));
      console.log('\n🧠 Context for task:');
      console.log(JSON.stringify(context, null, 2));
      break;

    case 'stats':
      await memory.stats();
      break;

    default:
      console.log(`
Claude Memory System - Zep-Inspired Local Implementation

Commands:
  fact <content>                 Add a fact
  pattern <category> <pattern>   Add a pattern
  preference <rule>              Add a preference
  entity <type> <name> [props]   Add an entity
  relationship <from> <type> <to> Add a relationship
  session <title> <summary>      Add a session summary
  search <query>                 Search memories
  context <task>                 Get context for a task
  stats                          Show memory statistics

Examples:
  node memory-system.js fact "FibreFlow and VF OneMap use separate Firebase projects"
  node memory-system.js pattern routing "Use simple routes in app.routes.ts"
  node memory-system.js preference "Ask before architectural changes"
  node memory-system.js entity service PoleTrackerService "Handles pole tracking"
  node memory-system.js relationship PoleTrackerComponent uses GoogleMapsService
  node memory-system.js session "Storage Auth Fix" "Fixed cross-project auth issue"
  node memory-system.js search "firebase storage"
  node memory-system.js context "upload to storage"
      `);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = ClaudeMemory;