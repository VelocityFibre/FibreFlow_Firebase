# FibreFlow - Project Context for Claude

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

### Frontend
- Angular 18+ (standalone components)
- Angular Material + CDK
- RxJS + Signals
- SCSS with Material theming
- AngularFire
- Logo: 110% scale in sidebar

### State Management
- **Primary**: Firestore real-time listeners (for shared data)
- **Local State**: Angular Signals (for UI state)
- **Caching**: RxJS shareReplay + service patterns
- **No NgRx/Akita needed** - Firebase provides state sync

### Backend  
- Firebase (serverless)
- Firestore + Auth + Storage
- Hosting: https://fibreflow-73daf.web.app
- Project ID: fibreflow-73daf

### DevOps
- ESLint + Prettier (configured)
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

// ❌ AVOID - One-time reads (unless truly needed)
const snapshot = await getDocs(collection(firestore, 'projects'));
```

## Common Issues & Solutions

### 1. Circular Dependencies (NG0200 Error)
- **Problem**: Services injecting each other in a circular pattern
- **Prevention**: Use event bus pattern or facade services
- **Detection**: Look for NG0200 errors in browser console

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

## Core Features & Routes

### Main Routes
- `/dashboard` - Role-based dashboard
- `/projects` - Project list and management
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

**Remember: ENTERPRISE application - Code quality, type safety, and maintainability are paramount!**