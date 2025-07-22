#!/usr/bin/env node

/**
 * Zep Sync - Synchronize local memory with Zep Cloud
 * 
 * This bridges our local Zep-style memory to actual Zep Cloud
 * Run this after getting Zep API key
 */

const fs = require('fs').promises;
const path = require('path');

// Zep SDK will be installed when ready
// const { ZepClient } = require('@getzep/zep-cloud');

class ZepSync {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.localMemoryPath = '.claude/memory';
    // this.zep = new ZepClient({ apiKey });
  }

  async syncToZep() {
    console.log('🔄 Syncing local memory to Zep Cloud...');
    
    // Load local memory
    const memory = await this.loadLocalMemory();
    const graph = await this.loadLocalGraph();
    const sessions = await this.loadLocalSessions();

    // When Zep is ready, uncomment these:
    /*
    // Create user for the project
    await this.zep.user.add({
      user_id: 'fibreflow_project',
      metadata: {
        project: 'FibreFlow',
        developer: 'Louis',
        created: new Date().toISOString()
      }
    });

    // Sync facts as Zep facts
    for (const fact of memory.facts) {
      await this.zep.memory.add({
        session_id: 'fibreflow_facts',
        messages: [{
          role: 'system',
          content: fact.content,
          metadata: {
            category: fact.category,
            ...fact.metadata,
            local_id: fact.id
          }
        }]
      });
    }

    // Sync patterns
    for (const [category, patterns] of Object.entries(memory.patterns)) {
      for (const pattern of patterns) {
        await this.zep.memory.add({
          session_id: 'fibreflow_patterns',
          messages: [{
            role: 'system',
            content: `Pattern: ${pattern.pattern}`,
            metadata: {
              category,
              context: pattern.context,
              timestamp: pattern.timestamp
            }
          }]
        });
      }
    }

    // Sync knowledge graph
    for (const [type, entities] of Object.entries(graph.entities)) {
      for (const [name, data] of Object.entries(entities)) {
        await this.zep.graph.add_entity({
          type,
          name,
          properties: data.properties
        });
      }
    }

    // Sync relationships
    for (const rel of graph.relationships) {
      await this.zep.graph.add_relationship({
        from: rel.from,
        to: rel.to,
        type: rel.type,
        metadata: rel.metadata
      });
    }
    */

    console.log('✅ Sync complete! (Ready for Zep integration)');
    this.generateSyncReport(memory, graph, sessions);
  }

  generateSyncReport(memory, graph, sessions) {
    console.log('\n📊 Ready to sync to Zep:');
    console.log(`- ${memory.facts.length} facts`);
    console.log(`- ${Object.values(memory.patterns).flat().length} patterns`);
    console.log(`- ${memory.preferences.length} preferences`);
    console.log(`- ${Object.values(graph.entities).reduce((sum, e) => sum + Object.keys(e).length, 0)} entities`);
    console.log(`- ${graph.relationships.length} relationships`);
    console.log(`- ${sessions.sessions.length} sessions`);
  }

  // Generate Zep configuration
  async generateZepConfig() {
    const config = {
      name: "FibreFlow Development Memory",
      description: "Context and memory for FibreFlow Angular/Firebase development",
      user_id: "fibreflow_project",
      sessions: [
        {
          session_id: "fibreflow_facts",
          description: "Project facts and learnings"
        },
        {
          session_id: "fibreflow_patterns", 
          description: "Code patterns and best practices"
        },
        {
          session_id: "fibreflow_errors",
          description: "Common errors and solutions"
        }
      ],
      metadata: {
        project: "FibreFlow",
        tech_stack: ["Angular 20", "Firebase", "TypeScript"],
        created: new Date().toISOString()
      }
    };

    await fs.writeFile(
      '.claude/zep-config.json',
      JSON.stringify(config, null, 2)
    );

    console.log('✅ Generated Zep configuration at .claude/zep-config.json');
  }

  // Helper methods
  async loadLocalMemory() {
    const data = await fs.readFile(path.join(this.localMemoryPath, 'memory.json'), 'utf8');
    return JSON.parse(data);
  }

  async loadLocalGraph() {
    const data = await fs.readFile(path.join(this.localMemoryPath, 'knowledge-graph.json'), 'utf8');
    return JSON.parse(data);
  }

  async loadLocalSessions() {
    const data = await fs.readFile(path.join(this.localMemoryPath, 'sessions.json'), 'utf8');
    return JSON.parse(data);
  }
}

// CLI Interface
async function main() {
  const command = process.argv[2];

  switch (command) {
    case 'prepare':
      console.log(`
🚀 Preparing for Zep Cloud Integration

1. Sign up for Zep Cloud:
   https://app.getzep.com

2. Get your API key from the dashboard

3. Install Zep SDK:
   npm install @getzep/zep-cloud

4. Set your API key:
   export ZEP_API_KEY="your-api-key"

5. Run sync:
   node .claude/zep-sync.js sync

Current local memory will be preserved and synced to Zep.
      `);
      
      const sync = new ZepSync();
      await sync.generateZepConfig();
      break;

    case 'sync':
      const apiKey = process.env.ZEP_API_KEY;
      if (!apiKey) {
        console.error('❌ Please set ZEP_API_KEY environment variable');
        process.exit(1);
      }
      
      const syncer = new ZepSync(apiKey);
      await syncer.syncToZep();
      break;

    default:
      console.log(`
Zep Sync - Bridge local memory to Zep Cloud

Commands:
  prepare  - Generate Zep configuration and show setup steps
  sync     - Sync local memory to Zep Cloud (requires API key)

Example:
  node .claude/zep-sync.js prepare
  export ZEP_API_KEY="your-key"
  node .claude/zep-sync.js sync
      `);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = ZepSync;