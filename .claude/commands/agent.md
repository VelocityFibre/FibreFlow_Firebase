# Agent Command

List and invoke FibreFlow's specialized AI agents for different development tasks.

## Usage
```
/agent              # List all available agents
/agent [name]       # Invoke a specific agent
```

## Available Agents

### 1. FibreFlow Architect
System design, architecture decisions, database schema, integration strategies
```
/agent architect
```

### 2. Angular Frontend Specialist
Angular 20 components, Material Design, reactive forms, theme system
```
/agent angular
```

### 3. Firebase Backend Expert
Firestore, Cloud Functions, security rules, authentication, real-time sync
```
/agent firebase
```

### 4. Pole Tracker Specialist
Mobile/desktop pole tracking, GPS, Google Maps, photo management, field ops
```
/agent pole
```

### 5. Testing Deployment Expert
Testing strategies, QA, Firebase deployment, performance monitoring, CI/CD
```
/agent test
```

### 6. BOQ RFQ Specialist
Bill of Quantities, Request for Quote, supplier integrations, Excel import/export
```
/agent boq
```

### 7. Data Integrity Guardian
Business rules, data validation, audit trail, quality assurance
```
/agent integrity
```

### 8. Security Agent
Security guidance, Firebase rules, authentication patterns, API security
```
/agent security
```

### 9. OneMap Data Agent
CSV processing, cross-database sync, report generation, duplicate detection
```
/agent onemap
```

### 10. Agent Manager
Coordinates agents, selects right agent, creates new agents, multi-agent workflows
```
/agent manager
```

## Quick Examples

List all agents:
```
/agent
```

Invoke Angular specialist:
```
/agent angular
```

Invoke with full name:
```
/agent "Angular Frontend Specialist"
```

Multi-agent coordination:
```
/agent manager
Task: Build complete reporting module
```

## Shortcuts

- `architect` → FibreFlow Architect
- `angular` → Angular Frontend Specialist  
- `firebase` → Firebase Backend Expert
- `pole` → Pole Tracker Specialist
- `test` → Testing Deployment Expert
- `boq` → BOQ RFQ Specialist
- `integrity` → Data Integrity Guardian
- `security` → Security Agent
- `onemap` → OneMap Data Agent
- `manager` → Agent Manager