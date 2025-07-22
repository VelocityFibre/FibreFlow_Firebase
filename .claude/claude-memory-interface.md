# Claude Memory Interface

## How Claude Code Uses This Memory System

### During Development Sessions

1. **Before suggesting solutions**, I check:
   ```bash
   node .claude/memory-system.js context "firebase storage upload"
   ```
   This gives me:
   - Previous issues with this topic
   - Patterns that work
   - Your preferences
   - Related entities

2. **After learning something new**, you can add:
   ```bash
   # Add a fact
   claude-mem fact "Component X uses Service Y for data fetching"
   
   # Add a pattern that worked
   claude-mem pattern firebase "Use waitForPendingWrites() for critical saves"
   
   # Add a mistake to avoid
   claude-mem fact "Never use direct Firebase SDK in components"
   ```

3. **End of session summary**:
   ```bash
   claude-mem session "Pole Tracker Mobile Fix" "Fixed routing conflict, added mobile list view"
   ```

### Memory Structure (Zep-Inspired)

```
.claude/memory/
├── memory.json          # Facts, patterns, preferences
├── knowledge-graph.json # Entity relationships
└── sessions.json        # Development session summaries
```

### Key Concepts from Zep

1. **Facts** - Discrete, verifiable information
   - "FibreFlow uses project ID: fibreflow-73daf"
   - "Cannot auth across Firebase projects"

2. **Patterns** - Reusable solutions
   - routing: "Simple routes in app.routes.ts"
   - firebase: "Real-time listeners for shared data"

3. **Knowledge Graph** - Entity relationships
   - PoleTrackerComponent → uses → GoogleMapsService
   - FibreFlow → separate-from → VF OneMap

4. **Sessions** - Learning from each work session
   - What we worked on
   - Issues encountered
   - Solutions found

### Integration with Claude Code

When you start a session:
```bash
# I can check context for your task
node .claude/memory-system.js context "work on OneMap upload"

# Returns:
- Facts about OneMap/FibreFlow separation
- Previous storage auth issues
- Your preference to fix root causes
```

### Future Zep Cloud Benefits

1. **Persistent across machines** - Access from any device
2. **Advanced search** - Semantic similarity, not just keywords
3. **Temporal queries** - "What did we learn last week?"
4. **Team sharing** - Other devs can access project memory

### Quick Commands for You

```bash
# After I make a mistake
claude-mem fact "Don't do X, instead do Y"

# When we find a good pattern
claude-mem pattern category "pattern description"

# After solving a tricky issue
claude-mem session "Issue Name" "How we solved it"

# Check what I should remember
claude-mem search "topic"
claude-mem context "task description"
```

This way, I evolve from session to session, remembering what works and what doesn't!