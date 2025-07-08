# NG0200 Diagnostic Plan

## Current Situation
- NG0200 error occurs during component creation/hydration
- Error message is minified ("NG0200: b")
- Happens when navigating to dashboard
- All attempted fixes have failed

## Root Cause Analysis

Based on the stack trace, the error occurs during:
1. Component creation (`createComponent`)
2. Service injection (`hydrate`, `get`, `retrieve`)
3. Specifically in the dashboard component factory

## Diagnostic Strategy

### 1. Enable Detailed Error Messages
Build with development configuration and named chunks:
```bash
npm run build -- --configuration=development --named-chunks --source-map
```

### 2. Create Minimal Dashboard
Replace the main dashboard with a version that has no service dependencies:

```typescript
@Component({
  selector: 'app-main-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `<div>Minimal Dashboard - No Services</div>`
})
export class MainDashboardComponent {}
```

### 3. Service Isolation
The error trace shows these services being injected:
- ProjectService (chunk-WYKIZ6ML.js)
- Multiple other services in the dashboard

Common causes:
- Services modifying global state in constructors
- Services with circular dependencies
- Services using inject() outside injection context

### 4. Check These Common NG0200 Triggers

#### a. Theme Service
The ThemeService might be modifying DOM in constructor:
```typescript
// Check if ThemeService modifies document.body.classList
```

#### b. Auth Service
Mock auth service might be setting values synchronously

#### c. Firebase Persistence
The warning about `enableIndexedDbPersistence()` suggests Firebase might be modifying state

## Immediate Actions

### Option 1: Minimal Dashboard Test
Create a dashboard with no dependencies to confirm routing works

### Option 2: Service-by-Service Addition
Start with minimal dashboard, add services one by one

### Option 3: Disable Problematic Services
Temporarily disable:
- Theme initialization
- Firebase persistence
- Mock auth auto-login

## Recommended Next Steps

1. **Build with source maps** for better error messages
2. **Create minimal dashboard** to isolate the issue
3. **Add services incrementally** to identify the problematic one
4. **Check service constructors** for state mutations

## Potential Quick Fixes

### Fix 1: Defer ALL Service Initialization
```typescript
constructor() {
  // Defer everything
  afterNextRender(() => {
    // Initialize services here
  });
}
```

### Fix 2: Use APP_INITIALIZER
Move initialization logic to APP_INITIALIZER token

### Fix 3: Disable Change Detection During Init
```typescript
constructor(private cdr: ChangeDetectorRef) {
  this.cdr.detach();
  // Do initialization
  setTimeout(() => this.cdr.reattach());
}
```

## Long-term Solution

Once we identify the problematic service:
1. Refactor to avoid constructor side effects
2. Use proper lifecycle hooks
3. Consider migrating to Angular signals
4. Add e2e tests to catch NG0200 errors