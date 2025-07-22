#!/usr/bin/env node

/**
 * Migrate from memory-system v1 to v2
 * Adds missing fields and creates archive
 */

const fs = require('fs').promises;
const path = require('path');

async function migrate() {
  console.log('🔄 Migrating memory system to v2...');
  
  const memoryPath = '.claude/memory';
  
  // Load existing memory
  const memoryFile = path.join(memoryPath, 'memory.json');
  const data = await fs.readFile(memoryFile, 'utf8');
  const memory = JSON.parse(data);
  
  // Update facts with new fields
  memory.facts = memory.facts.map(fact => ({
    ...fact,
    active: fact.active !== undefined ? fact.active : true,
    version: fact.version || 1,
    historical: false,
    important: false
  }));
  
  // Update patterns with version
  for (const category in memory.patterns) {
    memory.patterns[category] = memory.patterns[category].map(pattern => ({
      ...pattern,
      version: pattern.version || 1
    }));
  }
  
  // Update preferences
  memory.preferences = memory.preferences.map(pref => ({
    ...pref,
    active: pref.active !== undefined ? pref.active : true
  }));
  
  // Save updated memory
  await fs.writeFile(memoryFile, JSON.stringify(memory, null, 2));
  
  // Create empty archive
  const archiveFile = path.join(memoryPath, 'archive.json');
  try {
    await fs.access(archiveFile);
  } catch {
    await fs.writeFile(archiveFile, JSON.stringify({ archived: [] }, null, 2));
  }
  
  console.log('✅ Migration complete!');
  console.log('You can now use: node .claude/memory-system-v2.js');
}

migrate().catch(console.error);