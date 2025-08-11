# AI Context Manager - Complete Implementation Guide

*From zero to enhanced prompts in 15 minutes*

## 📋 Table of Contents

1. [Pre-Installation Requirements](#pre-installation-requirements)
2. [Step-by-Step Installation](#step-by-step-installation)
3. [Initial Configuration](#initial-configuration)
4. [First Run](#first-run)
5. [Integration Workflows](#integration-workflows)
6. [Troubleshooting](#troubleshooting)
7. [Advanced Configuration](#advanced-configuration)

---

## 🔍 Pre-Installation Requirements

### System Requirements
- **Python**: 3.8 or higher
- **Disk Space**: ~100MB for the tool + space for codebase index
- **Memory**: 2GB RAM minimum
- **OS**: Windows, macOS, or Linux

### Check Your System
```bash
# Check Python version
python --version  # or python3 --version

# Check pip
pip --version  # or pip3 --version

# Check available disk space
df -h  # Linux/Mac
# or
dir  # Windows
```

### Get Your Free API Key
1. Go to https://aistudio.google.com/app/apikey
2. Sign in with Google account
3. Click "Create API key"
4. Copy the key (starts with `AIzaSy...`)

---

## 📦 Step-by-Step Installation

### Option 1: From Git Repository (Recommended)

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/ai-context-manager.git
cd ai-context-manager

# 2. Run setup script
./setup_new_project.sh

# 3. The script will:
#    - Create virtual environment
#    - Install dependencies
#    - Create config templates
#    - Set up directory structure
```

### Option 2: From Portable Package

```bash
# 1. Extract the package
tar -xzf ai-context-portable.tar.gz
cd ai-context

# 2. Run setup
./setup_new_project.sh
```

### Option 3: Manual Installation

```bash
# 1. Create virtual environment
python -m venv venv

# 2. Activate it
source venv/bin/activate  # Linux/Mac
# or
venv\Scripts\activate  # Windows

# 3. Install dependencies
pip install google-generativeai python-dotenv pyyaml

# 4. Create necessary directories
mkdir -p cache logs config
```

---

## ⚙️ Initial Configuration

### 1. Add Your API Key

```bash
# Edit the environment file
nano .env.local  # or use any text editor

# Add these lines:
GOOGLE_AI_STUDIO_API_KEY=AIzaSy_YOUR_ACTUAL_KEY_HERE
GEMINI_MODEL=gemini-1.5-pro
DAILY_REQUEST_LIMIT=50
```

### 2. Configure for Your Project

```bash
# Copy template
cp config/project_config.yaml.template config/project_config.yaml

# Edit configuration
nano config/project_config.yaml
```

Update with your project details:

```yaml
project:
  name: "MyAwesomeProject"
  root: "/Users/john/projects/my-awesome-project"  # YOUR project path
  description: "E-commerce platform built with React"

technologies:
  frontend: "React"          # Your frontend framework
  backend: "Node.js"         # Your backend
  database: "PostgreSQL"     # Your database
  state: "Redux"            # Your state management

patterns:
  service_pattern: "BaseService"      # Your base classes
  component_pattern: "FunctionComponent"
  file_naming: "camelCase"           # or kebab-case

conventions:
  - "Use TypeScript for all new code"
  - "Follow Airbnb ESLint rules"
  - "All components must have tests"

scan_extensions:
  - ".js"
  - ".jsx"
  - ".ts"
  - ".tsx"
  - ".py"    # Add your languages

ignore_dirs:
  - "node_modules"
  - "build"
  - "dist"
  - ".git"
  - "coverage"
```

### 3. Test Your Setup

```bash
# Test API key
python -c "from dotenv import load_dotenv; load_dotenv('.env.local'); import os; print('✅ API key loaded!' if os.getenv('GOOGLE_AI_STUDIO_API_KEY') else '❌ No API key found')"

# Test imports
python -c "import google.generativeai as genai; print('✅ Gemini package installed!')"
```

---

## 🚀 First Run

### 1. Scan Your Codebase

```bash
# Activate virtual environment (if not already active)
source venv/bin/activate  # Linux/Mac
# or
venv\Scripts\activate  # Windows

# Run the scanner
python agents/codebase_scanner.py

# You'll see:
# 📂 Scanning MyAwesomeProject at /path/to/project
# 📊 Found 5,234 files to scan
#    Scanning... 100/5234 files
#    Scanning... 200/5234 files
# ✅ Scan complete!
#    Files: 5,234
#    Size: 125.3 MB
# 💾 Index saved to cache/codebase_index.json
```

### 2. Your First Enhancement

```bash
# Enhance a simple request
python cli/ai_cli.py enhance "Add user profile page"

# You'll see:
# 🚀 Initializing AI Context Manager...
# ✅ Connected to Google AI Studio
# 🧠 Analyzing request: Add user profile page
# ✓ Intent detected: create_feature (component)
# ✓ Found 3 relevant context matches
# ✅ Enhancement complete in 5.2s
#
# [Enhanced prompt with your patterns...]
```

### 3. Create an Alias for Convenience

```bash
# Add to your ~/.bashrc or ~/.zshrc
echo 'alias ai="python /path/to/ai-context/cli/ai_cli.py"' >> ~/.bashrc
source ~/.bashrc

# Now you can use:
ai enhance "Add shopping cart feature"
```

---

## 🔄 Integration Workflows

### Workflow 1: With Claude (claude.ai)

```bash
# 1. Enhance your prompt
ai enhance "Add real-time notifications using WebSockets" > enhanced_prompt.md

# 2. Open Claude
# 3. Paste the enhanced prompt
# 4. Claude now knows:
#    - Your WebSocket patterns
#    - Your notification components
#    - Your event handling approach
#    - Specific integration points
```

### Workflow 2: With ChatGPT

```bash
# 1. For complex features, save the enhancement
ai enhance "Implement OAuth2 with Google and GitHub" -o oauth_implementation.md

# 2. In ChatGPT:
"I need to implement OAuth2. Here's my project context:
[paste oauth_implementation.md]"

# 3. ChatGPT responds with YOUR patterns
```

### Workflow 3: With GitHub Copilot

```python
# 1. Generate context comment
ai enhance "Repository pattern for user data" > context.md

# 2. In your code:
"""
Context from project analysis:
[paste relevant parts from context.md]
"""

# 3. Copilot suggestions now match your patterns
```

### Workflow 4: Team Development

```bash
# 1. Team lead creates specifications
ai enhance "Q1 Feature: Multi-language support" > specs/i18n_implementation.md
git add specs/i18n_implementation.md
git commit -m "Add i18n implementation spec"
git push

# 2. Developers pull and implement
git pull
cat specs/i18n_implementation.md
# Everyone implements consistently!
```

### Workflow 5: Code Review Preparation

```bash
# Before creating PR
ai enhance "Code review checklist for authentication changes" > review_checklist.md

# Use the checklist to self-review
# Include relevant parts in PR description
```

---

## 🔧 Troubleshooting

### Common Issues and Solutions

#### "No API key found"
```bash
# Check if .env.local exists
ls -la .env.local

# Check contents (hide the actual key!)
cat .env.local | grep GOOGLE

# Fix: Make sure the key is on its own line
echo "GOOGLE_AI_STUDIO_API_KEY=AIzaSy..." > .env.local
```

#### "Module 'google' not found"
```bash
# You're not in the virtual environment
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate     # Windows

# Then reinstall
pip install google-generativeai
```

#### "Rate limit exceeded"
```bash
# Check your usage
ai status

# You've used all 50 free requests today
# Options:
# 1. Wait until midnight PT
# 2. Use pattern matching mode (no AI)
# 3. Use cached responses
```

#### "Codebase index not found"
```bash
# You haven't scanned yet
python agents/codebase_scanner.py

# Or the path is wrong in config
# Check: config/project_config.yaml
```

#### "Permission denied"
```bash
# Make scripts executable
chmod +x setup_new_project.sh
chmod +x cli/ai_cli.py
```

---

## 🎛️ Advanced Configuration

### Custom Patterns

Edit `agents/prompt_enhancer_gemini.py`:

```python
# Add your specific patterns
self.project_patterns = {
    'api_endpoint': {
        'pattern': 'RESTful Resource',
        'template': '''
@app.route('/api/v1/{resource}')
class {Resource}API:
    def get(self, id):
        return self.service.find_by_id(id)
''',
        'examples': ['users_api.py', 'products_api.py']
    }
}
```

### Multi-Project Setup

```bash
# Create project-specific configs
config/
├── project_config_webapp.yaml
├── project_config_mobile.yaml
└── project_config_api.yaml

# Use different configs
PROJECT_CONFIG=webapp python agents/codebase_scanner.py
```

### Caching Configuration

```python
# In .env.local
CACHE_ENABLED=true
CACHE_TTL=3600  # 1 hour
CACHE_MAX_SIZE=100  # MB
```

### Custom Ignore Patterns

```yaml
# In project_config.yaml
ignore_patterns:
  - "*.test.js"     # Ignore test files
  - "*.min.js"      # Ignore minified files
  - "migrations/*"  # Ignore migrations
  - "vendor/*"      # Ignore vendor code
```

### Performance Tuning

```yaml
# For large codebases
scanning:
  max_file_size: 1048576  # 1MB - skip larger files
  sample_rate: 0.5        # Sample 50% of files
  parallel_workers: 4     # Use 4 CPU cores
```

---

## 📊 Monitoring Usage

### Check Daily Stats
```bash
ai status

# Output:
# 📊 AI Context Manager Status
# ✅ Codebase indexed: 5,234 files (2 hours ago)
# ✅ Google AI: Connected
# 📈 Today's usage: 12/50 requests
# 💰 Value saved today: $42
# 🕐 Resets in: 8 hours
```

### View Usage History
```bash
cat cache/daily_usage.json | python -m json.tool

# {
#   "2025-01-30": 45,
#   "2025-01-31": 12
# }
```

---

## 🎯 Best Practices

### 1. **Update Index Regularly**
```bash
# Add to crontab for daily updates
0 2 * * * cd /path/to/ai-context && venv/bin/python agents/codebase_scanner.py
```

### 2. **Save Important Enhancements**
```bash
# Create enhancement library
mkdir enhancements/
ai enhance "Complex feature" > enhancements/feature_name.md
```

### 3. **Team Sharing**
```bash
# Share index (exclude sensitive data)
tar -czf codebase_index.tar.gz cache/codebase_index.json
# Share with team for consistent context
```

### 4. **Prompt Templates**
```bash
# Create templates for common tasks
echo "Add CRUD operations for [MODEL] with validation and tests" > templates/crud.txt
ai enhance -f templates/crud.txt
```

---

## 🎉 Success Checklist

- [ ] Python environment set up
- [ ] Dependencies installed
- [ ] API key configured
- [ ] Project config updated
- [ ] Codebase scanned successfully
- [ ] First enhancement worked
- [ ] Alias created for easy access
- [ ] Team members onboarded

---

## 📚 Next Steps

1. **Explore Commands**:
   ```bash
   ai --help
   ai cost
   ai status
   ```

2. **Read Advanced Guides**:
   - `docs/TECHNICAL_IMPLEMENTATION.md`
   - `docs/GEMINI_USAGE_GUIDE.md`

3. **Customize for Your Needs**:
   - Add custom patterns
   - Create team templates
   - Build enhancement library

4. **Share with Team**:
   - Document your patterns
   - Create onboarding guide
   - Share enhanced prompts

---

*Remember: The goal is to make AI understand YOUR project as well as you do!*