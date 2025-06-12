markdown# FibreFlow V2 - Project Context for Claude

## Project Overview
FibreFlow V2 is an enterprise fiber optic project management system built with Angular and Firebase. This is a complete rebuild focusing on performance, offline capability, and real-time collaboration.

## 🎨 Theme System & Design Guidelines
- **Design Philosophy**: Apple-inspired minimalism with function-first approach
- **Theme System**: CSS variables with runtime switching (light, dark, vf, fibreflow)
- **Component Architecture**: Modular, single-responsibility components
- **Reference Docs**:
  - `docs/theme-strategy.md` - Complete theme system documentation
  - `docs/angular-theme-implementation.md` - Angular-specific implementation
  - `docs/project-card-component-architecture.md` - Modular component patterns
  - `docs/ai-theme-collaboration-guide.md` - AI prompting guidelines
- **Key Files**:
  - `src/styles/_variables.scss` - Theme CSS variables
  - `src/styles/_functions.scss` - SCSS utility functions
  - `src/styles/_utilities.scss` - Pre-built utility classes

## Tech Stack

### Frontend
- **Framework**: Angular 17+ with standalone components
- **UI Library**: Angular Material + CDK
- **State Management**: RxJS + Angular Signals
- **PWA**: @angular/pwa for offline support ✨
- **Styling**: SCSS with Material theming
- **Firebase Integration**: AngularFire
- **Build Tool**: Angular CLI
- **Bundle Analysis**: webpack-bundle-analyzer ✨

### Backend  
- **Platform**: Firebase (100% serverless)
- **Functions**: Node.js 20 + TypeScript
- **API Framework**: Express.js or Hono
- **Rate Limiting**: firebase-functions-rate-limiter ✨
- **Security**: Firebase App Check enabled ✨
- **Database**: Firestore
- **Auth**: Firebase Auth
- **Storage**: Firebase Storage
- **Real-time**: Firestore listeners
- **Hosting**: Firebase Hosting

### DevOps & Quality
- **Pre-commit Hooks**: Husky + lint-staged ✨
- **Code Quality**: ESLint + Prettier
- **Testing**: Karma + Jasmine (unit), Cypress (E2E)
- **CI/CD**: GitHub Actions
- **Monitoring**: Firebase Performance & Analytics

## Project Structure
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
│   └── src/
│       ├── api/               # REST endpoints
│       ├── triggers/          # Firestore triggers
│       ├── scheduled/         # Cron jobs
│       └── middleware/        # Rate limiting ✨
├── .husky/                    # Git hooks ✨
├── firebase.json              # Firebase config
├── firestore.rules           # Security rules
└── storage.rules             # Storage rules

## Critical Rules (NEVER VIOLATE)

### Theme Implementation Rules
```scss
// ✅ CORRECT - Use theme functions and variables
background: ff-rgb(background);
padding: ff-spacing(xl);
font-size: ff-font-size(2xl);

// ❌ WRONG - Hardcoded values
background: #FFFFFF;
padding: 32px;
font-size: 24px;
```

### Component Architecture Rules
```typescript
// ✅ CORRECT - Modular components
@Component({
  selector: 'ff-project-card',
  standalone: true,
  imports: [CardHeaderComponent, ProjectStatsComponent],
  template: `
    <ff-card-header [title]="project.title" />
    <ff-project-stats [stats]="projectStats" />
  `
})

// ❌ WRONG - Monolithic components with everything in one file
```

### Angular Patterns
```typescript
// ✅ CORRECT - Angular 17+ standalone
import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-example',
  standalone: true,
  imports: [CommonModule, MatCardModule],
  template: `...`
})

// ❌ WRONG - Old module-based approach
import { NgModule } from '@angular/core'; // NO!
Firebase Integration
typescript// ✅ CORRECT - AngularFire
import { Firestore, collection, collectionData } from '@angular/fire/firestore';
const firestore = inject(Firestore);
projects$ = collectionData(collection(firestore, 'projects'));

// ❌ WRONG - Direct Firebase SDK in components
import { getFirestore } from 'firebase/firestore'; // NO!
Material Design
typescript// ✅ CORRECT - Use Angular Material
import { MatButtonModule } from '@angular/material/button';
<button mat-raised-button color="primary">Save</button>

// ❌ WRONG - Custom button components
<custom-button>Save</custom-button> // NO!
Security Implementation
typescript// ✅ CORRECT - Rate limiting in Functions
import * as functions from 'firebase-functions';
import { FirebaseFunctionsRateLimiter } from 'firebase-functions-rate-limiter';

const limiter = FirebaseFunctionsRateLimiter.withRealtimeDbBackend({
  name: 'api_limiter',
  maxCalls: 100,
  periodSeconds: 60,
});

// ❌ WRONG - No rate limiting
export const api = functions.https.onRequest(app); // NO!
Core Features
1. Workflow System

Fixed 5-Phase Structure: Planning → Design → Implementation → Testing → Deployment
Parallel execution support
Complex task dependencies
Auto-assignment based on roles
Critical path analysis

2. User Roles

Admin: Full system access
Project Manager: Manage projects, assign tasks
Team Lead: Manage team tasks
Field Technician: View/update assigned tasks only
Client: View project progress only

3. Key Views

/dashboard - Role-based dashboard
/projects - Project list and management
/projects/:id/workflow - Workflow designer
/tasks - Task board (Kanban/Gantt)
/reports - Analytics and reporting
/offline - Offline queue status ✨

4. Real-time Features

Live project updates
Task status changes
Team notifications
Offline queue sync
Background sync for field workers ✨

PWA Configuration

Service worker for offline support
App manifest for installability
Cache strategies:

Cache First: Static assets
Network First: API calls with fallback
Background Sync: Offline actions


Push notifications for critical updates

Security Requirements

Row-level security in Firestore
Role-based access control (RBAC)
Firebase App Check enabled ✨
Content Security Policy headers ✨
Rate limiting on all API endpoints ✨
Environment variables for sensitive data
Secure Headers middleware

Implementation Guidelines

### Theme Service Pattern
```typescript
// Theme service for runtime switching
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private theme = signal<Theme>('light');
  
  setTheme(theme: Theme) {
    this.theme.set(theme);
    document.documentElement.setAttribute('data-theme', theme);
  }
}
```

### Component Styling Pattern
```scss
// Component SCSS using theme system
@import '../../../styles/functions';

.my-component {
  padding: ff-spacing(xl);
  background: ff-rgb(card);
  border-radius: var(--ff-radius);
  
  &__title {
    font-size: ff-font-size(2xl);
    color: ff-rgb(foreground);
  }
}
```

Service Architecture
typescript// All services should be providedIn: 'root'
@Injectable({ providedIn: 'root' })
export class ProjectService {
  private firestore = inject(Firestore);
  private auth = inject(Auth);
  
  // Use observables for real-time data
  projects$ = collectionData(
    collection(this.firestore, 'projects'),
    { idField: 'id' }
  );
}
Component Patterns
typescript// Use standalone components with signals
@Component({
  selector: 'app-project-list',
  standalone: true,
  imports: [CommonModule, MatCardModule],
  template: `
    <mat-card *ngFor="let project of projects$ | async">
      {{ project.name }}
    </mat-card>
  `
})
export class ProjectListComponent {
  private projectService = inject(ProjectService);
  projects$ = this.projectService.projects$;
}
Offline Support Pattern
typescript// Service worker registration
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/ngsw-worker.js');
}

// Offline queue service
@Injectable({ providedIn: 'root' })
export class OfflineQueueService {
  private queue = signal<Action[]>([]);
  
  async sync() {
    if (navigator.onLine) {
      // Process queue
    }
  }
}
Firestore Schema
typescriptinterface Project {
  id: string;
  title: string;
  client: {
    id: string;
    name: string;
  };
  status: 'active' | 'completed' | 'pending' | 'on-hold';
  priority?: 'high' | 'medium' | 'low';
  location: string;
  startDate: Timestamp;
  manager: string;
  type: 'FTTH' | 'FTTB' | 'FTTC' | 'P2P';
  currentPhase: ProjectPhase;
  phaseProgress: number;
  overallProgress: number;
  createdAt: Timestamp;
}

interface Task {
  id: string;
  projectId: string;
  phaseId: string;
  name: string;
  assigneeId: string;
  status: TaskStatus;
  dependencies: string[];
  dueDate: Timestamp;
}
Performance Requirements

First Contentful Paint < 1.5s
Time to Interactive < 3s
Lighthouse score > 90
Offline capability required
Handle 10,000+ tasks smoothly
Bundle size < 500KB (lazy loaded)

Code Quality Setup
bash# Husky pre-commit hooks configured:
- ESLint validation
- Prettier formatting
- TypeScript compilation check
- Unit test execution (affected only)
- Bundle size check
Development Commands
bash# Development
ng serve                    # Frontend dev server
npm run emulators          # Firebase emulators
npm run functions:serve    # Functions local

# Code Quality
npm run lint               # ESLint
npm run format             # Prettier
npm run analyze            # Bundle analyzer

# Build & Deploy
ng build --configuration production
firebase deploy            # Full deployment
firebase deploy --only hosting
firebase deploy --only functions

# Testing
ng test                    # Unit tests
ng e2e                     # E2E tests
npm run functions:test     # Functions tests
Environment Setup
Create .env files:
typescript// src/environments/environment.ts - Development
export const environment = {
  production: false,
  firebase: { /* config */ },
  useEmulators: true,
  appCheckDebugToken: 'debug-token'
};

// src/environments/environment.prod.ts - Production
export const environment = {
  production: true,
  firebase: { /* config */ },
  useEmulators: false
};

// functions/.env - Functions environment
FIREBASE_PROJECT_ID=your-project
RATE_LIMIT_MAX_CALLS=100
Current Development Status

 Project setup complete
 Firebase initialized
 Angular Material theme configured
 PWA support added
 Security headers implemented
 Core services implemented
 Authentication flow
 Project CRUD operations
 Workflow engine
 Real-time updates
 Offline support
 Rate limiting configured
 App Check enabled

Common Pitfalls to Avoid
❌ Using NgModules (use standalone)
❌ Direct Firebase SDK usage (use AngularFire)
❌ Creating custom UI components (use Material)
❌ Nested subscriptions (use RxJS operators)
❌ Not unsubscribing (use takeUntilDestroyed)
❌ Synchronous Firestore calls
❌ Missing CSP headers
❌ No rate limiting on Functions
❌ Not implementing offline support
❌ Forgetting lazy loading for features
❌ Not using OnPush change detection
❌ Hardcoding colors/spacing (use theme functions)
❌ Monolithic components (use modular architecture)
❌ Ignoring theme compatibility (test all 4 themes)
Performance Optimization Checklist
✅ Lazy load all feature modules
✅ Use OnPush change detection
✅ Implement virtual scrolling for large lists
✅ Use trackBy functions in *ngFor
✅ Preload critical routes
✅ Optimize images with NgOptimizedImage
✅ Tree-shake unused Material components
✅ Enable production build optimizations
Questions?
When in doubt:

Check Angular Material docs
Use AngularFire patterns
Follow Angular style guide
Optimize for performance
Ensure offline capability
Keep security in mind

Remember: This is an ENTERPRISE application. Code quality, type safety, security, and maintainability are paramount!
Useful Resources

Angular Docs
Material Design
AngularFire
Firebase Docs
PWA Guide


This complete `claude.md` now includes all security features, PWA support, performance optimizations, and code quality tools. It gives Claude Code everything needed to build a production-ready enterprise application! 🚀
