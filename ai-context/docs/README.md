# FibreFlow Context Manager (Vertex)

## 🚀 Quick Start

### Option 1: Google AI Studio (Recommended - FREE!)
```bash
# Get API key from: https://aistudio.google.com/app/apikey
# Run setup
python scripts/setup_google_ai_studio.py

# Test it
python cli/vertex_cli_unified.py enhance "Add invoice management"
```

**Benefits:**
- 50 free requests/day with 1M token context
- Same Gemini 1.5 Pro model
- 90% cheaper than Vertex AI
- Simple API key setup

### Option 2: Vertex AI (Original)
- More complex setup
- Requires billing account
- Same models, higher cost

## 📋 What This Does

The Context Manager enhances your prompts for Claude Code by:
1. **Analyzing** your entire FibreFlow codebase
2. **Finding** relevant patterns and examples
3. **Adding** context about your architecture
4. **Preventing** hallucinations and bad patterns

## 🎯 Usage

### Basic Enhancement
```bash
# Simple request
python cli/vertex_cli_unified.py enhance "Add Excel export to pole tracker"

# From file
python cli/vertex_cli_unified.py enhance -f request.txt

# Multi-line with editor
python cli/vertex_cli_unified.py enhance --editor

# Use faster model
python cli/vertex_cli_unified.py enhance "Quick query" --model flash
```

### Check Status
```bash
# System status
python cli/vertex_cli_unified.py status

# Cost comparison
python cli/vertex_cli_unified.py cost
```

## 📁 Directory Structure

```
vertex/
├── agents/                 # Core logic
│   ├── codebase_scanner.py        # Indexes your code
│   ├── prompt_enhancer.py         # Original Vertex AI version
│   └── prompt_enhancer_gemini.py  # Google AI Studio version
├── cli/                    # Command-line interfaces
│   ├── vertex_cli.py              # Original CLI
│   └── vertex_cli_unified.py      # New unified CLI
├── docs/                   # Documentation
│   ├── VERTEX_AI_OVERVIEW.md      # What is Vertex AI?
│   ├── PRACTICAL_VERTEX_USAGE.md  # How to use it
│   ├── AGENT_SETUP_GUIDE.md       # Advanced agents
│   └── GOOGLE_AI_STUDIO_MIGRATION.md # Migration guide
├── scripts/                # Setup and utilities
│   └── setup_google_ai_studio.py  # Easy setup script
└── cache/                  # Cached data
    ├── codebase_index.json        # Your indexed code
    └── daily_usage.json           # Usage tracking
```

## 💡 How It Works

```
Your Request → Context Manager → Gemini AI → Enhanced Prompt → Claude Code
     ↓              ↓                ↓              ↓              ↓
"Add invoices" → Finds patterns → Analyzes → Full context → Perfect code
```

## 🆓 Free Tier Limits

- **50 requests/day** (resets at midnight Pacific)
- **1M tokens per request** (analyzes entire codebase)
- **No credit card required**
- **Worth ~$175/day on Vertex AI**

## 📊 Cost Comparison

| Usage | Vertex AI | AI Studio Free | AI Studio Paid |
|-------|-----------|----------------|----------------|
| 50 requests/day | $175/day | $0 | $3.75/day |
| Monthly | $3,500 | $0 | $75 |

## 🎯 When to Use

### Use Context Manager For:
- New features (finds similar implementations)
- Debugging (analyzes patterns)
- Architecture decisions (considers your setup)
- Performance optimization (identifies bottlenecks)

### Skip For:
- Simple typo fixes
- Tiny UI changes
- When you know exactly what to do

## 🚦 Getting Started

1. **Setup** (5 minutes)
   ```bash
   cd vertex
   python scripts/setup_google_ai_studio.py
   ```

2. **Index Your Code** (one time)
   ```bash
   python agents/codebase_scanner.py
   ```

3. **Enhance Your First Prompt**
   ```bash
   python cli/vertex_cli_unified.py enhance "Your request here"
   ```

4. **Copy to Claude Code** and watch the magic!

---

**Remember**: This makes Claude Code understand your ENTIRE codebase without you explaining it every time!