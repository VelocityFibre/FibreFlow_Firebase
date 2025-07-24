#!/bin/bash

# Daily "Grease the Groove" Script for FibreFlow Memory Systems
# Run this each morning to ensure smooth memory operations

echo "🏃 Greasing the Groove - FibreFlow Memory Systems"
echo "================================================"
echo "Running daily optimization routine..."
echo ""

# 1. Update antiHall knowledge if code changed
echo "1️⃣  Checking for code changes..."
cd /home/ldp/VF/Apps/FibreFlow
CHANGES=$(git status --porcelain src/ | grep -E "\.ts$" | wc -l)
if [ $CHANGES -gt 0 ]; then
    echo "   Found $CHANGES TypeScript file changes"
    echo "   Updating antiHall knowledge base..."
    cd antiHall && npm run parse:improved
    echo "   ✅ antiHall updated"
else
    echo "   ✅ No code changes - antiHall is current"
fi
echo ""

# 2. Quick Zep Cloud warmup
echo "2️⃣  Warming up Zep Cloud connection..."
cd /home/ldp/VF/Apps/FibreFlow/.claude
node zep-bridge.js add-fact "daily-warmup" "System check at $(date +%Y-%m-%d)" >/dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "   ✅ Zep Cloud connection active"
else
    echo "   ⚠️  Zep Cloud connection issue - check API key"
fi
echo ""

# 3. Memory statistics
echo "3️⃣  Memory System Statistics:"
echo "   --------------------------------"

# Zep stats (search for all recent)
echo -n "   Zep Cloud entries: "
node zep-bridge.js search "*" 100 2>&1 | grep -c "Result" || echo "0"

# antiHall stats
echo -n "   antiHall entities: "
cd /home/ldp/VF/Apps/FibreFlow/antiHall 2>/dev/null && cat knowledge-graphs/summary.json 2>/dev/null | grep -o '"total":[0-9]*' | cut -d: -f2 || echo "unknown"

# Serena memories
echo -n "   Serena memories: "
ls -1 /home/ldp/VF/Apps/FibreFlow/.serena/memories/*.md 2>/dev/null | wc -l || echo "0"

# Local memory
echo -n "   Local backup entries: "
if [ -f "/home/ldp/VF/Apps/FibreFlow/.claude/memory/memory.json" ]; then
    FACTS=$(grep -o '"type":"fact"' /home/ldp/VF/Apps/FibreFlow/.claude/memory/memory.json | wc -l)
    PATTERNS=$(grep -o '"type":"pattern"' /home/ldp/VF/Apps/FibreFlow/.claude/memory/memory.json | wc -l)
    echo "$((FACTS + PATTERNS))"
else
    echo "0"
fi
echo ""

# 4. Recent memories check
echo "4️⃣  Recent Memory Activity (last 24 hours):"
cd /home/ldp/VF/Apps/FibreFlow/.claude
node zep-bridge.js search "$(date +%Y-%m-%d)" 5 2>&1 | grep -E "(Result|Content)" | head -10
echo ""

# 5. Quick tips for today
echo "📝 Quick Memory Commands for Today:"
echo "   --------------------------------"
echo "   Add fact:    node zep-bridge.js add-fact 'category' 'your fact here'"
echo "   Add pattern: node zep-bridge.js add-pattern 'name' 'description'"
echo "   Add episode: node zep-bridge.js add-episode 'title' '{\"problem\":\"...\",\"solution\":\"...\"}'"
echo "   Search:      node zep-bridge.js search 'query'"
echo "   Validate:    cd antiHall && npm run check 'code to check'"
echo ""

# 6. Create today's memory focus
echo "🎯 Today's Memory Focus:"
DAY=$(date +%A)
case $DAY in
    Monday)
        echo "   Focus: Capture weekly goals and architectural decisions"
        ;;
    Tuesday|Wednesday|Thursday)
        echo "   Focus: Document bug fixes and new patterns discovered"
        ;;
    Friday)
        echo "   Focus: Summarize week's learnings and update key patterns"
        ;;
    *)
        echo "   Focus: Review and organize memories from the week"
        ;;
esac
echo ""

# 7. Checklist
echo "✅ Daily Checklist:"
echo "   [ ] Run this script each morning"
echo "   [ ] Add at least one memory today (fact/pattern/episode)"
echo "   [ ] Validate code with antiHall before suggesting"
echo "   [ ] Review memories at end of day"
echo ""

echo "🚀 Groove is greased! Ready for productive development!"
echo ""

# Optional: Open memory guide
echo "💡 Tip: For detailed testing, see: .claude/MEMORY_TESTING_GUIDE.md"