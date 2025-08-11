# Vertex AI Quick Start for FibreFlow

## 🚀 5-Minute Setup

### Prerequisites
- Google Cloud account with billing enabled
- Python 3.9+ installed
- Access to FibreFlow codebase

### Step 1: Enable Vertex AI
```bash
# If not already done
gcloud services enable aiplatform.googleapis.com
```

### Step 2: Test Current Setup
```bash
cd /home/ldp/VF/Apps/FibreFlow/vertex
python scripts/test_vertex_connection.py
```

### Step 3: Start Using
```bash
# Enhance a prompt
python cli/vertex_cli.py enhance "Add invoice management feature"

# Find patterns
python cli/vertex_cli.py enhance "Find all services using real-time updates"

# Get architecture advice
python cli/vertex_cli.py enhance "Should I denormalize user data in projects?"
```

## 🎯 What Vertex Does for You

### 1. **Remembers Everything**
- All your patterns (BaseFirestoreService, signals, etc.)
- Past decisions (why signals over BehaviorSubject)
- Common issues and their solutions

### 2. **Provides Perfect Context**
```
Your request: "Add Excel export"
           ↓
Vertex finds: BOQ module already has Excel export
           ↓ 
Enhanced prompt includes: Exact code examples, libraries, patterns
           ↓
Claude Code: Implements perfectly
```

### 3. **Prevents Mistakes**
- No hallucinated APIs
- No pattern violations  
- No reinventing existing features

## 💡 Daily Workflow

### Morning
```bash
# Update codebase index (if major changes)
cd vertex && python agents/codebase_scanner.py
```

### Before Each Feature
```bash
# Get enhanced prompt
python cli/vertex_cli.py enhance "Your feature request" > prompt.md

# Copy to Claude Code
cat prompt.md | pbcopy  # Mac
cat prompt.md | xclip   # Linux
```

### For Complex Questions
```bash
# Architecture decisions
python cli/vertex_cli.py enhance "Should we add caching to pole tracker?"

# Performance issues
python cli/vertex_cli.py enhance "Why is the project list slow?"

# Data analysis
python cli/vertex_cli.py enhance "Analyze pole distribution in Lawley"
```

## 📋 Common Commands

```bash
# Enhance prompt for Claude
vertex enhance "request"

# Multi-line request
vertex enhance --editor

# From file
vertex enhance -f request.txt

# Interactive mode
vertex enhance -i
```

## 🎨 What Makes a Good Vertex Request?

### ❌ Too Vague
"Make it faster"

### ✅ Good
"The pole tracker list takes 5 seconds to load with 1000 items"

### ❌ Too Specific  
"Change line 234 in pole-tracker.component.ts"

### ✅ Good
"Add virtual scrolling to pole tracker list for better performance"

## 🔄 The Magic Formula

1. **Describe what you want** (not how)
2. **Let Vertex find patterns** in your codebase
3. **Get enhanced prompt** with all context
4. **Give to Claude Code** for implementation
5. **Perfect result** following all patterns

## 💰 Cost Management

- Average request: ~$0.01-0.05
- With caching: ~$0.001-0.005
- Monthly estimate: $20-40 for active development

## 🚦 Next Steps

1. **Today**: Try enhancing your next feature request
2. **This Week**: Build habit of checking patterns
3. **This Month**: Set up specialized agents
4. **Long Term**: Full workflow automation

## 🆘 Troubleshooting

### "Vertex AI not accessible"
```bash
gcloud auth application-default login
gcloud config set project fibreflow-73daf
```

### "No codebase index found"
```bash
cd vertex && python agents/codebase_scanner.py
```

### "Enhancement not helpful"
- Be more specific in your request
- Include context about the problem
- Mention similar features if known

## 🎯 Remember

Vertex AI is like having a senior developer who:
- Knows every line of your codebase
- Remembers every decision
- Never forgets patterns
- Always available

Use it to make Claude Code superhuman!

---

*Start simple: Just enhance your next prompt and see the magic.*