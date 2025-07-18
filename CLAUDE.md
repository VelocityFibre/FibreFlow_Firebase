# Claude Development Notes

## 🚀 SuperClaude Enhanced Mode Active
Configuration files in: `.claude/shared/`
Master config: `.claude/shared/fibreflow-master-config.yml`

## 🚨 CRITICAL SAFETY PROTOCOLS - READ FIRST

### 🛡️ CODE LOSS PREVENTION
**📖 [BULLETPROOF_BACKUP_GUIDE.md](docs/BULLETPROOF_BACKUP_GUIDE.md)**  

### ⚠️ DANGEROUS COMMANDS - REQUIRE DOUBLE CONFIRMATION
**Claude MUST ask for explicit confirmation before running these commands:**
- `jj new` - DELETES current work, moves to new commit
- `jj abandon` - PERMANENTLY deletes commits 
- `jj undo` - Can lose recent work
- `git reset --hard` - Destroys uncommitted changes
- `rm -rf` - Deletes files permanently

### 🔐 API KEY MANAGEMENT STANDARD
**NEVER remove API keys from code - Use `.gitignore` instead!**
- Add files with secrets to `.gitignore`
- Use `git rm --cached filename` to remove from git index
- Keep API keys in local files for development
- This is the OBVIOUS and STANDARD approach

### 🚀 ALL CURRENT WORK IS SAFE
**✅ 226 files backed up to GitHub master branch**
**✅ Grid page with jQuery fix deployed to Firebase**
**✅ All features from yesterday's work preserved**
**✅ No jj commands can delete this work anymore**

@docs/API_REFERENCE.md
@docs/TESTING_GUIDE.md
@docs/COMPONENT_LIBRARY.md
@docs/THEME_SYSTEM.md
@docs/SYNC_MEETINGS_GUIDE.md
@.claude/commands/
@.claude/shared/
@.claude/shared/fibreflow-page-contexts.yml

## Quick Start for Claude

**Philosophy**: Specifications first, code second. Define WHAT before HOW.

**New Development Process**:
1. **Start with Specification** - Write SPEC-XXX-001 defining intent and success criteria
2. **Get Approval** - Ensure specification meets business needs
3. **Implement to Spec** - Code that fulfills the specification
4. **Test Against Spec** - Validate all criteria are met

**Essential Commands**:
- `deploy` - Build, commit & deploy to Firebase (via jj) - ALWAYS test this way
- `jj st` - Check what's changed
- `jj diff` - See detailed changes
- `npm run parse` - Update antiHall knowledge graph
- `/create-feature` - Scaffold new feature with proper structure
- `/check-implementation` - Verify feature completeness
- `/dev-task` - View development backlog and tasks
- `node scripts/sync-meetings-improved.js` - Sync meetings from Fireflies to Firebase

**Page Context Commands**:
- `!db {feature}` - Show database info (collections, subcollections)
- `!routes {feature}` - Show all routes for feature
- `!services {feature}` - Show services for feature
- `!notes {feature}` - Show quick notes and known issues

**Development Tracking**:
- `docs/DEVELOPMENT_BACKLOG.md` - Centralized dev tasks, bugs, features
- Reference tasks in commits: "DEV-001: Fixed issue"
- Update task status as you work

**Feature Development Workflow**:
1. Write specification in `specifications/SPEC-XXX-001.md` - Define WHAT you want
2. Create PRP using `docs/PRP_TEMPLATE.md` - Plan HOW to build it
3. Use `/create-feature` command to scaffold structure
4. Follow patterns in `docs/COMPONENT_LIBRARY.md`
5. Implement CRUD first, enhancements later
6. Deploy frequently with `deploy` command
7. Test against specification criteria (not just functionality)
8. Validate on live site: https://fibreflow.web.app
9. Use `/check-implementation` to verify completeness
10. Link implementation back to specification

**Critical Rules**:
- ❌ NEVER use `ng serve` for testing
- ❌ NEVER store secrets in code (use .env.local)
- ❌ NEVER create complex abstractions early
- ❌ NEVER work on multiple features at once
- ❌ NEVER skip antiHall validation
- ❌ NEVER bypass pole/drop data integrity rules
- ✅ ALWAYS validate patterns with antiHall
- ✅ ALWAYS deploy to test
- ✅ ALWAYS follow existing patterns
- ✅ ALWAYS enforce pole number uniqueness (max 12 drops per pole)
- ✅ ALWAYS enforce drop number uniqueness (1 drop per pole relationship)

**Validate Before Implementing**:
```bash
cd antiHall
npm run check "code or pattern to verify"
```

---

## Project Overview

### FibreFlow - Fiber Optic Project Management System

**Tech Stack:**
- Frontend: Angular 20.0.6 with Material Design
- Backend: Firebase/Firestore
- Functions: Firebase Functions (Node.js)
- State: Signals + RxJS
- Styling: SCSS with CSS Custom Properties
- Version Control: jj (Jujutsu) with Git coexistence

### Specification-First Development (NEW!)

**Core Principle**: Software engineering is about intent, not code.

**Specifications Directory**: `specifications/`
- Index: `specifications/index.yml` - Central registry
- Format: `SPEC-{DOMAIN}-{NUMBER}` (e.g., SPEC-AUTH-001)
- Example: `specifications/SPEC-KPI-001-daily-progress-tracking.md`

**Why Specifications First**:
- Clear success criteria before coding
- Test against intent, not just function
- AI can generate better code from specs
- Requirements traceable to implementation

**Quick Spec Commands**:
- View all specs: Check `specifications/index.yml`
- Find by ID: `grep -r "SPEC-XXX-001" specifications/`
- Check implementation: See index.yml for code links

### Recent Achievements (July 2025)

1. **Firebase Cleanup & Backup System** ✅
   - Complete database cleanup scripts
   - Automated daily backups at 9:00 AM
   - Service account authentication
   - Compressed backup storage
   - Selective restoration capabilities
   - Clean state: 2 reference projects (Mohadin MO-001, Lawley Law-001)

### Implemented Features (Production-Ready)

1. **Daily Progress** ✅
   - Daily KPIs tracking with enhanced forms
   - Financial tracking and quality metrics
   - Weekly report generation

2. **Projects** ✅
   - Complete project lifecycle management
   - Integrated BOQ, contractors, phases, steps, stock, tasks

3. **Staff Management** ✅
   - Full CRUD with role-based access
   - Import functionality
   - Facade service pattern

4. **Meetings** ✅
   - Fireflies API integration
   - Meeting notes and action items
   - Sync meetings: `node scripts/sync-meetings-improved.js`
   - See `docs/SYNC_MEETINGS_GUIDE.md` for details

5. **Stock Management** ✅
   - Inventory tracking with movements
   - Material allocations
   - Import/export capabilities

6. **BOQ (Bill of Quantities)** ✅
   - Excel import/export
   - Templates, allocations, analytics
   - Quote and order management

7. **Contractors** ✅
   - Assignment and tracking
   - Payment management
   - Progress monitoring

8. **Pole Tracker** ✅
   - Mobile/desktop views
   - Google Maps integration
   - Offline capabilities

### Partially Implemented

- Reports (PDF generation ready)
- Suppliers (basic CRUD)
- Quotes/RFQ (email integration in progress)
- Tasks (basic management)

### Architecture Patterns

- **Services**: Firebase wrapper pattern with base service
- **Components**: Standalone (no NgModules)
- **Routing**: Lazy-loaded feature modules
- **Forms**: Reactive forms with validation
- **Theming**: 4 themes (light, dark, vf, fibreflow)
- **Error Handling**: Global + Sentry integration

### Key Documentation

- **API Reference**: `docs/API_REFERENCE.md` - Firebase Functions
- **Testing Guide**: `docs/TESTING_GUIDE.md` - Deploy-first testing
- **Component Library**: `docs/COMPONENT_LIBRARY.md` - Verified patterns
- **Theme System**: `docs/THEME_SYSTEM.md` - 4 themes, ff-functions
- **Database Schema**: `docs/DATABASE_STRUCTURE.md` - Firestore structure
- **PRP Template**: `docs/PRP_TEMPLATE.md` - Feature planning
- **Sync Meetings Guide**: `docs/SYNC_MEETINGS_GUIDE.md` - Fireflies sync instructions
- **Vision: LLM Search**: `docs/VISION_LLM_POWERED_SEARCH.md` - Future of search in FibreFlow
- **Commands**: `.claude/commands/` - Slash commands
- **antiHall**: `antiHall/` - Hallucination prevention

---

## Secret Management Guidelines

### Where We Store Secrets

1. **Local Development Secrets** (Never committed to Git)
   - **Location**: `.env.local`
   - **Purpose**: Local development credentials, API keys, passwords
   - **Example**: Fireflies API key, Firebase CI tokens
   - **Note**: This file is gitignored and only exists on your local machine

2. **Firebase Functions Config** (For deployed functions)
   - **Set via CLI**: `firebase functions:config:set service.key="value"`
   - **Example**: `firebase functions:config:set fireflies.api_key="[VALUE FROM .env.local]"`
   - **Retrieve**: `firebase functions:config:get`
   - **Note**: These are stored securely in Firebase and not in code

3. **Firebase Environment Variables** (For Angular app)
   - **Location**: `src/environments/environment.ts` (public keys only!)
   - **Never store**: Passwords, secret keys, or sensitive data here
   - **Only store**: Public Firebase config, API endpoints

### Important Security Rules

1. **NEVER commit** `.env.local` or any `.env` files to Git
2. **NEVER store** sensitive credentials in the Angular app code
3. **ALWAYS use** Firebase Functions for operations requiring secret keys
4. **ALWAYS check** `.gitignore` includes all env files

### Current Secrets Storage

```
.env.local (Local development only - not in Git)
├── FIREBASE_TOKEN (for CI/CD)
├── FIREFLIES_EMAIL (for dev reference)
├── FIREFLIES_PASSWORD (for dev reference)
└── FIREFLIES_API_KEY (stored locally, deploy to Firebase Functions)

Firebase Functions Config (for production)
└── fireflies.api_key (deploy from .env.local value)
```

### How to Add New Secrets

1. **For local development**:
   ```bash
   echo "NEW_SECRET=value" >> .env.local
   ```

2. **For Firebase Functions**:
   ```bash
   # Read value from .env.local and set in Firebase
   firebase functions:config:set service.key="value"
   firebase deploy --only functions
   ```

3. **For production Angular** (public keys only):
   - Edit `src/environments/environment.prod.ts`
   - Only add non-sensitive configuration

### Security Checklist
- [ ] Is `.env.local` in `.gitignore`? ✓
- [ ] Are all sensitive operations in Firebase Functions? ✓
- [ ] Are API keys stored in Firebase config, not code? ✓
- [ ] Have you verified no secrets in commit history? ✓

---

## Project-Specific Notes

### Fireflies Integration
- All credentials stored in `.env.local` (never pushed to GitHub)
- API key must be deployed to Firebase Functions config for production
- Deploy command: Check `.env.local` for the exact command with API key
- All API calls happen through Firebase Functions, never from Angular

### Firebase Setup
- Firebase CI token in `.env.local` for automated deployments
- Project credentials in `firebase.json` and `.firebaserc` (safe to commit)

### Deployment Commands
```bash
# To deploy Fireflies API key (get value from .env.local)
firebase functions:config:set fireflies.api_key="[CHECK .env.local]"

# To verify configuration
firebase functions:config:get

# To deploy functions
firebase deploy --only functions
```

---

## Version Control Workflow (jj - Jujutsu)

### Why jj Instead of Git

As a solo developer, we use **jj (Jujutsu)** for version control because:
- **No staging area** - all changes are automatically tracked
- **Every change is a snapshot** - no need to manually commit
- **Deploy what you see** - no confusion about uncommitted changes
- **Simplified workflow** - focus on building, not git commands

### jj File Size Rules

**Default limit**: 1MiB per file (prevents accidental large file commits)

**Already configured in .gitignore**:
```
# Large data files
OneMap/*.csv
OneMap/*.xlsx
OneMap/*.json
OneMap/split_data/
```

**If you encounter file size errors**:
1. Add to .gitignore (recommended for data files)
2. Or increase limit: `jj config set --repo snapshot.max-new-file-size 50MiB`
3. Or override once: `jj --config snapshot.max-new-file-size=50MiB st`

### Daily Workflow

```bash
# Everything is automatically tracked! Just:
deploy  # This alias commits everything and deploys
```

### Common Commands

```bash
# Check status (replaces git status)
jj st

# See your changes (replaces git diff)
jj diff

# Update your current change description
jj describe -m "your message"

# Push to GitHub and deploy
deploy  # Custom alias that does everything

# See history
jj log
```

### Setup Commands (Already Done)

```bash
# Initialize jj with git coexistence
jj git init --colocate

# Import existing git history
jj git import
```

### Deployment Workflow

Our `deploy` command does everything:
1. Automatically captures all current changes
2. Creates a commit with timestamp
3. Pushes to GitHub
4. Deploys to Firebase

```bash
# One command to rule them all:
deploy

# Or if you want a custom message:
deploy "Added new feature X"
```

### Important Notes

- **No need to "add" files** - jj tracks everything automatically
- **No need to commit** - every save is already tracked
- **No branches needed** - work directly on main
- **Conflicts are rare** - as a solo dev, you control everything

### Troubleshooting

```bash
# If you need to see what jj is tracking
jj st

# If you need to undo the last change
jj undo

# If you need to go back to a previous version
jj restore

# If you need to untrack files (after adding to .gitignore)
jj file untrack path/to/file
jj file untrack 'glob:path/to/directory/**'
```

---

## Simplicity Principles

### Core Philosophy
**"Keep it simple, get the basics working first"**

1. **Start Simple**
   - Build CRUD first, add features later
   - One feature at a time
   - Test basic functionality before adding complexity

2. **Clear Boundaries**
   - Services in `/core/services/`
   - Models in `/core/models/`
   - Components in `/features/[feature]/`
   - Don't mix concerns

3. **Predictable Patterns**
   - All services extend BaseFirestoreService
   - All components are standalone
   - All forms use reactive patterns
   - Same structure for every feature

4. **Direct Communication**
   - Service provides Observable methods
   - Component subscribes and displays
   - No unnecessary abstractions

5. **Quick Wins**
   - Get list view working → Add details → Add edit → Add create
   - Test everything with real deployment via `deploy`
   - See results on live Firebase site immediately

### Example: Adding a New Feature

```bash
# 1. Create the model
ng g interface core/models/item

# 2. Create the service  
ng g service core/services/item

# 3. Create basic components
ng g component features/items/components/item-list
ng g component features/items/components/item-form

# 4. Wire them up, build and deploy to test
deploy "Added item list and form"

# 5. Check the live site to verify it works
# Fix any issues and deploy again
```

---

## CRITICAL ROUTING LESSONS LEARNED (2025-01-17)

### ⚠️ ANGULAR ROUTING ISSUES - MUST READ BEFORE CREATING NEW PAGES

**Problem Experienced**: Spent 30+ minutes debugging `NG04002: 'tasks/management/grid'` error when creating task management grid view. The nested lazy-loaded route structure failed repeatedly.

**Root Cause**: Angular's nested lazy-loaded routes can lose path context, causing routing to fail with cryptic errors.

### ❌ WHAT NOT TO DO (This Will Waste Time):

```typescript
// In feature.routes.ts (e.g., tasks.routes.ts)
{
  path: 'management/grid',  // Nested route under lazy-loaded module
  loadComponent: () => import('./pages/grid/grid.component').then(m => m.GridComponent)
}
// Accessing via: /tasks/management/grid
// Result: NG04002 error, route not found
```

### ✅ CORRECT APPROACH (Simple & Works):

```typescript
// In app.routes.ts (main routes file)
{
  path: 'task-grid',  // Simple, direct, top-level route
  loadComponent: () => import('./features/tasks/pages/task-management-grid/task-management-grid.component')
    .then(m => m.TaskManagementGridComponent),
  canActivate: [authGuard],
  data: { title: 'Task Management Grid' }
}
// Access via: /task-grid
// Result: Works immediately!
```

### Why This Happens:
1. **Lazy loading complexity** - Multiple layers of lazy-loaded modules cause path resolution issues
2. **Route context loss** - Child routes lose their parent context, stripping leading slashes
3. **Angular Router limitations** - Deeply nested routes are harder to debug and maintain

### MANDATORY APPROACH FOR ALL NEW PAGES:

1. **START SIMPLE** - Create a direct route in `app.routes.ts` first
2. **TEST IT WORKS** - Verify the route loads correctly
3. **ADD COMPLEXITY ONLY IF NEEDED** - Most pages don't need nested routing
4. **DOCUMENT ANY ISSUES** - Add notes here if you encounter routing problems

### Examples of Simple Routes That Work:

```typescript
// Good examples from our codebase
{ path: 'task-grid', loadComponent: () => import('...') }        // ✅ Works
{ path: 'pole-tracker', loadChildren: () => import('...') }      // ✅ Works
{ path: 'daily-progress', loadChildren: () => import('...') }    // ✅ Works

// Avoid these patterns
{ path: 'feature/sub-feature/page' }                             // ❌ Too nested
{ path: 'management/grid' } // under lazy module                 // ❌ Context loss
```

### Quick Decision Tree:
- **New standalone page?** → Add to `app.routes.ts` with simple path
- **Part of existing feature?** → Try simple path first, test thoroughly
- **Must be nested?** → Document why, test extensively, prepare for issues

**Remember**: The simplest solution that works is the best solution. Don't overcomplicate routing!

---

## Common Development Patterns

### Creating a New Service
```typescript
// Always extend BaseFirestoreService
export class NewService extends BaseFirestoreService<NewModel> {
  constructor() {
    super('collection-name');
  }
}
```

### Component Structure
```typescript
@Component({
  selector: 'app-feature',
  standalone: true,
  imports: [CommonModule, MaterialModule],
  templateUrl: './feature.component.html'
})
```

### Form Validation
```typescript
form = this.fb.group({
  field: ['', [Validators.required]],
  email: ['', [Validators.required, Validators.email]]
});
```

### Theme-Aware Styling
```scss
@use '../../../styles/utils/component-theming' as theme;

.component {
  color: theme.ff-rgb(foreground);
  background: theme.ff-rgb(background);
}
```

### Firebase Query Pattern
```typescript
getActiveItems(): Observable<Item[]> {
  return this.getWithQuery([
    where('status', '==', 'active'),
    orderBy('createdAt', 'desc')
  ]);
}
```

### Working with Observables
```typescript
// In component
items$ = this.itemService.getAll();

// In template
<div *ngFor="let item of items$ | async">
  {{ item.name }}
</div>
```

### Quick Deployment
```bash
# One command does everything (jj + Firebase)
deploy "Added item management feature"
```

---

## Context Engineering Workflow

### What is Context Engineering?
Providing comprehensive context to prevent hallucinations and improve code quality. Better than prompt engineering - it's about the entire ecosystem of information.

### Key Components

1. **Global Rules** (this file - CLAUDE.md)
   - Project overview and current state
   - Development patterns and conventions
   - Security guidelines
   - Workflow instructions

2. **Slash Commands** (`.claude/commands/`)
   - `/deploy` - Full deployment workflow
   - `/create-feature` - Scaffold new features
   - `/check-implementation` - Verify completeness
   - `/fix-common-errors` - Quick solutions
   - `/quick-reference` - Code patterns

3. **Product Requirements Prompts (PRPs)**
   - Template: `docs/PRP_TEMPLATE.md`
   - Examples: `.claude/prps/`
   - Use for planning features before coding

4. **Reference Documentation**
   - `API_REFERENCE.md` - Firebase Functions
   - `TESTING_GUIDE.md` - Testing approach
   - `COMPONENT_LIBRARY.md` - Reusable components
   - `THEME_SYSTEM.md` - Theming details

### Context Engineering Process

1. **Before Starting a Feature**:
   ```bash
   # Update antiHall knowledge
   cd antiHall && npm run parse
   
   # Create a PRP for the feature
   # Use docs/PRP_TEMPLATE.md
   ```

2. **During Development**:
   ```bash
   # Use slash commands
   /create-feature invoice
   
   # Validate patterns
   npm run check "your code"
   
   # Reference documentation
   /quick-reference firebase
   ```

3. **Before Deployment**:
   ```bash
   # Check implementation
   /check-implementation invoice
   
   # Deploy with context
   /deploy "Implemented invoice management per PRP"
   ```

### Why Context Engineering?

- **Reduces hallucinations** - AI has all needed information
- **Consistent patterns** - Same approach every time
- **Faster development** - Less back-and-forth
- **Better quality** - Follows established patterns

### Context Updates & Continuous Improvement

When you:
- Add new patterns → Update CLAUDE.md
- Find common errors → Add to fix-common-errors.md
- Create new components → Update COMPONENT_LIBRARY.md
- Change workflows → Update relevant commands
- **Struggle with finding something → Add to page-contexts.yml**

**Continuous Improvement Protocol**:
If Claude struggles repeatedly with the same information:
1. **Document the solution** in relevant system (page-contexts.yml, antiHall, etc.)
2. **Note the path/location** for future reference
3. **Update the context** so it's instantly available next time
4. **Test the improvement** to ensure it works

Examples:
- "Where is BOQ data stored?" → Added to page-contexts.yml under boq.collections
- "Which service handles X?" → Document in page-contexts.yml service mappings
- "What routes exist for Y?" → Add to page-contexts.yml route listings

Remember: Good context = Good code = No repeated struggles

---

*Last updated: 2025-07-14*
---

## Agent Notes
### Pattern Learning - 2025-07-16
**Context**: general
**Patterns Learned**: 1

- **intent_pattern**: User intent: memory_search
  - Solution: Actions: prepare_context
  - Confidence: 0.8


### Pattern Learning - 2025-07-16
**Context**: general
**Patterns Learned**: 1

- **intent_pattern**: User intent: development_task
  - Solution: Actions: prepare_context, launch_claude_code
  - Confidence: 0.8


### Pattern Learning - 2025-07-16
**Context**: general
**Patterns Learned**: 1

- **intent_pattern**: User intent: general_help
  - Solution: Actions: provide_assistance
  - Confidence: 0.8


### Pattern Learning - 2025-07-16
**Context**: general
**Patterns Learned**: 1

- **intent_pattern**: User intent: development_task
  - Solution: Actions: prepare_context, launch_claude_code
  - Confidence: 0.8


### Pattern Learning - 2025-07-16
**Context**: general
**Patterns Learned**: 1

- **intent_pattern**: User intent: pattern_query
  - Solution: Actions: 
  - Confidence: 0.8


### Pattern Learning - 2025-07-16
**Context**: general
**Patterns Learned**: 1

- **intent_pattern**: User intent: development_task
  - Solution: Actions: prepare_context
  - Confidence: 0.8


### Pattern Learning - 2025-07-16
**Context**: general
**Patterns Learned**: 1

- **intent_pattern**: User intent: memory_search
  - Solution: Actions: prepare_context
  - Confidence: 0.8


### Pattern Learning - 2025-07-16
**Context**: general
**Patterns Learned**: 1

- **intent_pattern**: User intent: general_help
  - Solution: Actions: provide_assistance
  - Confidence: 0.8


### Pattern Learning - 2025-07-16
**Context**: general
**Patterns Learned**: 1

- **intent_pattern**: User intent: general_help
  - Solution: Actions: provide_assistance
  - Confidence: 0.8


### Pattern Learning - 2025-07-16
**Context**: general
**Patterns Learned**: 1

- **intent_pattern**: User intent: status_check
  - Solution: Actions: show_status
  - Confidence: 0.8


### Pattern Learning - 2025-07-16
**Context**: general
**Patterns Learned**: 1

- **intent_pattern**: User intent: general_help
  - Solution: Actions: provide_assistance
  - Confidence: 0.8


### Pattern Learning - 2025-07-16
**Context**: general
**Patterns Learned**: 1

- **intent_pattern**: User intent: memory_search
  - Solution: Actions: search_past_solutions
  - Confidence: 0.8


### Pattern Learning - 2025-07-16
**Context**: general
**Patterns Learned**: 1

- **intent_pattern**: User intent: general_help
  - Solution: Actions: provide_assistance
  - Confidence: 0.8


### Pattern Learning - 2025-07-16
**Context**: general
**Patterns Learned**: 1

- **intent_pattern**: User intent: development_task
  - Solution: Actions: prepare_context, launch_claude
  - Confidence: 0.8


### Pattern Learning - 2025-07-16
**Context**: general
**Patterns Learned**: 1

- **intent_pattern**: User intent: general_help
  - Solution: Actions: provide_assistance
  - Confidence: 0.8



### Pattern Learning - 2025-07-16
**Context**: general
**Patterns Learned**: 1

- **intent_pattern**: User intent: general_help
  - Solution: Actions: provide_assistance
  - Confidence: 0.8

