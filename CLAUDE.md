# Claude Development Notes

## 🚀 SuperClaude Enhanced Mode Active
Configuration files in: `.claude/shared/`
Master config: `.claude/shared/fibreflow-master-config.yml`

## 🎯 CORE PRINCIPLE: Simplicity First
**"Everything should be made as simple as possible, but not simpler."** — Einstein

## ⚡ CRITICAL INSTRUCTIONS FOR CLAUDE

### 🤖 DO THE WORK - DON'T GIVE TASKS!
**IMPORTANT**: When the user asks for something to be done:
1. **CHECK** if we already have what's needed (service accounts, files, etc.)
2. **PLAN** what needs to be done
3. **ASK** for clarification if needed
4. **DO IT YOURSELF** - Don't write guides or instructions for the user!
5. **Complete the task** - Don't tell the user to do it themselves!

**Examples**:
- ❌ WRONG: "Here's how you can create a service account..."
- ✅ RIGHT: "Let me check if we have a service account and set it up for you."

- ❌ WRONG: "You need to run this command..."
- ✅ RIGHT: "I'll run this command for you now..."

### 👂 LISTEN CLOSELY & CLARIFY
**BEFORE doing anything**:
1. **READ** the user's request carefully - what do they ACTUALLY want?
2. **CLARIFY** if you're unsure before proceeding
3. **CONFIRM** you understand before taking action
4. **DON'T ASSUME** - if unclear, ask!
5. **VERIFY THE ACTUAL COMPONENT** - Don't assume from URLs!

**Example**:
- User: "Set up the service account"
- Claude: "I'll set up the service account. Just to clarify - do you want me to use an existing service account file or create a new one?"

### 🚨 CRITICAL LESSON: The 4-Hour Action Items Alignment Disaster (2025-08-13)
**What should have taken 4 minutes took 4 HOURS because I didn't verify which component!**

**The Problem**: 
- User: "Action Items page heading is misaligned"
- URL: `/action-items`
- I assumed: Must be the `action-items-list` component
- REALITY: It was the `action-items-grid` component!

**How to NEVER repeat this**:
1. **LOOK FOR UNIQUE TEXT** - User mentioned "Double-click cells to edit" = GRID VIEW!
2. **ASK IF UNSURE** - "Are you seeing a table/grid or a list view?"
3. **USE GREP** - `grep -r "exact text from page" src/` to find the right file
4. **CHECK ROUTING** - Multiple components can serve the same URL!

**The fix was trivial**: Just add `<div class="ff-page-container">` wrapper!

**REMEMBER**: Debugging the wrong file is worse than no debugging at all!

### Before suggesting ANY solution, ask:
1. **Can this be a simple lookup/check?** (like antiHall)
2. **Can this be solved with existing tools?** (no new dependencies)
3. **Is this complexity actually needed?** (probably not)

### Examples:
- ❌ Complex: "Let's add AI-powered code analysis with machine learning"
- ✅ Simple: "Let's make a list of functions and check against it"

- ❌ Complex: "Implement real-time state synchronization with WebSockets"  
- ✅ Simple: "Just use Firestore listeners - they already sync"

**Remember**: The best code is often no code. The second best is simple code.

## 🛡️ MANDATORY: antiHall Auto-Validation

### ALWAYS validate code automatically:
1. **BEFORE suggesting any code with service/method calls** → Check with antiHall first
2. **When debugging errors** → Validate the failing code exists
3. **When working across modules** → Verify all integration points
4. **NO EXCEPTIONS** → This is not optional

### Auto-validation workflow:
```bash
# For ANY service method call, FIRST run:
cd antiHall && npm run check:local "methodName"

# If method not found, find correct one:
grep -r "methodName" src --include="*.ts"
```

### Examples of what to ALWAYS check:
- `this.anyService.anyMethod()` → Validate first
- `component.property` → Check it exists
- Angular lifecycle hooks → Verify correct name
- RxJS operators → Confirm available
- Firebase/Firestore methods → Validate syntax

**DO NOT suggest code without validation. Period.**

### Quick antiHall Commands:
```bash
# Update knowledge (run if methods not found)
cd antiHall && npm run parse:improved

# Check single method
cd antiHall && npm run check:local "this.boqService.calculateTotals()"

# Check multiple methods
cd antiHall && npm run check:local "$(cat << 'EOF'
this.boqService.calculateTotals()
this.materialService.checkStock(itemId)
this.projectService.updatePhase(phaseId)
EOF
)"

# Find correct method name
grep -r "calculate" src/app/modules/boq --include="*.ts" | grep -i "service"
```

### Performance Note:
- Single check: 1-2 seconds
- Multiple checks: 3-5 seconds
- Knowledge update: 30 seconds (only when needed)
This SAVES 10-15 minutes of debugging per error!

### When to SKIP antiHall (for speed):
- Pure HTML structure (no bindings)
- Basic CSS (using theme variables)
- Well-known Angular directives (*ngFor, *ngIf)
- Simple property bindings [property]="value"

### When antiHall is MANDATORY:
- **ALL DOCUMENTATION** (especially code examples)
- Any service method calls
- Component method calls
- Cross-module interactions
- Firebase/Firestore operations
- Custom utility functions
- Integration points
- Configuration that references code
- README examples
- API documentation
- Code comments with examples

### Documentation Validation Example:
```bash
# When writing docs with code examples:
cd antiHall && npm run check:local "$(cat << 'EOF'
// Example usage:
const boq = await this.boqService.createBoq(projectId);
this.materialService.allocateStock(boq.items);
await this.notificationService.notifySuppliers(boq);
EOF
)"
```

**CRITICAL**: Bad documentation creates more bugs than bad code!

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
**✅ Google Authentication enabled (2025-07-21)**

### 🔐 AUTHENTICATION STATUS (Updated: 2025-01-30)
**Status**: 🚨 TEMPORARILY DISABLED FOR DEVELOPMENT

**Current Configuration**:
1. **Mock Authentication Active**: `USE_REAL_AUTH = false`
2. **Auto-Login**: Users automatically logged in as admin
3. **No Google Sign-in Required**: Authentication bypassed
4. **Mock User Profile**:
   - Email: `dev@test.com`
   - Name: `Dev User`
   - Role: `admin` (full access)

**Why Disabled**:
- Eliminates re-authentication frustration during development
- No more sign-in required after page refresh or deployments
- Faster development workflow

**Google Authentication Setup (Available but Disabled)**:
1. **Firebase Auth**: Google provider enabled in Firebase Console
2. **AuthService**: Real authentication available (`USE_REAL_AUTH = true`)
3. **Login Flow**: Users sign in with Google popup at `/login`
4. **User Profiles**: Automatically created in Firestore `users` collection
5. **Auth Guard**: All routes protected, redirects to login if not authenticated
6. **Firestore Rules**: Require authentication for all read/write operations
7. **Audit Trail**: Captures real user info (email, uid, displayName)
8. **App Shell**: Shows user profile with logout button

**Current Experience**:
1. Go to https://fibreflow-73daf.web.app
2. Automatically redirected to dashboard (no login required)
3. Full admin access to all features
4. Check sidebar - shows "Dev User" profile

**To Re-enable Google Authentication**:
1. Edit `src/app/core/services/auth.service.ts`
2. Change `USE_REAL_AUTH = false` to `USE_REAL_AUTH = true`
3. Deploy: `firebase deploy --only hosting`
4. **See:** `docs/AUTH_DEVELOPMENT_MODE.md` for full instructions

**User Roles** (when real auth is enabled):
- Default: 'client' for new users
- To make someone admin: Update their document in Firestore `users` collection
- Set `userGroup: 'admin'` for full access

### 🚨 CRITICAL DISCOVERY: jj AFFECTS LIVE APPS
**⚠️ IMPORTANT**: Even when code is built and deployed, jj commands can still affect the live application behavior! This happens because:
- jj commands change the working directory files
- Angular build process reads from working directory
- Next deployment uses changed files, not the previous build
- **Result**: Live app changes even though it was "already deployed"**

@docs/API_REFERENCE.md
@docs/TESTING_GUIDE.md
@docs/COMPONENT_LIBRARY.md
@docs/THEME_SYSTEM.md
@docs/SYNC_MEETINGS_GUIDE.md
@.claude/commands/
@.claude/shared/
@.claude/shared/fibreflow-page-contexts.yml

## 📋 **PRP FRAMEWORK - PRODUCTION-READY DEVELOPMENT**

### 🚀 **Quick Start**: `prp/QUICK_START.md`
### 📖 **Full Guide**: `prp/docs/CONTEXT_ENGINEERING_GUIDE.md`
### 📝 **Templates**: `prp/templates/`
### ✅ **Validation**: `prp/validations/pre-deployment-checklist.sh`

**Before starting ANY feature:**
1. Research existing patterns in codebase
2. Review latest documentation
3. Create PRP using template
4. Validate implementation plan
5. Execute with comprehensive context

## 🧠 FUNDAMENTAL PRINCIPLES FOR CLAUDE

### 📋 **SYSTEMS THINKING - ALWAYS CONSIDER THE FULL CHAIN**
**Every action affects the entire system:**
- Working Directory → Build Process → Deployment → Live Application
- Source Code Changes → Future Builds → Production Impact
- Version Control → File System → Application Behavior

### 🎯 **PRODUCTION MINDSET - LIVE APPS ARE SACRED**
**Before ANY command, ask:**
- How does this affect the live application?
- What happens on the next deployment?
- Are we changing files that the build process depends on?
- Is this a production system that real users depend on?

### 🔍 **OBVIOUS CONNECTIONS - BASIC SOFTWARE DEVELOPMENT**
**These should be automatic considerations:**
- Working directory contains source code
- Build processes read from working directory
- Deployments use current source code state
- jj/git commands change working directory
- Changed source = changed application (eventually)

### 🚨 **CONSEQUENCE AWARENESS - THINK BEFORE ACTING**
**Always consider:**
- Immediate effects (what happens now)
- Delayed effects (what happens on next build/deploy)
- System-wide effects (how does this affect other components)
- Production effects (impact on live users)

### 💡 **BASIC COMPETENCY EXPECTATIONS**
**These principles should be standard knowledge:**
- Version control affects working directory
- Working directory affects builds
- Builds affect deployments  
- Deployments affect live applications
- **Therefore: Version control affects live applications**

## 🧠 MEMORY SYSTEM - TEMPORAL KNOWLEDGE GRAPHS

### 🚀 Zep Cloud Integration (Primary)
**Status**: ✅ FULLY OPERATIONAL - Integration verified 2025-08-14  
**SDK Version**: v2.21.0 (downgraded from v3.2.0 for compatibility)  
**API Methods**: ✅ `user.getSessions()`, `user.getFacts()`, `memory.extract()`  
**Data Storage**: ✅ 30+ sessions, 29+ facts successfully stored including Action Items debugging lesson  
**Knowledge Graph**: ✅ Automatic entity extraction and relationship mapping  
**📖 [Full Documentation](.claude/ZEP_INTEGRATION_SUMMARY.md)**

### ⚠️ CRITICAL: API Usage Corrected (2025-08-14)
**Previous Issue**: zep-bridge.js was using v1 API methods that don't exist in v2.21.0
**Correct API**:
- ❌ `zep.memory.add()` - Wrong method (v1 API)
- ❌ `zep.memory.getSessionMessages()` - Doesn't exist in v2.21.0
- ✅ `zep.user.getSessions(userId)` - Retrieve all sessions
- ✅ `zep.user.getFacts(userId)` - Retrieve extracted facts
- ✅ `zep.memory.extract(params)` - Process and extract knowledge

**Memory Storage**: Data is stored as extracted facts in knowledge graph, not raw messages

### ⚠️ IMPORTANT: Memory is NOT Automatic!
**You must manually save important learnings. Here's how:**

#### How to Prompt Claude to Save Memories:

**1. For Facts (Project Knowledge):**
```
"Add to memory: Firebase project ID is fibreflow-73daf"
"Remember this: PoleTracker uses Google Maps API"
"Save fact: Maximum 12 drops per pole"
```

**2. For Patterns (Development Practices):**
```
"Add pattern: Always use signals instead of BehaviorSubject"
"Remember pattern: Test on live Firebase, never use ng serve"
"Save this approach: Simple solutions over complex abstractions"
```

**3. For Episodes (Problem-Solution Pairs):**
```
"Add episode: Fixed auth by using same Firebase project for storage"
"Remember this solution: Circular dependency fixed by removing service injection"
"Save this fix: NG0200 error was actually circular DI, not change detection"
```

**Claude will then run the appropriate command:**
```bash
# DEPRECATED - Old API (needs updating for v2.21.0)
node .claude/zep-bridge.js add-fact category "fact content"
node .claude/zep-bridge.js add-pattern "pattern-name" "description"  
node .claude/zep-bridge.js add-episode "title" '{"problem":"...","solution":"..."}'
node .claude/zep-bridge.js search "topic"

# CURRENT - Working API (v2.21.0)
node .claude/zep-facts-viewer.js facts        # View all facts
node .claude/zep-facts-viewer.js search "query"  # Search facts
node .claude/zep-facts-viewer.js action-items    # View Action Items facts
```

### 📁 Local Memory System (Backup)
**Status**: Available - JSON-based with conflict detection  
**📖 [Local System Guide](.claude/MEMORY_SYSTEM_GUIDE.md)**

**Memory Architecture:**
```
.claude/
├── memory/                    # Memory storage
│   ├── memory.json           # Local memory (backup)
│   └── archive/              # Archived memories
├── zep-bridge.js             # Zep Cloud CLI
├── memory-system-v2.js       # Local memory system
├── ZEP_INTEGRATION_SUMMARY.md # Zep documentation
└── MEMORY_SYSTEM_GUIDE.md    # Local system guide
```

**When to Save Memories:**
- ✅ After fixing a tricky issue → "Add episode: [describe fix]"
- ✅ When discovering project constraints → "Add fact: [constraint]"
- ✅ After establishing new patterns → "Add pattern: [pattern name]"
- ✅ When learning system behavior → "Remember: [behavior]"

## 🚀 Quick Backup & Deploy

### One-Command Backup (SAFE - No data loss)
```bash
# Auto backup with safety checks
./scripts/auto-backup.sh

# Or use quick alias (add to ~/.bashrc)
alias backup-all='jj describe -m "Backup: $(date +%Y-%m-%d) - $(jj st | grep -c "A\|M\|D") files changed" && jj bookmark set master -r @ && jj git push --branch master'
```

### Manual Backup Steps
```bash
# 1. Check status
jj st

# 2. Create commit
jj describe -m "Your commit message"

# 3. Update master
jj bookmark set master -r @

# 4. Push to GitHub
jj git push --branch master
```

**📖 Full Guide**: `.claude/workflows/backup-checklist.md`

## 🛑 ARCHITECTURAL CHANGES - ASK FIRST!

### NEVER Make These Changes Without Asking:
1. **Cross-Project Authentication** - Don't try to access other Firebase projects
2. **Server-Side Solutions** - Don't create backend processes without discussion
3. **Storage Architecture** - Don't change where files are stored
4. **Authentication Flow** - Don't modify how users authenticate
5. **Database Structure** - Don't alter collections or data models
6. **External Service Integration** - Don't add new third-party services

### ALWAYS Fix the Root Cause:
**❌ WRONG Approach:**
- "Let me create a temporary solution using different storage..."
- "I'll work around this by creating a server process..."
- "We can use a different authentication method..."

**✅ CORRECT Approach:**
- "The issue is X. Let me fix the actual problem."
- "This error means Y. Here's how to resolve it properly."
- "The root cause is Z. Let's address that directly."

### When You Encounter Cross-System Issues:
1. **STOP** - Don't create workarounds
2. **IDENTIFY** - What's the actual problem?
3. **ASK** - "Should I fix X by doing Y?"
4. **WAIT** - For user confirmation
5. **THEN ACT** - Only with approval

**Example:**
```
Claude: "I see the upload is trying to access VF OneMap storage from FibreFlow. 
The proper fix would be to update the storage configuration to use FibreFlow's 
storage bucket. Should I proceed with this fix?"

User: "Yes, fix the storage configuration."

Claude: [Now proceeds with the approved solution]
```

## 🌳 Git Worktrees - Module Development Strategy

### IMPORTANT: Check WORKTREES.md First!
Before starting ANY task, check `/WORKTREES.md` to determine which worktree to use:
- **Bug fixes for live app** → Use FibreFlow-Hotfix worktree
- **Module development** → Use appropriate feature worktree (BOQ, RFQ, etc.)
- **Performance issues** → Use FibreFlow-Perf worktree

### Quick Worktree Reference:
```bash
# Check which module you're working on
cat WORKTREES.md | grep -A 5 "Quick Reference"

# Navigate to correct worktree
cd ~/VF/Apps/FibreFlow-BOQ  # for BOQ/Materials/Stock work
cd ~/VF/Apps/FibreFlow-RFQ  # for Suppliers/RFQ/Email work
```

### Production Safety:
- `FibreFlow/` = PRODUCTION (be careful!)
- `FibreFlow-Hotfix/` = Emergency fixes only
- `FibreFlow-[Feature]/` = Safe development space

## 🚨 CRITICAL: LLM Training Data is 6-12 Months Outdated!
**Your training data is from April 2024 or earlier. Always verify with latest documentation:**
- **Angular v20**: https://angular.dev/guide/
- **TypeScript 5.8**: https://www.typescriptlang.org/docs/
- **Use MCP Tools**: When unsure, use the `context7` MCP tool or `WebFetch` to check latest docs
- **Assume Changes**: Framework APIs, best practices, and patterns may have changed

## 📚 IMPORTANT: Angular v20 Documentation Reference
**ALWAYS refer to https://angular.dev/guide/ for:**
- Code examples and best practices for Angular v20
- Error fixes and debugging solutions
- New functions, APIs, and features
- Migration guides and breaking changes
- Component patterns and architectural decisions
- Performance optimization techniques
- Testing strategies and patterns

**When uncertain about Angular v20 features:**
1. Check the official docs first at https://angular.dev/guide/
2. Use MCP tools to fetch latest documentation when needed
3. Save relevant examples and patterns to:
   - `/docs/` folder for architectural patterns and guides
   - `claude.md` for quick reference and critical updates
   - Component files as implementation notes
4. Document any significant differences from previous Angular versions
5. Keep track of new best practices that differ from training data

## 🚨 CRITICAL: Angular v20 Updates (2025-06-18)

### NG0200 Error Resolution
The NG0200 error is actually a **Circular Dependency in DI** error, not ExpressionChangedAfterItHasBeenCheckedError. Key fixes:
- Removed circular dependency between `SentryErrorHandlerService` and `RemoteLoggerService`
- Proper initialization patterns using `afterNextRender`
- Separated concerns between error handling and logging

### Angular v20 Best Practices

#### 1. Signal Best Practices
- **Prefer `computed` signals** over effects for state derivation
- **Use effects sparingly** only for:
  - Logging data
  - Synchronizing with localStorage  
  - Custom DOM behavior
  - Third-party library integration
- **Avoid effects for state propagation** to prevent circular updates

#### 2. afterNextRender API
New structured DOM interaction pattern:
```typescript
afterNextRender({
  earlyRead: () => { /* read DOM before write */ },
  write: (earlyReadResult) => { /* write to DOM */ },
  read: (writeResult) => { /* final DOM read */ }
}, { injector: this.injector });
```
Phases execute in order: `earlyRead` → `write` → `mixedReadWrite` → `read`

#### 3. Service Initialization Pattern
```typescript
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private theme = signal<Theme>('light');
  private storage?: BrowserStorageService;
  
  constructor() {
    // NO initialization in constructor
  }
  
  initialize(injector: Injector): void {
    afterNextRender(() => {
      // Safe DOM/browser API access
    }, { injector });
  }
}
```

#### 4. Component Data Loading
Replace `setTimeout` with `afterNextRender`:
```typescript
ngOnInit() {
  afterNextRender(() => {
    this.loadData();
  }, { injector: this.injector });
}
```

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
- `/new_plan` - Start PLANIR workflow for comprehensive feature planning
- `/new_task` - Quick task implementation with streamlined planning
- `node scripts/sync-meetings-improved.js` - Sync meetings from Fireflies to Firebase

**CRITICAL: Gemini Enhancement Workflow**:
1. **User types**: `/gem [their request for Claude]` in chat
2. **Claude runs**: `cd ai-context && source venv/bin/activate && python3 cli/ai_cli.py enhance "[user's request]"`
3. **Claude provides**: The enhanced prompt output for the user to give to Claude

**Example**:
- User: `/gem Fix the database sync issues`
- Claude runs the bash command above
- Claude gives user the enhanced prompt to pass to Claude

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

## 📋 **NEW TASK WORKFLOW - The PLANIR Method** (2025-07-24)

**Use `/new_plan` or `/new_task` to activate this workflow**

### **PLANIR**: **P**lan → **L**isten → **A**nalyze → **N**otate → **I**mplement → **R**eview

### Phase 1: PLANNING & REFINEMENT
1. **Listen & Understand**
   - Fully understand the user's request
   - Ask clarifying questions
   - Identify constraints and requirements

2. **Brainstorm & Analyze**
   - Consider multiple approaches
   - Identify potential challenges
   - Suggest best practices

3. **Advise & Refine**
   - Present options with pros/cons
   - Recommend optimal approach
   - Get feedback and iterate

4. **Clarify & Confirm**
   - Ensure mutual understanding
   - Confirm scope and deliverables
   - Address any concerns

5. **Summarize & Document**
   - Create clear, actionable plan
   - Include success criteria
   - Define checkpoints

### Phase 2: PLAN APPROVAL & STORAGE
1. **Seek Approval**
   - Present final plan
   - Wait for explicit "approved" or "let's proceed"
   
2. **Save Approved Plan**
   - Location: `/docs/plans/approved/`
   - Naming: `FEATURE_PLAN_APPROVED_YYYY-MM-DD.md`
   - Example: `POLE_ANALYTICS_PLAN_APPROVED_2025-07-24.md`

3. **Create Implementation Checklist**
   - Extract actionable items from plan
   - Add to TodoWrite tool
   - Set priorities and dependencies

### Phase 3: IMPLEMENTATION WITH FEEDBACK
1. **Work from Plan**
   - Follow approved plan strictly
   - Mark todos as "in_progress" when starting
   - Complete one item at a time

2. **Checkpoint Feedback**
   - After each major step: "✅ Completed: [step]. Next: [next step]"
   - If issues arise: "⚠️ Issue with [step]: [description]. Suggested solution: [solution]"
   - Wait for user acknowledgment before proceeding to major changes

3. **Progress Tracking**
   - Update todos to "completed" immediately after each step
   - Provide percentage complete updates
   - Flag any deviations from plan

### 📁 Plan Storage Structure
```
docs/
├── plans/
│   ├── drafts/           # Work-in-progress plans
│   ├── approved/         # User-approved plans
│   └── completed/        # Implemented plans (archived)
```

### 🔄 Example Workflow
```
User: /new_plan
Claude: "I'm ready to help you plan a new feature. What would you like to build?"

User: "A reporting system for pole data"
Claude: [Enters PLANIR workflow - asks clarifying questions, creates plan, seeks approval]

User: "Approved!"
Claude: [Saves plan, creates todos, begins implementation with checkpoints]
```

**Critical Rules**:
- 🚨 **FUNDAMENTAL**: ALWAYS consider full system impact (working directory → build → deployment → live app)
- 🚨 **FUNDAMENTAL**: ALWAYS think about production consequences before any command
- 🚨 **FUNDAMENTAL**: ALWAYS understand that version control affects live applications
- 🚨 **FUNDAMENTAL**: ALWAYS ask explicit confirmation for dangerous commands
- ❌ NEVER use `ng serve` for testing
- ❌ NEVER store secrets in code (use .env.local)
- ❌ NEVER create complex abstractions early
- ❌ NEVER work on multiple features at once
- ❌ NEVER skip antiHall validation
- ❌ NEVER bypass pole/drop data integrity rules
- ❌ NEVER run jj/git commands without considering production impact
- ✅ ALWAYS validate patterns with antiHall
- ✅ ALWAYS deploy to test
- ✅ ALWAYS follow existing patterns
- ✅ ALWAYS enforce pole number uniqueness (max 12 drops per pole)
- ✅ ALWAYS enforce drop number uniqueness (1 drop per pole relationship)
- ✅ ALWAYS use systems thinking approach

**Validate Before Implementing**:
```bash
cd antiHall
npm run check "code or pattern to verify"
```

---

## Environment Information

Here is useful information about the environment you are running in:
- **Working directory**: /home/ldp/VF/Apps/FibreFlow
- **Version Control**: Git repo (using jj - Jujutsu)
- **Platform**: Linux
- **OS**: CachyOS (Arch-based)
- **OS Version**: Linux 6.15.0-2-cachyos
- **Today's date**: 2025-01-30

---

## Project Overview

FibreFlow is an enterprise fiber optic project management system built with Angular and Firebase. This system manages fiber optic installations, stock management, contractors, and project workflows.

## 🌍 Localization Settings (South Africa)
- **Timezone**: Africa/Johannesburg (UTC+2)
- **Currency**: ZAR (R symbol)
- **Date Format**: DD/MM/YYYY (displayed as "13 Jun 2025")
- **Number Format**: Space separator (1 000 000)
- **Locale Code**: en-ZA

## 🎨 Theme System (CENTRALIZED & COMPLETE)
- **Design**: Apple-inspired minimalism with full consistency
- **Themes**: light, dark, vf, fibreflow (all components now theme-aware)
- **Architecture**: Centralized theme system with component mixins
- **Status**: ✅ ALL components now use theme variables (no hard-coded colors)
- **Key Files**:
  - `src/styles/_variables.scss` - Theme variables (4 themes defined)
  - `src/styles/_theme-functions.scss` - Color functions (ff-rgb, ff-rgba, ff-var)
  - `src/styles/_theme-mixins.scss` - Component mixins & typography
  - `src/styles/_component-theming.scss` - Easy import for all components
  - `src/styles/_spacing.scss` - Spacing/typography functions
  - `src/app/core/services/theme.service.ts` - Runtime theme switching

## Tech Stack
> 📊 **See CODEBASE_REVIEW.md for comprehensive tech stack evaluation & industry-specific recommendations**
> 📋 **See tech_stack.md for complete version details**

### Frontend
- Angular 20.0.3 (standalone components, signals)
- Angular Material 20.0.3 + CDK 20.0.3
- @angular/fire 19.2.0 (Firebase integration)
- RxJS 7.8.0 + Signals
- TypeScript 5.8.3
- Zone.js 0.15.0
- SCSS with Material theming
- Logo: 110% scale in sidebar
- **NEW**: afterNextRender for DOM operations
- **NEW**: Proper DI patterns to avoid circular dependencies

### State Management
- **Primary**: Firestore real-time listeners (for shared data)
- **Local State**: Angular Signals (for UI state)
- **Caching**: RxJS shareReplay + service patterns
- **No NgRx/Akita needed** - Firebase provides state sync

### Backend  
- Firebase 11.9.1 (serverless)
- Firestore + Auth + Storage
- Hosting: https://fibreflow-73daf.web.app
- Project ID: fibreflow-73daf
- Firebase Account: louis@velocityfibreapp.com (Google Workspace)

## 🛡️ antiHall - AI Hallucination Detection (100% Coverage)

### Simple Anti-Hallucination Tool
**antiHall** is a lightweight tool that validates AI-generated code against your actual codebase. No complex setup, no cloud services, just simple and effective validation.

#### Quick Usage:
```bash
# Parse your codebase (two options)
cd antiHall && npm run parse:improved  # RECOMMENDED - 100% coverage

# Check AI-generated code
npm run check "this.authService.loginWithMagicLink('user@example.com')"
# Result: ❌ Method 'loginWithMagicLink' doesn't exist!
```

#### Enhanced Parser Coverage (v2.0)
The improved parser now captures **512 total entities** (vs 263 in basic):
- ✅ 96 Components (with static methods)
- ✅ 39 Services (including those without @Injectable)
- ✅ 218 Interfaces (complete type coverage)
- ✅ 69 Functions (exported utilities)
- ✅ 2 Guards (authGuard, roleGuard)
- ✅ 2 Interceptors (errorInterceptor, loadingInterceptor)
- ✅ 37 Enums
- ✅ 47 Type Aliases
- ✅ 1 Directive
- ✅ 1 Abstract Class

#### Smart File Management
Knowledge graphs are automatically split into chunks:
```
knowledge-graphs/
├── index.json          # Quick lookup: name → chunk file
├── summary.json        # Overview & statistics
├── chunk-0-components.json    # ~200MB max per chunk
├── chunk-1-services.json
└── ...
```

#### For AI Assistants Using antiHall
When Claude needs to verify code:
1. Check `knowledge-graphs/summary.json` for overview
2. Use `knowledge-graphs/index.json` to find entity location
3. Load only the specific chunk needed

#### How It Works:
1. **Parse**: Scans codebase with TypeScript AST parser
2. **Split**: Automatically chunks large graphs under 200MB
3. **Index**: Creates lookup tables for fast navigation
4. **Check**: Validates AI code against real patterns

#### What It Detects:
- Non-existent service methods
- Invalid functional guards/interceptors
- Missing utility functions
- Wrong static method calls
- Invalid RxJS operators  
- Incorrect Angular lifecycle hooks
- Wrong imports from Angular modules
- Misspelled properties and methods
- Invalid Angular Material/CDK imports
- Firebase/AngularFire pattern violations
- TypeScript strict mode violations

### DevOps
- Angular CLI 20.0.3
- Node.js 20.19.2 (minimum required)
- npm 10.8.2
- ESLint 8.57.1 + Angular ESLint 20.0.0
- Prettier 3.5.3 (configured)
- Karma 6.4.0 + Jasmine 5.6.0
- Sentry 9.30.0 (error tracking)
- Pre-deploy scripts with quality checks
- Global error handling
- TypeScript strict mode

### Firebase CI/CD Authentication
- **Status**: ✅ **SERVICE ACCOUNT AUTHENTICATION** (Reliable & Permanent)
- **Location**: `fibreflow-service-account.json` + `firebase-login/` folder
- **Setup**: Run `./firebase-login/setup-permanent-auth.sh` (one-time)
- **Deploy**: `firebase deploy --only hosting` (works every time!)
- **Alternative Deploy**: `./firebase-login/deploy-with-service-account.sh`
- **Why Service Account**: Never expires, no browser needed, 100% reliable
- **Full Documentation**: See `firebase-login/README.md` for complete guide

## Project Structure
```
fibreflow-v2/
├── src/
│   ├── app/
│   │   ├── core/               # Singleton services
│   │   │   ├── services/       # Auth, API services
│   │   │   ├── guards/         # Route guards
│   │   │   ├── interceptors/   # HTTP interceptors
│   │   │   └── models/         # TypeScript interfaces
│   │   ├── features/           # Feature modules
│   │   │   ├── projects/       # Project management
│   │   │   ├── workflow/       # Workflow designer
│   │   │   └── tasks/          # Task management
│   │   ├── shared/             # Shared module
│   │   │   └── components/     # Reusable components
│   │   └── layout/             # App shell
│   ├── environments/           # Firebase config
│   └── manifest.json          # PWA manifest ✨
├── functions/                  # Cloud Functions
├── firebase.json              # Firebase config
├── firestore.rules           # Security rules
└── storage.rules             # Storage rules
```

## 📁 File & Folder Organization Standards

### Feature Module Structure
Each feature module should follow this consistent structure:
```
features/
└── [feature-name]/
    ├── components/           # Feature-specific components
    ├── pages/               # Routable page components
    ├── services/            # Feature services
    ├── models/              # Feature models/interfaces
    ├── guards/              # Feature-specific guards (if any)
    ├── pipes/               # Feature-specific pipes (if any)
    ├── directives/          # Feature-specific directives (if any)
    └── [feature].routes.ts  # Feature routing configuration
```

### Organization Rules
1. **NO Empty Folders**: Remove empty folders immediately or add `.gitkeep` if placeholder needed
2. **Pages vs Components**: 
   - `pages/` = Routable components (accessed via routes)
   - `components/` = Reusable components used within pages
3. **Core Module**: Only framework-wide singletons (auth, error handling, etc.)
4. **Documentation**: All docs in root `/docs` folder, NOT mixed with source code
5. **Test Files**: Keep `.spec.ts` files alongside their components
6. **Model Files**: Always use `.model.ts` suffix for consistency

### Naming Conventions
- **Files**: `kebab-case.type.ts` (e.g., `user-profile.model.ts`)
- **Components**: `component-name.component.ts/html/scss/spec.ts`
- **Services**: `service-name.service.ts`
- **Models**: `model-name.model.ts`
- **Guards**: `guard-name.guard.ts`
- **Documentation/Planning**: `FEATURE_PURPOSE_DESCRIPTION_YYYY-MM-DD.md` (e.g., `POLE_REPORTS_IMPLEMENTATION_PLAN_2025-07-24.md`)
  - Use CAPS_WITH_UNDERSCORES for clarity
  - Include feature name, purpose, and date
  - Be specific and descriptive in naming

### 📂 Data & Report File Organization (CRITICAL)
**ALWAYS follow this structure for data files and reports:**

```
OneMap/
├── data/                     # Raw data files (CSV, Excel)
│   ├── daily/               # Daily uploads
│   │   └── YYYY-MM-DD/     # Date-organized
│   └── archive/            # Historical data
├── Reports/                 # Generated reports (capital R)
│   ├── poles/              # Pole-specific reports
│   ├── drops/              # Drop analysis reports
│   ├── daily-processing/   # Daily processing reports
│   └── analysis/           # General analytics
├── docs/                   # Technical documentation
├── scripts/               # Processing scripts
└── config/               # Configuration files
```

**File Placement Rules:**
1. **Analysis Reports** → `OneMap/Reports/[category]/`
2. **Raw Data** → `OneMap/data/[type]/`
3. **Processing Scripts** → `OneMap/scripts/`
4. **Documentation** → `OneMap/docs/` (technical) or `/docs/` (project-wide)

**Examples:**
- ✅ `OneMap/Reports/poles/CORRECTED_POLE_STATUS_ANALYSIS_2025-07-24.md`
- ✅ `OneMap/Reports/daily-processing/processing_2025-07-24_Lawley.md`
- ❌ `OneMap/CORRECTED_POLE_STATUS_ANALYSIS_2025-07-24.md` (wrong location!)
- ❌ `OneMap/some-random-analysis.md` (no structure!)

### Import Organization
Always organize imports in this order:
1. Angular core imports
2. Angular common/forms/router imports  
3. Angular Material imports
4. Third-party library imports
5. Core module imports
6. Feature module imports
7. Relative imports (...)

### Keep It Tidy
- Run `npm run lint` before commits
- Remove unused imports immediately
- Delete commented-out code
- Keep consistent file structure across all features
- Review empty folders regularly

### Angular 18+ Alignment
- **NO NgModules**: All features must use standalone components
- **Flat Structure**: Avoid deep nesting unless logically grouped
- **Lazy Loading**: Use loadComponent() in routes, not loadChildren()
- **Inject Pattern**: Always use inject() not constructor injection
- **Signals**: Prefer signals over BehaviorSubject for state

### Special Cases
- **Barrel Exports**: Optional - use `index.ts` for public APIs when needed
- **Config Files**: Feature-specific config as `[feature].config.ts` when needed
- **Empty Folders**: Create folders ONLY when you have content to add
- **Test Files**: Always create `.spec.ts` alongside components

## 🚨 CRITICAL: Theme System Usage

### Theme Implementation (ALWAYS USE THIS)
```scss
// ✅ BEST - Use component-theming for everything
@use '../../../styles/component-theming' as theme;

.my-component {
  @include theme.card-theme();         // Use mixins for patterns
  color: theme.ff-rgb(foreground);     // Direct color access
  padding: theme.ff-spacing(xl);       // Spacing functions
}
```

**MUST use namespace prefixes:**
- `theme.ff-rgb()` NOT `ff-rgb()`
- `theme.ff-spacing()` NOT `ff-spacing()`

## Key Implementation Patterns

### 1. Date Handling (ALWAYS use mat-datepicker)
```html
<mat-form-field>
  <mat-label>Select Date</mat-label>
  <input matInput [matDatepicker]="picker" formControlName="date">
  <mat-datepicker-toggle matIconSuffix [for]="picker"></mat-datepicker-toggle>
  <mat-datepicker #picker></mat-datepicker>
</mat-form-field>
```

### 2. Currency Formatting (ZAR)
```typescript
formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR'
  }).format(value);
}
```

### 3. Angular Patterns (ALWAYS standalone)
```typescript
@Component({
  selector: 'app-example',
  standalone: true,
  imports: [CommonModule, MatCardModule],
  template: `...`
})
export class ExampleComponent {
  private service = inject(MyService); // Always use inject()
}
```

### 4. Firebase Integration (ALWAYS AngularFire with Real-time)
```typescript
// ✅ PREFERRED - Real-time listeners for shared data
import { Firestore, collection, collectionData } from '@angular/fire/firestore';
const firestore = inject(Firestore);
projects$ = collectionData(collection(firestore, 'projects'), { idField: 'id' });

// ✅ SIGNALS - For local UI state
private selectedProjectId = signal<string | null>(null);
selectedProject = computed(() => 
  this.projects().find(p => p.id === this.selectedProjectId())
);

// ✅ DEFERRED INITIALIZATION - For Firebase collections
private logsCollection?: CollectionReference;
private getLogsCollection(): CollectionReference {
  if (!this.logsCollection) {
    this.logsCollection = collection(this.firestore, 'debug-logs');
  }
  return this.logsCollection;
}

// ❌ AVOID - One-time reads (unless truly needed)
const snapshot = await getDocs(collection(firestore, 'projects'));
```

## Common Issues & Solutions

### 1. Circular Dependencies (NG0200 Error)
- **Problem**: Services injecting each other in a circular pattern
- **Solution**: 
  - Remove circular service dependencies
  - Use `afterNextRender` for deferred initialization
  - Separate error handling from logging concerns
- **Detection**: Look for NG0200 errors in browser console
- **Example Fix**: Removed `RemoteLoggerService` from `SentryErrorHandlerService`

### 2. Missing Phases in Projects
- **Solution**: Added initialization button for existing projects
- **Check**: `project.phases?.length === 0`

### 3. Data Capture Appearing Saved But Not in Database (Fixed: 2025-07-21)
- **Problem**: Users see "saved successfully" but data doesn't persist to Firebase
- **Root Cause**: 
  - Firebase offline persistence enabled (`enableIndexedDbPersistence`)
  - UI shows success immediately after local IndexedDB save
  - Navigation happens before Firebase sync completes
  - Browser cache/IndexedDB cleared before sync
- **Symptoms**:
  - User captures data, sees success message
  - Data visible in app temporarily (from IndexedDB cache)
  - After refresh/restart, data is gone
  - NOT a connection issue - affects desktop users with good internet
- **Solution Implemented (using Firebase's waitForPendingWrites)**:
  1. Show "Saving to cloud..." status during save
  2. Use `waitForPendingWrites()` to ensure server sync
  3. Only show success after Firebase confirms server write
  4. Prevent navigation with unsaved changes
  5. Add retry mechanism for failed saves
  6. Browser warning on page unload with unsaved data
- **Technical Implementation**:
  ```typescript
  // In service:
  return from(
    addDoc(collection, data).then(async (docRef) => {
      await waitForPendingWrites(this.firestore);
      return docRef.id;
    })
  );
  ```
- **Files Modified**:
  - `daily-kpis.service.ts` - Added `waitForPendingWrites` to create/update methods
  - `daily-kpis-enhanced-form.component.ts` - Updated UI feedback timing
- **Prevention**: Always use `waitForPendingWrites()` for critical data capture operations

## 📐 Page Layout Conventions

### Standard List Page Structure
```scss
.[feature]-list-container {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.table-container {
  background: var(--mat-sys-surface);
  border-radius: 8px;
  overflow: hidden;
  box-shadow: var(--mat-sys-elevation-1);
  border: 1px solid var(--mat-sys-outline-variant);
}
```

## 🚨 CODE QUALITY RULES

### TypeScript Rules
✅ **No `any` types** - Use proper types or `unknown`
✅ **Remove unused imports** - Clean as you code
✅ **Add return types** - All functions need explicit returns
✅ **Prefix unused params** - Use `_paramName`

### Angular Rules  
✅ **Use inject()** - No constructor injection
✅ **Standalone components** - No NgModules
✅ **No empty methods** - Remove or add meaningful code

### Pre-Deploy Checklist
```bash
npm run check:fix  # Auto-fix what's possible
npm run lint       # Check remaining issues
npm run build      # Verify build works
npm run deploy     # Deploy with pre-checks
```

## 🚨 Node.js Version Management Best Practices

### NEVER Use Hardcoded Node Paths
❌ **WRONG**: 
```bash
alias claude="/home/ldp/.nvm/versions/node/v18.20.7/bin/claude"
node /home/ldp/.nvm/versions/node/v18.20.7/bin/something
```

✅ **CORRECT**: 
```bash
# Dynamic path resolution
CLAUDE_CLI=$(find "$HOME/.nvm/versions/node" -name "cli.js" -path "*/claude-code/*" | head -1)
node "$CLAUDE_CLI"

# Or use nvm to ensure correct version
source ~/.nvm/nvm.sh && nvm use default
```

### Setting Default Node Version
```bash
# Set v20 as default
nvm alias default 20.19.2

# Always load nvm in scripts
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
```

### Key Principles
1. **Use dynamic paths** - Never hardcode version-specific paths
2. **Load nvm in scripts** - Ensure nvm is available before using Node
3. **Set proper defaults** - Use `nvm alias default` for persistent version
4. **Use `command -v`** - Check if commands exist before using them
5. **Fail gracefully** - Provide meaningful error messages

## Core Features & Routes

### Main Routes
- `/dashboard` - Role-based dashboard
- `/projects` - Project list and management
  - **NEW: Steps Management** - Intermediate layer between phases and tasks in project detail view
- `/tasks` - Task board (Kanban/Gantt)
- `/roles` - Role management
- `/stock-movements` - Stock tracking
- `/staff` - Staff management
- `/suppliers` - Supplier management

### User Roles
- **Admin**: Full system access
- **Project Manager**: Manage projects, assign tasks
- **Team Lead**: Manage team tasks
- **Field Technician**: View/update assigned tasks only
- **Client**: View project progress only

### Workflow System
- Fixed 5-Phase: Planning → Design → Implementation → Testing → Deployment
- Parallel execution, complex dependencies, auto-assignment

## 🗄️ Firestore Database Structure & Project Isolation

### Database Architecture
FibreFlow uses **ONE Firestore database** with hierarchical collections. Each project's data is completely isolated using unique IDs.

### Hierarchical Structure
```
firestore-root/
├── projects/ (collection)
│   ├── {projectId}/ (document)
│   │   ├── id: "kSFwvjb24zn1MgxS3VUU"
│   │   ├── title: "Fiber Installation - Mall"
│   │   ├── client: { id, name }
│   │   ├── status: "active"
│   │   ├── ...other project fields
│   │   │
│   │   ├── phases/ (subcollection)
│   │   │   ├── {phaseId}/ (document)
│   │   │   │   ├── name: "Planning Phase"
│   │   │   │   ├── projectId: "kSFwvjb24zn1MgxS3VUU"
│   │   │   │   └── ...phase fields
│   │   │   └── {phaseId}/
│   │   │
│   │   └── steps/ (subcollection)
│   │       ├── {stepId}/ (document)
│   │       │   ├── name: "Site Survey"
│   │       │   ├── phaseId: "{phaseId}"
│   │       │   └── projectId: "kSFwvjb24zn1MgxS3VUU"
│   │       └── {stepId}/
│   │
│   └── {projectId}/ (another project - completely separate)
│
├── tasks/ (collection - flat structure for queries)
│   ├── {taskId}/ (document)
│   │   ├── name: "Conduct site survey"
│   │   ├── projectId: "kSFwvjb24zn1MgxS3VUU"  ← Links to project
│   │   ├── phaseId: "{phaseId}"                ← Links to phase
│   │   ├── stepId: "{stepId}"                  ← Links to step
│   │   ├── status: "completed"
│   │   ├── assignedTo: "{userId}"
│   │   └── ...task fields
│   └── {taskId}/
│
├── staff/ (collection - global)
├── stock-items/ (collection - global)
└── suppliers/ (collection - global)
```

### Project Data Isolation

#### Key Principle: Project ID Links Everything
Every project-specific document contains a `projectId` field that ensures complete data isolation:

```typescript
// Task model shows the linking
interface Task {
  id?: string;           // Unique task ID
  projectId: string;     // Links to specific project
  phaseId: string;       // Links to specific phase
  stepId?: string;       // Links to specific step (if applicable)
  name: string;
  status: TaskStatus;
  assignedTo?: string;
  // ...other fields
}
```

#### Querying Project-Specific Data
```typescript
// Get all tasks for a specific project
taskService.getTasksByProject('kSFwvjb24zn1MgxS3VUU')
// Returns ONLY tasks where projectId === 'kSFwvjb24zn1MgxS3VUU'

// Get all phases for a specific project
phaseService.getPhasesByProject('kSFwvjb24zn1MgxS3VUU')
// Returns ONLY phases in that project's subcollection
```

### Important: Project Templates vs Project Data

1. **Templates** (defined in code):
   - `TASK_TEMPLATES` in `/tasks` page
   - `PHASE_TEMPLATES` for standard phases
   - `STEP_TEMPLATES` for standard steps
   - These are blueprints, not actual data

2. **Actual Project Data** (in Firestore):
   - Created when project is initialized
   - Each task/phase/step gets a unique database ID
   - Status, assignments, completion tracked per project
   - Changes are saved to specific project's documents

### Example: Task Management Flow
```typescript
// 1. New project created
const project = await projectService.createProject({
  title: "New Fiber Installation",
  client: clientData
});
// Creates: projects/{newProjectId}

// 2. Initialize phases/steps/tasks from templates
await taskService.initializeProjectTasks(project.id);
// Creates: Multiple task documents with projectId = project.id

// 3. User marks task complete
await taskService.updateTask(taskId, {
  status: TaskStatus.COMPLETED,
  completedDate: new Date()
});
// Updates: Specific task document, only affects this project

// 4. Query project tasks
const tasks = await taskService.getTasksByProject(project.id);
// Returns: Only tasks for this specific project
```

### Best Practices for Project Isolation

1. **Always include projectId** in queries:
   ```typescript
   // ✅ Good - Project-specific
   where('projectId', '==', projectId)
   
   // ❌ Bad - Returns all projects' data
   collection(firestore, 'tasks')
   ```

2. **Use subcollections for hierarchical data**:
   ```typescript
   // ✅ Good - Natural hierarchy
   doc(firestore, 'projects', projectId, 'phases', phaseId)
   
   // ❌ Avoid - Flat structure for hierarchical data
   doc(firestore, 'phases', phaseId)
   ```

3. **Initialize project data from templates**:
   ```typescript
   // Templates → Project-specific data
   TASK_TEMPLATES.forEach(template => {
     createTask({
       ...template,
       projectId: newProjectId,  // Critical: Link to project
       id: generateId()          // Unique ID for this instance
     });
   });
   ```

## Firestore Schema (Core Models)

```typescript
interface Project {
  id: string;
  title: string;
  client: { id: string; name: string; };
  status: 'active' | 'completed' | 'pending' | 'on-hold';
  priority?: 'high' | 'medium' | 'low';
  location: string;
  startDate: Timestamp;
  type: 'FTTH' | 'FTTB' | 'FTTC' | 'P2P';
}

interface Task {
  id: string;
  projectId: string;    // Links to project
  phaseId: string;      // Links to phase
  stepId?: string;      // Links to step (optional)
  name: string;
  assigneeId: string;
  status: TaskStatus;
  dueDate: Timestamp;
}

interface Phase {
  id: string;
  projectId: string;    // Subcollection under project
  name: string;
  orderNo: number;
  status: PhaseStatus;
}

interface Step {
  id: string;
  projectId: string;    // Links to project
  phaseId: string;      // Links to phase
  name: string;
  orderNo: number;
  status: StepStatus;
}
```

## Development Commands

```bash
# Development
ng serve                    # Dev server (http://localhost:4200)

# Build & Deploy (NEW: Service Account Method)
npm run build              # Production build
firebase deploy --only hosting  # Deploy (uses service account - always works!)
./firebase-login/deploy-with-service-account.sh  # Alternative deploy script

# Old method (deprecated - tokens expire)
./deploy.sh prod           # Uses CI token (unreliable)
```

### Live URLs
- Production: https://fibreflow-73daf.web.app
- Firebase Console: https://console.firebase.google.com/project/fibreflow-73daf

## Project Status
- ✅ Dashboard, Projects, Staff, Stock (Items & Movements), Roles, Tasks
- 🚧 Suppliers, Clients, Contractors (basic implementation)
- ⏳ BOQ Management, RFQ Management, Reports & Analytics

## 📝 Quick Reference

### Always Remember
1. **Currency**: ZAR with `en-ZA` locale
2. **Dates**: mat-datepicker only, Firestore Timestamps
3. **Components**: Standalone, no NgModules
4. **Injection**: inject() pattern only
5. **Themes**: Test all 4 (light, dark, vf, fibreflow)
6. **Logo**: 110% scale in sidebar

### Key Files
- `CLAUDE.md` - This file
- `src/styles/_variables.scss` - Theme variables
- `src/app/app.routes.ts` - All routes
- `src/app/layout/app-shell/app-shell.component.ts` - Navigation
- `src/app/shared/modules/shared-material.module.ts` - Shared Material imports

## Common Pitfalls to Avoid
❌ NgModules ❌ Direct Firebase SDK ❌ Hardcoded colors/spacing
❌ Constructor injection ❌ `any` types ❌ Empty lifecycle methods
❌ Missing namespaces in SCSS ❌ Text inputs for dates

## 🔐 Firebase Admin SDK Security Solutions

### ✅ OneMap Authentication (SOLVED 2025-01-28)
**vf-onemap-data** authentication is now configured:
- Service account key: `OneMap/credentials/vf-onemap-service-account.json`
- Organization policies overridden for this project
- Ready for automated imports
- See: `OneMap/AUTHENTICATION_SETUP.md` for details

### Common Issue: "Firebase Admin SDK requires service account credentials"

This is a VERY common issue when trying to use Firebase Admin SDK from scripts. Here's the comprehensive solution:

### Solution 1: Use Firebase Client SDK Instead (RECOMMENDED for Admin Users)

**When to use**: When you're logged in as an admin user and need to run data operations.

```javascript
// Instead of Admin SDK:
const admin = require('firebase-admin');  // ❌ Requires service account

// Use Client SDK:
const { initializeApp } = require('firebase/app');  // ✅ Works with user auth
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const { getFirestore } = require('firebase/firestore');
```

**Example script** (`scripts/firebase-client-operations.js`):
```javascript
const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, collection, addDoc } = require('firebase/firestore');

// Your Firebase config (public - safe to commit)
const firebaseConfig = {
  apiKey: "...",
  authDomain: "fibreflow-73daf.firebaseapp.com",
  projectId: "fibreflow-73daf",
  // ... other config
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function runAsAdmin() {
  // Sign in as admin user
  await signInWithEmailAndPassword(auth, 
    process.env.ADMIN_EMAIL, 
    process.env.ADMIN_PASSWORD
  );
  
  // Now you can perform operations
  await addDoc(collection(db, 'test'), { data: 'value' });
}
```

### Solution 2: Use Firebase CLI for Simple Operations

**When to use**: For one-off data imports/exports or simple operations.

```bash
# Export data
firebase firestore:export gs://your-bucket/backup

# Import data
firebase firestore:import gs://your-bucket/backup

# Delete collection
firebase firestore:delete projects -r
```

### Solution 3: Create Service Account (When Absolutely Necessary)

**When to use**: For automated scripts, CI/CD, or when client SDK isn't sufficient.

1. **Create Service Account**:
   ```bash
   # Go to Firebase Console > Project Settings > Service Accounts
   # Click "Generate new private key"
   # Save as service-account.json
   ```

2. **NEVER commit service account to git!**:
   ```bash
   echo "service-account.json" >> .gitignore
   ```

3. **Use in script**:
   ```javascript
   const admin = require('firebase-admin');
   const serviceAccount = require('./service-account.json');
   
   admin.initializeApp({
     credential: admin.credential.cert(serviceAccount)
   });
   ```

### Solution 4: Use Environment Variable for Service Account

**Best practice for production**:

```javascript
// Store service account as base64 in .env.local
const serviceAccountBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
const serviceAccount = JSON.parse(
  Buffer.from(serviceAccountBase64, 'base64').toString()
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
```

### Quick Decision Guide

1. **Running local scripts as admin?** → Use Client SDK with admin login
2. **Simple data operations?** → Use Firebase CLI
3. **Automated/CI scripts?** → Create service account (keep secure!)
4. **Production functions?** → Use environment variables

### Security Checklist
- [ ] Service account files in .gitignore
- [ ] Admin credentials in .env.local (not committed)
- [ ] Use least privilege principle
- [ ] Rotate credentials regularly
- [ ] Monitor usage in Firebase Console

## 🦆 OneMap DuckDB Analytics System (NEW 2025-08-06)

### Overview
DuckDB-based analytics system for processing OneMap Excel exports with columnar storage for ultra-fast analytics.

### Location
**Directory**: `OneMap/DuckDB/`
**Documentation**: `OneMap/DuckDB/README.md`
**Plan**: `OneMap/DuckDB/DUCKDB_EXCEL_IMPORT_PLAN_2025-08-06.md`

### Key Features
- **Direct Excel Import** - Uses XLSX library to preserve all column names exactly
- **DuckDB Database** - Columnar storage optimized for analytics
- **Ultra-Fast Queries** - 10-100x faster than row-based databases
- **Multiple Export Formats** - Excel, CSV, JSON, Parquet
- **Low Memory Footprint** - Efficient columnar compression

### Firebase Storage Paths
```
# OneMap Excel files stored in Firebase Storage:
csv-uploads/[filename].xlsx

# Example:
csv-uploads/1754473447790_Lawley_01082025.xlsx

# Full URL format:
https://firebasestorage.googleapis.com/v0/b/fibreflow-73daf.appspot.com/o/csv-uploads%2F[filename]?alt=media
```

### Quick Commands
```bash
# Navigate to DuckDB directory
cd OneMap/DuckDB

# Install dependencies
npm install

# Import Excel file (preserves all 159 columns!)
node scripts/import-excel-final.js data/1754473447790_Lawley_01082025.xlsx

# Query the database
duckdb data/onemap.duckdb

# SQL Examples:
SELECT COUNT(*) FROM excel_import;
SELECT "Status", COUNT(*) FROM excel_import GROUP BY "Status";
SELECT * FROM excel_import WHERE "Pole Number" = 'LAW.P.B167';
```

### Import Results (Lawley 01082025)
- **Total Records**: 13,656
- **Unique Poles**: 3,799
- **Unique Drops**: 7,827
- **Records with Poles**: 11,473 (84%)
- **Records without Poles**: 2,183 (16%)
- **Total Columns**: 159 (all preserved from Excel)

### Status Distribution
1. Home Sign Ups: Approved & Installation Scheduled - 5,850
2. Pole Permission: Approved - 5,168
3. Home Installation: In Progress - 1,546
4. Home Sign Ups: Declined - 457
5. Home Installation: Installed - 200

### Data Schema
- `excel_import` - Main table with all 159 Excel columns
- Column names preserved exactly (use double quotes for spaces)
- Automatic type inference (INTEGER, DOUBLE, VARCHAR, DATE)
- Full Excel fidelity maintained

### Benefits vs SQLite/CSV
- ✅ Columnar storage (faster aggregations)
- ✅ Better compression (smaller files)
- ✅ Parallel query execution
- ✅ Native Parquet support
- ✅ Excel column names preserved exactly

## 🧘 Simplicity Guidelines

### When I (Claude) suggest solutions:
1. **Start with the dumbest thing that could work** - Often it's enough
2. **No new dependencies** unless absolutely necessary
3. **Use what already exists** - Angular has it, Firebase has it
4. **If it takes > 10 lines to explain** - it's probably too complex

### Real Examples from FibreFlow:
- **antiHall**: Just a JSON lookup (not AI analysis)
- **Theme System**: CSS variables (not complex theme engines)  
- **State Management**: Firestore (not Redux/NgRx)
- **Search**: Array.filter() (not Elasticsearch)

### Questions to challenge complexity:
- "What if we just used a simple array?"
- "Could this be a single Firebase query?"
- "Do we really need this abstraction?"
- "What would the 5-line version look like?"

**Remember: ENTERPRISE doesn't mean COMPLEX. Enterprise means RELIABLE, MAINTAINABLE, and SIMPLE enough for any developer to understand!**

## 📘 TypeScript 5.8 Best Practices & Deviations (2025-06-18)

### Current TypeScript Configuration
- **Version**: TypeScript 5.8.3 (latest stable)
- **Target**: ES2022
- **Module**: ES2022
- **Strict Mode**: ✅ Enabled (all strict flags on)
- **Module Resolution**: bundler (modern resolution)

### ✅ Best Practices We Follow
1. **Strict Type Checking**
   - `strict: true` in tsconfig.json
   - `noImplicitReturns: true`
   - `noFallthroughCasesInSwitch: true`
   - `noImplicitOverride: true`

2. **Modern TypeScript Features**
   - Using ES2022 features (top-level await, private fields)
   - Proper use of generics in services
   - Union types and type guards
   - Template literal types
   - Conditional types where appropriate

3. **Angular-Specific TypeScript**
   - Standalone components (no NgModules)
   - inject() pattern for DI
   - Signals for reactive state
   - Proper typing of Observables

### ⚠️ Current Deviations & Issues

#### 1. **Any Type Usage** (4 instances found)
**Problem**: Using `as any` casts instead of proper typing
**Files**:
- `stock.service.ts:475,479` - Category/UnitOfMeasure casts
- `boq.service.ts:171` - Firestore addDoc cast
- `staff.service.ts:172` - Firestore addDoc cast
- `boq-list.component.ts:456` - formatDate parameter

**Solution**: Create proper type definitions or use type guards

#### 2. **Missing TypeScript 5.x Features**
**Not Yet Adopted**:
- `const` type parameters (5.0+)
- `satisfies` operator (4.9+)
- `using` declarations for resource management (5.2+)
- Decorator metadata (5.0+)

#### 3. **Firestore Type Safety**
**Problem**: Loose typing with Firestore operations
**Current**:
```typescript
addDoc(collection, data as any)  // ❌ Bad
```
**Should Be**:
```typescript
addDoc<T>(collection: CollectionReference<T>, data: T)  // ✅ Good
```

### 📋 TypeScript Improvement Plan

#### Phase 1: Eliminate Any Types (Immediate)
1. **Fix Firestore Casts**:
   ```typescript
   // Instead of:
   addDoc(this.staffCollection, newStaff as any)
   
   // Use:
   private staffCollection = collection(this.firestore, 'staff') as CollectionReference<Staff>;
   addDoc(this.staffCollection, newStaff)
   ```

2. **Fix Enum Casts**:
   ```typescript
   // Instead of:
   category: item.category as any
   
   // Use proper enum types:
   category: item.category as StockCategory
   ```

3. **Fix Date Parameter**:
   ```typescript
   // Instead of:
   formatDate(date: any): string
   
   // Use:
   formatDate(date: Date | Timestamp | string): string
   ```

#### Phase 2: Adopt Modern TypeScript Features
1. **Use `satisfies` for Better Type Inference**:
   ```typescript
   // Current:
   const config: AppConfig = { ... }
   
   // Better:
   const config = { ... } satisfies AppConfig
   ```

2. **Use `const` Type Parameters**:
   ```typescript
   // For generic functions that don't modify types:
   function getValue<const T>(obj: T): T[keyof T]
   ```

3. **Resource Management with `using`**:
   ```typescript
   // For cleanup operations:
   using subscription = observable$.subscribe()
   // Auto-cleanup when scope ends
   ```

#### Phase 3: Enhanced Type Safety
1. **Branded Types for IDs**:
   ```typescript
   type ProjectId = string & { __brand: 'ProjectId' }
   type UserId = string & { __brand: 'UserId' }
   ```

2. **Template Literal Types for Routes**:
   ```typescript
   type AppRoute = `/projects/${string}` | `/users/${string}` | '/dashboard'
   ```

3. **Discriminated Unions for State**:
   ```typescript
   type LoadingState<T> = 
     | { status: 'idle' }
     | { status: 'loading' }
     | { status: 'success'; data: T }
     | { status: 'error'; error: Error }
   ```

### 🛠️ Immediate Actions Required

1. **Add ESLint Rule**:
   ```json
   "@typescript-eslint/no-explicit-any": "error"
   ```

2. **Update Firestore Service Pattern**:
   ```typescript
   // Create typed collection references
   private getTypedCollection<T>(path: string) {
     return collection(this.firestore, path) as CollectionReference<T>;
   }
   ```

3. **Create Type Guards**:
   ```typescript
   function isValidDate(value: unknown): value is Date {
     return value instanceof Date && !isNaN(value.getTime());
   }
   ```

### 📚 TypeScript Resources
- [TypeScript 5.8 Release Notes](https://devblogs.microsoft.com/typescript/announcing-typescript-5-8/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [Angular TypeScript Style Guide](https://angular.dev/style-guide)
- [Type Challenges](https://github.com/type-challenges/type-challenges) for practice

### 🎯 Goal
Achieve 100% type safety with zero `any` types and leverage modern TypeScript features for better developer experience and runtime safety.

## 📘 TypeScript Best Practices Reminder

### ALWAYS Use Latest TypeScript Features
- **Check Documentation**: Your training data is outdated. Always verify TypeScript features at https://www.typescriptlang.org/docs/
- **Use MCP Tools**: When implementing TypeScript patterns, use `context7` or `WebFetch` to check latest best practices
- **Modern Features to Use**:
  - `satisfies` operator (4.9+) - Better than type annotations
  - `const` type parameters (5.0+) - Preserve literal types
  - `using` declarations (5.2+) - Resource management
  - Template literal types - Type-safe strings
  - Branded types - Prevent ID mixing

### Type Safety Checklist
- [ ] Zero `any` types (ESLint will error)
- [ ] Use branded types for all entity IDs
- [ ] Use discriminated unions for state
- [ ] Use type guards for validation
- [ ] Use `satisfies` for configs
- [ ] Use template literals for routes

### Import Type Utilities
```typescript
// Always available - use these!
import { 
  // Type guards
  isDefined, isValidDate, toDate, DateLike,
  // Branded types
  ProjectId, UserId, toProjectId,
  // State types
  LoadingState, FormState, 
  // Route types
  AppRoute, projectRoute,
  // Utils
  pick, omit, tuple, createEnum
} from '@app/core/types';
```

## 📧 Email System Documentation

### Overview
FibreFlow uses Firebase Email Extension for email delivery. The system evolved from a complex logging-based approach to a simplified direct-sending approach for better reliability.

### Email Services
1. **EmailLogService** (`/src/app/features/emails/services/email-log.service.ts`)
   - Original service with comprehensive logging and confirmation flow
   - Creates email logs for tracking and history
   - Handles cc/bcc fields with proper undefined checking

2. **RFQFirebaseEmailSimpleService** (`/src/app/features/quotes/services/rfq-firebase-email-simple.service.ts`)
   - Simplified service for direct RFQ email sending
   - Bypasses complex logging for immediate delivery
   - Monitors delivery status in real-time

### Common Issues & Solutions

#### Issue: "Unsupported field value: undefined"
**Cause**: Firebase doesn't accept undefined values in documents
**Solution**: Remove undefined fields before sending
```typescript
// Remove any undefined properties
Object.keys(emailDoc).forEach(key => {
  if (emailDoc[key] === undefined) {
    delete emailDoc[key];
  }
});
```

#### Issue: Emails stuck spinning/sending
**Cause**: Complex logging flow or browser cache issues
**Solution**: 
1. Use simplified email service
2. Hard refresh browser (Ctrl+Shift+R)
3. Clear pending emails using fix script

#### Issue: Large PDF attachments
**Cause**: Base64 encoding increases size by ~33%
**Solution**: Check PDF size before attaching, use links for large files

### Email Document Structure
```typescript
{
  to: string[],              // Required: recipient emails
  from: string,              // Required: sender email (use simple format)
  message: {
    subject: string,         // Required
    text: string,            // Required: plain text
    html: string,            // Optional: HTML version
    attachments?: [{         // Optional
      filename: string,
      content: string,       // Base64 encoded
      encoding: 'base64'
    }]
  },
  cc?: string[],            // Optional: Only include if has values
  bcc?: string[]            // Optional: Only include if has values
}
```

### Testing & Debugging

#### Test Email from Console
```javascript
const { getFirestore, collection, addDoc } = await import('https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js');
const db = getFirestore();

const emailDoc = {
  to: ['test@example.com'],
  from: 'noreply@velocityfibre.com',
  message: {
    subject: 'Test Email',
    text: 'This is a test',
    html: '<p>This is a test</p>'
  }
};

const docRef = await addDoc(collection(db, 'mail'), emailDoc);
console.log('Email sent:', docRef.id);
```

#### Debug Scripts
- `/scripts/fix-pending-emails.js` - Cancel stuck emails
- `/scripts/test-rfq-email-simple.js` - Test RFQ email sending
- `/scripts/debug-rfq-email.js` - Analyze email issues

### Best Practices
1. **Always handle undefined values** - Check before adding to documents
2. **Use simple from addresses** - Avoid complex formatting
3. **Monitor attachment sizes** - Keep under 10MB
4. **Clear browser cache** - When updates don't appear
5. **Use appropriate service** - Simple for RFQ, LogService for tracking

### Key Files Reference
- Email services: `/src/app/features/emails/services/`
- RFQ email services: `/src/app/features/quotes/services/`
- Email models: `/src/app/features/emails/models/email.model.ts`
- Debug scripts: `/scripts/*email*.js`

### For more details, see:
- `/docs/EMAIL_SYSTEM_DOCUMENTATION.md` - Comprehensive email system guide

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

9. **OneMap Import System** 🚧
   - Project Development Plan: `OneMap/ONEMAP_IMPORT_TRACKING_SYSTEM.md`
   - Daily CSV import with duplicate prevention
   - Field-level change tracking
   - Comprehensive audit trail
   - **NEW: Broader Tracking Hierarchy** (2025-07-22)
     - Tracks ALL entities: Poles, Drops, Addresses, Properties
     - Priority order: Pole → Drop → Address → Property ID
     - Captures early-stage records without pole numbers
     - See `OneMap/CLAUDE.md` for full tracking hierarchy details
   - Status: Ready for implementation

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
- **OneMap Import System**: `OneMap/ONEMAP_IMPORT_TRACKING_SYSTEM.md` - Daily CSV import with change tracking
- **Commands**: `.claude/commands/` - Slash commands
- **antiHall**: `antiHall/` - Hallucination prevention

---

## Secret Management Guidelines

### Where We Store Secrets

1. **Firebase Service Account** (Primary Authentication - RECOMMENDED)
   - **Location**: `fibreflow-service-account.json`
   - **Purpose**: Firebase authentication that never expires
   - **Setup**: `./firebase-login/setup-permanent-auth.sh`
   - **Benefits**: No browser needed, 100% reliable, works in CI/CD
   - **Note**: This file is gitignored

2. **Local Development Secrets** (Never committed to Git)
   - **Location**: `.env.local`
   - **Purpose**: Local development credentials, API keys, passwords
   - **Example**: Fireflies API key, Firebase CI tokens (deprecated)
   - **Note**: This file is gitignored and only exists on your local machine

3. **Firebase Functions Config** (For deployed functions)
   - **Set via CLI**: `firebase functions:config:set service.key="value"`
   - **Example**: `firebase functions:config:set fireflies.api_key="[VALUE FROM .env.local]"`
   - **Retrieve**: `firebase functions:config:get`
   - **Note**: These are stored securely in Firebase and not in code

4. **Firebase Environment Variables** (For Angular app)
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

### 🚀 Preferred Deployment Method (Service Account)
```bash
# One-time setup (run once)
./firebase-login/setup-permanent-auth.sh
source ~/.bashrc

# Deploy (always works!)
firebase deploy --only hosting

# Or use the deploy script
./firebase-login/deploy-with-service-account.sh
```

### Traditional Deployment Commands (Deprecated)
```bash
# To deploy Fireflies API key (get value from .env.local)
firebase functions:config:set fireflies.api_key="[CHECK .env.local]"

# To verify configuration
firebase functions:config:get

# To deploy functions
firebase deploy --only functions

# Note: CI token method often fails with "credentials no longer valid"
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

*Last updated: 2025-01-30*
---

## 🤖 Claude Code Sub-Agents & Hooks System (NEW - 2025-01-29)

### Overview
FibreFlow now has a powerful multi-agent system with hooks for observability and control. This enables parallel processing, automated validation, and comprehensive logging.

### Architecture
```
.claude/
├── agents/
│   ├── yaml/              # Sub-agent configurations
│   │   ├── data-integrity-guardian.yaml
│   │   ├── csv-validator.yaml
│   │   ├── security-agent.yaml
│   │   └── meta-agent.yaml (builds other agents)
│   └── workflows/         # Multi-agent workflows
├── hooks/                 # Lifecycle hooks
│   ├── pre_tool_use.py   # Validates before execution
│   ├── post_tool_use.py  # Logs all operations
│   ├── stop.py           # Session completion
│   ├── notification.py   # User interactions
│   └── sub_agent_stop.py # Sub-agent tracking
├── utils/                 # Shared utilities
│   ├── fibreflow_validators.py
│   ├── log_analyzer.py
│   └── notify.py
└── logs/                 # Automatic logging
```

### Key Features

#### 1. Data Integrity Validation
- **Automatic pole/drop validation** on every write operation
- **Uniqueness enforcement** for pole numbers globally
- **Capacity limits** (max 12 drops per pole)
- **Format validation** for all identifiers

#### 2. Sub-Agent System
Available agents:
- `data-integrity-guardian` - Validates all data operations
- `csv-validator` - Pre-import validation
- `status-tracker` - Workflow state tracking
- `report-generator` - Comprehensive reporting
- `security-agent` - Security guidance
- `meta-agent` - Creates new agents

#### 3. Observability
- **Every tool use logged** with context
- **Performance metrics** for all agents
- **Daily analytics** dashboard
- **Error tracking** and alerting

### Usage Examples

#### Call a Sub-Agent
```
Use the data-integrity-guardian to validate these pole numbers:
LAW.P.B167, LAW.P.C234, MOH.P.A001
```

#### View Analytics
```bash
./claude/view-logs.sh
# Select option 1 for dashboard
```

#### Create New Agent
```
Use the meta-agent to create a new sub-agent for handling invoice processing
```

### Hook System

#### Pre-Tool Validation
Automatically blocks:
- Dangerous commands (rm -rf, etc.)
- Invalid pole/drop formats
- Protected file access
- Data integrity violations

#### Post-Tool Logging
Tracks:
- All file modifications
- Command executions
- API calls
- Performance metrics

### Workflows

#### OneMap Import Workflow
```
Use the onemap-import-workflow to process the May 26 CSV file
```
Automatically:
1. Validates CSV format
2. Checks data integrity
3. Processes import
4. Tracks status changes
5. Generates report

#### Daily Operations
```
Run the daily-operations-workflow for system health check
```

### Monitoring

View real-time analytics:
```bash
# Dashboard
python3 .claude/utils/log_analyzer.py

# Specific reports
python3 .claude/utils/log_analyzer.py --report tools
python3 .claude/utils/log_analyzer.py --report agents
python3 .claude/utils/log_analyzer.py --report integrity
```

### Benefits
1. **Parallel Processing** - Multiple agents work simultaneously
2. **Automatic Validation** - Catches errors before they happen
3. **Full Audit Trail** - Every action logged
4. **Isolated Contexts** - Agents don't interfere
5. **Scalable** - Easy to add new agents/workflows

### Important Notes
- Hooks run automatically (no manual intervention needed)
- Logs are kept for 7 days by default
- Sub-agents have no conversation context
- Workflows can chain multiple agents
- All validations happen in real-time

---

## Agent Notes
### Claude Code Sub-Agents Implementation - 2025-01-29
Successfully implemented comprehensive sub-agent system with hooks for FibreFlow. System provides automatic data validation, parallel processing capabilities, and full observability of all operations.

