# Setting Up Vertex AI Agents for FibreFlow

## 🤖 Understanding Agents vs Direct API

### Direct API (Current Implementation)
```python
model = GenerativeModel('gemini-1.5-pro')
response = model.generate_content("Analyze this code")
```
- Simple, stateless calls
- No memory between requests
- General purpose responses

### Agent-Based System (Recommended)
```python
agent = FibreFlowAssistant(role="architecture_expert")
response = agent.analyze("Should we use signals?")
```
- Stateful, remembers context
- Specialized expertise
- Consistent personality

## 🎯 FibreFlow Agent Architecture

### Core Agent Roles

#### 1. **The Architect** 🏗️
```python
class ArchitectAgent:
    """Makes architectural decisions and enforces patterns"""
    
    system_prompt = """
    You are the FibreFlow Chief Architect. You:
    - Enforce established patterns (BaseFirestoreService, signals, etc.)
    - Make architectural decisions based on past choices
    - Prevent architectural drift
    - Suggest simple solutions over complex ones
    
    Key principles:
    - Simplicity first (like antiHall - just JSON lookups)
    - Use what exists (Angular/Firebase features)
    - No unnecessary abstractions
    - Consistent patterns everywhere
    """
```

#### 2. **The Code Analyst** 🔍
```python
class CodeAnalystAgent:
    """Analyzes codebase for patterns, issues, and opportunities"""
    
    system_prompt = """
    You are the FibreFlow Code Analyst. You:
    - Find usage patterns across the codebase
    - Identify inconsistencies and violations
    - Suggest refactoring opportunities
    - Track technical debt
    
    You have indexed:
    - 11,915 files
    - 102 services
    - 195 components
    - All following specific patterns
    """
```

#### 3. **The Data Specialist** 📊
```python
class DataSpecialistAgent:
    """Specializes in OneMap, poles, and data analysis"""
    
    system_prompt = """
    You are the FibreFlow Data Specialist. You understand:
    - Pole/drop relationships (max 12 drops per pole)
    - OneMap data structure (159 columns)
    - Status workflows and transitions
    - Data integrity requirements
    
    You help with:
    - SQL query generation
    - Data migration planning
    - Analytics and reporting
    - Performance optimization
    """
```

#### 4. **The Performance Doctor** ⚡
```python
class PerformanceAgent:
    """Diagnoses and fixes performance issues"""
    
    system_prompt = """
    You are the FibreFlow Performance Doctor. You:
    - Analyze bundle sizes and load times
    - Optimize Firebase queries
    - Identify rendering bottlenecks
    - Suggest caching strategies
    
    Key metrics:
    - Initial load: <3 seconds
    - Route changes: <500ms
    - List rendering: 60fps
    - Bundle size: <500kb
    """
```

#### 5. **The Documentation Writer** 📝
```python
class DocumentationAgent:
    """Creates and maintains documentation"""
    
    system_prompt = """
    You are the FibreFlow Documentation Expert. You:
    - Write clear, concise documentation
    - Generate API references
    - Create user guides
    - Maintain README files
    
    Style guide:
    - Use examples liberally
    - Focus on 'why' not just 'how'
    - Include common pitfalls
    - Keep it scannable
    """
```

## 🛠️ Implementation Options

### Option 1: Simple Agent Wrapper (Quick Start)
```python
# agents/fibreflow_assistant.py
class FibreFlowAssistant:
    def __init__(self, role="general"):
        self.model = GenerativeModel('gemini-1.5-pro')
        self.role = role
        self.system_prompts = {
            "architect": ARCHITECT_PROMPT,
            "analyst": ANALYST_PROMPT,
            "data": DATA_PROMPT,
            "performance": PERFORMANCE_PROMPT,
            "docs": DOCS_PROMPT
        }
        
    def query(self, request):
        prompt = f"{self.system_prompts[self.role]}\n\nRequest: {request}"
        return self.model.generate_content(prompt)
```

### Option 2: Stateful Agent System (Recommended)
```python
# agents/stateful_agent.py
class StatefulAgent:
    def __init__(self, role, memory_path="memory/"):
        self.role = role
        self.memory = AgentMemory(memory_path)
        self.context = self.load_context()
        
    def remember(self, key, value):
        self.memory.store(key, value)
        
    def recall(self, key):
        return self.memory.retrieve(key)
        
    def query(self, request):
        # Include memory in context
        context = self.build_context_with_memory(request)
        return self.model.generate_content(context)
```

### Option 3: Multi-Agent Orchestration (Advanced)
```python
# agents/orchestrator.py
class AgentOrchestrator:
    def __init__(self):
        self.agents = {
            "architect": ArchitectAgent(),
            "analyst": CodeAnalystAgent(),
            "data": DataSpecialistAgent(),
            "performance": PerformanceAgent(),
            "docs": DocumentationAgent()
        }
        
    def route(self, request):
        # Analyze request to determine best agent
        router_prompt = f"Which agent should handle: {request}"
        routing = self.router_model.generate_content(router_prompt)
        
        selected_agent = self.agents[routing.agent]
        return selected_agent.query(request)
```

## 📋 Setting Up Your Agents

### Step 1: Create Agent Configurations
```bash
mkdir -p vertex/agents/configs
```

```yaml
# vertex/agents/configs/architect.yaml
agent:
  name: FibreFlow Architect
  model: gemini-1.5-pro
  temperature: 0.2  # Low for consistency
  max_tokens: 8192
  
knowledge:
  patterns:
    - BaseFirestoreService inheritance
    - Signals over BehaviorSubject
    - Theme functions (ff-rgb)
    - Standalone components
    
  decisions:
    - Simple solutions preferred
    - No unnecessary abstractions
    - Use existing Angular/Firebase features
    
  antipatterns:
    - NgModules
    - Direct DOM manipulation
    - Any types
    - Nested lazy routes
```

### Step 2: Initialize Agent System
```python
# scripts/init_agents.py
#!/usr/bin/env python3
"""Initialize FibreFlow agent system"""

import yaml
from pathlib import Path

def init_agents():
    # Load configurations
    config_dir = Path("agents/configs")
    
    for config_file in config_dir.glob("*.yaml"):
        with open(config_file) as f:
            config = yaml.safe_load(f)
            
        # Create agent instance
        agent_name = config['agent']['name']
        print(f"Initializing {agent_name}...")
        
        # Set up memory stores
        memory_path = f"memory/{agent_name.lower().replace(' ', '_')}"
        Path(memory_path).mkdir(parents=True, exist_ok=True)
        
    print("✅ Agent system initialized!")

if __name__ == "__main__":
    init_agents()
```

### Step 3: Create CLI Commands
```python
# cli/commands/agent_commands.py
def add_agent_commands(parser):
    # Ask architect
    architect_parser = parser.add_parser('ask-architect')
    architect_parser.add_argument('question')
    
    # Analyze with analyst
    analyst_parser = parser.add_parser('analyze-code')
    analyst_parser.add_argument('target')
    
    # Data analysis
    data_parser = parser.add_parser('analyze-data')
    data_parser.add_argument('query')
```

## 🎭 Agent Personalities and Styles

### The Architect (Strict but Fair)
```
"This violates our signals pattern. Here's why we chose signals 
over BehaviorSubject: [explains]. Please refactor to: [example]"
```

### The Analyst (Detail-Oriented)
```
"Found 23 instances of this pattern across 8 services. 
Most common in: BOQService (5), ProjectService (4). 
Recommendation: Extract to shared utility."
```

### The Data Specialist (Precise)
```
"Query analysis: This will scan 13,656 rows. 
With an index on status+date: 847 rows. 
Estimated 94% performance improvement."
```

### The Performance Doctor (Direct)
```
"Main thread blocked for 2.3s. Cause: Synchronous loop 
in PoleTrackerComponent:234. Fix: Use virtual scrolling. 
Expected improvement: 60fps restored."
```

### The Documentation Writer (Clear)
```
"# BOQ Module Overview
The BOQ (Bill of Quantities) module manages project materials...
[continues with clear, example-rich documentation]"
```

## 🔄 Practical Workflow

### Morning Standup with Agents
```bash
# Ask all agents for daily briefing
vertex standup

Architect: "3 pattern violations detected in yesterday's commits"
Analyst: "New circular dependency risk in SupplierService"
Performance: "PoleTracker list degraded 15% after recent changes"
Data: "OneMap import pending: 2,341 new records"
```

### Feature Development
```bash
# 1. Consult architect first
vertex ask-architect "Should invoices be a subcollection or separate?"

# 2. Get implementation context
vertex enhance "Add invoice management"

# 3. After implementation, analyze
vertex analyze-code "src/app/features/invoices"

# 4. Document
vertex document "Invoice module"
```

### Debugging Session
```bash
# 1. Describe issue to performance doctor
vertex diagnose "Project list takes 5 seconds to load"

# 2. Get specific analysis
vertex analyze-performance "src/app/features/projects/list"

# 3. Apply fixes and verify
vertex verify-fix "project-list-performance"
```

## 🎯 Getting Started

### Minimal Setup (Just System Prompts)
```python
# Start with just system prompts, no complex infrastructure
ARCHITECT_PROMPT = """You are the FibreFlow Architect..."""

model = GenerativeModel('gemini-1.5-pro')
response = model.generate_content(
    f"{ARCHITECT_PROMPT}\n\nQuestion: {user_question}"
)
```

### Next Level (Stateful Agents)
Add memory and context awareness for better responses.

### Advanced (Multi-Agent System)
Full orchestration with specialized agents working together.

## 📊 Expected Benefits

1. **Consistency**: Agents always enforce patterns
2. **Speed**: Instant answers to architecture questions
3. **Quality**: Catch issues before they become problems
4. **Knowledge**: Never lose architectural decisions
5. **Scalability**: Agents can handle multiple developers

---

*The key is to start simple - even just adding system prompts will dramatically improve Vertex AI's responses for FibreFlow-specific questions.*