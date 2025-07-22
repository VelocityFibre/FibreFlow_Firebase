#!/bin/bash

# Initialize Claude Memory System with FibreFlow-specific knowledge

echo "🧠 Initializing Claude Memory System for FibreFlow..."

# Make the script executable
chmod +x .claude/memory-system.js

# Create alias for easier access
echo "alias claude-mem='node $(pwd)/.claude/memory-system.js'" >> ~/.bashrc

# Initialize with core FibreFlow facts
node .claude/memory-system.js fact "FibreFlow and VF OneMap use separate Firebase projects - cannot authenticate across them without service account"
node .claude/memory-system.js fact "FibreFlow uses Firebase project: fibreflow-73daf"
node .claude/memory-system.js fact "VF OneMap uses Firebase project: vf-onemap"
node .claude/memory-system.js fact "Storage uploads must use the same project's bucket as the authentication"

# Add patterns we've learned
node .claude/memory-system.js pattern routing "Use simple routes in app.routes.ts to avoid NG04002 errors"
node .claude/memory-system.js pattern routing "Nested lazy-loaded routes lose path context"
node .claude/memory-system.js pattern firebase "Always use AngularFire methods, not direct Firebase SDK"
node .claude/memory-system.js pattern storage "Check storage bucket configuration matches authentication project"

# Add user preferences
node .claude/memory-system.js preference "Always ask before making architectural changes"
node .claude/memory-system.js preference "Fix root cause, not symptoms"
node .claude/memory-system.js preference "Prefer simple solutions over complex ones"
node .claude/memory-system.js preference "Never create server-side workarounds without permission"

# Add entities to knowledge graph
node .claude/memory-system.js entity project FibreFlow "Main fiber optic management system"
node .claude/memory-system.js entity project "VF OneMap" "Separate OneMap data processing system"
node .claude/memory-system.js entity service PoleTrackerService "Handles pole tracking operations"
node .claude/memory-system.js entity service GoogleMapsService "Provides map functionality"
node .claude/memory-system.js entity component PoleTrackerComponent "Main pole tracking UI"

# Add relationships
node .claude/memory-system.js relationship PoleTrackerComponent uses PoleTrackerService
node .claude/memory-system.js relationship PoleTrackerComponent uses GoogleMapsService
node .claude/memory-system.js relationship FibreFlow separate-from "VF OneMap"

# Add session summaries
node .claude/memory-system.js session "Storage Authentication Issue" "Discovered cross-project Firebase auth limitations when uploading to VF OneMap storage from FibreFlow"
node .claude/memory-system.js session "Routing Best Practices" "Learned that nested lazy routes cause NG04002 errors, should use simple top-level routes"

echo "✅ Memory system initialized!"
echo ""
echo "📊 Current memory stats:"
node .claude/memory-system.js stats

echo ""
echo "🔍 Quick usage:"
echo "  claude-mem search 'firebase storage'  # Search memories"
echo "  claude-mem context 'upload files'     # Get context for a task"
echo "  claude-mem fact 'new learning'        # Add a new fact"
echo ""
echo "See all commands: claude-mem"