#!/usr/bin/env node

/**
 * Zep Facts Viewer - Correct API Usage for v2.21.0
 * 
 * This script demonstrates the proper way to access Zep Cloud memories
 * using the v2.21.0 API (facts extraction, not raw messages).
 */

require('dotenv').config({ path: '.env' });
const { ZepClient } = require('@getzep/zep-cloud');

const zep = new ZepClient({ apiKey: process.env.ZEP_API_KEY });
const userId = 'fibreflow_dev';

async function main() {
  const command = process.argv[2] || 'facts';
  
  try {
    switch (command) {
      case 'facts':
        await showFacts();
        break;
      case 'sessions':
        await showSessions();
        break;
      case 'search':
        await searchFacts(process.argv[3] || '');
        break;
      case 'action-items':
        await findActionItemsFacts();
        break;
      case 'help':
      default:
        showHelp();
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.status) console.error('Status:', error.status);
  }
}

async function showFacts() {
  console.log('🧠 **Retrieving Facts from Zep Cloud**\n');
  
  const result = await zep.user.getFacts(userId);
  
  if (!result.facts || result.facts.length === 0) {
    console.log('No facts found.');
    return;
  }
  
  console.log(`Found ${result.facts.length} facts:\n`);
  
  result.facts.forEach((fact, index) => {
    console.log(`--- Fact ${index + 1} ---`);
    console.log(`Content: ${fact.content}`);
    console.log(`Relationship: ${fact.sourceNodeName} -> ${fact.name} -> ${fact.targetNodeName}`);
    console.log(`Created: ${fact.createdAt}`);
    console.log();
  });
}

async function showSessions() {
  console.log('📋 **Retrieving Sessions from Zep Cloud**\n');
  
  const sessions = await zep.user.getSessions(userId);
  
  if (!sessions || sessions.length === 0) {
    console.log('No sessions found.');
    return;
  }
  
  console.log(`Found ${sessions.length} sessions:\n`);
  
  sessions.forEach((session, index) => {
    console.log(`--- Session ${index + 1} ---`);
    console.log(`Session ID: ${session.sessionId}`);
    console.log(`Created: ${session.createdAt}`);
    if (session.metadata) {
      console.log(`Metadata:`, session.metadata);
    }
    console.log();
  });
}

async function searchFacts(query) {
  if (!query) {
    console.log('❌ Please provide a search query');
    return;
  }
  
  console.log(`🔍 **Searching facts for: "${query}"**\n`);
  
  const result = await zep.user.getFacts(userId);
  
  if (!result.facts) {
    console.log('No facts found.');
    return;
  }
  
  const matches = result.facts.filter(fact => 
    fact.content.toLowerCase().includes(query.toLowerCase()) ||
    fact.sourceNodeName.toLowerCase().includes(query.toLowerCase()) ||
    fact.targetNodeName.toLowerCase().includes(query.toLowerCase())
  );
  
  if (matches.length === 0) {
    console.log(`No facts found matching "${query}"`);
    return;
  }
  
  console.log(`Found ${matches.length} matching facts:\n`);
  
  matches.forEach((fact, index) => {
    console.log(`--- Match ${index + 1} ---`);
    console.log(`Content: ${fact.content}`);
    console.log(`Relationship: ${fact.sourceNodeName} -> ${fact.name} -> ${fact.targetNodeName}`);
    console.log();
  });
}

async function findActionItemsFacts() {
  console.log('🎯 **Action Items Debugging Facts**\n');
  
  const result = await zep.user.getFacts(userId);
  
  const actionItemsFacts = result.facts.filter(fact => 
    fact.content.toLowerCase().includes('action-items') ||
    fact.content.toLowerCase().includes('action items')
  );
  
  if (actionItemsFacts.length === 0) {
    console.log('❌ No Action Items facts found');
    return;
  }
  
  console.log(`✅ Found ${actionItemsFacts.length} Action Items related facts:\n`);
  
  actionItemsFacts.forEach((fact, index) => {
    console.log(`--- Action Items Fact ${index + 1} ---`);
    console.log(`📝 ${fact.content}`);
    console.log(`🔗 ${fact.sourceNodeName} -> ${fact.targetNodeName}`);
    console.log(`📅 ${fact.createdAt}`);
    console.log();
  });
}

function showHelp() {
  console.log(`
🧠 **Zep Facts Viewer - Correct API Usage for v2.21.0**

Usage: node zep-facts-viewer.js <command> [args]

Commands:
  facts              List all extracted facts (default)
  sessions           List all sessions
  search <query>     Search facts by content
  action-items       Find Action Items debugging facts
  help               Show this help

Examples:
  node zep-facts-viewer.js facts
  node zep-facts-viewer.js search "action-items"
  node zep-facts-viewer.js action-items

Note: This uses the correct v2.21.0 API methods:
- user.getFacts() instead of memory.getSessionMessages()
- user.getSessions() instead of memory.getSession()
`);
}

main();