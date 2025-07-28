# FibreFlow AI Agents

This directory contains specialized AI agents for the FibreFlow fiber optic project management system. Each agent has specific expertise and can self-improve based on usage.

## Available Agents

### 🏗️ **FibreFlow Architect**
- System design and architecture decisions
- Database schema planning
- Integration strategies
- Performance optimization

### 🎨 **Angular Frontend Specialist**
- Angular 20 component development
- Material Design implementation
- Reactive forms and validation
- Theme system and styling

### 🔥 **Firebase Backend Expert**
- Firestore database operations
- Cloud Functions development
- Security rules and authentication
- Real-time sync and offline support

### 📍 **Pole Tracker Specialist**
- Mobile and desktop pole tracking
- GPS and Google Maps integration
- Photo management workflows
- Field operation optimization

### 🚀 **Testing & Deployment Expert**
- Testing strategies and QA
- Firebase deployment processes
- Performance monitoring
- CI/CD and production issues

### 📊 **BOQ & RFQ Specialist**
- Bill of Quantities management
- Request for Quote workflows
- Supplier integrations
- Excel import/export

### 🛡️ **Data Integrity Guardian**
- Business rule enforcement
- Data validation patterns
- Audit trail implementation
- Quality assurance

### 🎯 **Agent Manager**
- Coordinates other agents
- Helps select the right agent
- Creates and improves agents
- Multi-agent workflows

### 📊 **OneMap Data Agent**
- CSV processing and validation
- Cross-database synchronization
- Report generation
- Duplicate detection
- Agent payment verification

## How to Use

1. **In Claude Code**, use the `/agent` command to invoke a specific agent
2. **Describe your task** and let the Agent Manager recommend the right specialist
3. **Agents can update themselves** - tell them to remember patterns or fix issues

## Self-Improvement

All agents can:
- Read their own configuration files
- Update their system prompts with new knowledge
- Learn from repeated corrections
- Share patterns with other agents

## Creating New Agents

To create a new agent:
```bash
/agent create "Agent Name" --description "What this agent does"
```

Or ask the Agent Manager to help create a specialized agent for your needs.

## Agent Files

Each agent is defined in a markdown file with:
- **Name**: Agent identifier
- **Location**: Path to this file
- **Tools**: Available tools (usually "all tools")
- **Description**: When to use this agent
- **System Prompt**: Detailed expertise and instructions

## Best Practices

1. **Use the right agent** for each task
2. **Let agents improve** themselves when they make mistakes
3. **Coordinate agents** for complex features
4. **Keep agents focused** on their specialty

## Examples

```bash
# Ask for agent recommendation
"Which agent should implement a new reporting feature?"

# Direct agent invocation
/agent "Angular Frontend Specialist"

# Multi-agent workflow
"I need to add a supplier portal. Coordinate the necessary agents."

# Agent improvement
"Frontend agent, remember to always use signals instead of BehaviorSubject"
```

---

*These agents are continuously learning and improving based on the FibreFlow codebase and your feedback.*