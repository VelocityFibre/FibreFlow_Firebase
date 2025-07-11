# dev-task

Quick access to development backlog and task management.

## Usage

This command helps you manage development tasks in the DEVELOPMENT_BACKLOG.md file.

## What it does

1. Shows current in-progress tasks
2. Lists high-priority backlog items
3. Provides quick access to edit the backlog
4. Shows task statistics

## Implementation

```bash
#!/bin/bash

BACKLOG_FILE="docs/DEVELOPMENT_BACKLOG.md"

echo "🚀 FibreFlow Development Tasks"
echo "=============================="
echo ""

# Show in-progress tasks
echo "📍 In Progress:"
grep -A 8 "^### DEV-" "$BACKLOG_FILE" | grep -B 8 "In Progress" | grep "^### DEV-" || echo "  None"
echo ""

# Show high priority tasks
echo "🔥 High Priority:"
grep -A 4 "^### DEV-" "$BACKLOG_FILE" | grep -B 4 "High" | grep "^### DEV-" || echo "  None"
echo ""

# Show statistics
TOTAL=$(grep -c "^### DEV-" "$BACKLOG_FILE")
COMPLETED=$(grep -A 1 "^## ✅ Completed" "$BACKLOG_FILE" | grep -c "^### DEV-")
ACTIVE=$((TOTAL - COMPLETED))

echo "📊 Statistics:"
echo "  Active Tasks: $ACTIVE"
echo "  Completed: $COMPLETED"
echo "  Total: $TOTAL"
echo ""

echo "📝 Commands:"
echo "  View full backlog: cat $BACKLOG_FILE"
echo "  Edit backlog: code $BACKLOG_FILE"
echo "  Search tasks: grep 'search-term' $BACKLOG_FILE"
```

## Examples

View development tasks:
```
/dev-task
```

This will show you:
- Current in-progress tasks
- High priority items
- Quick statistics
- Helpful commands

## Tips

1. **Reference tasks in commits**: Use DEV-XXX format
2. **Update regularly**: Move tasks between sections
3. **Add estimates**: Help with planning
4. **Track blockers**: Note any dependencies