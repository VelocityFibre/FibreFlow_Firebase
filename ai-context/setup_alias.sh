#!/bin/bash
# Setup simple 'ai' command for FibreFlow AI Context Manager

echo "🚀 Setting up 'ai' command for FibreFlow AI Context Manager"
echo ""

# Get the full path to the ai-context directory
AI_CONTEXT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Create alias command
echo "# FibreFlow AI Context Manager" >> ~/.bashrc
echo "alias ai='python $AI_CONTEXT_DIR/cli/ai_cli.py'" >> ~/.bashrc
echo "alias fibreflow-ai='python $AI_CONTEXT_DIR/cli/ai_cli.py'" >> ~/.bashrc

echo "✅ Aliases added to ~/.bashrc"
echo ""
echo "📝 Usage:"
echo "   ai enhance \"your request\"     # Enhance a prompt"
echo "   ai status                      # Check status"
echo "   ai cost                        # Show cost comparison"
echo ""
echo "🔄 To activate now, run: source ~/.bashrc"
echo "   Or just open a new terminal"
echo ""
echo "💡 This enhances your prompts with FibreFlow context!"
echo "   Currently using: Pattern matching (no API needed)"
echo "   For AI enhancement: Run 'ai setup' to add Google AI Studio"