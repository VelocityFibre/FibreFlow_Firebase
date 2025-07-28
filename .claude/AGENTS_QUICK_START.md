# FibreFlow Claude Code Agents - Quick Start Guide

## 🚀 What's New

FibreFlow now has a powerful multi-agent system that:
- **Validates data automatically** before any operation
- **Runs tasks in parallel** using specialized agents
- **Logs everything** for complete observability
- **Prevents errors** before they happen

## 🎯 Quick Examples

### 1. Validate Data
```
Use the data-integrity-guardian to check if these pole numbers are valid:
LAW.P.B167, LAW.P.C234, INVALID.POLE.123
```

### 2. Import CSV File
```
Use the onemap-import-workflow to process OneMap/downloads/May26.csv
```

### 3. Generate Analytics
```
Use the pole-analytics-workflow to analyze pole installation progress
```

### 4. Check System Health
```
Run the daily-operations-workflow
```

### 5. Create New Agent
```
Use the meta-agent to create a sub-agent for monitoring stock levels
```

## 📊 View Analytics Dashboard

```bash
# In terminal:
./.claude/view-logs.sh
# Then select option 1
```

## 🛡️ Automatic Protection

The system automatically:
- ✅ Blocks dangerous commands (rm -rf, etc.)
- ✅ Validates pole/drop numbers
- ✅ Enforces business rules (max 12 drops per pole)
- ✅ Protects sensitive files (.env, etc.)
- ✅ Logs all operations

## 🤖 Available Agents

### Core Agents
- **data-integrity-guardian** - Validates all data operations
- **security-agent** - Security guidance and rules
- **meta-agent** - Creates new agents

### OneMap Agents
- **csv-validator** - Validates CSV files before import
- **status-tracker** - Tracks workflow state changes
- **report-generator** - Creates comprehensive reports

### Feature Agents
- **fibreflow-architect** - System design decisions
- **angular-frontend-specialist** - UI/UX implementation
- **firebase-backend-expert** - Backend operations
- **pole-tracker-specialist** - Pole tracking features
- **boq-rfq-specialist** - BOQ and quotes
- **testing-deployment-expert** - Build and deploy

### Workflows (Multi-Agent)
- **onemap-import-workflow** - Complete CSV import process
- **pole-analytics-workflow** - Comprehensive pole analysis
- **daily-operations-workflow** - System health checks

## 🔍 How It Works

1. **You ask Claude** to use an agent or workflow
2. **Claude calls the agent** with specific instructions
3. **Hooks validate** the operations before execution
4. **Agent completes** the task in isolation
5. **Results logged** and returned to you

## 📈 Benefits

- **Faster** - Parallel processing with multiple agents
- **Safer** - Automatic validation prevents errors
- **Visible** - Complete audit trail of all operations
- **Scalable** - Easy to add new agents
- **Reliable** - Isolated contexts prevent interference

## 🎓 Pro Tips

1. **Be specific** when calling agents - provide context
2. **Check logs** regularly with view-logs.sh
3. **Chain agents** in workflows for complex tasks
4. **Create custom agents** with the meta-agent
5. **Trust the validation** - it catches errors early

## ⚡ Common Commands

```bash
# View analytics dashboard
./.claude/view-logs.sh

# Check specific logs
ls .claude/logs/

# Test a hook manually
python3 .claude/hooks/pre_tool_use.py < test-input.json

# Run log analyzer directly
python3 .claude/utils/log_analyzer.py --report summary
```

## 🚨 Troubleshooting

**Q: Agent not found?**
A: Check agent name in `.claude/agents/yaml/`

**Q: Validation failing?**
A: Check logs in `.claude/logs/pre_tool_use.json`

**Q: Need more agents?**
A: Use the meta-agent to create new ones

**Q: Performance slow?**
A: Check agent metrics in analytics dashboard

---

Remember: The system is designed to help you work faster and safer. Let the agents handle the complexity while you focus on the business logic!