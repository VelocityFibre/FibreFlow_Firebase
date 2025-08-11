# Vertex AI as Context Manager for Claude Code

## Where Vertex AI Fits In

**Vertex AI** is Google Cloud's unified AI platform that provides:
- Access to all Gemini models (including 1M+ context versions)
- Custom model training and deployment
- Model orchestration and chaining
- Scalable infrastructure
- Integration with Google Cloud services

### Key Advantages for Context Management
1. **Full Gemini Access**: Use Gemini 2.5 Pro with 1M tokens
2. **Custom Endpoints**: Build specific context APIs for FibreFlow
3. **Caching**: Store processed codebase context for reuse
4. **Fine-tuning**: Train on FibreFlow patterns and conventions
5. **Cost Control**: Pay-per-use with detailed monitoring

## Revised Architecture: Context Manager Above Claude Code

```
┌────────────────────────────────────────────────────────────┐
│                        YOU (Developer)                      │
│                "I need to implement invoice management"     │
└────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌────────────────────────────────────────────────────────────┐
│              VERTEX AI CONTEXT MANAGER                      │
│                 (Gemini 2.5 Pro - 1M tokens)               │
│                                                            │
│  • Analyzes entire FibreFlow codebase                     │
│  • Understands project history & decisions                │
│  • Knows all patterns, services, components               │
│  • Tracks what Claude Code has been told                  │
│  • Generates enhanced prompts with full context           │
└────────────────────────────────────────────────────────────┘
                                │
                                ▼
                    ┌─────────────────────┐
                    │   ENHANCED PROMPT    │
                    │  "Implement invoice  │
                    │  management using:   │
                    │  - BOQ pattern       │
                    │  - Existing services │
                    │  - Theme system      │
                    │  - Avoid X,Y,Z..."  │
                    └─────────────────────┘
                                │
                                ▼
┌────────────────────────────────────────────────────────────┐
│                      CLAUDE CODE                           │
│                    (Limited Context)                       │
│                                                            │
│  • Receives pre-contextualized prompts                    │
│  • Focuses on implementation details                       │
│  • Doesn't need to rediscover patterns                    │
│  • Can work more efficiently                              │
└────────────────────────────────────────────────────────────┘
                                │
                                ▼
                        ┌──────────────┐
                        │   YOUR CODE   │
                        └──────────────┘
```

## Implementation with Vertex AI

### Step 1: Set Up Vertex AI Project
```bash
# Install Google Cloud SDK
curl https://sdk.cloud.google.com | bash

# Initialize and set project
gcloud init
gcloud config set project fibreflow-73daf

# Enable Vertex AI
gcloud services enable aiplatform.googleapis.com
```

### Step 2: Create Context Manager Service
```python
# langraph/agents/vertex-context-manager.py
from google.cloud import aiplatform
from vertexai.language_models import TextGenerationModel
import json

class FibreFlowContextManager:
    def __init__(self):
        aiplatform.init(project='fibreflow-73daf', location='us-central1')
        self.model = TextGenerationModel.from_pretrained("text-bison-32k")
        self.codebase_context = self.load_codebase_context()
        self.conversation_history = []
        
    def load_codebase_context(self):
        """Load and index entire FibreFlow codebase"""
        return {
            "services": self.scan_services(),
            "components": self.scan_components(),
            "patterns": self.extract_patterns(),
            "decisions": self.load_decision_log(),
            "claude_md": self.load_claude_md(),
            "known_issues": self.load_known_issues()
        }
    
    def enhance_prompt(self, user_request: str) -> str:
        """Transform user request into context-rich prompt for Claude Code"""
        
        # Analyze what user is asking for
        analysis = self.analyze_request(user_request)
        
        # Find relevant context
        relevant_context = self.find_relevant_context(analysis)
        
        # Build enhanced prompt
        enhanced_prompt = f"""
        Context for Claude Code:
        
        User wants to: {user_request}
        
        Relevant FibreFlow Information:
        - Similar implementations: {relevant_context['similar']}
        - Required patterns: {relevant_context['patterns']}
        - Services to use: {relevant_context['services']}
        - Avoid these mistakes: {relevant_context['pitfalls']}
        - Previous decisions: {relevant_context['decisions']}
        
        Specific instructions:
        {self.generate_specific_instructions(analysis, relevant_context)}
        
        Original request: {user_request}
        """
        
        return enhanced_prompt
```

### Step 3: Create CLI Interface
```python
# langraph/cli/context-enhance.py
#!/usr/bin/env python3
import sys
from vertex_context_manager import FibreFlowContextManager

def main():
    manager = FibreFlowContextManager()
    
    print("FibreFlow Context Manager")
    print("=" * 50)
    
    while True:
        # Get user input
        user_request = input("\nWhat do you want to build? > ")
        
        if user_request.lower() in ['exit', 'quit']:
            break
            
        # Enhance the prompt
        print("\nAnalyzing codebase context...")
        enhanced = manager.enhance_prompt(user_request)
        
        print("\n" + "="*50)
        print("ENHANCED PROMPT FOR CLAUDE CODE:")
        print("="*50)
        print(enhanced)
        print("="*50)
        
        # Option to copy to clipboard
        copy = input("\nCopy to clipboard? (y/n) > ")
        if copy.lower() == 'y':
            import pyperclip
            pyperclip.copy(enhanced)
            print("✓ Copied to clipboard!")

if __name__ == "__main__":
    main()
```

## Practical Workflow

### 1. Simple Request Flow
```
You: "Add email notifications to BOQ approvals"
                    ↓
Context Manager: 
- Scans BOQ implementation
- Finds email service patterns
- Checks notification conventions
- Reviews past email implementations
                    ↓
Enhanced Prompt to Claude:
"Add email notifications to BOQ approvals using:
- EmailLogService (not FirebaseEmailSimpleService)
- Existing email templates in /features/emails/templates
- Follow pattern from RFQ email implementation
- Use queued approach for reliability
- Include audit trail entry
- Test with existing BOQ #12345"
                    ↓
Claude Code: [Implements with full context]
```

### 2. Complex Architecture Planning
```
You: "Design multi-tenant support for FibreFlow"
                    ↓
Context Manager:
- Reviews all current tenant assumptions
- Identifies required changes across services
- Finds similar multi-tenant patterns
- Lists breaking changes
                    ↓
Enhanced Prompt includes:
- 47 services that need tenant isolation
- Current user/project relationships
- Firestore security rule implications
- Suggested phased migration approach
                    ↓
Claude Code: [Can focus on implementation, not discovery]
```

## Vertex AI Specific Features

### 1. Model Garden Access
```python
# Use different models for different tasks
class MultiModelContextManager:
    def __init__(self):
        # Use Gemini for code understanding
        self.code_model = TextGenerationModel.from_pretrained("gemini-pro")
        
        # Use PaLM for natural language
        self.nlp_model = TextGenerationModel.from_pretrained("text-bison")
        
        # Use Codey for code generation
        self.codegen_model = CodeGenerationModel.from_pretrained("code-bison")
```

### 2. Caching for Performance
```python
# Cache expensive operations
from google.cloud import memcache

class CachedContextManager:
    def __init__(self):
        self.cache = memcache.Client()
        
    def get_codebase_context(self):
        # Check cache first
        context = self.cache.get('fibreflow_context')
        if not context:
            context = self.scan_entire_codebase()  # Expensive
            self.cache.set('fibreflow_context', context, time=3600)
        return context
```

### 3. Fine-tuning on FibreFlow Patterns
```python
# Fine-tune model on your specific patterns
from google.cloud import aiplatform

def fine_tune_for_fibreflow():
    # Prepare training data from your codebase
    training_data = prepare_fibreflow_patterns()
    
    # Fine-tune model
    model = aiplatform.Model.upload(
        display_name="fibreflow-context-model",
        artifact_uri="gs://fibreflow-models/base",
    )
    
    model.fine_tune(
        training_data=training_data,
        epochs=10,
        learning_rate=0.001
    )
```

## Integration Options

### Option 1: CLI Workflow (Simplest)
```bash
# 1. Describe what you want
$ fibreflow-context "implement user permissions system"

# 2. Get enhanced prompt
[Enhanced prompt with full context]

# 3. Copy and paste to Claude Code
$ claude
> [Paste enhanced prompt]
```

### Option 2: Automated Pipeline
```bash
# Direct pipeline to Claude Code
$ fibreflow-context "implement user permissions" | claude --stdin
```

### Option 3: VS Code Extension
```typescript
// Intercept prompts before sending to Claude Code
vscode.commands.registerCommand('fibreflow.enhancePrompt', async () => {
    const userInput = await vscode.window.showInputBox();
    const enhanced = await contextManager.enhance(userInput);
    
    // Send to Claude Code extension
    vscode.commands.executeCommand('claude.query', enhanced);
});
```

## Cost Optimization

### Vertex AI Pricing (Jan 2025)
- **Input**: $0.00025 per 1K tokens
- **Output**: $0.0005 per 1K tokens
- **Caching**: Reduces costs by 90% for repeated queries

### Cost Calculation Example
```
Daily Usage:
- 20 prompts enhanced
- Average 500K tokens input (codebase context)
- Average 2K tokens output (enhanced prompt)

Daily Cost:
- Input: 20 × 500 × $0.00025 = $2.50
- Output: 20 × 2 × $0.0005 = $0.02
- With caching: ~$0.25/day
- Monthly: ~$7.50
```

## Benefits of This Architecture

1. **Claude Code works better**: Receives perfect context every time
2. **No repeated explanations**: Context manager remembers everything
3. **Consistency**: All implementations follow established patterns
4. **Speed**: No time wasted rediscovering patterns
5. **Evolution tracking**: Decisions and changes are logged

## Quick Start Guide

### Today:
1. Set up Google Cloud account
2. Enable Vertex AI API
3. Create simple context scanner script

### This Week:
1. Build basic prompt enhancer
2. Index FibreFlow codebase
3. Test with real coding tasks

### This Month:
1. Refine context selection algorithm
2. Add caching layer
3. Create VS Code extension
4. Fine-tune model on FibreFlow patterns

## Conclusion

Using Vertex AI as a context manager ABOVE Claude Code solves the fundamental limitation of Claude's context window. Instead of trying to stuff everything into Claude Code, we:

1. **Pre-process** with unlimited context
2. **Distill** to relevant information
3. **Enhance** prompts with specific guidance
4. **Let Claude Code** focus on what it does best

This architecture is more efficient, cost-effective, and maintains perfect context across your entire development lifecycle.