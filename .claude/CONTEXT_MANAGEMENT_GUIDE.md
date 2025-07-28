# Context Management System for FibreFlow Agents

## Overview

The Context Management System allows agents to learn from past decisions, accumulate knowledge, and reference previous solutions. This creates a growing knowledge base that improves agent effectiveness over time.

## Architecture

```
.claude/
├── context/
│   ├── decisions.json          # Central knowledge repository
│   └── agents/                 # Agent-specific context files
│       ├── firebase-backend-expert.json
│       ├── data-integrity-guardian.json
│       └── ...
├── utils/
│   └── context_manager.py      # Context management CLI tool
```

## Usage

### Adding Context via CLI

#### 1. Add a Decision
```bash
python3 .claude/utils/context_manager.py add-decision \
  --agent firebase-backend-expert \
  --decision "Use Firestore real-time listeners for sync" \
  --context "Syncing pole status between OneMap and FibreFlow" \
  --rationale "Real-time sync better than batch CSV imports" \
  --category sync-architecture \
  --implementation "OneMap/docs/FIREBASE_TO_FIREBASE_SYNC_INTEGRATION.md" \
  --tags firebase sync real-time
```

#### 2. Add a Pattern
```bash
python3 .claude/utils/context_manager.py add-pattern \
  --agent firebase-backend-expert \
  --name "Cross-Firebase Sync Pattern" \
  --description "Real-time listeners with error handling" \
  --when "Syncing between separate Firebase projects" \
  --code "See integration docs" \
  --tags firebase pattern sync
```

#### 3. Add a Learning
```bash
python3 .claude/utils/context_manager.py add-learning \
  --agent data-integrity-guardian \
  --learning "Pole numbers must be globally unique" \
  --impact "Prevents duplicates and ensures data integrity" \
  --applied-to csv-imports manual-entry sync-operations \
  --tags validation poles uniqueness
```

### Searching Context

```bash
# Search by keyword
python3 .claude/utils/context_manager.py search "firebase sync"

# Search by tags
python3 .claude/utils/context_manager.py search sync --tags firebase real-time
```

### Getting Agent Context

```bash
# View all context for an agent
python3 .claude/utils/context_manager.py agent firebase-backend-expert

# Export agent knowledge as markdown
python3 .claude/utils/context_manager.py agent firebase-backend-expert --export markdown

# Export as JSON
python3 .claude/utils/context_manager.py agent firebase-backend-expert --export json
```

### Updating Decision Outcomes

```bash
# Mark a decision as successful
python3 .claude/utils/context_manager.py update-outcome DEC-2024-01-29-001 success

# Mark as failure
python3 .claude/utils/context_manager.py update-outcome DEC-2024-01-29-001 failure

# Mark as mixed results
python3 .claude/utils/context_manager.py update-outcome DEC-2024-01-29-001 mixed
```

## Integration with Agents

### Automatic Context Loading

Agents can access their context through the `mcp__serena__read_memory` tool or by referencing their context file:

```yaml
# In agent YAML
knowledge_base:
  context_file: ".claude/context/agents/{agent_name}.json"
  decisions_file: ".claude/context/decisions.json"
```

### Using Context in Agent Prompts

When calling an agent, Claude will automatically have access to:
1. The agent's accumulated decisions
2. Patterns that have been established
3. Learnings from past experiences
4. References to implementation documents

### Example Agent Context Usage

```
Use the firebase-backend-expert to set up sync between databases

[Agent will reference]:
- Decision DEC-2024-01-29-001: Use real-time listeners
- Pattern PAT-001: Cross-Firebase Sync Pattern
- Implementation: OneMap/docs/FIREBASE_TO_FIREBASE_SYNC_INTEGRATION.md
```

## Best Practices

### 1. Document Decisions Immediately
After making an architectural or implementation decision:
```bash
python3 .claude/utils/context_manager.py add-decision --agent [agent] ...
```

### 2. Create Patterns from Repeated Solutions
When you solve similar problems multiple times:
```bash
python3 .claude/utils/context_manager.py add-pattern --agent [agent] ...
```

### 3. Capture Learnings from Issues
When you discover important constraints or solutions:
```bash
python3 .claude/utils/context_manager.py add-learning --agent [agent] ...
```

### 4. Update Outcomes
Track whether decisions were successful:
```bash
python3 .claude/utils/context_manager.py update-outcome [decision-id] [outcome]
```

### 5. Regular Knowledge Export
Export agent knowledge for documentation:
```bash
# Export all agent knowledge
for agent in $(ls .claude/agents/yaml/ | sed 's/.yaml//'); do
  python3 .claude/utils/context_manager.py agent $agent --export markdown
done
```

## Context Structure

### Decision Entry
```json
{
  "id": "DEC-2024-01-29-001",
  "date": "2024-01-29",
  "agent": "firebase-backend-expert",
  "category": "sync-architecture",
  "decision": "Use Firestore real-time listeners",
  "context": "Syncing between OneMap and FibreFlow",
  "rationale": "Real-time updates better than batch",
  "implementation": "path/to/docs",
  "outcome": "success|failure|mixed|pending",
  "tags": ["firebase", "sync"]
}
```

### Pattern Entry
```json
{
  "id": "PAT-001",
  "name": "Pattern Name",
  "description": "What the pattern does",
  "agent": "agent-name",
  "code_example": "Code or reference",
  "when_to_use": "Conditions for using pattern",
  "tags": ["tag1", "tag2"]
}
```

### Learning Entry
```json
{
  "id": "LEARN-001",
  "date": "2024-01-29",
  "agent": "agent-name",
  "learning": "What was learned",
  "impact": "How it affects development",
  "applied_to": ["area1", "area2"],
  "tags": ["tag1", "tag2"]
}
```

## Workflow Integration

### During Development
1. **Before starting**: Search for relevant context
   ```bash
   python3 .claude/utils/context_manager.py search "feature-name"
   ```

2. **After decisions**: Document them
   ```bash
   python3 .claude/utils/context_manager.py add-decision ...
   ```

3. **After completion**: Update outcomes
   ```bash
   python3 .claude/utils/context_manager.py update-outcome ...
   ```

### During Agent Usage
1. Agents automatically reference their context
2. Past decisions inform current recommendations
3. Patterns are applied to new problems
4. Learnings prevent repeated mistakes

## Quick Reference Card

```bash
# Add decision
./context add-decision --agent [name] --decision "..." --context "..." --rationale "..."

# Add pattern
./context add-pattern --agent [name] --name "..." --description "..." --when "..."

# Add learning
./context add-learning --agent [name] --learning "..." --impact "..." --applied-to ...

# Search
./context search "keyword" --tags tag1 tag2

# Get agent knowledge
./context agent [name] --export markdown

# Update outcome
./context update-outcome [decision-id] success|failure|mixed
```

## Future Enhancements

1. **Auto-capture from conversations** - Detect decisions in chat
2. **Weekly summaries** - Automated knowledge reports
3. **Cross-agent learning** - Share patterns between agents
4. **Version tracking** - Track evolution of decisions
5. **Impact analysis** - Measure decision effectiveness

Remember: The more context you capture, the smarter your agents become!