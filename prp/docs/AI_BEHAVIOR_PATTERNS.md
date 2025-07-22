# 🤖 AI Behavior Patterns Documentation

*Last Updated: 2025-07-18*  
*Purpose: Document observed AI coding assistant behaviors and how to work with them effectively*

## 📊 **OBSERVED PATTERNS**

### 1. **Context Window Management**

**Pattern**: AI performance degrades as context fills up
- **Symptoms**: Forgetting earlier instructions, inconsistent patterns
- **Solution**: Use `/clear` between major tasks
- **Best Practice**: Keep PRPs focused on single features

### 2. **Instruction Following Hierarchy**

**Pattern**: AI prioritizes recent instructions over older ones
- **Observation**: Last instruction often overrides previous guidance
- **Solution**: Put critical rules in CLAUDE.md (persistent context)
- **Best Practice**: Repeat important constraints in PRPs

### 3. **Code Generation Tendencies**

**Pattern**: AI tends to over-engineer when not constrained
- **Default Behavior**: Creates abstractions, interfaces, complex patterns
- **Solution**: Explicitly state "keep it simple" in instructions
- **Best Practice**: Provide examples of desired simplicity

### 4. **Error Handling Gaps**

**Pattern**: AI often omits comprehensive error handling
- **Common Misses**: Network errors, edge cases, null checks
- **Solution**: Explicitly require error handling in PRPs
- **Best Practice**: Include error handling in validation criteria

## 🎯 **EFFECTIVE PROMPTING STRATEGIES**

### 1. **Explicit Over Implicit**
```markdown
❌ "Add validation"
✅ "Add validation that checks:
   - Required fields are not empty
   - Email format is valid
   - Phone number is 10 digits
   - Show specific error messages for each validation"
```

### 2. **Positive Instructions**
```markdown
❌ "Don't use any abstractions"
✅ "Use direct, simple implementations without abstractions"
```

### 3. **Structured Requirements**
```markdown
✅ Break down complex tasks:
   1. First, create the model
   2. Then, implement the service
   3. Next, build the component
   4. Finally, add routing
```

## 🔍 **COMMON AI MISCONCEPTIONS**

### 1. **File System Operations**
- **Misconception**: AI thinks it needs permission for every file operation
- **Reality**: It has full file system access in development
- **Guidance**: "You have full access to create, edit, and delete files"

### 2. **Database Operations**
- **Misconception**: AI may try to create SQL schemas for Firestore
- **Reality**: Firestore is schemaless
- **Guidance**: "Firestore collections are created on first write"

### 3. **Import Paths**
- **Misconception**: May use incorrect import paths
- **Reality**: TypeScript path aliases are configured
- **Guidance**: "Use @core, @shared, @features path aliases"

### 4. **Testing Assumptions**
- **Misconception**: May assume test infrastructure exists
- **Reality**: May need to set up testing framework
- **Guidance**: Specify exact testing requirements

## 🚨 **RISKY BEHAVIORS**

### 1. **File Deletion Tendency**
- **Risk**: May suggest deleting files to "clean up"
- **Mitigation**: Never approve file deletions without review
- **Rule**: Add to CLAUDE.md: "Never delete files without explicit permission"

### 2. **Configuration Changes**
- **Risk**: May modify critical configs (angular.json, tsconfig)
- **Mitigation**: Review all config changes carefully
- **Rule**: Specify which configs can/cannot be modified

### 3. **Package Installation**
- **Risk**: May suggest unnecessary dependencies
- **Mitigation**: Question every new package
- **Rule**: "Use existing packages when possible"

### 4. **Global State Modifications**
- **Risk**: May modify global styles or configurations
- **Mitigation**: Require component-scoped changes
- **Rule**: "Keep changes scoped to feature being built"

## 📈 **PERFORMANCE PATTERNS**

### 1. **Best Performance Scenarios**
- Clear, structured PRPs
- Fresh context (after /clear)
- Single-feature focus
- Explicit file structure

### 2. **Degraded Performance Scenarios**
- Long conversations (>50 messages)
- Multiple features in progress
- Vague requirements
- Conflicting instructions

### 3. **Optimal Context Size**
- **CLAUDE.md**: <1000 lines
- **PRPs**: 300-800 lines
- **Session context**: Clear every 20-30 operations

## 🔧 **WORKING WITH AI QUIRKS**

### 1. **The "Helpful" Tendency**
**Behavior**: AI wants to add extra features
```markdown
Mitigation: "Implement ONLY the features listed. Do not add any additional functionality."
```

### 2. **The "Apology" Pattern**
**Behavior**: AI apologizes and may not complete tasks
```markdown
Mitigation: "Complete all tasks. Show the implementation without apologies."
```

### 3. **The "Assumption" Problem**
**Behavior**: AI makes assumptions about your preferences
```markdown
Mitigation: "Ask for clarification if any requirement is unclear. Do not make assumptions."
```

### 4. **The "Partial Implementation"**
**Behavior**: AI shows snippets instead of complete code
```markdown
Mitigation: "Provide complete, working implementations for all files."
```

## 📋 **VALIDATION STRATEGIES**

### 1. **Code Review Focus Areas**
- Import statements (correct paths?)
- Error handling (comprehensive?)
- Type safety (no 'any' types?)
- Theme compliance (hardcoded colors?)
- Production readiness (loading states?)

### 2. **Common AI Errors to Check**
- Missing error boundaries
- Incomplete type definitions
- Hardcoded values that should be configurable
- Missing loading/empty states
- Incorrect service inheritance

### 3. **Testing AI Output**
```bash
# Quick validation sequence
npm run lint        # Syntax and style
npm run build       # Compilation check
npm test           # If tests exist
deploy             # Real environment test
```

## 🎨 **PROMPT TEMPLATES FOR COMMON TASKS**

### Feature Implementation
```markdown
Build [feature name] following these requirements:
1. Use existing patterns from [reference]
2. Extend BaseFirestoreService for data
3. Include loading, error, and empty states
4. Follow theme system (no hardcoded colors)
5. Make responsive for mobile/tablet/desktop
6. Include proper TypeScript types
7. Add error handling for all operations
```

### Bug Fixing
```markdown
Fix [issue description]:
- Current behavior: [what happens]
- Expected behavior: [what should happen]
- Reproduce steps: [how to see the issue]
- Constraints: [what not to change]
- Test criteria: [how to verify fix]
```

### Performance Optimization
```markdown
Optimize [component/feature] for performance:
- Current issues: [specific problems]
- Measure using: [metrics]
- Acceptable threshold: [target]
- Maintain functionality: [what must not break]
- Consider: lazy loading, memoization, virtual scrolling
```

## 💡 **KEY INSIGHTS**

1. **AI works best with structure** - PRPs and templates dramatically improve output
2. **Explicit beats implicit** - Never assume AI understands context
3. **Validation is critical** - AI output always needs human review
4. **Context degradation is real** - Fresh starts often produce better results
5. **Production thinking must be taught** - AI doesn't inherently understand deployment

## 🚀 **MAXIMIZING AI EFFECTIVENESS**

### Do's:
- ✅ Provide comprehensive context upfront
- ✅ Use structured templates and PRPs
- ✅ Validate every output
- ✅ Clear context regularly
- ✅ Be explicit about requirements

### Don'ts:
- ❌ Assume AI understands your system
- ❌ Accept output without review
- ❌ Let context get too large
- ❌ Use vague instructions
- ❌ Skip validation steps

---

*This document is based on observed patterns and should be updated as new behaviors are discovered.*