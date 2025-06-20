# FibreFlow - Project Context for Claude

## 🎯 CORE PRINCIPLE: Simplicity First
**"Everything should be made as simple as possible, but not simpler."** — Einstein

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

## 🛡️ antiHall - AI Hallucination Detection

### Simple Anti-Hallucination Tool
**antiHall** is a lightweight tool that validates AI-generated code against your actual codebase. No complex setup, no cloud services, just simple and effective validation.

#### Quick Usage:
```bash
# Parse your codebase (run once)
cd antiHall && npm run parse

# Check AI-generated code
npm run check "this.authService.loginWithMagicLink('user@example.com')"
# Result: ❌ Method 'loginWithMagicLink' doesn't exist!
```

#### How It Works:
1. **Parse**: Scans your codebase and builds a knowledge graph (JSON file)
2. **Check**: Validates AI code suggestions against real methods/services
3. **Report**: Shows exactly what's wrong and suggests valid alternatives

#### Common Issues:
1. **Permission Error**: If you get gcloud permission errors, the Firebase CLI login may need to be refreshed:
   ```bash
   firebase logout && firebase login
   ```

2. **MCP Not Loading**: Restart Claude Code session to pick up new MCP configuration

3. **Environment Variables**: The system automatically sets `FIREBASE_PROJECT_ID=fibreflow-73daf`

#### What It Detects:
- Non-existent service methods
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

### Import Organization
Always organize imports in this order:
1. Angular core imports
2. Angular common/forms/router imports  
3. Angular Material imports
4. Third-party library imports
5. Core module imports
6. Feature module imports
7. Relative imports (./...)

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
  projectId: string;
  phaseId: string;
  name: string;
  assigneeId: string;
  status: TaskStatus;
  dueDate: Timestamp;
}
```

## Development Commands

```bash
# Development
ng serve                    # Dev server (http://localhost:4200)

# Build & Deploy
npm run build              # Production build
firebase deploy            # Full deployment
./DEPLOY_NOW.sh           # Quick deploy (if available)
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
- `claude.md` - This file
- `src/styles/_variables.scss` - Theme variables
- `src/app/app.routes.ts` - All routes
- `src/app/layout/app-shell/app-shell.component.ts` - Navigation
- `src/app/shared/modules/shared-material.module.ts` - Shared Material imports

## Common Pitfalls to Avoid
❌ NgModules ❌ Direct Firebase SDK ❌ Hardcoded colors/spacing
❌ Constructor injection ❌ `any` types ❌ Empty lifecycle methods
❌ Missing namespaces in SCSS ❌ Text inputs for dates

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