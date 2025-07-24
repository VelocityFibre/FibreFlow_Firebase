# FibreFlow Memory Systems Integration

## Overview
FibreFlow uses 4 integrated memory systems for Claude AI assistance:

### 1. Zep Cloud (Primary)
- **Purpose**: Long-term temporal knowledge graphs
- **Access**: `node zep-bridge.js` commands
- **Types**: Facts, Patterns, Episodes
- **Status**: ✅ Operational (fixed SDK method signature 2025-07-24)

### 2. Serena MCP (Automatic)
- **Purpose**: Project context and code patterns
- **Access**: MCP tools (mcp__serena__*)
- **Storage**: `.serena/memories/`
- **Status**: ✅ Active

### 3. antiHall (Validation)
- **Purpose**: Prevent code hallucinations
- **Access**: `npm run check "code"`
- **Storage**: `knowledge-graphs/`
- **Status**: ✅ Working (512 entities parsed)

### 4. Local Memory (Backup)
- **Purpose**: Offline backup system
- **Access**: `memory-system-v2.js`
- **Storage**: `.claude/memory/`
- **Status**: ✅ Available

## Daily Workflow
1. Run `grease-the-groove.sh` each morning
2. Validate code with antiHall before suggesting
3. Add memories after discoveries
4. Test weekly with `test-all-memory.sh`