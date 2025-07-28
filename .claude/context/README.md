# Agent Context Directory

This directory contains the accumulated knowledge and context for FibreFlow agents.

## Structure

- `decisions.json` - Central repository of all decisions, patterns, and learnings
- `agents/` - Individual agent context files with references to their specific knowledge

## Management

Use the context manager tool to add and query context:

```bash
python3 ..utils/context_manager.py --help
```

See `../CONTEXT_MANAGEMENT_GUIDE.md` for full documentation.

## Important Notes

1. **Do not edit these files manually** - Use the context_manager.py tool
2. **Context is automatically loaded** by agents when they run
3. **Regular backups recommended** - This is your knowledge base

## Quick Stats

Check the current knowledge base size:
```bash
# Count decisions
jq '.decisions | length' decisions.json

# Count patterns  
jq '.patterns | length' decisions.json

# Count learnings
jq '.learnings | length' decisions.json
```