# FibreFlow Claude Code Agents - Complete User Guide

## 📚 Table of Contents
1. [What Are Claude Code Agents?](#what-are-claude-code-agents)
2. [How to Use Agents](#how-to-use-agents)
3. [Complete Agent List](#complete-agent-list)
4. [Agent Workflows](#agent-workflows)
5. [When to Use Each Agent](#when-to-use-each-agent)
6. [Examples & Use Cases](#examples--use-cases)
7. [How the System Works](#how-the-system-works)
8. [Monitoring & Analytics](#monitoring--analytics)
9. [Creating Custom Agents](#creating-custom-agents)
10. [Troubleshooting](#troubleshooting)

---

## 🤖 What Are Claude Code Agents?

Claude Code agents are specialized AI assistants that:
- **Focus on one specific task** (single responsibility)
- **Run in isolated contexts** (no interference)
- **Can work in parallel** (multiple agents simultaneously)
- **Are automatically validated** (hooks ensure data integrity)
- **Provide structured outputs** (consistent, reliable results)

Think of them as your specialized team members, each expert in their domain.

---

## 📝 How to Use Agents

### Basic Syntax
```
Use the [agent-name] to [specific task]
```

### Examples:
```
Use the data-integrity-guardian to validate pole numbers LAW.P.B167 and LAW.P.C234

Use the csv-validator to check the file OneMap/downloads/May26.csv

Use the security-agent to review our Firebase rules for production deployment
```

### Important Rules:
1. **Be specific** - Tell the agent exactly what you need
2. **Provide context** - Include file paths, data, or requirements
3. **One task at a time** - Agents work best with focused requests

---

## 📋 Complete Agent List

### 1. **data-integrity-guardian**
**Purpose**: Validates all data operations to prevent corruption  
**When to use**:
- Before importing data
- Validating pole/drop numbers
- Checking business rules (max drops per pole)
- Ensuring data consistency

**Example**:
```
Use the data-integrity-guardian to validate these poles: LAW.P.B167, MOH.P.A001
Check if pole LAW.P.B167 can accept 3 more drops
```

### 2. **csv-validator**
**Purpose**: Validates CSV files before import  
**When to use**:
- Before importing OneMap CSV files
- Checking file format and encoding
- Validating column headers
- Assessing data quality

**Example**:
```
Use the csv-validator to check OneMap/downloads/May26.csv
Validate if the Lawley project CSV has all required columns
```

### 3. **status-tracker**
**Purpose**: Tracks workflow state changes and progressions  
**When to use**:
- Analyzing status transitions
- Finding workflow bottlenecks
- Tracking payment-eligible approvals
- Detecting anomalies in status flow

**Example**:
```
Use the status-tracker to analyze status changes in the last import batch
Track how many poles reached "Pole Permission: Approved" status today
```

### 4. **report-generator**
**Purpose**: Creates comprehensive reports from data  
**When to use**:
- After imports for summary
- Daily/weekly reporting
- Payment verification reports
- Data quality assessments

**Example**:
```
Use the report-generator to create a daily processing report for May 26
Generate a payment summary report for approved poles
```

### 5. **security-agent**
**Purpose**: Provides security guidance and checks  
**When to use**:
- Before public deployment
- Reviewing Firebase rules
- Security assessments
- Permission configurations

**Example**:
```
Use the security-agent to check if we're ready for public deployment
Review our Firebase rules for the production environment
```

### 6. **fibreflow-architect**
**Purpose**: System architecture and design decisions  
**When to use**:
- Planning new features
- Architectural decisions
- Refactoring discussions
- Pattern recommendations

**Example**:
```
Use the fibreflow-architect to design the invoice management module
Review our service architecture for the BOQ feature
```

### 7. **angular-frontend-specialist**
**Purpose**: Angular and UI/UX implementation  
**When to use**:
- Building new components
- UI performance issues
- Material Design questions
- Frontend best practices

**Example**:
```
Use the angular-frontend-specialist to create a data table component
Help optimize the pole tracker list view performance
```

### 8. **firebase-backend-expert**
**Purpose**: Firebase and backend operations  
**When to use**:
- Database queries
- Authentication issues
- Cloud Functions
- Performance optimization

**Example**:
```
Use the firebase-backend-expert to optimize our pole queries
Help design the Firestore structure for invoices
```

### 9. **pole-tracker-specialist**
**Purpose**: Pole tracking feature expertise  
**When to use**:
- Pole tracker features
- Mobile app issues
- GPS functionality
- Photo upload problems

**Example**:
```
Use the pole-tracker-specialist to fix the mobile GPS accuracy issue
Design the offline queue for pole captures
```

### 10. **boq-rfq-specialist**
**Purpose**: BOQ and RFQ management  
**When to use**:
- BOQ calculations
- Quote generation
- Supplier communications
- Material planning

**Example**:
```
Use the boq-rfq-specialist to calculate materials for project LAW-001
Generate RFQ for the Lawley project materials
```

### 11. **testing-deployment-expert**
**Purpose**: Testing and deployment processes  
**When to use**:
- Build errors
- Deployment issues
- Performance testing
- CI/CD setup

**Example**:
```
Use the testing-deployment-expert to fix the build memory error
Set up preview deployment for the new feature
```

### 12. **meta-agent** ⭐
**Purpose**: Creates new agents  
**When to use**:
- Need a new specialized agent
- Updating existing agents
- Building agent templates

**Example**:
```
Use the meta-agent to create a new agent for invoice processing
Build an agent that monitors system performance
```

---

## 🔄 Agent Workflows

Workflows combine multiple agents for complex tasks:

### 1. **onemap-import-workflow**
**What it does**: Complete CSV import process  
**Agents used**:
1. csv-validator → Validates file
2. data-integrity-guardian → Checks data rules
3. status-tracker → Monitors progress
4. report-generator → Creates summary

**Usage**:
```
Use the onemap-import-workflow to process OneMap/downloads/May26.csv
```

### 2. **pole-analytics-workflow**
**What it does**: Comprehensive pole analysis  
**Agents used**:
1. data-integrity-guardian → Data quality check
2. status-tracker → Progress analysis
3. report-generator → Analytics report

**Usage**:
```
Use the pole-analytics-workflow to analyze this month's pole installations
```

### 3. **daily-operations-workflow**
**What it does**: System health check  
**Agents used**:
1. security-agent → Security posture
2. data-integrity-guardian → Data consistency
3. testing-deployment-expert → System performance
4. report-generator → Daily summary

**Usage**:
```
Run the daily-operations-workflow for morning system check
```

---

## 🎯 When to Use Each Agent

### For Data Operations
- **Importing data** → onemap-import-workflow
- **Validating data** → data-integrity-guardian
- **Checking files** → csv-validator
- **Tracking changes** → status-tracker

### For Development
- **UI work** → angular-frontend-specialist
- **Backend work** → firebase-backend-expert
- **Architecture** → fibreflow-architect
- **Deployment** → testing-deployment-expert

### For Business Operations
- **Reports** → report-generator
- **Analytics** → pole-analytics-workflow
- **BOQ/Quotes** → boq-rfq-specialist
- **Pole tracking** → pole-tracker-specialist

### For System Management
- **Daily checks** → daily-operations-workflow
- **Security** → security-agent
- **New agents** → meta-agent

---

## 💡 Examples & Use Cases

### Scenario 1: Importing New OneMap Data
```
1. Use the csv-validator to check OneMap/downloads/May27.csv
2. If valid, use the onemap-import-workflow to process the file
3. Use the report-generator to create an import summary
```

### Scenario 2: Investigating Data Issues
```
1. Use the data-integrity-guardian to check pole number uniqueness
2. Use the status-tracker to find anomalous status transitions
3. Use the report-generator to document findings
```

### Scenario 3: Building New Feature
```
1. Use the fibreflow-architect to design the feature structure
2. Use the angular-frontend-specialist for UI components
3. Use the firebase-backend-expert for data models
4. Use the testing-deployment-expert to deploy
```

### Scenario 4: Daily Operations
```
Morning routine:
1. Run the daily-operations-workflow
2. Check any alerts with security-agent
3. Review metrics with report-generator
```

---

## ⚙️ How the System Works

### Agent Lifecycle
1. **You request** → "Use agent X to do Y"
2. **Claude calls agent** → Passes specific instructions
3. **Hooks validate** → Pre-tool checks run automatically
4. **Agent executes** → In isolated context
5. **Results logged** → Post-tool hooks record everything
6. **Response returned** → Structured output back to you

### Automatic Protections
- **Pre-execution**: Validates data formats, blocks dangerous commands
- **During execution**: Isolated context, no side effects
- **Post-execution**: Logs all actions, tracks performance

---

## 📊 Monitoring & Analytics

### View Dashboard
```bash
./.claude/view-logs.sh
# Select option 1 for dashboard
```

### Available Reports
1. **Summary Dashboard** - Overall system health
2. **Tool Usage** - Most used tools and patterns
3. **Agent Performance** - Success rates, execution times
4. **Data Integrity** - Validation events and issues

### Log Locations
```
.claude/logs/
├── pre_tool_use.json         # Validation events
├── post_tool_use.json        # All operations
├── session_summaries.json    # Conversation summaries
├── sub_agent_executions.json # Agent performance
├── agent_metrics.json        # Aggregated metrics
└── daily_stats_*.json        # Daily statistics
```

---

## 🛠️ Creating Custom Agents

### Using Meta-Agent
```
Use the meta-agent to create a new agent for [purpose]
Requirements:
- [What it should do]
- [What tools it needs]
- [When it should be triggered]
```

### Example:
```
Use the meta-agent to create an agent for monitoring stock levels
Requirements:
- Check stock quantities against minimum levels
- Alert when stock is low
- Generate reorder recommendations
- Triggered by "stock check" or "inventory alert"
```

---

## 🔧 Troubleshooting

### Agent Not Working?
1. Check agent name spelling: `ls .claude/agents/yaml/`
2. Verify agent exists: `cat .claude/agents/yaml/[agent-name].yaml`
3. Check logs: `.claude/logs/sub_agent_executions.json`

### Validation Failing?
1. Check validation rules: `.claude/utils/fibreflow_validators.py`
2. Review blocked operations: `.claude/logs/pre_tool_use.json`
3. Verify data format matches requirements

### Performance Issues?
1. Check agent metrics: `python3 .claude/utils/log_analyzer.py --report agents`
2. Review execution times in logs
3. Consider splitting large tasks across multiple agents

### Need Help?
1. Check this guide first
2. Review logs for specific errors
3. Use the meta-agent to create specialized help

---

## 🚀 Quick Reference Card

### Most Common Commands
```
# Data validation
Use the data-integrity-guardian to validate [data]

# Import CSV
Use the onemap-import-workflow to process [file]

# Generate report
Use the report-generator to create [report type]

# System check
Run the daily-operations-workflow

# Create new agent
Use the meta-agent to create [agent description]
```

### View Analytics
```bash
./.claude/view-logs.sh
```

### Check Specific Agent
```bash
cat .claude/agents/yaml/[agent-name].yaml
```

---

Remember: Agents are here to make your work faster, safer, and more reliable. Use them liberally!