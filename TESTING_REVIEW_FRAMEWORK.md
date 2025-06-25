# FibreFlow Testing & Review Framework 🧪

> **CORE PRINCIPLE**: "Everything should be made as simple as possible, but not simpler."
> This framework uses ONLY existing tools - no new dependencies.

## 1. Testing Strategy (Using Existing Tools)

### A. Unit Tests (Karma + Jasmine - Already Configured)
```bash
# Test single module
npm test -- --include='**/boq/**/*.spec.ts'

# Test with coverage
npm test -- --code-coverage

# Keep tests running
npm test -- --watch
```

**Module Test Structure**:
```
src/app/modules/boq/
├── services/
│   ├── boq.service.ts
│   └── boq.service.spec.ts      # Service tests
├── components/
│   ├── boq-list/
│   │   ├── boq-list.component.ts
│   │   └── boq-list.component.spec.ts  # Component tests
```

### B. Integration Tests (Still Using Karma)
Create integration specs that test module interactions:
```typescript
// src/app/tests/integration/boq-materials.integration.spec.ts
describe('BOQ-Materials Integration', () => {
  // Test BOQ + Materials working together
});
```

### C. antiHall Validation (MANDATORY - Automated by Claude)
**Claude automatically validates ALL code before suggesting**. No manual steps needed.

For manual checks:
```bash
# Update knowledge graph (run after major changes)
cd antiHall && npm run parse:improved

# Manual validation (rarely needed - Claude does this)
npm run check:local "this.boqService.calculateTotals()"
```

### D. Manual E2E Testing (No New Tools)
Document user flows for manual testing:
```markdown
## E2E Test: Create Project with BOQ
1. Login as admin
2. Create new project
3. Add BOQ items
4. Verify calculations
5. Check stock allocation
```

## 2. Code Review Checklist (Aligned with claude.md + antiHall)

### A. antiHall Validation (AUTOMATED)
Claude automatically checks:
- ✅ All service methods exist
- ✅ Component lifecycle hooks correct
- ✅ Angular/RxJS imports valid
- ✅ Firebase method calls accurate
- ✅ Documentation examples work

### B. Theme Compliance (Per theme.md)
- [ ] Uses CSS custom properties (`--ff-*` variables)
- [ ] Uses utility functions (`ff-spacing()`, `ff-font-size()`)
- [ ] Uses standard classes (`ff-page-container`, `ff-card`)
- [ ] No hardcoded colors, spacing, or fonts
- [ ] Follows typography scale (32px titles, 18px subtitles)

### C. Angular v20 Standards (Per claude.md)
- [ ] Standalone components (NO NgModules)
- [ ] Uses `inject()` pattern
- [ ] Proper signal usage for reactive state
- [ ] No circular dependencies (NG0200 prevention)
- [ ] Follows `app-*` component selector pattern

### D. TypeScript Standards (Per ESLint config)
- [ ] Zero `any` types
- [ ] Explicit return types
- [ ] No unused imports
- [ ] Unused params prefixed with `_`
- [ ] Uses branded types for IDs

### E. Simplicity Check (MOST IMPORTANT)
- [ ] Can it be simpler? (Start with dumbest solution)
- [ ] Uses existing Angular/Firebase features?
- [ ] No unnecessary abstractions?
- [ ] < 10 lines to explain = good

## 3. Automated Checks (Using Existing Setup)

### Pre-commit (Already Configured with Husky)
```json
// .lintstagedrc.json
{
  "*.ts": ["eslint --fix", "prettier --write"],
  "*.html": ["prettier --write"],
  "*.scss": ["prettier --write"]
}
```

### Review Commands (Add to package.json)
```json
{
  "scripts": {
    "review:theme": "grep -r 'color:\\|font-size:\\|margin:\\|padding:' src --include='*.scss' | grep -v 'var(--ff' || echo 'Theme check passed!'",
    "review:any": "grep -r ': any' src --include='*.ts' || echo 'No any types found!'",
    "review:modules": "find src/app/modules -name '*.module.ts' || echo 'No NgModules found (good!)'",
    "review:all": "npm run lint && npm run format:check && npm run review:theme && npm run review:any",
    "test:module": "npm test -- --include='src/app/modules/$MODULE/**/*.spec.ts'",
    "validate:manual": "cd antiHall && npm run check:local"
  }
}
```

## 4. Documentation Validation (CRITICAL)

### All Documentation MUST be Validated
**Bad documentation creates more bugs than bad code!**

Documentation requiring validation:
- README.md code examples
- API documentation
- Component usage examples
- Service method examples
- Configuration samples
- Tutorial code snippets

### Example Documentation Check
When Claude writes documentation:
```markdown
## BOQ Service Usage

// This example will be auto-validated by Claude:
const boq = await this.boqService.createBoq(projectId);
const items = await this.boqService.getItems(boq.id);
await this.materialService.allocateStock(items);
```

Claude validates BEFORE including in docs.

## 5. Module-Specific Review Focus

### Per Worktree Reviews
Each worktree focuses on its modules:

**FibreFlow-BOQ**:
- Material calculations accuracy
- Stock allocation logic
- BOQ template validation
- Integration with Projects
- Documentation accuracy

**FibreFlow-RFQ**:
- Email template simplicity
- Supplier notification flow
- Quote comparison logic
- No over-engineering
- API documentation validity

**FibreFlow-Projects**:
- Phase/Step hierarchy
- Task assignment logic
- Progress calculations
- Keep it simple!
- Usage examples correctness

## 6. Review Schedule (Simple & Practical)

### Every Commit (Automated)
- ESLint + Prettier (via Husky)
- TypeScript compilation
- Theme compliance grep

### Every PR/Merge
- Run `npm run review:all`
- Check simplicity principle
- Verify no new dependencies
- Test affected modules
- Validate documentation changes

### Weekly
- Bundle size check: `npm run build -- --stats-json`
- Performance review (manual)
- Documentation audit
- antiHall knowledge update

## 7. Firebase Security Rules Testing
```bash
# Use Firebase's built-in emulator
firebase emulators:start --only firestore

# Run security rules tests
npm test -- --include='**/*.rules.spec.ts'
```

## 8. Performance Monitoring (Simple Metrics)

### Bundle Size Limits (in angular.json)
```json
"budgets": [
  {
    "type": "initial",
    "maximumWarning": "2mb",
    "maximumError": "3mb"
  }
]
```

### Simple Performance Checks
```bash
# Check bundle size
npm run build:prod
ls -lh dist/fibreflow/browser/*.js

# Find large dependencies
npm ls --depth=0 | sort -k2 -hr
```

## 9. Worktree-Specific Testing

```bash
# In BOQ worktree
cd ~/VF/Apps/FibreFlow-BOQ
npm test -- --include='**/boq/**/*.spec.ts'
npm run review:all

# In RFQ worktree
cd ~/VF/Apps/FibreFlow-RFQ
npm test -- --include='**/suppliers/**/*.spec.ts'
npm test -- --include='**/quotes/**/*.spec.ts'
```

## 10. Claude Code Integration

### How Claude Works Now (AUTOMATIC)
1. **Before ANY code suggestion** → Claude validates with antiHall
2. **Before ANY documentation** → Claude checks examples work
3. **When debugging** → Claude verifies methods exist
4. **No manual validation needed** → It's automatic

### What You Need to Do
**Nothing special!** Just ask normally:
- "Add stock allocation feature"
- "Write docs for BOQ module"
- "Fix this error: [paste]"

Claude handles all validation automatically.

## 11. Common Issues Claude Will Catch

### Code Hallucinations
```typescript
// ❌ Claude won't suggest (doesn't exist):
this.boqService.calculateMaterialCosts()

// ✅ Claude will suggest (validated):
this.boqService.calculateTotalCost()
```

### Documentation Hallucinations
```markdown
// ❌ Claude won't document (invalid):
The BOQ service has a `generatePDF()` method

// ✅ Claude will document (verified):
The BOQ service exports data via `exportToExcel()`
```

## 12. Emergency Manual Validation

If you need to check something manually:
```bash
# Update antiHall knowledge
cd antiHall && npm run parse:improved

# Check specific code
npm run validate:manual "code to check"

# Find correct method
grep -r "methodName" src --include="*.ts"
```

## 13. No New Tools Policy

**We will NOT add**:
- Jest (have Karma)
- Cypress (manual testing works)
- Storybook (unnecessary)
- Complex CI/CD (keep it simple)
- Additional linters (ESLint is enough)

**We WILL use**:
- Existing Angular CLI commands
- Built-in TypeScript checking
- Firebase emulators
- Simple bash scripts
- antiHall (already built)
- Manual testing for complex flows

---

## Quick Reference

### For Developers
```bash
# Daily commands
npm test                    # Run tests
npm run review:all         # Full review
npm run build:prod         # Production build

# Weekly maintenance
cd antiHall && npm run parse:improved
```

### For Claude Code
**Claude automatically**:
- Validates all code before suggesting
- Checks documentation examples
- Verifies cross-module calls
- Ensures methods exist

**You just ask** - Claude validates!

**Remember**: 
- If it's not simple, it's not FibreFlow
- Bad documentation is worse than bad code
- antiHall catches errors before they exist