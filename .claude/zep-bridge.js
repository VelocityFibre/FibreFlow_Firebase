#!/usr/bin/env node

const { ZepClient } = require('@getzep/zep-cloud');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Initialize Zep client
const apiKey = process.env.ZEP_API_KEY || '';
if (!apiKey) {
  console.error('❌ ZEP_API_KEY environment variable is required');
  console.error('Get your API key from: https://app.getzep.com/settings/api-keys');
  process.exit(1);
}

const zep = new ZepClient({ apiKey });

// FibreFlow project user
const userId = 'fibreflow_dev';
const projectId = 'fibreflow';

// Command-line interface
async function main() {
  const command = process.argv[2];
  const args = process.argv.slice(3);

  try {
    switch (command) {
      case 'add-fact':
        await addFact(args[0], args[1]);
        break;
      
      case 'add-pattern':
        await addPattern(args[0], args[1]);
        break;
      
      case 'add-episode':
        await addEpisode(args[0], args[1]);
        break;
      
      case 'search':
        await search(args[0], args[1]);
        break;
      
      case 'search-facts':
        await searchFacts(args[0]);
        break;
      
      case 'list-sessions':
        await listSessions();
        break;
      
      case 'get-memory':
        await getMemory(args[0]);
        break;
      
      case 'migrate':
        await migrateFromLocal();
        break;
      
      case 'setup':
        await setupUser();
        break;
      
      case 'help':
      default:
        showHelp();
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response?.data) {
      console.error('API Response:', error.response.data);
    }
    process.exit(1);
  }
}

// Setup FibreFlow user
async function setupUser() {
  console.log('🔧 Setting up FibreFlow user in Zep...');
  
  try {
    // Try to get existing user first
    try {
      const existingUser = await zep.user.get(userId);
      console.log('✅ User already exists:', userId);
      return;
    } catch (e) {
      // User doesn't exist, create it
    }
    
    // Create new user
    await zep.user.add({
      userId: userId,
      email: 'dev@fibreflow.com',
      firstName: 'FibreFlow',
      lastName: 'Developer',
      metadata: {
        project: 'FibreFlow',
        repository: 'https://github.com/fibreflow/fibreflow',
        environment: 'development',
        created: new Date().toISOString()
      }
    });
    
    console.log('✅ User created successfully');
  } catch (error) {
    console.error('Setup error:', error.message);
    throw error;
  }
}

// Add a fact (using memory API)
async function addFact(category, content) {
  if (!category || !content) {
    console.error('Usage: add-fact <category> <content>');
    return;
  }
  
  const sessionId = `${projectId}_facts_${category}`;
  
  // First ensure session exists
  try {
    await zep.memory.getSession({ sessionId });
  } catch (e) {
    // Create session if it doesn't exist
    await zep.memory.addSession({
      sessionId: sessionId,
      userId: userId,
      metadata: {
        type: 'facts',
        category: category
      }
    });
  }
  
  // Add memory to session
  await zep.memory.add({
    sessionId: sessionId,
    messages: [{
      roleType: 'system',
      content: content,
      metadata: {
        type: 'fact',
        category: category,
        timestamp: new Date().toISOString(),
        source: 'manual_entry'
      }
    }]
  });
  
  console.log(`✅ Added fact to category: ${category}`);
}

// Add a pattern (development pattern)
async function addPattern(name, description) {
  if (!name || !description) {
    console.error('Usage: add-pattern <name> <description>');
    return;
  }
  
  const sessionId = `${projectId}_patterns`;
  
  // First ensure session exists
  try {
    await zep.memory.getSession({ sessionId });
  } catch (e) {
    // Create session if it doesn't exist
    await zep.memory.addSession({
      sessionId: sessionId,
      userId: userId,
      metadata: {
        type: 'patterns'
      }
    });
  }
  
  // Add memory to session
  await zep.memory.add({
    sessionId: sessionId,
    messages: [{
      roleType: 'system',
      content: `Pattern: ${name}\n${description}`,
      metadata: {
        type: 'pattern',
        pattern_name: name,
        timestamp: new Date().toISOString()
      }
    }]
  });
  
  console.log(`✅ Added pattern: ${name}`);
}

// Add an episode (complete interaction)
async function addEpisode(title, jsonData) {
  if (!title || !jsonData) {
    console.error('Usage: add-episode <title> <json-data>');
    return;
  }
  
  const sessionId = `${projectId}_episode_${Date.now()}`;
  let data;
  
  try {
    data = JSON.parse(jsonData);
  } catch (e) {
    console.error('Invalid JSON data');
    return;
  }
  
  // Create session for this episode
  await zep.memory.addSession({
    sessionId: sessionId,
    userId: userId,
    metadata: {
      type: 'episode',
      episode_title: title,
      entities: data.entities || []
    }
  });
  
  // Add memory to session
  await zep.memory.add({
    sessionId: sessionId,
    messages: [{
      roleType: 'system',
      content: JSON.stringify(data, null, 2),
      metadata: {
        type: 'episode',
        title: title,
        timestamp: new Date().toISOString(),
        ...data.metadata
      }
    }]
  });
  
  console.log(`✅ Added episode: ${title}`);
  console.log(`Session ID: ${sessionId}`);
}

// Search across all memories
async function search(query, limit = 10) {
  if (!query) {
    console.error('Usage: search <query> [limit]');
    return;
  }
  
  console.log(`🔍 Searching for: "${query}"...\n`);
  
  const results = await zep.graph.search({
    query: query,
    userId: userId,
    limit: parseInt(limit)
  });
  
  if (!results?.results || results.results.length === 0) {
    console.log('No results found.');
    return;
  }
  
  results.results.forEach((result, index) => {
    console.log(`\n--- Result ${index + 1} ---`);
    console.log(`Score: ${result.score?.toFixed(3) || 'N/A'}`);
    console.log(`Session: ${result.sessionId}`);
    console.log(`Content: ${result.message?.content?.substring(0, 200)}...`);
    if (result.message?.metadata) {
      console.log(`Metadata:`, result.message.metadata);
    }
  });
}

// Search specifically for facts
async function searchFacts(category) {
  console.log(`🔍 Searching facts${category ? ` in category: ${category}` : ''}...\n`);
  
  const sessionPattern = category ? `${projectId}_facts_${category}` : `${projectId}_facts_`;
  
  // For now, use graph search
  const results = await zep.graph.search({
    query: category || '*',
    userId: userId,
    limit: 50
  });
  
  if (!results?.results || results.results.length === 0) {
    console.log('No facts found.');
    return;
  }
  
  const factsByCategory = {};
  results.results.forEach(result => {
    const cat = result.message?.metadata?.category || 'uncategorized';
    if (!factsByCategory[cat]) factsByCategory[cat] = [];
    factsByCategory[cat].push(result.message?.content);
  });
  
  Object.entries(factsByCategory).forEach(([cat, facts]) => {
    console.log(`\n📁 ${cat}:`);
    facts.forEach(fact => console.log(`  • ${fact}`));
  });
}

// List all sessions
async function listSessions() {
  console.log('📋 Listing FibreFlow sessions...\n');
  
  // Note: Zep Cloud doesn't have a direct list sessions API
  // We'll search for all content from our user
  // List sessions by searching graph
  const results = await zep.graph.search({
    query: '*',
    userId: userId,
    limit: 100
  });
  
  const sessions = new Set();
  if (results?.results) {
    results.results.forEach(result => {
      if (result.sessionId) {
        sessions.add(result.sessionId);
      }
    });
  }
  
  console.log(`Found ${sessions.size} sessions:`);
  Array.from(sessions).sort().forEach(session => {
    console.log(`  • ${session}`);
  });
}

// Get memory for a specific session
async function getMemory(sessionId) {
  if (!sessionId) {
    console.error('Usage: get-memory <session-id>');
    return;
  }
  
  console.log(`📄 Getting memory for session: ${sessionId}\n`);
  
  const memory = await zep.memory.getSessionMessages({ sessionId });
  
  if (!memory || !memory.messages || memory.messages.length === 0) {
    console.log('No memory found for this session.');
    return;
  }
  
  console.log(`Messages (${memory.messages.length}):`);
  memory.messages.forEach((msg, index) => {
    console.log(`\n--- Message ${index + 1} ---`);
    console.log(`Role: ${msg.roleType}`);
    console.log(`Content: ${msg.content}`);
    if (msg.metadata) {
      console.log(`Metadata:`, msg.metadata);
    }
  });
  
  if (memory.summary) {
    console.log(`\nSummary: ${memory.summary.content}`);
  }
}

// Migrate from local memory system
async function migrateFromLocal() {
  console.log('🔄 Migrating from local memory system...\n');
  
  const memoryPath = path.join(__dirname, 'memory', 'memory.json');
  
  try {
    const data = await fs.readFile(memoryPath, 'utf8');
    const memory = JSON.parse(data);
    
    // Ensure user exists
    await setupUser();
    
    // Migrate facts
    if (memory.facts && memory.facts.length > 0) {
      console.log(`Migrating ${memory.facts.length} facts...`);
      for (const fact of memory.facts) {
        if (fact.active !== false) {
          await addFact(fact.category, fact.content);
        }
      }
    }
    
    // Migrate patterns
    if (memory.patterns && memory.patterns.length > 0) {
      console.log(`\nMigrating ${memory.patterns.length} patterns...`);
      for (const pattern of memory.patterns) {
        await addPattern(pattern.name, pattern.description || pattern.content);
      }
    }
    
    // Migrate recent sessions as episodes
    if (memory.sessions && memory.sessions.length > 0) {
      console.log(`\nMigrating ${Math.min(10, memory.sessions.length)} recent sessions...`);
      const recentSessions = memory.sessions.slice(0, 10);
      for (const session of recentSessions) {
        await addEpisode(`Session: ${session.timestamp}`, JSON.stringify({
          summary: session.summary,
          context: session.context,
          metadata: {
            timestamp: session.timestamp,
            migrated_from: 'local_memory'
          }
        }));
      }
    }
    
    console.log('\n✅ Migration complete!');
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.error('❌ No local memory file found at:', memoryPath);
    } else {
      throw error;
    }
  }
}

// Show help
function showHelp() {
  console.log(`
Zep Bridge for FibreFlow - Memory Management via Zep Cloud

Usage: node zep-bridge.js <command> [args]

Commands:
  setup                        Setup FibreFlow user in Zep
  add-fact <category> <text>   Add a fact to memory
  add-pattern <name> <desc>    Add a development pattern
  add-episode <title> <json>   Add a complete episode
  search <query> [limit]       Search across all memories
  search-facts [category]      List facts (optionally by category)
  list-sessions               List all memory sessions
  get-memory <session-id>     Get memory for a specific session
  migrate                     Migrate from local memory system
  help                        Show this help

Examples:
  node zep-bridge.js add-fact firebase "Firebase projects are isolated"
  node zep-bridge.js add-pattern "api-first" "Design API before implementation"
  node zep-bridge.js search "firebase authentication"
  node zep-bridge.js add-episode "Storage Debug" '{"problem":"auth fail","solution":"same project"}'

Environment:
  ZEP_API_KEY     Your Zep Cloud API key (required)
`);
}

// Run main function
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});