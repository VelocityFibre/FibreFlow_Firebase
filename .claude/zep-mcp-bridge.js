#!/usr/bin/env node

/**
 * Zep MCP Bridge for Claude Desktop
 * 
 * This provides MCP (Model Context Protocol) server functionality
 * that bridges Claude Desktop to Zep Cloud for memory management.
 * 
 * Usage in Claude Desktop config:
 * {
 *   "mcpServers": {
 *     "fibreflow-memory": {
 *       "command": "node",
 *       "args": ["/path/to/zep-mcp-bridge.js"],
 *       "env": { "ZEP_API_KEY": "your-key" }
 *     }
 *   }
 * }
 */

const { ZepClient } = require('@getzep/zep-cloud');
const readline = require('readline');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// MCP protocol implementation
class MCPServer {
  constructor() {
    this.zep = null;
    this.userId = 'fibreflow_dev';
    this.projectId = 'fibreflow';
  }

  async initialize() {
    const apiKey = process.env.ZEP_API_KEY;
    if (!apiKey) {
      throw new Error('ZEP_API_KEY environment variable is required');
    }
    
    this.zep = new ZepClient({ apiKey });
    
    // Setup readline for stdio communication
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false
    });
  }

  async handleRequest(request) {
    const { method, params, id } = request;
    
    try {
      let result;
      
      switch (method) {
        case 'tools/list':
          result = this.listTools();
          break;
          
        case 'tools/call':
          result = await this.callTool(params.name, params.arguments);
          break;
          
        default:
          throw new Error(`Unknown method: ${method}`);
      }
      
      return {
        jsonrpc: '2.0',
        id,
        result
      };
    } catch (error) {
      return {
        jsonrpc: '2.0',
        id,
        error: {
          code: -32000,
          message: error.message
        }
      };
    }
  }

  listTools() {
    return {
      tools: [
        {
          name: 'add_memory',
          description: 'Add a memory to Zep (fact, pattern, or episode)',
          inputSchema: {
            type: 'object',
            properties: {
              type: {
                type: 'string',
                enum: ['fact', 'pattern', 'episode'],
                description: 'Type of memory to add'
              },
              category: {
                type: 'string',
                description: 'Category for facts, name for patterns'
              },
              content: {
                type: 'string',
                description: 'The content to remember'
              },
              metadata: {
                type: 'object',
                description: 'Additional metadata (for episodes)'
              }
            },
            required: ['type', 'content']
          }
        },
        {
          name: 'search_memory',
          description: 'Search Zep memories',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Search query'
              },
              limit: {
                type: 'number',
                description: 'Maximum results',
                default: 10
              },
              type: {
                type: 'string',
                enum: ['all', 'facts', 'patterns', 'episodes'],
                description: 'Filter by memory type',
                default: 'all'
              }
            },
            required: ['query']
          }
        },
        {
          name: 'list_facts',
          description: 'List all facts by category',
          inputSchema: {
            type: 'object',
            properties: {
              category: {
                type: 'string',
                description: 'Filter by category (optional)'
              }
            }
          }
        },
        {
          name: 'get_context',
          description: 'Get relevant context for a topic',
          inputSchema: {
            type: 'object',
            properties: {
              topic: {
                type: 'string',
                description: 'Topic to get context for'
              }
            },
            required: ['topic']
          }
        }
      ]
    };
  }

  async callTool(name, args) {
    switch (name) {
      case 'add_memory':
        return await this.addMemory(args);
        
      case 'search_memory':
        return await this.searchMemory(args);
        
      case 'list_facts':
        return await this.listFacts(args);
        
      case 'get_context':
        return await this.getContext(args);
        
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  async addMemory({ type, category, content, metadata = {} }) {
    let sessionId;
    
    switch (type) {
      case 'fact':
        sessionId = `${this.projectId}_facts_${category || 'general'}`;
        break;
      case 'pattern':
        sessionId = `${this.projectId}_patterns`;
        break;
      case 'episode':
        sessionId = `${this.projectId}_episode_${Date.now()}`;
        break;
      default:
        throw new Error(`Invalid memory type: ${type}`);
    }
    
    await this.zep.memory.add(sessionId, {
      messages: [{
        role_type: 'system',
        content: content,
        metadata: {
          type,
          category,
          timestamp: new Date().toISOString(),
          source: 'claude_mcp',
          ...metadata
        }
      }],
      metadata: {
        user_id: this.userId,
        type,
        category
      }
    });
    
    return {
      success: true,
      sessionId,
      message: `Added ${type} to memory`
    };
  }

  async searchMemory({ query, limit = 10, type = 'all' }) {
    const searchParams = {
      text: query,
      user_id: this.userId,
      limit,
      search_scope: 'messages'
    };
    
    if (type !== 'all') {
      // Filter by session pattern
      const typeMap = {
        'facts': `${this.projectId}_facts_`,
        'patterns': `${this.projectId}_patterns`,
        'episodes': `${this.projectId}_episode_`
      };
      if (typeMap[type]) {
        searchParams.session_id = typeMap[type];
      }
    }
    
    const results = await this.zep.memory.search(searchParams);
    
    return {
      results: results.map(r => ({
        content: r.message?.content,
        score: r.score,
        metadata: r.metadata,
        sessionId: r.session_id
      }))
    };
  }

  async listFacts({ category } = {}) {
    const sessionPattern = category 
      ? `${this.projectId}_facts_${category}`
      : `${this.projectId}_facts_`;
    
    const results = await this.zep.memory.search({
      text: '',
      user_id: this.userId,
      session_id: sessionPattern,
      limit: 100,
      search_scope: 'messages'
    });
    
    const factsByCategory = {};
    results.forEach(result => {
      const cat = result.metadata?.category || 'general';
      if (!factsByCategory[cat]) factsByCategory[cat] = [];
      factsByCategory[cat].push({
        content: result.message?.content,
        timestamp: result.metadata?.timestamp
      });
    });
    
    return { facts: factsByCategory };
  }

  async getContext({ topic }) {
    // Search for relevant information
    const results = await this.zep.memory.search({
      text: topic,
      user_id: this.userId,
      limit: 20,
      search_scope: 'messages'
    });
    
    // Organize by type
    const context = {
      facts: [],
      patterns: [],
      episodes: [],
      relevant: []
    };
    
    results.forEach(result => {
      const item = {
        content: result.message?.content,
        score: result.score,
        metadata: result.metadata
      };
      
      switch (result.metadata?.type) {
        case 'fact':
          context.facts.push(item);
          break;
        case 'pattern':
          context.patterns.push(item);
          break;
        case 'episode':
          context.episodes.push(item);
          break;
        default:
          context.relevant.push(item);
      }
    });
    
    return context;
  }

  async start() {
    await this.initialize();
    
    // Send initialization response
    console.log(JSON.stringify({
      jsonrpc: '2.0',
      method: 'initialized',
      params: {
        serverInfo: {
          name: 'fibreflow-zep-memory',
          version: '1.0.0'
        },
        capabilities: {
          tools: {}
        }
      }
    }));
    
    // Listen for requests
    this.rl.on('line', async (line) => {
      try {
        const request = JSON.parse(line);
        const response = await this.handleRequest(request);
        console.log(JSON.stringify(response));
      } catch (error) {
        console.error('Error processing request:', error);
      }
    });
  }
}

// Start the server
const server = new MCPServer();
server.start().catch(error => {
  console.error('Failed to start MCP server:', error);
  process.exit(1);
});