# 🚀 PRP Framework Quick Start Guide

*Get started with production-ready development in 5 minutes*

## 📋 **WHAT IS PRP?**

**Product Requirement Prompt (PRP)** = PRD + Codebase Intelligence + Implementation Guide

It's a structured way to give AI coding assistants everything they need to build production-ready features on the first try.

## 🎯 **QUICK START STEPS**

### 1️⃣ **Choose Your Feature**
Decide what you want to build (e.g., "Invoice Management System")

### 2️⃣ **Research & Review** 🔍
**CRITICAL STEP - Don't skip this!**
```bash
# Review similar features in your codebase
grep -r "Service extends BaseFirestoreService" src/
find src/app/features -name "*.service.ts" | head -5

# Check latest documentation
- Angular docs for new features/patterns
- Firebase/Firestore best practices
- Material Design updates
- Review 2-3 similar apps/features in codebase
```

**What to look for:**
- **Patterns**: How do similar features handle CRUD?
- **Structure**: File organization and naming
- **Dependencies**: What services/components do they use?
- **Recent changes**: Any new patterns or deprecations?

### 3️⃣ **Copy the Template**
```bash
cp prp/templates/FEATURE_PRP_TEMPLATE.md prp/features/invoice-management-prp.md
```

### 4️⃣ **Fill Out Key Sections**
Minimum required sections:
- **Business Context**: Why build this?
- **Specifications**: What exactly to build?
- **Current State**: What exists now?
- **Similar Features**: Reference 2-3 similar implementations
- **Implementation Plan**: How to build it?

### 5️⃣ **Generate Implementation**
In Claude Code (or your AI assistant):
```
Please implement the Invoice Management System according to this PRP:
[paste your PRP content]

Follow these rules:
1. Create all files specified in the implementation plan
2. Follow existing patterns from similar features
3. Include error handling and loading states
4. Make it production-ready
5. Use the same patterns as [reference feature]
```

### 6️⃣ **Validate Output**
Run validation checklist:
```bash
./prp/validations/pre-deployment-checklist.sh
```

## 📝 **MINIMAL PRP EXAMPLE**

```markdown
# Invoice Management PRP

## Business Context
**Why**: Users need to create and track invoices for billing
**Impact**: Streamlines billing process, reduces errors
**Success**: 90% of invoices created without errors

## Research & References
**Similar Features Reviewed**:
- ProjectService - CRUD pattern with relationships
- BOQService - Document generation and export
- QuoteService - Email integration pattern

**Latest Best Practices**:
- Angular 18 signals for state management
- Firestore compound queries for filtering
- Material 16 standalone components

## Specifications
- Create, read, update, delete invoices
- Generate PDF invoices
- Track payment status
- Send email notifications

## Current State
- No invoice system exists
- Using manual Excel sheets
- Payment tracking is manual

## Implementation Plan
1. Create Invoice model and service (follow ProjectService pattern)
2. Build invoice list component (follow StaffListComponent structure)
3. Create invoice form component (follow BOQFormComponent validation)
4. Add PDF generation (use pattern from ReportService)
5. Integrate email notifications (follow QuoteService email pattern)

## Validation Criteria
- [ ] CRUD operations work
- [ ] PDF generation successful
- [ ] Email notifications sent
- [ ] All tests pass
- [ ] Follows existing patterns
```

## 🔍 **RESEARCH CHECKLIST**

Before creating any PRP, research:

### 1. **Internal Patterns**
```bash
# Find similar services
find src/app -name "*.service.ts" -exec grep -l "extends BaseFirestoreService" {} \;

# Find similar components
find src/app/features -name "*-list.component.ts"

# Check recent implementations
git log --oneline -20 src/app/features/
```

### 2. **External Updates**
- [ ] Angular latest version features
- [ ] Firebase/Firestore new capabilities
- [ ] Material Design updates
- [ ] Security best practices
- [ ] Performance optimizations

### 3. **Pattern Evolution**
Look for:
- Deprecated patterns to avoid
- New patterns being adopted
- Performance improvements
- Security updates

## 🔧 **TIPS FOR SUCCESS**

### Research First, Code Second
```markdown
"Reviewed ProjectService and StaffService for CRUD patterns.
Using the new signal-based state management from StaffService
instead of older BehaviorSubject pattern from ProjectService."
```

### Start Small
- First PRP: Single feature (not entire system)
- Get comfortable with the process
- Scale up complexity over time

### Be Specific
```markdown
❌ "Add validation"
✅ "Validate that invoice amount is positive number with max 2 decimal places, 
following the pattern in BOQFormComponent lines 145-160"
```

### Reference Examples
```markdown
"Follow the error handling pattern from TaskService.create() method"
"Use the same loading state management as MeetingListComponent"
```

### Include Anti-Patterns
```markdown
"Do NOT use the old Observable-based state (pre-Angular 17)"
"Do NOT create abstract base classes"
"AVOID the deprecated API endpoints"
```

## 🚨 **COMMON MISTAKES TO AVOID**

1. **No Research**: Building without reviewing existing patterns
2. **Outdated Patterns**: Using old code as reference
3. **Too Vague**: "Build an invoice system" → Be specific!
4. **Missing Context**: Always explain existing system state
5. **No Validation**: Always define success criteria
6. **Skipping Review**: Always read AI output before using

## 📚 **RESEARCH RESOURCES**

### Internal
- `src/app/features/` - Existing feature implementations
- `docs/COMPONENT_LIBRARY.md` - Verified patterns
- `git log` - Recent changes and patterns

### External
- [Angular.io/guide](https://angular.io/guide) - Latest Angular patterns
- [Firebase Docs](https://firebase.google.com/docs) - Current best practices
- [Material.angular.io](https://material.angular.io) - Component updates

## 📚 **NEXT STEPS**

1. **Read Full Guide**: `prp/docs/CONTEXT_ENGINEERING_GUIDE.md`
2. **Study Templates**: Browse `prp/templates/` folder
3. **Review Examples**: Check `prp/features/` for real PRPs
4. **Learn Patterns**: Read `prp/docs/AI_BEHAVIOR_PATTERNS.md`

## 🎉 **YOU'RE READY!**

Remember: 30 minutes of research saves 3 hours of debugging! Start with a simple feature and experience the power of structured context engineering. Your first production-ready feature is just a PRP away!

---

*Questions? Check the full documentation or iterate on your PRP based on results.*