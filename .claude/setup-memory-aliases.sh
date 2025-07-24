#!/bin/bash

# Setup Memory System Aliases for FibreFlow
# Add these to your ~/.bashrc or ~/.zshrc for quick access

echo "# FibreFlow Memory System Aliases" >> ~/.bashrc
echo "" >> ~/.bashrc

# Zep Cloud aliases
echo "# Zep Cloud Memory" >> ~/.bashrc
echo "alias zep='node ~/VF/Apps/FibreFlow/.claude/zep-bridge.js'" >> ~/.bashrc
echo "alias zep-fact='node ~/VF/Apps/FibreFlow/.claude/zep-bridge.js add-fact'" >> ~/.bashrc
echo "alias zep-pattern='node ~/VF/Apps/FibreFlow/.claude/zep-bridge.js add-pattern'" >> ~/.bashrc
echo "alias zep-episode='node ~/VF/Apps/FibreFlow/.claude/zep-bridge.js add-episode'" >> ~/.bashrc
echo "alias zep-search='node ~/VF/Apps/FibreFlow/.claude/zep-bridge.js search'" >> ~/.bashrc
echo "" >> ~/.bashrc

# antiHall aliases
echo "# antiHall Validation" >> ~/.bashrc
echo "alias anticheck='cd ~/VF/Apps/FibreFlow/antiHall && npm run check:local'" >> ~/.bashrc
echo "alias antiparse='cd ~/VF/Apps/FibreFlow/antiHall && npm run parse:improved'" >> ~/.bashrc
echo "alias antistats='cd ~/VF/Apps/FibreFlow/antiHall && npm run stats'" >> ~/.bashrc
echo "" >> ~/.bashrc

# Memory testing aliases
echo "# Memory System Testing" >> ~/.bashrc
echo "alias test-memory='~/VF/Apps/FibreFlow/.claude/test-all-memory.sh'" >> ~/.bashrc
echo "alias grease='~/VF/Apps/FibreFlow/.claude/grease-the-groove.sh'" >> ~/.bashrc
echo "" >> ~/.bashrc

# Quick memory patterns
echo "# Quick Memory Patterns" >> ~/.bashrc
echo "function remember-bug() {" >> ~/.bashrc
echo '  read -p "Problem: " problem' >> ~/.bashrc
echo '  read -p "Solution: " solution' >> ~/.bashrc
echo '  node ~/VF/Apps/FibreFlow/.claude/zep-bridge.js add-episode "bug-fix-$(date +%s)" "{\"problem\":\"$problem\",\"solution\":\"$solution\",\"date\":\"$(date)\"}"' >> ~/.bashrc
echo "}" >> ~/.bashrc
echo "" >> ~/.bashrc

echo "function remember-fact() {" >> ~/.bashrc
echo '  read -p "Category: " category' >> ~/.bashrc
echo '  read -p "Fact: " fact' >> ~/.bashrc
echo '  node ~/VF/Apps/FibreFlow/.claude/zep-bridge.js add-fact "$category" "$fact"' >> ~/.bashrc
echo "}" >> ~/.bashrc
echo "" >> ~/.bashrc

echo "✅ Aliases added to ~/.bashrc"
echo ""
echo "To activate them now, run:"
echo "  source ~/.bashrc"
echo ""
echo "Quick Reference:"
echo "  zep-fact <category> <fact>     - Add a fact"
echo "  zep-pattern <name> <desc>      - Add a pattern"
echo "  zep-episode <title> <json>     - Add an episode"
echo "  zep-search <query>             - Search memories"
echo "  anticheck <code>               - Validate code"
echo "  antiparse                      - Update antiHall"
echo "  test-memory                    - Test all systems"
echo "  grease                         - Daily optimization"
echo "  remember-bug                   - Interactive bug capture"
echo "  remember-fact                  - Interactive fact capture"