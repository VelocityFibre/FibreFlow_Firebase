# FibreFlow Agent Responsibility Matrix

## Overview
This matrix defines clear boundaries and responsibilities for each specialized agent in the FibreFlow system. Each agent has specific domains they own, areas they explicitly don't handle, and agents they delegate to for related work.

---

## 1. FibreFlow Architect Agent

### Owns:
- System-wide architecture decisions
- Database schema design and modifications
- API design and integration patterns
- Performance optimization strategies
- Technology stack decisions
- Cross-feature integration design
- System scalability planning
- Code architecture standards

### NOT Responsible For:
- Feature-specific implementation details
- UI/UX design decisions
- Business logic implementation
- Security implementation (design only)
- Testing implementation
- Deployment processes
- Agent-specific features (BOQ, RFQ, Pole Tracker)

### Delegates To:
- **Security Agent**: For security architecture validation
- **Angular Frontend Specialist**: For frontend architecture patterns
- **Firebase Backend Expert**: For backend implementation details
- **Testing & Deployment Expert**: For CI/CD architecture

---

## 2. Angular Frontend Specialist Agent

### Owns:
- Angular component architecture
- Frontend state management (Signals, RxJS)
- Theme system implementation
- Component library development
- Frontend performance optimization
- Angular routing and navigation
- Frontend form validation
- Material Design implementation

### NOT Responsible For:
- Backend logic or Firebase operations
- Database queries or schema
- Business logic decisions
- Security implementation beyond frontend
- API endpoint design
- Agent-specific business features
- Deployment processes

### Delegates To:
- **FibreFlow Architect**: For overall frontend architecture
- **Firebase Backend Expert**: For API integration needs
- **Feature Agents (BOQ/RFQ/Pole)**: For feature-specific UI requirements
- **Testing Expert**: For frontend testing strategies

---

## 3. Firebase Backend Expert Agent

### Owns:
- Firestore database operations
- Firebase Functions implementation
- Firebase Authentication setup
- Firebase Storage management
- Real-time data synchronization
- Backend API implementation
- Cloud Function optimization
- Firebase security rules

### NOT Responsible For:
- Frontend implementation
- UI/UX decisions
- Business logic design (implements only)
- System architecture decisions
- Feature-specific workflows
- Testing strategies
- Deployment pipelines

### Delegates To:
- **FibreFlow Architect**: For database schema approval
- **Security Agent**: For security rules validation
- **Feature Agents**: For feature-specific backend needs
- **Data Integrity Guardian**: For data validation rules

---

## 4. BOQ & RFQ Specialist Agent

### Owns:
- Bill of Quantities (BOQ) feature implementation
- Request for Quote (RFQ) workflows
- Supplier management features
- Material and stock integration for BOQ/RFQ
- Quote generation and management
- BOQ templates and importing
- RFQ email workflows
- Pricing calculations and formulas

### NOT Responsible For:
- Core system architecture
- Authentication/authorization implementation
- Non-BOQ/RFQ features
- Pole tracking features
- General frontend/backend patterns
- Deployment or testing infrastructure
- Security beyond BOQ/RFQ data

### Delegates To:
- **Firebase Backend Expert**: For BOQ/RFQ data operations
- **Angular Frontend Specialist**: For UI component needs
- **Data Integrity Guardian**: For BOQ data validation
- **Security Agent**: For BOQ/RFQ access control

---

## 5. Pole Tracker Specialist Agent

### Owns:
- Pole installation tracking features
- Drop management (1-12 per pole)
- Mobile pole tracking features
- GPS and mapping integration
- Pole photo capture workflows
- Field worker mobile features
- Pole import/export processes
- Pole-drop relationship management

### NOT Responsible For:
- BOQ/RFQ features
- General system architecture
- Authentication systems
- Non-pole-related features
- Core Firebase setup
- Theme or styling decisions
- Testing infrastructure

### Delegates To:
- **OneMap Data Agent**: For pole data imports
- **Data Integrity Guardian**: For pole-drop validation
- **Firebase Backend Expert**: For pole data operations
- **Angular Frontend Specialist**: For mobile UI needs

---

## 6. Security Agent

### Owns:
- Authentication strategy and implementation
- Authorization and role-based access
- Security audit and compliance
- Data encryption strategies
- API security measures
- Vulnerability assessment
- Security best practices enforcement
- Firebase security rules review

### NOT Responsible For:
- Feature implementation
- UI/UX design
- Business logic
- Performance optimization (unless security-related)
- Testing (except security testing)
- Deployment (except security configurations)

### Delegates To:
- **Firebase Backend Expert**: For security rules implementation
- **FibreFlow Architect**: For security architecture integration
- **Testing Expert**: For security testing implementation
- **All Feature Agents**: For feature-specific security needs

---

## 7. Testing & Deployment Expert Agent

### Owns:
- Test strategy and implementation
- Unit, integration, and e2e testing
- CI/CD pipeline configuration
- Deployment processes and automation
- Performance testing
- Test coverage monitoring
- Deployment environments management
- Build optimization

### NOT Responsible For:
- Feature development
- Architecture decisions
- Security implementation
- Business logic
- UI/UX design
- Database schema design

### Delegates To:
- **Feature Agents**: For feature-specific test cases
- **Security Agent**: For security testing requirements
- **FibreFlow Architect**: For testing architecture
- **All Agents**: For component-specific tests

---

## 8. Data Integrity Guardian Agent

### Owns:
- Data validation rules enforcement
- Pole number uniqueness (global)
- Drop number uniqueness (global)
- Pole capacity rules (max 12 drops)
- Data migration integrity
- Import data validation
- Cross-collection data consistency
- Audit trail integrity

### NOT Responsible For:
- Feature implementation
- UI/UX design
- Authentication/authorization
- Performance optimization
- Deployment processes
- Business logic beyond data rules

### Delegates To:
- **Firebase Backend Expert**: For validation implementation
- **Feature Agents**: For feature-specific validation
- **OneMap Data Agent**: For import validation rules
- **FibreFlow Architect**: For data model validation

---

## 9. OneMap Data Agent

### Owns:
- VF OneMap data imports
- CSV data processing for poles/drops
- Data transformation and mapping
- Import status tracking
- Duplicate detection in imports
- Field mapping configuration
- Import error handling
- OneMap-specific workflows

### NOT Responsible For:
- Core pole tracking features
- System architecture
- UI beyond import interfaces
- Security implementation
- General data validation rules
- Non-OneMap data sources

### Delegates To:
- **Pole Tracker Specialist**: For pole data structure
- **Data Integrity Guardian**: For validation rules
- **Firebase Backend Expert**: For data operations
- **Angular Frontend Specialist**: For import UI

---

## 10. OneMap SQL Agent

### Owns:
- SQL database operations for OneMap data
- DuckDB and SQLite database management
- Complex analytical queries
- Performance optimization for large datasets
- Status change tracking queries
- Date progression analysis
- Cross-table joins and aggregations
- Data export to various formats

### NOT Responsible For:
- CSV import processes (use OneMap Data Agent)
- Firebase operations
- UI implementation
- Data validation rules
- Security implementation
- Real-time data synchronization
- Non-SQL data sources

### Delegates To:
- **OneMap Data Agent**: For CSV imports and initial processing
- **Data Integrity Guardian**: For validation before SQL operations
- **Firebase Backend Expert**: For syncing results to Firebase
- **Report Generator**: For formatted report creation

---

## 11. Agent Manager

### Owns:
- Agent coordination and orchestration
- Multi-agent task delegation
- Cross-agent communication
- Agent conflict resolution
- Complex task breakdown
- Agent performance monitoring
- Agent capability tracking

### NOT Responsible For:
- Direct implementation of any features
- Technical decisions
- Architecture choices
- Business logic
- Testing or deployment
- Security implementation

### Delegates To:
- **All Specialized Agents**: Based on task requirements
- **FibreFlow Architect**: For system-wide decisions
- **Security Agent**: For security concerns
- **Feature Agents**: For domain-specific work

---

## Decision Matrix

### When to Use Each Agent:

| Scenario | Primary Agent | Supporting Agents |
|----------|---------------|-------------------|
| New feature design | FibreFlow Architect | Feature Specialist, Frontend/Backend |
| BOQ implementation | BOQ & RFQ Specialist | Frontend, Backend, Data Guardian |
| Pole tracking feature | Pole Tracker Specialist | Frontend, Backend, OneMap |
| Security concern | Security Agent | Architect, Backend |
| Data validation issue | Data Integrity Guardian | Feature Agents, Backend |
| Import from OneMap | OneMap Data Agent | Pole Tracker, Data Guardian |
| UI component needed | Angular Frontend Specialist | Feature Agents |
| Database operation | Firebase Backend Expert | Architect, Data Guardian |
| Complex multi-domain task | Agent Manager | All relevant agents |
| Testing strategy | Testing & Deployment Expert | All agents for their domains |

---

## Boundary Rules

1. **No Overlap Rule**: If two agents could handle something, defer to the more specific agent
2. **Delegation Rule**: Agents must delegate outside their domain rather than attempt implementation
3. **Architect Override**: FibreFlow Architect has final say on system-wide patterns
4. **Security Veto**: Security Agent can veto any implementation on security grounds
5. **Data Integrity Veto**: Data Guardian can block any operation violating data rules
6. **Feature Ownership**: Feature agents own all business logic within their domain
7. **Manager Coordination**: Agent Manager handles all multi-agent tasks

---

## Quick Reference

### Feature Domains:
- **BOQ/RFQ**: BOQ & RFQ Specialist
- **Poles/Drops**: Pole Tracker Specialist
- **OneMap Imports**: OneMap Data Agent
- **All Others**: FibreFlow Architect (design) → Appropriate specialist (implementation)

### Technical Domains:
- **Frontend**: Angular Frontend Specialist
- **Backend**: Firebase Backend Expert
- **Security**: Security Agent
- **Data Rules**: Data Integrity Guardian
- **Testing**: Testing & Deployment Expert

### Cross-Cutting:
- **Architecture**: FibreFlow Architect
- **Coordination**: Agent Manager

---

*Last Updated: 2025-01-29*