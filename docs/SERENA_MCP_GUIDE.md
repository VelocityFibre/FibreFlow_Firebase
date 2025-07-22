# Serena MCP Guide for FibreFlow

## What is Serena MCP?

Serena is a **semantic code search and retrieval tool** that dramatically improves how Claude Code understands and navigates your codebase. Instead of Claude reading through hundreds of files to find what it needs, Serena uses semantic search to instantly locate the exact code relevant to your task.

## How Serena Helps FibreFlow

### Before Serena (What Claude does now):
```
You: "Fix the BOQ calculation error"
Claude: 
- Lists directory structure
- Reads 50+ service files looking for BOQ
- Reads 100+ component files
- Finally finds BoqService after reading 10,000+ lines
- Context window now cluttered with irrelevant code
```

### With Serena (Semantic search):
```
You: "Fix the BOQ calculation error"
Claude (using Serena):
- Semantic search: "BOQ calculation"
- Instantly finds: BoqService.calculateTotals()
- Only loads relevant methods and related code
- Context window stays clean and focused
```

## Key Benefits for FibreFlow

1. **Faster Responses** - No more waiting while Claude explores your entire codebase
2. **Better Accuracy** - Focused context means fewer mistakes
3. **Token Savings** - Critical on Pro plan with 5-hour windows
4. **Cross-Module Intelligence** - Finds connections between BOQ → Stock → Projects instantly

## How to Use Serena

### Step 1: Start Claude Code
When you start Claude Code in your FibreFlow directory, Serena automatically launches:
```bash
cd ~/VF/Apps/FibreFlow
claude
```

You'll see Serena is connected in the MCP section.

### Step 2: Give Claude Instructions
The first thing you should do in any new conversation is tell Claude to use Serena:
```
/mcp__serena__initial_instructions
```

Or manually:
```
When searching for code, always use Serena's semantic search tools before reading files directly. This will help you find relevant code faster and more accurately.
```

### Step 3: Watch the Magic
Now when you ask Claude to work on features, it will use Serena's tools:
- `find_symbol` - Find classes, methods, interfaces by name
- `find_referencing_symbols` - Find all places that use a symbol
- `get_symbols_overview` - Get structure of files/modules
- `search_for_pattern` - Semantic search for concepts

## Real-World Examples for FibreFlow

### Example 1: Cross-Module Bug Fix
```
You: "The BOQ calculations aren't updating stock levels correctly"

Without Serena:
- Claude reads all BOQ files (2000+ lines)
- Then reads all Stock files (1500+ lines)  
- Then reads Project files (3000+ lines)
- Total: 6500+ lines in context

With Serena:
- Searches: "BOQ calculation stock update"
- Finds: BoqService.calculateTotals(), StockService.updateLevels()
- Only loads: 200 lines of relevant code
- Instantly sees the connection issue
```

### Example 2: Finding All Usages
```
You: "Show me everywhere we call updateProjectStatus"

Without Serena:
- Claude has to grep through entire codebase
- Might miss dynamic calls or indirect references

With Serena:
- Uses: find_referencing_symbols("updateProjectStatus")
- Instantly returns all usages across all modules
- Includes TypeScript-aware references
```

### Example 3: Understanding Complex Features
```
You: "How does the OneMap import process work?"

Without Serena:
- Claude reads dozens of files in OneMap directory
- Gets lost in implementation details

With Serena:
- Searches: "OneMap import process"
- Finds key methods and their relationships
- Presents clear flow without noise
```

## When Serena Shines

### Perfect for:
- **Cross-module bugs** - "BOQ not updating stock"
- **Refactoring** - "Change all date formatting to use SA locale"
- **Understanding flows** - "How does authentication work?"
- **Finding usages** - "What calls this deprecated method?"
- **Complex features** - "How does pole tracker offline mode work?"

### Less useful for:
- Simple single-file edits
- Creating new features from scratch
- UI/styling changes
- Configuration updates

## Pro Tips

1. **Always start with instructions** - Tell Claude to use Serena at conversation start
2. **Be specific** - "BOQ calculation error" better than "calculation error"
3. **Use for exploration** - "Show me how contractors are assigned to projects"
4. **Combine with your tools** - Serena + antiHall + page contexts = ultimate accuracy

## How It Works with Your Existing Setup

Serena **complements** your current tools:
- **CLAUDE.md** - Still provides high-level overview
- **antiHall** - Still validates the code Serena finds
- **Page contexts** - Serena uses these as hints for better search
- **Specifications** - Semantic search understands your intent

## Technical Details

- **Indexed**: All 713 TypeScript/Angular files
- **Language Server**: Uses TypeScript LSP for accurate symbol resolution
- **Cache**: Located in `.serena/cache/` (49s to index full project)
- **Dashboard**: http://127.0.0.1:24282/dashboard/index.html (when running)

## Monitoring Serena

While Claude Code is running with Serena:
1. Check the dashboard at http://127.0.0.1:24282/dashboard/index.html
2. View logs of what Serena is doing
3. See which files it's accessing
4. Monitor performance

## Troubleshooting

### If Serena seems inactive:
1. Check MCP status in Claude Code
2. Ensure you gave initial instructions
3. Try explicit: "Use Serena to find X"

### If results seem off:
1. Re-index: `uvx --from git+https://github.com/oraios/serena serena project index .`
2. Be more specific in queries
3. Check dashboard for errors

## Summary

Serena transforms Claude Code from a "reader" into a "searcher". Instead of drowning in code, Claude precisely finds what's needed. For a complex codebase like FibreFlow with 200+ components and services, this is a game-changer for:
- Faster responses
- Better accuracy
- Lower token usage
- Smarter cross-module work

Start every session with `/mcp__serena__initial_instructions` and watch your productivity soar!