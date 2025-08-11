# LLM Context Window Research & Integration Plan

## Research Summary: High-Context LLMs (January 2025)

### Gemini API / LLM Token Limits

- **Google Gemini API**: Most current Gemini models, including Gemini 2.5 Pro and Gemini 2.5 Flash, offer a **context window of up to 1,048,576 tokens (about 1 million tokens)** per session or prompt. Some specialized Gemini configurations (for example, Gemini 1.5 Pro) may go up to 2,097,152 tokens (2 million) in certain enterprise tiers.
- **Code Assist / Vertex AI**: Gemini Code Assist can also support up to a 1,000,000 token context window.
- **Where to get it?** You can access these models via the Google AI Developer API, Google Cloud Vertex AI, or Gemini for Google Cloud.

### Other LLMs With Similar or Larger Context Windows (January 2025)

| Model                          | Context Window Size        | Notes                                                         |
|---------------------------------|---------------------------|---------------------------------------------------------------|
| **Magic.dev LTM-2-Mini**        | 100 million tokens        | Largest context window available in 2025.                  |
| **Meta Llama 4 Scout**          | 10 million tokens         | Multimodal, on-device, top benchmark scores.           |
| **Gemini 2.5 Pro, Flash**       | 1 million tokens          | API and cloud; exposed via Google AI.           |
| **OpenAI GPT-4.1, o3, o4**      | 1 million tokens          | API-only, advanced coding and language.                    |
| **Meta Llama 4 Maverick**       | 1 million tokens          | Advanced context, multimodal.                              |
| **Anthropic Claude 4 Opus/Sonnet**| 200,000 tokens            | Cost-efficient, robust reasoning.                          |
| **Mistral Large 2**             | 128,000 tokens            | Multilingual, competitive with Llama 3.1.              |
| **DeepSeek R models**           | 128,000 tokens            | High performance, open access.                             |

### Recommendations for FibreFlow

1. **For maximum context**: Magic.dev LTM-2-Mini (if accessible) is the current leader, followed by Meta Llama 4 Scout.
2. **For practical API access**: Gemini 2.5 Pro or OpenAI GPT-4.1 offer broad API access at the 1M token tier.
3. **Cost-effective option**: Anthropic Claude 4 with 200K tokens may be sufficient for most codebase analysis.

## Integration Plan: Context Management Agent for Claude Code

### Problem Statement
Claude Code has limited context window, making it challenging to maintain project direction, remember past decisions, and understand the full codebase architecture. We need a complementary high-context LLM agent that can:
- Maintain full codebase understanding
- Track project evolution and decisions
- Provide strategic guidance to Claude Code
- Act as a "memory layer" for complex projects

### Proposed Architecture

```
┌─────────────────────┐     ┌──────────────────────┐     ┌─────────────────┐
│   Developer (You)   │────▶│    Claude Code       │────▶│   FibreFlow     │
└─────────────────────┘     │  (Limited Context)   │     │   Codebase      │
           │                └──────────────────────┘     └─────────────────┘
           │                           ▲                           ▲
           │                           │                           │
           ▼                           │                           │
┌─────────────────────┐                │                           │
│  Context Manager    │                │                           │
│  (High-Context LLM) │◀───────────────┴───────────────────────────┘
│  - Gemini 2.5 Pro   │
│  - Full codebase    │
│  - Project history  │
└─────────────────────┘
```

### Key Benefits

1. **Strategic Oversight**: The high-context agent maintains understanding of the entire project
2. **Decision Memory**: Tracks why certain architectural decisions were made
3. **Code Consistency**: Ensures new features align with existing patterns
4. **Documentation Sync**: Keeps CLAUDE.md and other docs in sync with actual implementation
5. **Continuation Support**: Helps Claude Code continue complex tasks across sessions

### Implementation Strategy

#### Phase 1: Basic Integration (Week 1)
- Set up Gemini API access
- Create codebase indexing system
- Build basic query interface

#### Phase 2: Context Management (Week 2)
- Implement project history tracking
- Create decision log system
- Build context summarization

#### Phase 3: Claude Code Integration (Week 3)
- Create workflow for Claude Code ↔ Context Manager communication
- Build prompt enhancement system
- Implement validation checks

#### Phase 4: Advanced Features (Week 4)
- Add code pattern recognition
- Implement architectural consistency checks
- Create automated documentation updates

### Practical Workflow Integration

1. **Before Starting Work**:
   ```
   Developer → Context Manager: "What should I know about the BOQ module?"
   Context Manager → Developer: Full context, recent changes, known issues
   Developer → Claude Code: Start coding with enhanced context
   ```

2. **During Development**:
   ```
   Claude Code → Context Manager: "Validate this approach"
   Context Manager → Claude Code: "This conflicts with pattern X, suggest Y"
   ```

3. **After Changes**:
   ```
   Developer → Context Manager: "Update project state"
   Context Manager: Updates documentation, tracks decisions
   ```

### Tool Selection

For FibreFlow, I recommend:

1. **Primary Choice: Google Gemini 2.5 Pro**
   - 1M token context (enough for full codebase)
   - Good API availability
   - Reasonable pricing
   - Strong code understanding

2. **Alternative: Meta Llama 4 (when available)**
   - 10M tokens for future growth
   - Can be self-hosted
   - Open source advantage

3. **Budget Option: Claude 4 Opus**
   - 200K tokens may be sufficient
   - You're already familiar with Claude
   - Good integration potential

### Next Steps

1. Choose LLM provider
2. Set up API access
3. Create initial indexing script
4. Build basic query interface
5. Test with FibreFlow codebase
6. Iterate based on effectiveness

This integration would significantly enhance your development workflow by providing Claude Code with strategic oversight and comprehensive project understanding.