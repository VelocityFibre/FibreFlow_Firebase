#!/bin/bash

# Setup script for new projects
echo "🚀 Setting up AI Context Manager for your project"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 1. Check Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is required but not installed."
    exit 1
fi

echo "✅ Python 3 found"

# 2. Create virtual environment
if [ ! -d "venv" ]; then
    echo -e "${YELLOW}Creating virtual environment...${NC}"
    python3 -m venv venv
fi

# 3. Activate and install
echo -e "${YELLOW}Installing dependencies...${NC}"
source venv/bin/activate
pip install -r requirements.txt

# 4. Setup configuration
if [ ! -f "config/project_config.yaml" ]; then
    if [ -f "config/project_config.yaml.template" ]; then
        echo -e "${YELLOW}Creating project configuration...${NC}"
        cp config/project_config.yaml.template config/project_config.yaml
        echo "⚠️  Please edit config/project_config.yaml with your project details"
    fi
fi

# 5. Setup environment
if [ ! -f ".env.local" ]; then
    if [ -f ".env.local.example" ]; then
        echo -e "${YELLOW}Creating environment file...${NC}"
        cp .env.local.example .env.local
        echo "⚠️  Please edit .env.local with your Google AI Studio API key"
        echo "   Get your free key at: https://aistudio.google.com/app/apikey"
    fi
fi

# 6. Create directories
mkdir -p cache logs

# 7. Make CLI executable
if [ -f "cli/ai_cli.py" ]; then
    chmod +x cli/ai_cli.py
fi

# 8. Create convenient alias script
cat > use_ai_context.sh << 'EOF'
#!/bin/bash
# Source this file to use AI Context Manager easily
# Usage: source use_ai_context.sh

# Get the directory of this script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Activate virtual environment
source "$SCRIPT_DIR/venv/bin/activate"

# Create alias
alias ai="python $SCRIPT_DIR/cli/ai_cli.py"

echo "✅ AI Context Manager ready!"
echo "   Usage: ai enhance 'your request'"
echo "   Example: ai enhance 'Add user authentication'"
EOF

chmod +x use_ai_context.sh

echo
echo -e "${GREEN}✅ Setup complete!${NC}"
echo
echo "📋 Next steps:"
echo "1. Edit .env.local with your API key"
echo "2. Edit config/project_config.yaml for your project"
echo "3. Scan your codebase:"
echo "   source venv/bin/activate"
echo "   python agents/codebase_scanner.py"
echo "4. Start enhancing:"
echo "   python cli/ai_cli.py enhance 'your request'"
echo
echo "💡 Tip: For easy access, run: source use_ai_context.sh"