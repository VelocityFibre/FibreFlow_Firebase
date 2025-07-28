# FibreFlow Agent Context Management System

*Last Updated: 2025-01-29*

## Overview

The Context Management System enables FibreFlow agents to learn from past decisions, capture patterns, and build institutional knowledge over time. This system integrates with the existing agent infrastructure to provide persistent memory and decision tracking.

## System Components

### 1. Decision Log Structure
- **Location**: `.claude/context-management/decisions/`
- **Format**: YAML files organized by date and agent
- **Naming**: `YYYY-MM-DD-agent-name-decision-type.yaml`

### 2. Context Accumulator
- **Script**: `.claude/context-management/accumulate-context.js`
- **Purpose**: Processes decision logs and updates agent knowledge bases
- **Schedule**: Run manually or via cron job

### 3. Pattern Library
- **Location**: `.claude/context-management/patterns/`
- **Categories**: Solutions, Anti-patterns, Best Practices
- **Format**: Markdown with metadata headers

### 4. Agent Integration
- **Enhanced YAML**: Agents include `learned_patterns` section
- **Dynamic Loading**: Patterns loaded based on context
- **Version Control**: Track learning evolution

## Quick Start

### Recording a Decision
```bash
# Use the decision logger
node .claude/context-management/log-decision.js

# Or manually create a decision log
cp .claude/context-management/templates/decision-template.yaml \
   .claude/context-management/decisions/2025-01-29-security-agent-api-key-handling.yaml
```

### Accumulating Context
```bash
# Process all new decisions
node .claude/context-management/accumulate-context.js

# Process specific agent's decisions
node .claude/context-management/accumulate-context.js --agent="Security Agent"
```

### Querying Past Decisions
```bash
# Search for patterns
node .claude/context-management/search-context.js --query="authentication"

# List decisions by agent
node .claude/context-management/search-context.js --agent="Firebase Backend Expert"
```

## Decision Categories

1. **Architecture Decisions**
   - System design choices
   - Technology selections
   - Integration strategies

2. **Problem Solutions**
   - Bug fixes
   - Performance optimizations
   - Workarounds

3. **Business Rules**
   - Data validation patterns
   - Workflow implementations
   - Policy enforcements

4. **Security Decisions**
   - Authentication patterns
   - API key management
   - Access control strategies

## Best Practices

1. **Log Immediately**: Record decisions while context is fresh
2. **Be Specific**: Include exact error messages, code snippets
3. **Tag Appropriately**: Use consistent tags for searchability
4. **Review Regularly**: Periodic reviews to extract patterns
5. **Update Agents**: Incorporate learnings into agent instructions

## Integration with Agents

Agents automatically access relevant context through:
1. **Startup Loading**: Recent decisions loaded on agent activation
2. **Context Injection**: Relevant patterns injected based on task
3. **Dynamic Updates**: Real-time access to new learnings

## Maintenance

- **Weekly**: Run accumulator to update pattern library
- **Monthly**: Review and consolidate similar patterns
- **Quarterly**: Update agent base instructions with stable patterns

## Example Workflow

1. **Encounter Issue**: Firebase authentication fails
2. **Find Solution**: Discover service account needed
3. **Log Decision**: Record solution with context
4. **Tag Pattern**: `#authentication #firebase #service-account`
5. **Accumulate**: Script extracts pattern
6. **Future Use**: Pattern available to all agents

## Directory Structure
```
.claude/context-management/
├── README.md                 # This file
├── decisions/               # Individual decision logs
├── patterns/               # Extracted patterns
├── templates/              # Templates for decisions
├── scripts/               # Management scripts
│   ├── log-decision.js
│   ├── accumulate-context.js
│   └── search-context.js
└── reports/               # Analysis reports
```