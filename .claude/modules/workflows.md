# Development Workflows - Detailed Guide

<module-metadata>
  <name>workflows</name>
  <version>1.0</version>
  <priority>high</priority>
  <last-updated>2025-07-18</last-updated>
</module-metadata>

## 📋 Feature Development Workflow

### Complete Feature Development Process

#### 1. Specification Phase
```markdown
# Create specification first
specifications/SPEC-{DOMAIN}-{NUMBER}.md

Example: SPEC-AUTH-001-magic-link-authentication.md

Contents:
- Business need
- Success criteria  
- Technical requirements
- Test scenarios
```

#### 2. Planning Phase (PRP)
```bash
# Copy template
cp prp/templates/FEATURE_PRP_TEMPLATE.md prp/features/{feature}-prp.md

# Research existing patterns
grep -r "similar-feature" src/app/features/
find src/app/features -name "*.service.ts" | head -5

# Document in PRP:
- Similar features analyzed
- Patterns to follow
- Implementation plan
```

#### 3. Implementation Phase
```bash
# Scaffold structure
/create-feature invoice

# This creates:
features/invoice/
├── components/
├── pages/
├── services/
├── models/
└── invoice.routes.ts

# Start with service
1. Extend BaseFirestoreService
2. Add CRUD methods
3. Test with antiHall
```

#### 4. Testing & Deployment
```bash
# Continuous deployment
deploy "Added invoice list view"     # After list works
deploy "Added invoice form"          # After create works  
deploy "Added invoice edit"          # After edit works

# Each deploy:
- Builds production
- Commits to jj/git
- Deploys to Firebase
- Available at https://fibreflow-73daf.web.app
```

## 🔄 Daily Development Workflow

### Morning Routine
```bash
# 1. Check task list
cat docs/DEVELOPMENT_BACKLOG.md | grep "IN PROGRESS"

# 2. Update antiHall
cd antiHall && npm run parse:improved

# 3. Check for updates
jj st
npm outdated

# 4. Start work
/dev-task  # View tasks
```

### During Development
```bash
# Every 30 minutes:
deploy "Work in progress - {what you did}"

# Before suggesting code:
antiHall check "methodName"

# When stuck:
!db {feature}      # Check data structure
!routes {feature}  # Check routing
!notes {feature}   # Known issues
```

### End of Day
```bash
# 1. Deploy current state
deploy "End of day - {summary}"

# 2. Update task status
# Edit DEVELOPMENT_BACKLOG.md

# 3. Document blockers
# Add to relevant .yml file
```

## 🚀 Quick Feature Patterns

### CRUD Feature (Most Common)
```typescript
// 1. Model (core/models/invoice.model.ts)
export interface Invoice {
  id?: string;
  projectId: string;  // ALWAYS link to project
  number: string;
  amount: number;
  status: 'draft' | 'sent' | 'paid';
  createdAt: Timestamp;
}

// 2. Service (features/invoice/services/invoice.service.ts)
@Injectable({ providedIn: 'root' })
export class InvoiceService extends BaseFirestoreService<Invoice> {
  constructor() {
    super('invoices');
  }
  
  getByProject(projectId: string) {
    return this.getWithQuery([
      where('projectId', '==', projectId),
      orderBy('createdAt', 'desc')
    ]);
  }
}

// 3. List Component - Always first!
// 4. Form Component - Then create/edit
// 5. Routes - Wire it up
```

### Dashboard Feature
```typescript
// 1. Use signals for data
invoices = signal<Invoice[]>([]);
stats = computed(() => ({
  total: this.invoices().length,
  paid: this.invoices().filter(i => i.status === 'paid').length
}));

// 2. Real-time updates
ngOnInit() {
  this.invoiceService.getAll().subscribe(
    data => this.invoices.set(data)
  );
}

// 3. Use Material cards
<mat-card *ngFor="let stat of stats()">
  {{ stat.label }}: {{ stat.value }}
</mat-card>
```

## 🔍 Debugging Workflow

### When Something Breaks
```bash
# 1. Check browser console first
# Look for NG0xxx errors

# 2. Validate the code exists
antiHall check "failing.method()"

# 3. Check recent changes
jj diff

# 4. Test in isolation
# Create minimal reproduction

# 5. Rollback if needed
jj op log
jj op restore {safe-operation-id}
```

### Common Issues & Quick Fixes

| Issue | Quick Check | Likely Fix |
|-------|------------|------------|
| NG0200 | Circular dependency | Remove circular service injection |
| Chunk loading error | jQuery or missing module | Remove jQuery, check imports |
| Firebase permission | Console → Rules | Update security rules |
| Build fails | `npm run lint` | Fix lint errors first |
| Route not found | Check lazy loading | Use direct routes in app.routes.ts |

## 📊 Task Management Workflow

### Using Built-in Dev Tasks
```bash
# View all tasks
/dev-task

# In your commit messages
git commit -m "DEV-001: Fixed invoice calculations"

# Update DEVELOPMENT_BACKLOG.md
- [x] DEV-001: Fix invoice calculations
```

### Priority System
```markdown
🔴 CRITICAL: Production bugs
🟡 HIGH: Features blocking users
🟢 MEDIUM: Normal features
🔵 LOW: Nice to have
```

## 🔄 Git/jj Workflow

### Safe Daily Flow
```bash
# Morning
jj st  # Check status

# Before any work
jj describe -m "Starting work on {feature}"

# Regular saves (every 30 min)
deploy "Progress: {what you did}"

# End of day
deploy "EOD: {feature} - {status}"
```

### Branch Strategy
```bash
# We work on main (solo dev)
# But for experiments:

jj new -m "Experiment: trying new approach"
# Try stuff
# If good: continue
# If bad: jj abandon (with confirmation!)
```

## 🎯 Specification-Driven Workflow

### Why Spec First?
1. **Clear target** - Know when you're done
2. **No scope creep** - Requirements locked
3. **Better code** - Implementation matches intent
4. **Easy testing** - Test against specs

### Spec Template
```markdown
# SPEC-{DOMAIN}-{NUMBER}: {Feature Name}

## Why (Business Need)
Brief explanation of the problem

## What (Requirements)
- [ ] Specific requirement 1
- [ ] Specific requirement 2

## How (Technical Approach)
High-level technical solution

## Success Criteria
- [ ] Measurable outcome 1
- [ ] Measurable outcome 2
```

## 🚄 Performance Workflow

### When Things Are Slow
```bash
# 1. Measure first
npm run build -- --stats-json
npx webpack-bundle-analyzer dist/stats.json

# 2. Check common causes
- Large imports (moment.js → use date-fns)
- Missing lazy loading
- Unnecessary subscriptions
- Missing OnPush change detection

# 3. Profile in Chrome
DevTools → Performance → Record
```

## 🎨 Theme Testing Workflow

### Quick Theme Check
```typescript
// Add to any component
themes = ['light', 'dark', 'vf', 'fibreflow'];
currentTheme = inject(ThemeService).currentTheme;

// In template
<button *ngFor="let theme of themes" 
        (click)="themeService.setTheme(theme)">
  {{ theme }}
</button>
```

### Manual Test
1. Open app
2. Click through all 4 themes
3. Check for hardcoded colors
4. Verify readability

---

Remember: Workflows are guides, not rules. Adapt based on the task, but always prioritize safety and validation!