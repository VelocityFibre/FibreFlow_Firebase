# 🚀 Setting Up Google AI Studio (Gemini) - Step by Step

## Why Use Gemini?

Without Gemini:
- Basic pattern matching only
- Limited understanding of context
- Simple keyword detection

With Gemini:
- **Deep understanding** of your request
- **Intelligent analysis** of your codebase
- **50 FREE requests per day** (worth $175 on Vertex AI!)
- **1 million token context** - analyzes your entire codebase

## 📋 Step-by-Step Setup

### Step 1: Get Your API Key (2 minutes)

1. **Open this link**: https://aistudio.google.com/app/apikey
2. **Sign in** with your Google account
3. **Click** "Create API key"
4. **Select** "Create API key in new project" (or use existing)
5. **Copy** the API key (starts with `AIzaSy...`)

### Step 2: Create Configuration File

Create a file called `.env.local` in the ai-context directory:

```bash
cd /home/ldp/VF/Apps/FibreFlow/ai-context
nano .env.local
```

Add this content (replace with your actual API key):
```
# Google AI Studio Configuration
GOOGLE_AI_STUDIO_API_KEY=AIzaSy_YOUR_ACTUAL_API_KEY_HERE

# Model Selection
GEMINI_MODEL=gemini-1.5-pro

# Free tier limit
DAILY_REQUEST_LIMIT=50
```

Save and exit (Ctrl+X, Y, Enter)

### Step 3: Install Required Package

```bash
pip install --user google-generativeai
```

If that doesn't work due to system restrictions:
```bash
# Option 1: Use pipx
pipx install google-generativeai

# Option 2: Use virtual environment
python -m venv venv
source venv/bin/activate
pip install google-generativeai
```

### Step 4: Test Your Setup

```bash
# Test if it's working
python -c "from dotenv import load_dotenv; load_dotenv('.env.local'); import os; print('✅ API Key loaded!' if os.getenv('GOOGLE_AI_STUDIO_API_KEY') else '❌ No API key found')"
```

### Step 5: Workflow with Claude Code

**How the `/gem` command works:**

1. **User types in Claude Code chat**: `/gem Fix database sync issues`
2. **Claude Code runs this command**: 
   ```bash
   cd ai-context && source venv/bin/activate && python3 cli/ai_cli.py enhance "Fix database sync issues"
   ```
3. **Claude Code provides the enhanced prompt** for user to give to Claude

**Manual testing** (if needed):
```bash
# Test the command manually
cd ai-context && source venv/bin/activate && python3 cli/ai_cli.py enhance "test request"
```

**WRONG WAYS** (will fail):
```bash
# DON'T DO THIS - missing venv activation
python3 agents/prompt_enhancer_gemini.py "request"

# DON'T DO THIS - without cd and venv
python cli/ai_cli.py enhance "request"
```

## 🎯 What You'll See

### Before (Pattern Matching Only):
```
Intent: create_feature
Keywords: ['invoice', 'management', 'pdf']
Basic pattern suggestions...
```

### After (With Gemini AI):
```
🧠 Using Gemini 1.5 Pro
✓ Analyzed entire codebase context
✓ Found similar PDF generation in quotes module
✓ Identified BOQ patterns for line items
✓ Suggested invoice service architecture
✓ Added specific code examples
💰 Free tier usage: 1/50 today
```

## 📊 Usage Tracking

Your daily usage is tracked in `cache/daily_usage.json`:
```json
{
  "2025-01-31": 5  // Used 5 out of 50 free requests today
}
```

## 🆘 Troubleshooting

### "No module named 'google'"
```bash
# Install in user directory
pip install --user google-generativeai

# Or use system package manager
sudo pacman -S python-google-generativeai  # Arch
sudo apt install python3-google-generativeai  # Debian/Ubuntu
```

### "API key not found"
- Make sure `.env.local` is in the `ai-context` directory
- Check the API key doesn't have extra spaces
- Ensure the key starts with `AIzaSy`

### "Quota exceeded"
- You've used your 50 free requests for today
- Resets at midnight Pacific Time
- Still falls back to pattern matching

## 💡 Pro Tips

1. **Use wisely**: 50 requests/day is generous but not unlimited
2. **Complex requests first**: Use AI for difficult features
3. **Cache works**: Repeated similar requests use cache
4. **Pattern matching fallback**: Still works after quota

## 🎉 Success Indicators

You'll know it's working when:
1. You see "🎉 Using Google AI Studio (cheaper Gemini access!)"
2. Response time is 2-5 seconds (AI is thinking)
3. Enhanced prompts include specific code references
4. Usage counter shows (e.g., "Free tier usage: 1/50")

## 📈 Before/After Example

**Your request**: "Add comprehensive invoice management"

**Without Gemini**: 
- Generic patterns
- Basic requirements
- ~100 tokens

**With Gemini**:
- Analyzes your BOQ module for similar patterns
- Finds PDF generation in quotes
- Suggests specific Firebase structure
- Includes ZAR formatting from your code
- References your email service
- ~500+ tokens of rich context

---

Ready? Start with Step 1 and get your API key!