#!/bin/bash

echo "🚀 Setting up Zep Cloud integration for FibreFlow"
echo ""

# Check if we're in the .claude directory
if [[ ! "$PWD" =~ \.claude$ ]]; then
    echo "Please run this script from the .claude directory"
    exit 1
fi

# Step 1: Install dependencies
echo "📦 Installing npm dependencies..."
npm install

# Step 2: Check for API key
# Load from .env file if exists
if [ -f ".env" ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

if [ -z "$ZEP_API_KEY" ]; then
    echo ""
    echo "⚠️  ZEP_API_KEY environment variable not set!"
    echo ""
    echo "To get your API key:"
    echo "1. Go to https://app.getzep.com"
    echo "2. Sign up for a free account"
    echo "3. Go to Settings → API Keys"
    echo "4. Create a new API key"
    echo ""
    echo "Then set it in your environment:"
    echo "export ZEP_API_KEY='your-api-key-here'"
    echo ""
    echo "Or add to your .bashrc/.zshrc:"
    echo "echo 'export ZEP_API_KEY=\"your-api-key-here\"' >> ~/.bashrc"
    echo ""
    exit 1
fi

# Step 3: Setup user
echo ""
echo "🔧 Setting up FibreFlow user in Zep..."
node zep-bridge.js setup

# Step 4: Test connection
echo ""
echo "🧪 Testing Zep connection..."
node zep-bridge.js search "test" 1 > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Zep connection successful!"
else
    echo "❌ Failed to connect to Zep. Check your API key."
    exit 1
fi

# Step 5: Offer to migrate
echo ""
echo "📚 Local memory system detected. Would you like to migrate to Zep? (y/n)"
read -r response
if [[ "$response" =~ ^[Yy]$ ]]; then
    echo "🔄 Migrating local memories to Zep..."
    node zep-bridge.js migrate
fi

# Step 6: Quick guide
echo ""
echo "🎉 Zep setup complete!"
echo ""
echo "Quick commands:"
echo "  npm run zep help                      - Show all commands"
echo "  npm run zep add-fact firebase \"fact\" - Add a fact"
echo "  npm run zep search \"query\"           - Search memories"
echo "  npm run zep list-sessions            - List all sessions"
echo ""
echo "For Claude Desktop integration, add to ~/.config/Claude/claude_desktop_config.json:"
echo ""
cat << 'EOF'
{
  "mcpServers": {
    "fibreflow-zep": {
      "command": "/usr/bin/node",
      "args": [
        "/path/to/FibreFlow/.claude/zep-mcp-bridge.js"
      ],
      "env": {
        "ZEP_API_KEY": "your-api-key"
      }
    }
  }
}
EOF
echo ""