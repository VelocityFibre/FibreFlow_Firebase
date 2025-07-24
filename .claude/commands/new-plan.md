# New Plan Command - PLANIR Workflow

Initiates the comprehensive PLANIR workflow for complex features or significant changes.

## Usage
```
/new_plan [feature-name]
```

## What This Command Does

Activates the **PLANIR Method**: **P**lan → **L**isten → **A**nalyze → **N**otate → **I**mplement → **R**eview

### Phase 1: PLANNING & REFINEMENT

#### 1. Listen & Understand
- "I'm ready to help you plan a new feature. What would you like to build?"
- Ask clarifying questions:
  - What is the main purpose/goal?
  - Who will use this feature?
  - What are the key requirements?
  - Any constraints or limitations?
  - Success criteria?

#### 2. Brainstorm & Analyze
- Consider multiple implementation approaches
- Identify potential technical challenges
- Review existing similar features for patterns
- Suggest best practices and standards
- Estimate complexity and timeline

#### 3. Advise & Refine
- Present 2-3 options with pros/cons
- Recommend optimal approach based on:
  - Simplicity principles
  - Existing patterns
  - Maintenance considerations
  - Performance implications
- Get user feedback and iterate

#### 4. Clarify & Confirm
- Ensure mutual understanding of scope
- Confirm deliverables and timeline
- Address any remaining concerns
- Define success criteria clearly

#### 5. Summarize & Document
- Create comprehensive plan document
- Include architectural decisions
- Define implementation phases
- Set checkpoints and milestones

### Phase 2: PLAN APPROVAL & STORAGE

#### 1. Seek Approval
- Present final plan summary
- Highlight key decisions and rationale
- Wait for explicit "approved" or "let's proceed"
- **DO NOT** start implementation without approval

#### 2. Save Approved Plan
- Create plan document at: `/docs/plans/approved/`
- Use naming: `FEATURE_PLAN_APPROVED_YYYY-MM-DD.md`
- Include:
  - Executive summary
  - Technical approach
  - Implementation phases
  - Success criteria
  - Timeline and milestones

#### 3. Create Implementation Checklist
- Extract actionable items from plan
- Add to TodoWrite tool with priorities
- Set dependencies between tasks
- Estimate effort for each item

### Phase 3: IMPLEMENTATION WITH FEEDBACK

#### 1. Work from Plan
- Follow approved plan strictly
- Mark todos as "in_progress" when starting
- Complete one phase at a time
- Deploy and test at each checkpoint

#### 2. Checkpoint Feedback
Format: "✅ Completed: [phase/step]. Next: [next step]"
- After each major milestone
- If issues arise: "⚠️ Issue with [step]: [description]. Suggested solution: [solution]"
- Wait for user acknowledgment before major changes
- Document any plan deviations

#### 3. Progress Tracking
- Update todos to "completed" immediately
- Provide percentage complete updates
- Flag deviations from original plan
- Archive completed plan to `/docs/plans/completed/`

## When to Use /new_plan

✅ **Use for:**
- New major features (5+ components)
- Architectural changes
- Cross-module integrations
- Complex business logic
- Database schema changes
- API integrations

❌ **Don't use for:**
- Simple bug fixes
- UI tweaks
- Single component changes
- Configuration updates

## Example Interaction

```
User: /new_plan reporting-system

Claude: I'm ready to help you plan a new reporting system. Let me understand your requirements:

1. What types of reports do you need?
2. Who will be using these reports?
3. What data sources should be included?
4. Any specific formats or export requirements?
5. Performance considerations?

[User provides answers]

Claude: Based on your requirements, I see three approaches:

**Option A: Simple Template System**
- Pros: Quick to implement, easy to maintain
- Cons: Limited flexibility
- Timeline: 1-2 weeks

**Option B: Dynamic Report Builder**
- Pros: Very flexible, user-configurable
- Cons: Complex, longer development
- Timeline: 4-6 weeks

**Option C: Hybrid Approach**
- Pros: Balanced flexibility and simplicity
- Cons: Some complexity
- Timeline: 2-3 weeks

I recommend Option C because...

[Discussion continues until plan is finalized]

Claude: Here's the final plan:
[Comprehensive plan document]

Does this look good to proceed? Please confirm with "approved" to continue.

User: approved

Claude: ✅ Plan saved to /docs/plans/approved/REPORTING_SYSTEM_PLAN_APPROVED_2025-07-24.md

Creating implementation checklist:
- [ ] Phase 1: Foundation (Week 1)
- [ ] Phase 2: Core Reports (Week 2)  
- [ ] Phase 3: Export & UI (Week 3)

📍 Starting Phase 1: Foundation
Creating base report service...
```

## Best Practices

1. **Always validate with antiHall** before suggesting code patterns
2. **Follow simplicity principles** - start simple, add complexity gradually
3. **Deploy frequently** - test each phase on live system
4. **Document decisions** - explain why choices were made
5. **Stay flexible** - adapt plan based on discoveries during implementation

<arguments>
feature-name: Optional name of the feature to plan (helps with context)
</arguments>