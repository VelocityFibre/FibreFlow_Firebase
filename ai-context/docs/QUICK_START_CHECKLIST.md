# AI Context Manager - Quick Start Checklist

*Get up and running in 10 minutes!*

## ⏱️ 5-Minute Setup

### 1️⃣ Get Your Free API Key (2 min)
- [ ] Go to https://aistudio.google.com/app/apikey
- [ ] Sign in with Google
- [ ] Click "Create API key" 
- [ ] Copy key (starts with `AIzaSy...`)

### 2️⃣ Download & Extract (1 min)
- [ ] Download `ai-context-portable.tar.gz`
- [ ] Extract: `tar -xzf ai-context-portable.tar.gz`
- [ ] Enter directory: `cd ai-context`

### 3️⃣ Run Setup (2 min)
- [ ] Run: `./setup_new_project.sh`
- [ ] Paste API key when prompted
- [ ] Virtual environment created ✓
- [ ] Dependencies installed ✓

## ⚙️ 5-Minute Configuration

### 4️⃣ Add Your API Key
- [ ] Edit `.env.local`
- [ ] Add: `GOOGLE_AI_STUDIO_API_KEY=AIzaSy...your-key...`
- [ ] Save file

### 5️⃣ Configure Your Project
- [ ] Edit `config/project_config.yaml`
- [ ] Update:
  - [ ] Project name
  - [ ] Project path (full path to your code)
  - [ ] Technology stack (React/Angular/Vue etc)
  - [ ] File extensions (.js, .py, etc)

### 6️⃣ Scan Your Codebase
- [ ] Run: `source venv/bin/activate`
- [ ] Run: `python agents/codebase_scanner.py`
- [ ] Wait for scan to complete
- [ ] See: "✅ Scan complete!"

## 🚀 First Enhancement

### 7️⃣ Test It Works
- [ ] Run: `python cli/ai_cli.py enhance "Add user login feature"`
- [ ] See enhanced prompt output
- [ ] Includes your project patterns ✓
- [ ] References your code ✓

### 8️⃣ Create Alias (Optional)
- [ ] Run: `source use_ai_context.sh`
- [ ] Now use: `ai enhance "your request"`

## ✅ Success Indicators

You know it's working when:
- [ ] "✅ Connected to Google AI Studio" appears
- [ ] Enhancement takes 5-30 seconds
- [ ] Output references YOUR project files
- [ ] Patterns match YOUR codebase
- [ ] "Free tier usage: X/50" shows

## 🎯 Next Steps

### Basic Usage
```bash
# Simple enhancement
ai enhance "Add shopping cart"

# Save to file
ai enhance "Add payment system" -o payment_spec.md

# Check usage
ai status
```

### Common Requests
```bash
# Feature development
ai enhance "Add admin dashboard with charts"

# Bug fixing
ai enhance "Fix memory leak in user service"

# Documentation
ai enhance "Document the API endpoints"

# Testing
ai enhance "Write tests for authentication"
```

## 🆘 Quick Troubleshooting

### If Nothing Works
```bash
# 1. Check Python
python --version  # Should be 3.8+

# 2. Check virtual env
source venv/bin/activate

# 3. Check API key
cat .env.local  # Should see your key

# 4. Test connection
python test_gemini_ready.py
```

### Common Fixes
- **"Module not found"** → Activate venv: `source venv/bin/activate`
- **"API key not found"** → Check `.env.local` has your key
- **"No index found"** → Run scanner: `python agents/codebase_scanner.py`
- **"Rate limit"** → Used 50 requests, wait until midnight PT

## 📱 Quick Commands Reference

```bash
# Setup
./setup_new_project.sh          # Initial setup

# Daily use  
ai enhance "request"            # Enhance prompt
ai status                       # Check usage
ai cost                        # See savings

# With options
ai enhance -m flash "request"   # Use faster model
ai enhance -f file.txt         # From file
ai enhance -o output.md        # Save output

# Maintenance
python agents/codebase_scanner.py  # Rescan code
```

## 🎉 You're Ready!

Total time: ~10 minutes

Now you can:
- ✅ Get code that matches YOUR patterns
- ✅ Save hours of explaining context to AI
- ✅ Maintain consistency across your project
- ✅ Get 50 FREE enhanced prompts daily

**Start building with AI that truly understands your code!**

---

*Stuck? Check the [FAQ](FAQ.md) or [full guide](IMPLEMENTATION_GUIDE.md)*