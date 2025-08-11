#!/bin/bash

# Prepare AI Context Manager for Git/Portability
# This script creates a clean, portable version ready for git

echo "🚀 Preparing AI Context Manager for Git/Portability"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# 1. Create .gitignore if it doesn't exist
echo -e "${YELLOW}Creating .gitignore...${NC}"
cat > .gitignore << 'EOF'
# Environment variables and secrets
.env.local
.env
*.env

# Virtual environment
venv/
env/
.venv/

# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python

# Cache and generated files
cache/
logs/
*.log
daily_usage.json
codebase_index.json

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db

# Test outputs
test_output/
*.test.md
enhanced_output.md
test_request.txt
EOF

# 2. Create .env.local.example
echo -e "${YELLOW}Creating .env.local.example...${NC}"
cat > .env.local.example << 'EOF'
# Google AI Studio Configuration
GOOGLE_AI_STUDIO_API_KEY=your-api-key-here

# Model Selection
# gemini-1.5-pro - Best for complex tasks (1M context)
# gemini-1.5-flash - Faster and cheaper (1M context)
GEMINI_MODEL=gemini-1.5-pro

# Cost Control
DAILY_REQUEST_LIMIT=50  # Free tier limit
CACHE_ENABLED=true
CACHE_TTL=3600
EOF

# 3. Create requirements.txt with exact versions
echo -e "${YELLOW}Creating requirements.txt...${NC}"
cat > requirements.txt << 'EOF'
google-generativeai==0.8.5
python-dotenv==1.0.0
pyyaml==6.0.1
EOF

# 4. Create a proper project config template
echo -e "${YELLOW}Creating project config template...${NC}"
mkdir -p config
cat > config/project_config.yaml.template << 'EOF'
# Project Configuration Template
# Copy to project_config.yaml and customize for your project

project:
  name: "YourProjectName"
  root: "/path/to/your/project"
  description: "Brief description of your project"

# Technology stack
technologies:
  frontend: "React"          # or Angular, Vue, Svelte, etc.
  backend: "Node.js"         # or Python, Java, Go, etc.
  database: "PostgreSQL"     # or MongoDB, MySQL, etc.
  state: "Redux"            # or MobX, Zustand, Signals, etc.

# Code patterns specific to your project
patterns:
  service_pattern: "BaseService"      # Your base service class
  component_pattern: "FunctionComponent" # Component style
  file_naming: "kebab-case"           # or camelCase, PascalCase
  
# Project conventions
conventions:
  - "Use TypeScript for all new code"
  - "Follow ESLint configuration"
  - "Write tests for all features"
  - "Use conventional commits"

# File extensions to scan
scan_extensions:
  - ".ts"
  - ".tsx"
  - ".js"
  - ".jsx"
  - ".py"
  - ".java"
  - ".go"

# Directories to ignore during scanning
ignore_dirs:
  - "node_modules"
  - "dist"
  - "build"
  - ".git"
  - "coverage"
  - "__pycache__"
EOF

# 5. Update the scanner to be more generic
echo -e "${YELLOW}Making codebase scanner project-agnostic...${NC}"
cat > agents/codebase_scanner_generic.py << 'EOF'
#!/usr/bin/env python3
"""
Generic Codebase Scanner for AI Context Manager
Works with any project - just update the config!
"""

import os
import json
import yaml
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Set
import hashlib
import re

class CodebaseScanner:
    def __init__(self, config_path: str = "config/project_config.yaml"):
        """Initialize with project configuration"""
        self.load_config(config_path)
        self.file_index = {}
        self.stats = {
            'total_files': 0,
            'total_size_mb': 0,
            'by_extension': {},
            'scan_date': datetime.now().isoformat()
        }
    
    def load_config(self, config_path: str):
        """Load project configuration"""
        config_file = Path(config_path)
        if not config_file.exists():
            # Use template if no config exists
            template_path = config_file.with_suffix('.yaml.template')
            if template_path.exists():
                print(f"⚠️  No {config_path} found. Using template.")
                print(f"   Copy {template_path} to {config_path} and customize it.")
                config_file = template_path
            else:
                # Fallback defaults
                print("⚠️  No configuration found. Using defaults.")
                self.config = {
                    'project': {
                        'name': 'Project',
                        'root': os.getcwd()
                    },
                    'scan_extensions': ['.py', '.js', '.ts', '.jsx', '.tsx'],
                    'ignore_dirs': ['node_modules', '.git', '__pycache__', 'venv']
                }
                return
        
        with open(config_file, 'r') as f:
            self.config = yaml.safe_load(f)
        
        self.project_root = Path(self.config['project']['root'])
        self.extensions = set(self.config.get('scan_extensions', ['.py', '.js', '.ts']))
        self.ignore_dirs = set(self.config.get('ignore_dirs', ['node_modules', '.git']))
    
    def should_scan_file(self, file_path: Path) -> bool:
        """Check if file should be scanned"""
        # Check extension
        if file_path.suffix not in self.extensions:
            return False
        
        # Check ignored directories
        for part in file_path.parts:
            if part in self.ignore_dirs:
                return False
        
        # Skip hidden files
        if any(part.startswith('.') for part in file_path.parts):
            return False
        
        return True
    
    def scan_file(self, file_path: Path) -> Dict:
        """Scan a single file for metadata"""
        try:
            stat = file_path.stat()
            content = file_path.read_text(encoding='utf-8', errors='ignore')
            
            # Extract basic info
            info = {
                'path': str(file_path.relative_to(self.project_root)),
                'size': stat.st_size,
                'modified': datetime.fromtimestamp(stat.st_mtime).isoformat(),
                'lines': len(content.splitlines()),
                'extension': file_path.suffix,
                'hash': hashlib.md5(content.encode()).hexdigest()
            }
            
            # Language-specific parsing
            if file_path.suffix in ['.py']:
                info['imports'] = self.extract_python_imports(content)
                info['classes'] = self.extract_python_classes(content)
                info['functions'] = self.extract_python_functions(content)
            elif file_path.suffix in ['.js', '.ts', '.jsx', '.tsx']:
                info['imports'] = self.extract_js_imports(content)
                info['exports'] = self.extract_js_exports(content)
                info['components'] = self.extract_react_components(content)
            
            return info
            
        except Exception as e:
            print(f"Error scanning {file_path}: {e}")
            return None
    
    def extract_python_imports(self, content: str) -> List[str]:
        """Extract Python imports"""
        imports = []
        for line in content.splitlines():
            if line.strip().startswith(('import ', 'from ')):
                imports.append(line.strip())
        return imports[:10]  # Limit to first 10
    
    def extract_python_classes(self, content: str) -> List[str]:
        """Extract Python class names"""
        pattern = r'^class\s+(\w+)'
        return re.findall(pattern, content, re.MULTILINE)[:10]
    
    def extract_python_functions(self, content: str) -> List[str]:
        """Extract Python function names"""
        pattern = r'^def\s+(\w+)'
        return re.findall(pattern, content, re.MULTILINE)[:10]
    
    def extract_js_imports(self, content: str) -> List[str]:
        """Extract JavaScript/TypeScript imports"""
        pattern = r'import\s+.*?from\s+[\'"](.+?)[\'"]'
        return re.findall(pattern, content)[:10]
    
    def extract_js_exports(self, content: str) -> List[str]:
        """Extract JavaScript/TypeScript exports"""
        pattern = r'export\s+(?:default\s+)?(?:class|function|const|let|var)\s+(\w+)'
        return re.findall(pattern, content)[:10]
    
    def extract_react_components(self, content: str) -> List[str]:
        """Extract React component names"""
        # Function components
        func_pattern = r'(?:export\s+)?(?:const|function)\s+(\w+)\s*(?::\s*\w+\s*)?=.*?=>\s*(?:\(|{)'
        # Class components
        class_pattern = r'class\s+(\w+)\s+extends\s+(?:React\.)?Component'
        
        components = re.findall(func_pattern, content) + re.findall(class_pattern, content)
        return list(set(components))[:10]
    
    def scan_directory(self) -> Dict:
        """Scan the entire project directory"""
        print(f"📂 Scanning {self.config['project']['name']} at {self.project_root}")
        
        all_files = []
        for root, dirs, files in os.walk(self.project_root):
            # Remove ignored directories from traversal
            dirs[:] = [d for d in dirs if d not in self.ignore_dirs]
            
            for file in files:
                file_path = Path(root) / file
                if self.should_scan_file(file_path):
                    all_files.append(file_path)
        
        print(f"📊 Found {len(all_files)} files to scan")
        
        # Scan files
        for i, file_path in enumerate(all_files):
            if i % 100 == 0:
                print(f"   Scanning... {i}/{len(all_files)} files")
            
            file_info = self.scan_file(file_path)
            if file_info:
                self.file_index[str(file_path)] = file_info
                
                # Update stats
                self.stats['total_files'] += 1
                self.stats['total_size_mb'] += file_info['size'] / (1024 * 1024)
                
                ext = file_info['extension']
                if ext not in self.stats['by_extension']:
                    self.stats['by_extension'][ext] = 0
                self.stats['by_extension'][ext] += 1
        
        print(f"✅ Scan complete!")
        print(f"   Files: {self.stats['total_files']}")
        print(f"   Size: {self.stats['total_size_mb']:.1f} MB")
        
        return {
            'project': self.config['project'],
            'stats': self.stats,
            'files': self.file_index
        }
    
    def save_index(self, output_path: str = "cache/codebase_index.json"):
        """Save the index to a JSON file"""
        output_file = Path(output_path)
        output_file.parent.mkdir(exist_ok=True)
        
        index_data = {
            'project': self.config['project'],
            'stats': self.stats,
            'files': self.file_index,
            'config': self.config
        }
        
        with open(output_file, 'w') as f:
            json.dump(index_data, f, indent=2)
        
        print(f"💾 Index saved to {output_file}")
        print(f"   Size: {output_file.stat().st_size / 1024:.1f} KB")

def main():
    """Run the scanner"""
    scanner = CodebaseScanner()
    scanner.scan_directory()
    scanner.save_index()

if __name__ == "__main__":
    main()
EOF

chmod +x agents/codebase_scanner_generic.py

# 6. Create a clean README for the repository
echo -e "${YELLOW}Creating clean README.md...${NC}"
cat > README.md << 'EOF'
# AI Context Manager

A powerful tool that enhances development prompts using Google's Gemini AI with a 1M token context window. Perfect for providing rich, project-specific context to AI coding assistants like Claude, ChatGPT, or Copilot.

## Features

- 🧠 **1M Token Context Window** - Analyze entire codebases
- 🆓 **50 Free Requests/Day** - Worth $175/day on other platforms
- 🚀 **Project Agnostic** - Works with any programming language
- 🎯 **Smart Pattern Detection** - Learns your project's patterns
- 💾 **Intelligent Caching** - Fast repeated requests
- 🔄 **Graceful Fallback** - Pattern matching when offline

## Quick Start

1. **Clone and setup**:
   ```bash
   git clone https://github.com/yourusername/ai-context-manager.git
   cd ai-context-manager
   ./setup_new_project.sh
   ```

2. **Add your API key**:
   ```bash
   # Get free key from: https://aistudio.google.com/app/apikey
   nano .env.local
   # Add: GOOGLE_AI_STUDIO_API_KEY=your-key-here
   ```

3. **Configure for your project**:
   ```bash
   cp config/project_config.yaml.template config/project_config.yaml
   nano config/project_config.yaml
   # Update project path and patterns
   ```

4. **Scan your codebase**:
   ```bash
   python agents/codebase_scanner.py
   ```

5. **Enhance prompts**:
   ```bash
   python cli/ai_cli.py enhance "Add user authentication with OAuth"
   ```

## Example Usage

### Basic Enhancement
```bash
$ python cli/ai_cli.py enhance "Add invoice management with PDF export"

🧠 Analyzing request...
✓ Intent: create_feature
✓ Found 5 relevant patterns
✅ Enhancement complete!

[Returns comprehensive prompt with:
- Clarified requirements
- Similar code patterns from your project  
- Step-by-step implementation plan
- Code examples following your conventions
- Integration points with existing code]
```

### Check Status
```bash
$ python cli/ai_cli.py status

📊 AI Context Manager Status
✅ Codebase indexed: 5,234 files
✅ Google AI: Connected
💰 Usage: 12/50 requests today
```

## How It Works

1. **Scans Your Codebase** - Builds an index of all your code patterns
2. **Analyzes Request** - Uses AI to understand what you want to build
3. **Finds Patterns** - Identifies similar code in your project
4. **Enhances Prompt** - Creates comprehensive context for AI assistants
5. **Delivers Results** - Provides implementation-ready specifications

## Supported Languages

- Python (.py)
- JavaScript/TypeScript (.js, .ts, .jsx, .tsx)
- Java (.java)
- Go (.go)
- C/C++ (.c, .cpp, .h)
- And more... (configurable)

## Cost Comparison

| Service | Daily Cost | Monthly Cost |
|---------|-----------|--------------|
| This Tool | $0 | $0 |
| Vertex AI | $175 | $5,250 |
| OpenAI | $200+ | $6,000+ |

## Contributing

Contributions welcome! Please read CONTRIBUTING.md first.

## License

MIT License - see LICENSE file for details.

## Acknowledgments

Built with Google's Gemini 1.5 Pro via Google AI Studio.
EOF

# 7. Create a portable tarball (excluding sensitive data)
echo -e "${YELLOW}Creating portable package...${NC}"
cd ..
tar --exclude='ai-context/cache' \
    --exclude='ai-context/venv' \
    --exclude='ai-context/.env.local' \
    --exclude='ai-context/.env' \
    --exclude='ai-context/__pycache__' \
    --exclude='ai-context/**/*.pyc' \
    --exclude='ai-context/.git' \
    --exclude='ai-context/logs' \
    --exclude='ai-context/test_*.txt' \
    --exclude='ai-context/enhanced_output.md' \
    -czf ai-context-portable.tar.gz ai-context/

echo -e "${GREEN}✅ Success! AI Context Manager is ready for Git${NC}"
echo
echo "📦 Created files:"
echo "   - .gitignore (excludes secrets and cache)"
echo "   - .env.local.example (template for API keys)"
echo "   - requirements.txt (Python dependencies)"
echo "   - project_config.yaml.template (for new projects)"
echo "   - README.md (clean documentation)"
echo "   - ai-context-portable.tar.gz (ready to share)"
echo
echo "📤 To push to Git:"
echo "   cd ai-context"
echo "   git init"
echo "   git add ."
echo "   git commit -m 'Initial commit: AI Context Manager'"
echo "   git remote add origin https://github.com/yourusername/ai-context-manager.git"
echo "   git push -u origin main"
echo
echo "📥 To use in another project:"
echo "   1. Copy ai-context-portable.tar.gz to new project"
echo "   2. Extract: tar -xzf ai-context-portable.tar.gz"
echo "   3. Run: cd ai-context && ./setup_new_project.sh"
echo "   4. Add your API key to .env.local"
echo "   5. Customize config/project_config.yaml"
echo "   6. Scan and start enhancing!"
echo
echo -e "${GREEN}🎉 Your AI Context Manager is portable and ready to share!${NC}"