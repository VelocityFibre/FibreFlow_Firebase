# Zep/Graphiti MCP Server Setup for FibreFlow

## Overview

Zep uses Graphiti - a temporal knowledge graph system that's much more sophisticated than our local implementation. Key differences:

1. **Temporal Knowledge Graphs** - Not just timestamped facts, but a full graph with relationships that change over time
2. **Episodes** - Groups of related facts from a single interaction
3. **Entity Extraction** - Automatically identifies and tracks entities (people, projects, systems)
4. **Bi-temporal Modeling** - Tracks when events happened AND when they were recorded
5. **Hybrid Search** - Semantic + keyword + graph traversal

## Installation Options

### Option 1: Zep Cloud MCP (Recommended for Quick Start)

```bash
# 1. Sign up for Zep Cloud
# https://app.getzep.com

# 2. Install Zep MCP server
npm install -g @zep/mcp-server

# 3. Configure in Claude Desktop settings.json
```

```json
{
  "mcpServers": {
    "zep-memory": {
      "command": "zep-mcp",
      "args": ["--api-key", "YOUR_ZEP_API_KEY"],
      "env": {
        "ZEP_API_URL": "https://api.getzep.com",
        "ZEP_USER_ID": "fibreflow_dev"
      }
    }
  }
}
```

### Option 2: Graphiti MCP Server (Self-hosted)

```bash
# 1. Clone Graphiti
git clone https://github.com/getzep/graphiti.git
cd graphiti

# 2. Install dependencies
pip install uv
uv sync

# 3. Start Neo4j (using Docker)
docker run -d \
  --name neo4j \
  -p 7474:7474 -p 7687:7687 \
  -e NEO4J_AUTH=neo4j/password \
  neo4j:latest

# 4. Configure environment
export NEO4J_URI="bolt://localhost:7687"
export NEO4J_USER="neo4j"
export NEO4J_PASSWORD="password"
export OPENAI_API_KEY="your-openai-key"
export MODEL_NAME="gpt-4o-mini"
```

## Claude Desktop Configuration

Add to `~/.config/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "fibreflow-memory": {
      "transport": "stdio",
      "command": "/usr/bin/python",
      "args": [
        "/path/to/graphiti/mcp_server/graphiti_mcp_server.py",
        "--transport", "stdio"
      ],
      "env": {
        "NEO4J_URI": "bolt://localhost:7687",
        "NEO4J_USER": "neo4j",
        "NEO4J_PASSWORD": "password",
        "OPENAI_API_KEY": "sk-...",
        "MODEL_NAME": "gpt-4o-mini"
      }
    }
  }
}
```

## Using Zep MCP in Our Workflow

### 1. Adding Episodes (Not Just Facts)

Instead of individual facts, Zep works with episodes - collections of related information:

```typescript
// Through MCP
await mcp.call('add_episode', {
  name: 'Firebase Storage Authentication Issue',
  episode_body: JSON.stringify({
    problem: 'Cross-project authentication failing',
    projects: {
      fibreflow: 'fibreflow-73daf',
      onemap: 'vf-onemap'
    },
    solution: 'Use same project storage bucket',
    learned: '2025-07-23',
    entities: ['FibreFlow', 'VF OneMap', 'Firebase Storage']
  }),
  source: 'development_session',
  source_description: 'Debugging storage upload issue'
});
```

### 2. Searching with Context

```typescript
// Semantic + graph search
await mcp.call('search', {
  query: 'firebase storage authentication',
  limit: 10,
  group_ids: ['fibreflow_project']
});
```

### 3. Entity Management

Zep automatically extracts and tracks entities:
- Projects: FibreFlow, VF OneMap
- Services: PoleTrackerService, AuthService
- Components: PoleTrackerComponent
- Concepts: Firebase Authentication, Storage Buckets

## Migration from Local Memory

```javascript
// migrate-to-zep.js
const localMemory = require('./.claude/memory/memory.json');
const { ZepClient } = require('@zep/js-sdk');

const zep = new ZepClient({ apiKey: process.env.ZEP_API_KEY });

// Create user for project
await zep.user.add({
  user_id: 'fibreflow_dev',
  metadata: {
    project: 'FibreFlow',
    developer: 'Louis'
  }
});

// Migrate facts as episodes
for (const fact of localMemory.facts) {
  await zep.memory.add({
    session_id: `fibreflow_${fact.category}`,
    messages: [{
      role: 'system',
      content: fact.content,
      metadata: {
        ...fact.metadata,
        migrated_from: 'local_memory',
        original_timestamp: fact.timestamp
      }
    }]
  });
}
```

## Key Differences from Our Local System

| Feature | Our Local System | Zep/Graphiti |
|---------|-----------------|--------------|
| Storage | JSON files | Neo4j graph database |
| Search | String matching | Semantic + graph traversal |
| Entities | Manual management | Auto-extraction |
| Time | Simple timestamps | Bi-temporal modeling |
| Relationships | Basic links | Temporal edges with validity |
| Conflicts | Manual resolution | Automatic through temporality |
| Scale | Local only | Cloud or self-hosted |

## Benefits for FibreFlow Development

1. **Automatic Entity Tracking** - Zep will identify and track all services, components, projects
2. **Temporal Queries** - "What was the Firebase config last month?"
3. **Relationship Understanding** - "Which components depend on PoleTrackerService?"
4. **Context Assembly** - Zep builds full context from graph traversal
5. **No Manual Deduplication** - Temporal edges handle updates automatically

## Quick Start Commands

```bash
# After setup, in Claude Desktop I can use:
<use_mcp_tool>
<tool_name>add_episode</tool_name>
<arguments>
{
  "name": "Development Session",
  "episode_body": "JSON content",
  "source": "claude_conversation"
}
</arguments>
</use_mcp_tool>

# Search for relevant context
<use_mcp_tool>
<tool_name>search</tool_name>
<arguments>
{
  "query": "firebase authentication",
  "limit": 20
}
</arguments>
</use_mcp_tool>
```

## Next Steps

1. Choose deployment option (Cloud vs Self-hosted)
2. Set up MCP server
3. Configure Claude Desktop
4. Migrate existing memories
5. Start using temporal knowledge graphs!