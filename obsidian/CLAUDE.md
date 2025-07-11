# Claude Context for FibreFlow Obsidian Knowledge Base

## Purpose

This Obsidian vault serves as the **strategic knowledge layer** for FibreFlow, focusing on business intelligence, management insights, and high-level architecture. It complements but does not replace the technical documentation in `/docs`.

## Key Principles

### 1. Business-First Language
- Write for non-technical stakeholders
- Focus on value and outcomes, not implementation
- Use diagrams and visuals extensively
- Explain the "why" before the "what"

### 2. Living Documentation
- Update documents as decisions are made
- Track changes in Decision Log
- Keep Current State accurate
- Review and refine regularly

### 3. AI-Optimized Structure
- Use consistent formatting for AI parsing
- Include metadata and tags
- Create semantic connections via wikilinks
- Structure data for easy extraction

## Folder Structure

```
obsidian/
├── 🎯 Vision/          # Strategic direction and goals
├── 🏗️ Architecture/   # System design and data flow
├── 📊 Management/      # Operations and decisions
├── 🚀 Features/        # Current and planned features
└── 📈 Business/        # Market and customer insights
```

## Document Guidelines

### When Creating Documents
1. **Start with why** - Business purpose first
2. **Use Mermaid diagrams** - Visual > text
3. **Link liberally** - Connect related concepts
4. **Include metrics** - How do we measure success?
5. **Add examples** - Real-world scenarios

### Document Template
```markdown
# Document Title

## Overview
Brief description of what this covers and why it matters.

## Business Context
How this relates to company goals and user needs.

## Current State
What exists today.

## Future Vision
Where we're heading.

## Success Metrics
How we measure progress.

## Related Documents
- [[Link 1]]
- [[Link 2]]
```

## AI Assistant Instructions

When working with this knowledge base:

### For Updates
- Check [[Tasks]] for current priorities
- Update [[Current State]] when features ship
- Add decisions to [[Decision Log]]
- Keep [[Roadmap]] aligned with reality

### For Analysis
- Use documents to answer strategic questions
- Extract insights across documents
- Identify patterns and trends
- Suggest connections between concepts

### For Planning
- Reference [[Project Goals]] for alignment
- Consider [[AI Strategy]] for intelligence features
- Check [[Integration Points]] for dependencies
- Review [[Development Philosophy]] for approach

## Management Context

### Key Stakeholders
- **Lew Hofmeyer** (MD) - Strategic vision
- **Hein** - Operational requirements
- **Development Team** - Technical implementation
- **Field Teams** - End users

### Business Priorities
1. Accelerate deployment speed
2. Improve cost control
3. Enable data-driven decisions
4. Enhance team coordination

### Success Metrics
- 30% faster project completion
- 95% budget accuracy
- 90% data-backed decisions
- 50% reduction in coordination overhead

## Integration with Development

### Connecting to Technical Docs
- Reference `/docs` for implementation details
- Link to specific files when needed
- Keep separation of concerns
- Business strategy here, code there

### Workflow
1. Business need identified → Document in Obsidian
2. Technical approach planned → Create PRP
3. Implementation complete → Update Current State
4. Lessons learned → Add to Decision Log

## Maintenance Guidelines

### Weekly Reviews
- [ ] Update task priorities
- [ ] Review Current State accuracy
- [ ] Check for outdated information
- [ ] Add new insights from meetings

### Monthly Reviews
- [ ] Align Roadmap with business
- [ ] Update success metrics
- [ ] Review AI opportunities
- [ ] Plan next features

## Quick Reference

### Most Important Documents
1. [[System Overview]] - What FibreFlow is
2. [[Project Goals]] - What we're trying to achieve
3. [[Current State]] - What's built and working
4. [[AI Strategy]] - How we'll use intelligence
5. [[Tasks]] - What needs to be done

### For Specific Needs
- **Planning a feature?** → Check [[Roadmap]] and [[Use Cases]]
- **Making a decision?** → Review [[Decision Log]] and [[Project Goals]]
- **Understanding data?** → See [[Data Flow]] and [[Integration Points]]
- **Improving processes?** → Read [[Development Philosophy]]

## Notes for Claude/AI

When processing these documents:
- Prioritize business value in responses
- Connect technical capabilities to business outcomes
- Suggest practical next steps
- Identify gaps in documentation
- Highlight risks and opportunities

Remember: This knowledge base is about **strategic thinking**, not tactical implementation. Keep discussions at the appropriate level for management and stakeholder consumption.

---

*This context file helps AI assistants understand the purpose and structure of the FibreFlow Obsidian knowledge base.*