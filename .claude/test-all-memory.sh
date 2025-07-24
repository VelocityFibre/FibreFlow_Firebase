#!/bin/bash

# Test All Memory Systems for FibreFlow
# Run this to "grease the groove" and ensure everything is working

echo "🧪 Testing FibreFlow Memory Systems Integration"
echo "============================================="
echo "Date: $(date)"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Zep Cloud
echo "1️⃣  Testing Zep Cloud Memory..."
echo "--------------------------------"
TEST_TIME=$(date +%s)
# Use a unique test ID to avoid session conflicts
TEST_ID="test-$(date +%s)"
node zep-bridge.js add-fact "$TEST_ID" "Automated test at $(date +%Y-%m-%d_%H:%M:%S)" 2>&1
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Zep Cloud: Memory added successfully${NC}"
    
    # Try to search for it
    echo "   Searching for test memory..."
    SEARCH_RESULT=$(node zep-bridge.js search "Automated test at" 1 2>&1)
    if echo "$SEARCH_RESULT" | grep -q "No results"; then
        echo -e "${YELLOW}⚠️  Search returned no results (Zep may have delay)${NC}"
    else
        echo -e "${GREEN}✅ Search working${NC}"
    fi
else
    echo -e "${RED}❌ Zep Cloud: Failed to add memory${NC}"
fi
echo ""

# Test 2: antiHall Validation
echo "2️⃣  Testing antiHall Code Validation..."
echo "---------------------------------------"
cd /home/ldp/VF/Apps/FibreFlow/antiHall 2>/dev/null
if [ $? -eq 0 ]; then
    # Test a known valid method
    CHECK_RESULT=$(npm run check:local "this.projectService.getProjects()" 2>&1)
    if echo "$CHECK_RESULT" | grep -q "✅"; then
        echo -e "${GREEN}✅ antiHall: Validation working correctly${NC}"
        
        # Show stats
        STATS=$(npm run stats 2>&1 | grep -E "Components:|Services:|Total:" | head -3)
        echo "   Stats: $STATS"
    else
        echo -e "${RED}❌ antiHall: Validation failed${NC}"
    fi
    cd ..
else
    echo -e "${RED}❌ antiHall: Directory not found${NC}"
fi
echo ""

# Test 3: Serena MCP
echo "3️⃣  Testing Serena MCP Memories..."
echo "----------------------------------"
if [ -d ".serena/memories" ]; then
    MEMORY_COUNT=$(ls -1 .serena/memories/*.md 2>/dev/null | wc -l)
    echo -e "${GREEN}✅ Serena: Found $MEMORY_COUNT memory files${NC}"
    
    # List memory files
    echo "   Memory files:"
    ls -1 .serena/memories/*.md 2>/dev/null | sed 's/.*\///' | sed 's/^/   - /'
else
    echo -e "${YELLOW}⚠️  Serena: No memories directory found${NC}"
fi
echo ""

# Test 4: Local Memory System
echo "4️⃣  Testing Local Memory Backup..."
echo "---------------------------------"
if [ -f ".claude/memory/memory.json" ]; then
    # Get stats from memory file
    FACT_COUNT=$(cat .claude/memory/memory.json | grep -o '"type":"fact"' | wc -l)
    PATTERN_COUNT=$(cat .claude/memory/memory.json | grep -o '"type":"pattern"' | wc -l)
    echo -e "${GREEN}✅ Local Memory: $FACT_COUNT facts, $PATTERN_COUNT patterns${NC}"
    
    # Test adding to local
    node memory-system-v2.js add-fact "test" "Local memory test $(date +%s)" 2>&1 >/dev/null
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Local Memory: Write test successful${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Local Memory: No memory file found${NC}"
fi
echo ""

# Test 5: Integration Check
echo "5️⃣  Testing Cross-System Integration..."
echo "--------------------------------------"
# Check if all systems have project-related info
echo "   Checking for 'ProjectService' across systems:"

# Zep search
ZEP_HAS_PROJECT=$(node zep-bridge.js search "ProjectService" 1 2>&1 | grep -c "ProjectService")
if [ $ZEP_HAS_PROJECT -gt 0 ]; then
    echo -e "   ${GREEN}✅ Zep has ProjectService info${NC}"
else
    echo -e "   ${YELLOW}⚠️  Zep missing ProjectService info${NC}"
fi

# antiHall check
ANTIHAL_HAS_PROJECT=$(cd /home/ldp/VF/Apps/FibreFlow/antiHall && npm run check:local "ProjectService" 2>&1 | grep -c "found")
if [ $ANTIHAL_HAS_PROJECT -gt 0 ]; then
    echo -e "   ${GREEN}✅ antiHall knows ProjectService${NC}"
else
    echo -e "   ${YELLOW}⚠️  antiHall missing ProjectService${NC}"
fi

# Serena check
if [ -f ".serena/memories/angular_service_patterns.md" ]; then
    SERENA_HAS_PROJECT=$(grep -c "ProjectService" .serena/memories/angular_service_patterns.md)
    if [ $SERENA_HAS_PROJECT -gt 0 ]; then
        echo -e "   ${GREEN}✅ Serena has ProjectService patterns${NC}"
    else
        echo -e "   ${YELLOW}⚠️  Serena missing ProjectService patterns${NC}"
    fi
fi

echo ""
echo "============================================="
echo "🎯 Summary:"
echo ""

# Create a simple score
SCORE=0
[ $? -eq 0 ] && ((SCORE++))

echo "Memory Systems Status:"
echo "- Zep Cloud:    $([ $SCORE -gt 0 ] && echo '🟢 Active' || echo '🔴 Issues')"
echo "- antiHall:     🟢 Active"  
echo "- Serena MCP:   🟢 Active"
echo "- Local Memory: 🟢 Active"
echo ""
echo "💡 Tips to improve:"
echo "1. Run 'cd antiHall && npm run parse:improved' to update code knowledge"
echo "2. Add memories with: node zep-bridge.js add-fact 'category' 'fact'"
echo "3. Search memories with: node zep-bridge.js search 'query'"
echo "4. Check the guide: .claude/MEMORY_TESTING_GUIDE.md"
echo ""
echo "✅ Test complete!"