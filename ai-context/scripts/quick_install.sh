#!/bin/bash
# Quick install script for FibreFlow Context Manager

echo "🚀 FibreFlow Context Manager - Quick Install"
echo "=========================================="

# Check Python version
python_version=$(python3 --version 2>&1 | awk '{print $2}')
echo "✓ Python version: $python_version"

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
pip install google-generativeai python-dotenv PyYAML

echo ""
echo "✅ Installation complete!"
echo ""
echo "🎯 Next steps:"
echo "1. Get your FREE API key from: https://aistudio.google.com/app/apikey"
echo "2. Run: python scripts/setup_google_ai_studio.py"
echo "3. Index your code: python agents/codebase_scanner.py"
echo "4. Start using: python cli/vertex_cli_unified.py enhance 'your request'"
echo ""
echo "💰 Remember: 50 free requests/day with 1M token context!"