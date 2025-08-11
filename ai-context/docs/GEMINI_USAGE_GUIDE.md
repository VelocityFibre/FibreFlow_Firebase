# Gemini AI Context Manager - Usage Guide

*Last Updated: 2025-01-31*

## Quick Start

### 1. Basic Usage
```bash
# Navigate to ai-context directory
cd /home/ldp/VF/Apps/FibreFlow/ai-context

# Use virtual environment Python
venv/bin/python cli/ai_cli.py enhance "your request here"
```

### 2. With Alias (Recommended)
```bash
# Set up alias (one time)
./setup_alias.sh
source ~/.bashrc

# Now use from anywhere
ai enhance "Add user authentication with role-based access"
```

## Command Reference

### enhance - AI-Powered Prompt Enhancement
Enhances your development request with FibreFlow-specific context.

```bash
# Basic enhancement
ai enhance "Add invoice management feature"

# From file
ai enhance -f requirements.txt

# Save output
ai enhance "Add feature X" -o enhanced_prompt.md

# Use faster model
ai enhance -m flash "Quick task"

# Multi-line input
ai enhance -e  # Opens editor
```

### status - System Status
Shows current configuration and usage stats.

```bash
ai status

# Output:
🔍 FibreFlow Context Manager Status
✅ Codebase indexed: 11,915 files
✅ Google AI Studio: Connected
📊 Daily usage: 3/50 requests
🧠 Model: gemini-1.5-pro
```

### cost - Cost Analysis
Displays cost comparison between services.

```bash
ai cost

# Shows savings vs Vertex AI
💰 Cost Analysis:
Google AI Studio: $0/month (50 req/day free)
Vertex AI: $5,250/month
Savings: $5,250/month! 🎉
```

### setup - Configuration Helper
Guides through API key setup.

```bash
ai setup
# Interactive setup wizard
```

## Enhancement Examples

### 1. Feature Development
```bash
ai enhance "Add dashboard with real-time analytics using charts"

# AI will:
- Identify similar features (daily-progress charts)
- Suggest chart libraries already in use
- Reference theme system for consistent styling
- Provide component structure
```

### 2. Bug Fixing
```bash
ai enhance "Fix circular dependency error in services"

# AI will:
- Recognize common Angular DI issues
- Reference FibreFlow's injection patterns
- Suggest refactoring approach
- Warn about anti-patterns
```

### 3. Documentation
```bash
ai enhance "Document the meeting sync workflow"

# AI will:
- Switch to documentation mode
- Include technical details
- Reference actual code paths
- Structure for clarity
```

### 4. Performance Optimization
```bash
ai enhance "Optimize pole tracker list performance"

# AI will:
- Analyze current implementation
- Suggest FibreFlow-compatible optimizations
- Reference similar optimizations done
- Provide specific techniques
```

## Advanced Usage

### Multi-Line Requests
```bash
# Method 1: Editor
ai enhance --editor
# Opens your default editor (nano/vim)

# Method 2: File input
echo "Complex multi-paragraph request..." > request.txt
ai enhance -f request.txt

# Method 3: Here document
ai enhance "$(cat << 'EOF'
Add comprehensive reporting module with:
- Multiple report types
- Excel export
- Scheduled generation
- Email delivery
EOF
)"
```

### Model Selection
```bash
# Gemini 1.5 Pro (default) - Best quality
ai enhance "Complex architectural change"

# Gemini 1.5 Flash - 4x faster, good for simple tasks
ai enhance -m flash "Add a new field to user model"
```

### Batch Processing
```bash
# Process multiple requests efficiently
for req in "Add invoices" "Add reports" "Add analytics"; do
    ai enhance "$req" -o "${req// /_}.md"
    sleep 2  # Be nice to the API
done
```

## Understanding the Output

### 1. Intent Detection
```
✓ Intent detected: create_feature (component)
```
Tells you how the AI understood your request.

### 2. Context Matches
```
✓ Found 5 relevant context matches
```
Shows related code found in FibreFlow.

### 3. Enhancement Sections
- **Clarified Requirements**: Detailed breakdown
- **Implementation Approach**: Step-by-step plan
- **Code Patterns**: FibreFlow-specific examples
- **Next Steps**: Actionable tasks

### 4. Usage Tracking
```
💰 Free tier usage: 5/50 requests today
```
Helps you stay within free limits.

## Best Practices

### DO ✅
- **Be specific** about what you want to build
- **Mention technologies** if you have preferences
- **Include constraints** (e.g., "must work offline")
- **Reference existing features** for consistency
- **Save enhanced prompts** for documentation

### DON'T ❌
- Don't use for trivial tasks (wastes quota)
- Don't repeat identical requests (use cache)
- Don't exceed 50 requests/day
- Don't include sensitive data
- Don't use for non-FibreFlow projects

## Troubleshooting

### "No API key found"
```bash
# Check .env.local exists
cat .env.local

# Should contain:
GOOGLE_AI_STUDIO_API_KEY=AIzaSy...
```

### "Rate limit exceeded"
- Used all 50 free requests today
- Resets at midnight Pacific Time
- Falls back to pattern matching

### "Module not found"
```bash
# Activate virtual environment
source venv/bin/activate
python cli/ai_cli.py enhance "request"
```

### "Connection failed"
- Check internet connection
- Verify API key is valid
- Try again (temporary issue)

## Integration Tips

### With Claude Code
1. Enhance your prompt first:
   ```bash
   ai enhance "Complex feature request" -o prompt.md
   ```

2. Copy enhanced prompt to Claude Code

3. Claude Code now has:
   - Clear requirements
   - FibreFlow patterns
   - Implementation steps
   - Code examples

### With Git Workflow
```bash
# Before starting feature
ai enhance "Feature description" -o docs/feature-plan.md
git add docs/feature-plan.md
git commit -m "Add feature plan"

# Now implement with Claude Code
```

### With Team Collaboration
```bash
# Share enhanced prompts
ai enhance "Team requested feature" -o shared/feature-spec.md

# Team reviews enhanced spec
# Everyone understands the approach
```

## Tips for Better Results

### 1. Provide Context
```bash
# Good
ai enhance "Add reporting module similar to OneMap analytics with Excel export"

# Better than
ai enhance "Add reports"
```

### 2. Mention Integration Points
```bash
# Good
ai enhance "Add notifications that integrate with existing email service"

# Helps AI reference the right patterns
```

### 3. Specify UI Requirements
```bash
# Good
ai enhance "Add dashboard with Material cards and responsive grid layout"

# AI will reference theme system and Material patterns
```

### 4. Include Technical Constraints
```bash
# Good
ai enhance "Add offline-capable data entry with sync when online"

# AI will suggest appropriate patterns
```

## Daily Workflow Example

```bash
# Morning: Check status
ai status

# Enhance today's main task
ai enhance "Today's complex feature" -o features/todays-task.md

# Quick enhancements with Flash
ai enhance -m flash "Add loading spinner"

# End of day: Check usage
ai status
# Used 15/50 requests - plenty left!
```

## Conclusion

The Gemini-enhanced AI Context Manager transforms vague requirements into comprehensive, FibreFlow-specific implementation plans. Use it wisely to:

- 🚀 Start features faster
- 🎯 Follow patterns consistently
- 📚 Generate better documentation
- 🐛 Debug more effectively
- 💡 Discover optimal approaches

Remember: **50 free requests/day** is generous but not unlimited. Use for complex tasks where AI insight adds real value!

---

*Happy coding with AI-enhanced context!* 🎉