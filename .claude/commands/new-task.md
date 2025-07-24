# New Task Command - Streamlined Implementation

Initiates a streamlined workflow for smaller tasks and quick implementations.

## Usage
```
/new_task [task-description]
```

## What This Command Does

Activates a **simplified PLANIR workflow** optimized for speed and efficiency.

### Phase 1: QUICK PLANNING (5-10 minutes)

#### 1. Understand & Clarify
- "I'm ready to help with your task. Let me understand what you need:"
- Quick clarifying questions (max 3-4):
  - What exactly needs to be done?
  - Any specific requirements or constraints?
  - Expected outcome?

#### 2. Simple Analysis
- Consider 1-2 implementation approaches
- Identify any obvious challenges
- Suggest best practice if applicable

#### 3. Create Task List
- Break task into 3-7 actionable steps
- Estimate effort (Simple/Medium/Complex)
- Identify any dependencies

### Phase 2: QUICK APPROVAL

#### 1. Present Plan
- Show task breakdown with steps
- Highlight any assumptions or decisions
- Ask: "Does this approach work for you?"

#### 2. Get Confirmation
- Wait for "yes", "approved", or "let's do it"
- Address any concerns quickly
- Adjust plan if needed

### Phase 3: IMPLEMENTATION WITH UPDATES

#### 1. Create Todo List
- Add all steps to TodoWrite tool
- Mark first task as "in_progress"

#### 2. Work with Progress Updates
- Complete one step at a time
- Brief status: "✅ Step X complete. Starting step Y..."
- Flag issues immediately: "⚠️ Issue: [description]. Solution: [approach]"

#### 3. Quick Validation
- Test each significant step
- Deploy if changes affect live system
- Mark todos complete as you go

## When to Use /new_task

✅ **Use for:**
- Bug fixes
- UI improvements  
- Single component changes
- Configuration updates
- Simple integrations
- Refactoring tasks
- Documentation updates

❌ **Don't use for:**
- New major features
- Database schema changes
- Complex business logic
- Cross-module integrations

## Example Interaction

```
User: /new_task Fix the dropdown issue in contractor form

Claude: I'll help you fix the dropdown issue. Let me understand:

1. Which specific dropdown is problematic?
2. What exactly is the issue? (won't open, won't close, wrong values?)
3. Is this affecting all users or specific scenarios?

User: The services dropdown stays open after selection in the contractor form

Claude: Got it! Here's my approach:

**Task Breakdown:**
1. Locate contractor form component
2. Identify multi-select dropdown behavior  
3. Check for Angular Material multi-select pattern
4. Implement proper close behavior
5. Test the fix
6. Deploy and verify

This should take about 15-30 minutes. Does this approach work?

User: yes

Claude: ✅ Task approved! Starting implementation...

📍 Step 1/6: Locating contractor form component
Found: src/app/features/contractors/components/contractor-form/contractor-form.component.ts

📍 Step 2/6: Analyzing dropdown behavior
Issue identified: mat-select with multiple attribute keeps dropdown open by design

📍 Step 3/6: Implementing solution
Adding Done button inside dropdown panel...

[Continued with each step...]

✅ All steps complete! Dropdown now closes properly after selection.
```

## Task Complexity Guidelines

### Simple Tasks (5-15 minutes)
- UI text changes
- CSS adjustments
- Single property updates
- Import additions

### Medium Tasks (15-45 minutes)
- Component behavior fixes
- Form validation updates
- Service method additions
- Route configurations

### Complex Tasks (45+ minutes)
- Multiple component changes
- New service integrations
- Data flow modifications
- Performance optimizations

**Note:** If task seems complex during analysis, suggest switching to `/new_plan` for better planning.

## Best Practices

1. **Keep it simple** - if it needs more than 7 steps, use `/new_plan`
2. **Validate quickly** - use antiHall for any code patterns
3. **Test immediately** - deploy small changes for quick feedback
4. **Document briefly** - add key learnings to CLAUDE.md if valuable
5. **Stay focused** - complete the specific task, avoid feature creep

<arguments>
task-description: Brief description of the task to complete (helps with context)
</arguments>