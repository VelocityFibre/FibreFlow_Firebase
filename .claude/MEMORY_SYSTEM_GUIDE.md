# Claude Memory System Guide (v2)

## Overview

The Claude Memory System v2 is an enhanced local, Zep-inspired memory management system with conflict detection, time relevance, and category management. It helps me (Claude Code) learn from our interactions while preventing conflicting or outdated information.

## Architecture

```
.claude/
├── memory-system.js         # Original v1 (deprecated)
├── memory-system-v2.js      # Enhanced v2 with conflict detection
├── migrate-memory.js        # Migration script v1 → v2
├── memory-init.sh          # Initialization script
├── zep-sync.js             # Future Zep Cloud sync
├── memory/                 # Memory storage
│   ├── memory.json         # Facts, patterns, preferences
│   ├── knowledge-graph.json # Entity relationships
│   ├── sessions.json       # Development sessions
│   └── archive.json        # Archived/historical memories
└── MEMORY_SYSTEM_GUIDE.md  # This file
```

## New in v2

### 1. Conflict Detection
When adding facts, the system checks for conflicts:
- Detects similar existing facts
- Prompts for resolution (replace, keep both, update, cancel)
- Maintains version history

### 2. Time Relevance
- All memories have timestamps
- Search by recency: `search-recent 7 "topic"`
- Timeline view: `timeline 14`
- Auto-archive old memories: `clean 90`

### 3. Category Management
- List all categories: `list-categories`
- View category contents: `list-category firebase`
- Categories show fact and pattern counts
- Easy cleanup by category

### 4. Memory Protection
- Mark important memories: `mark-important "critical fact"`
- Important memories won't be auto-cleaned
- Archive system preserves old data

## Memory Types

### 1. Facts
Discrete, verifiable information about the project.

**Examples:**
- "FibreFlow uses Firebase project: fibreflow-73daf"
- "Cannot authenticate across Firebase projects without service account"
- "Storage uploads must use the same project's bucket as the authentication"

**Add a fact:**
```bash
node .claude/memory-system.js fact "Angular v20 uses afterNextRender instead of setTimeout"
```

### 2. Patterns
Reusable solutions and approaches that work well.

**Categories:**
- `routing` - URL and navigation patterns
- `firebase` - Firebase/Firestore patterns
- `storage` - File storage patterns
- `errors` - Common error patterns and fixes
- `angular` - Angular-specific patterns
- `deployment` - Build and deploy patterns

**Add a pattern:**
```bash
node .claude/memory-system.js pattern routing "Use simple top-level routes to avoid NG04002 errors"
node .claude/memory-system.js pattern firebase "Use waitForPendingWrites() for critical saves"
```

### 3. Preferences
Your development preferences and rules I should follow.

**Current preferences:**
- Always ask before making architectural changes
- Fix root cause, not symptoms
- Prefer simple solutions over complex ones
- Never create server-side workarounds without permission

**Add a preference:**
```bash
node .claude/memory-system.js preference "Test on live Firebase, not local dev server"
```

### 4. Entities (Knowledge Graph)
Components, services, and their relationships.

**Entity types:**
- `project` - Firebase projects
- `service` - Angular services
- `component` - Angular components
- `module` - Feature modules
- `collection` - Firestore collections

**Add entities:**
```bash
node .claude/memory-system.js entity service AuthService "Handles authentication"
node .claude/memory-system.js entity component LoginComponent "User login interface"
```

### 5. Relationships
How entities connect to each other.

**Add relationships:**
```bash
node .claude/memory-system.js relationship LoginComponent uses AuthService
node .claude/memory-system.js relationship AuthService writes-to users
```

### 6. Sessions
Summaries of development sessions and what was learned.

**Add session:**
```bash
node .claude/memory-system.js session "Firebase Storage Fix" "Fixed cross-project auth by updating bucket config"
```

## Usage Workflows

### For Claude (Me)

#### Before Starting Any Task:
```bash
# Check context for the task
node .claude/memory-system.js context "implement file upload"

# This returns:
# - Relevant facts (Firebase project separation)
# - Applicable patterns (storage configuration)
# - User preferences (fix root cause)
# - Related sessions (previous upload work)
```

#### During Development:
1. Check memory for similar issues
2. Apply learned patterns
3. Respect user preferences
4. Avoid previous mistakes

### For You (Developer)

#### After I Make a Mistake:
```bash
# Add what went wrong and the correct approach
node .claude/memory-system.js fact "Don't use ng serve, always deploy to test"
```

#### When We Find a Good Solution:
```bash
# Capture the pattern
node .claude/memory-system.js pattern category "solution description"
```

#### End of Session:
```bash
# Summarize what we accomplished
node .claude/memory-system.js session "Session Name" "What we did and learned"
```

## Common Scenarios

### Scenario 1: Cross-Project Issues
```bash
# Memory helps me remember:
- Fact: "FibreFlow and VF OneMap are separate Firebase projects"
- Pattern: "Check project ID in storage bucket configuration"
- Preference: "Ask before creating workarounds"
```

### Scenario 2: Routing Problems
```bash
# Memory helps me remember:
- Pattern: "Simple routes in app.routes.ts work best"
- Fact: "Nested lazy routes cause NG04002 errors"
- Session: "Fixed task-grid routing with top-level route"
```

### Scenario 3: Component Dependencies
```bash
# Knowledge graph shows:
- PoleTrackerComponent uses PoleTrackerService
- PoleTrackerComponent uses GoogleMapsService
- Modifying services affects multiple components
```

## Search and Query

### Search by Keyword:
```bash
node .claude/memory-system.js search "firebase"
# Returns all facts, patterns, preferences with "firebase"
```

### Get Context for Task:
```bash
node .claude/memory-system.js context "implement authentication"
# Returns relevant memories and advice
```

### View Statistics:
```bash
node .claude/memory-system.js stats
# Shows count of all memory types
```

## Best Practices

### 1. Be Specific
```bash
# Good
node .claude/memory-system.js fact "mat-select with multiple=true keeps dropdown open by design"

# Too vague
node .claude/memory-system.js fact "Dropdown issues"
```

### 2. Include Context
```bash
# Good
node .claude/memory-system.js pattern errors "CORS errors on storage upload indicate cross-project auth issue"

# Missing context
node .claude/memory-system.js pattern errors "CORS errors"
```

### 3. Regular Updates
- Add learnings immediately while fresh
- Update after each development session
- Review and clean outdated information

## Future: Zep Cloud Integration

When ready to upgrade to Zep Cloud:

```bash
# 1. Prepare for migration
node .claude/zep-sync.js prepare

# 2. Set up Zep account and get API key
export ZEP_API_KEY="your-key"

# 3. Sync local memory to cloud
node .claude/zep-sync.js sync
```

Benefits of Zep Cloud:
- Persistent across machines
- Semantic search
- Temporal queries
- Team sharing
- Advanced AI features

## Quick Reference Card

```bash
# Essential Commands
fact "learning"                     # Add a fact
pattern category "solution"         # Add a pattern  
preference "rule"                   # Add a preference
entity type name "description"      # Add an entity
relationship from verb to           # Add a relationship
session "title" "summary"           # Add a session
search "keyword"                    # Search memories
context "task"                      # Get task context
stats                              # View statistics

# Common Patterns
pattern routing "..."              # Routing solutions
pattern firebase "..."             # Firebase patterns
pattern errors "..."               # Error patterns
pattern angular "..."              # Angular patterns

# Entity Types
entity service ServiceName "..."   # Services
entity component CompName "..."    # Components
entity project ProjectName "..."   # Projects
entity collection collName "..."   # Firestore collections
```

## Troubleshooting

### Memory Not Found
- Check spelling and keywords
- Use broader search terms
- Verify memory was added successfully

### Large Memory Files
- Periodically clean old/outdated facts
- Archive sessions older than 6 months
- Consider migrating to Zep Cloud

### Integration Issues
- Ensure Node.js is available
- Check file permissions in .claude/
- Verify JSON files are valid

---

*Memory System Version: 1.0*  
*Based on Zep's memory management concepts*  
*Created: 2025-07-23*