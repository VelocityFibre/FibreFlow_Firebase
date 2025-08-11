# AI Context Manager - Portability Guide

*Making the Gemini-enhanced context manager portable to other projects*

## Overview

The AI Context Manager is designed to be project-agnostic. You can easily copy it to other projects and adapt it to their specific patterns and conventions.

## Current Structure

```
ai-context/                    # Main directory (can be renamed)
├── agents/                    # Core enhancement logic
│   ├── codebase_scanner.py   # Scans any codebase
│   ├── prompt_enhancer_gemini.py  # Gemini AI enhancement
│   └── prompt_enhancer_simple.py  # Pattern matching fallback
├── cli/                       # Command-line interface
│   └── ai_cli.py             # Main CLI
├── cache/                     # Generated files (don't copy)
│   ├── codebase_index.json   # Project-specific index
│   └── daily_usage.json      # Usage tracking
├── docs/                      # Documentation
├── scripts/                   # Setup scripts
├── .env.local                 # API keys (don't commit!)
├── requirements.txt           # Python dependencies
└── setup_alias.sh            # Convenience script
```

## Quick Portability Steps

### 1. Copy Core Files
```bash
# From FibreFlow project
cd /home/ldp/VF/Apps/FibreFlow

# Create portable package (excludes cache, venv, secrets)
tar --exclude='ai-context/cache' \
    --exclude='ai-context/venv' \
    --exclude='ai-context/.env.local' \
    --exclude='ai-context/__pycache__' \
    --exclude='ai-context/*.pyc' \
    -czf ai-context-portable.tar.gz ai-context/

# Copy to new project
cp ai-context-portable.tar.gz /path/to/new/project/
cd /path/to/new/project/
tar -xzf ai-context-portable.tar.gz
```

### 2. Initialize in New Project
```bash
cd ai-context

# Create virtual environment
python -m venv venv
source venv/bin/activate

# Install dependencies
pip install google-generativeai python-dotenv pyyaml

# Create .env.local with your API key
echo "GOOGLE_AI_STUDIO_API_KEY=your-api-key-here" > .env.local
echo "GEMINI_MODEL=gemini-1.5-pro" >> .env.local
echo "DAILY_REQUEST_LIMIT=50" >> .env.local
```

### 3. Scan New Codebase
```bash
# Update the project root in scanner
# Edit agents/codebase_scanner.py line ~30:
# self.project_root = Path("/path/to/new/project")

# Run scanner
python agents/codebase_scanner.py

# This creates cache/codebase_index.json for the new project
```

### 4. Customize Patterns
Edit `agents/prompt_enhancer_gemini.py` to update project-specific patterns:

```python
# Around line 150, update patterns:
self.fibreflow_patterns = {
    'service_creation': {
        'pattern': 'YourProjectPattern',
        'template': '''your project's service template''',
        'examples': ['your-service.ts']
    }
}

# Update project name throughout
# Replace "FibreFlow" with "YourProject"
```

## Git Repository Setup

### 1. Create .gitignore
```bash
cat > ai-context/.gitignore << 'EOF'
# Environment
.env.local
.env
venv/
__pycache__/
*.pyc

# Cache (project-specific)
cache/
*.json

# Logs
logs/
*.log

# IDE
.vscode/
.idea/
EOF
```

### 2. Create requirements.txt
```bash
cat > ai-context/requirements.txt << 'EOF'
google-generativeai==0.8.5
python-dotenv==1.0.0
pyyaml==6.0.1
EOF
```

### 3. Create README for Git
```bash
cat > ai-context/README.md << 'EOF'
# AI Context Manager

AI-powered prompt enhancement using Google's Gemini 1.5 Pro.

## Quick Start

1. Clone this repository
2. Set up API key:
   ```bash
   cp .env.local.example .env.local
   # Edit .env.local with your API key
   ```
3. Install dependencies:
   ```bash
   python -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```
4. Scan your codebase:
   ```bash
   python agents/codebase_scanner.py
   ```
5. Use the enhancer:
   ```bash
   python cli/ai_cli.py enhance "your request"
   ```

## Features
- 1M token context window
- 50 free requests/day
- Pattern-based fallback
- Project-agnostic design
EOF
```

### 4. Create Setup Script
```bash
cat > ai-context/setup_new_project.sh << 'EOF'
#!/bin/bash

echo "🚀 Setting up AI Context Manager"

# Create virtual environment
echo "Creating virtual environment..."
python -m venv venv
source venv/bin/activate

# Install dependencies
echo "Installing dependencies..."
pip install -r requirements.txt

# Create .env.local if not exists
if [ ! -f .env.local ]; then
    echo "Creating .env.local..."
    cp .env.local.example .env.local
    echo "⚠️  Please edit .env.local with your API key"
fi

# Create cache directory
mkdir -p cache

echo "✅ Setup complete!"
echo "Next steps:"
echo "1. Edit .env.local with your Google AI Studio API key"
echo "2. Update project root in agents/codebase_scanner.py"
echo "3. Run: python agents/codebase_scanner.py"
echo "4. Start using: python cli/ai_cli.py enhance 'your request'"
EOF

chmod +x ai-context/setup_new_project.sh
```

## Making it Project-Agnostic

### 1. Configuration File
Create `ai-context/config/project_config.yaml`:

```yaml
project:
  name: "YourProject"
  root: "/path/to/project"
  description: "Your project description"

patterns:
  service_pattern: "BaseService"
  component_pattern: "standalone"
  state_management: "redux"  # or signals, mobx, etc.
  
technologies:
  frontend: "React"  # or Angular, Vue, etc.
  backend: "Node.js"  # or Python, Java, etc.
  database: "PostgreSQL"  # or MongoDB, etc.
  
conventions:
  - "Use functional components"
  - "Follow ESLint rules"
  - "Use TypeScript"
```

### 2. Pattern Loader
Update `prompt_enhancer_gemini.py` to load from config:

```python
def load_patterns(self):
    """Load project-specific patterns"""
    config_path = Path("config/project_config.yaml")
    if config_path.exists():
        with open(config_path) as f:
            config = yaml.safe_load(f)
        self.project_patterns = config.get('patterns', {})
        self.project_name = config['project']['name']
    else:
        # Fallback to defaults
        self.project_patterns = {}
        self.project_name = "Project"
```

## Git Commands

```bash
# Initialize git repo
cd ai-context
git init
git add .
git commit -m "Initial commit: AI Context Manager"

# Push to GitHub
git remote add origin https://github.com/yourusername/ai-context-manager.git
git push -u origin main
```

## Using as Git Submodule

For multiple projects:

```bash
# In your main project
git submodule add https://github.com/yourusername/ai-context-manager.git ai-context
git submodule init
git submodule update

# Each developer runs
cd ai-context
./setup_new_project.sh
```

## Docker Option

Create `Dockerfile`:

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV PYTHONPATH=/app

CMD ["python", "cli/ai_cli.py"]
```

## Summary

The AI Context Manager is portable because:

1. **Self-contained** - All logic in one directory
2. **Configurable** - Patterns can be customized
3. **Project-agnostic** - Scanner works on any codebase
4. **Simple dependencies** - Just 3 Python packages
5. **Clear separation** - Cache/config separate from code

To port to a new project:
1. Copy the `ai-context` directory
2. Run setup script
3. Scan the new codebase
4. Customize patterns (optional)
5. Start enhancing prompts!

This tool can enhance any project that needs better AI prompts!