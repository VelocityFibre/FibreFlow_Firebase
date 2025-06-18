# Angular v20 Upgrade Plan for FibreFlow

## Current State Analysis

### ✅ Already Up-to-Date
- **Angular Core**: Already on v20.0.3
- **Angular Material**: Already on v20.0.3
- **TypeScript**: v5.8.3 (compatible with Angular v20)
- **Node.js**: v18.20.7 (meets Angular v20 requirements)
- **Modern Patterns**: Already using signals, inject(), standalone components

### ⚠️ Minor Version Mismatches
- **@angular/fire**: v19.2.0 (should update to v20.x when available)
- **zone.js**: v0.15.0 (latest stable version)

## Step-by-Step Upgrade Plan

### Phase 1: Dependencies Update (Low Risk)

#### 1.1 Update Angular Fire
```bash
npm install @angular/fire@latest
```
*Note: Check if v20 is available, otherwise stay on v19.2.0 until compatible version is released*

#### 1.2 Update Development Dependencies
```bash
npm update @typescript-eslint/eslint-plugin @typescript-eslint/parser
npm update eslint eslint-config-prettier eslint-plugin-prettier
```

### Phase 2: Code Modernization (Medium Risk)

#### 2.1 Migrate to New Control Flow Syntax
Convert traditional directives to new Angular control flow:

**Before:**
```html
<div *ngIf="loading">Loading...</div>
<div *ngFor="let item of items">{{ item.name }}</div>
```

**After:**
```html
@if (loading) {
  <div>Loading...</div>
}
@for (item of items; track item.id) {
  <div>{{ item.name }}</div>
}
```

**Files to update:**
- All component templates (*.component.html)
- Inline templates in components

#### 2.2 Implement Proper Subscription Management
Replace manual subscriptions with signals or proper cleanup:

**Before:**
```typescript
ngOnInit() {
  this.service.getData().subscribe(data => {
    this.data = data;
  });
}
```

**After (Option 1 - Using Signals):**
```typescript
data = toSignal(this.service.getData());
```

**After (Option 2 - Using DestroyRef):**
```typescript
private destroyRef = inject(DestroyRef);

ngOnInit() {
  this.service.getData()
    .pipe(takeUntilDestroyed(this.destroyRef))
    .subscribe(data => {
      this.data = data;
    });
}
```

**Priority files to update:**
- `/src/app/features/suppliers/components/supplier-form/supplier-form.component.ts`
- `/src/app/features/dashboard/components/simple-dashboard/simple-dashboard.component.ts`
- `/src/app/features/daily-progress/pages/daily-progress-page/daily-progress-page.component.ts`
- `/src/app/features/stock/components/stock-list/stock-list.component.ts`

#### 2.3 Migrate Remaining NgModules to Standalone
Convert remaining modules to standalone components:

**Files to migrate:**
- `/src/app/features/auth/auth.module.ts`
- `/src/app/features/boq-management/boq-management.module.ts`
- `/src/app/shared/modules/shared-material.module.ts`

**Example migration:**
```typescript
// Before (auth.module.ts)
@NgModule({
  declarations: [LoginComponent],
  imports: [CommonModule, ReactiveFormsModule, MatButtonModule],
  exports: [LoginComponent]
})
export class AuthModule {}

// After (remove module, update component)
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatButtonModule],
  // ... rest of component
})
export class LoginComponent {}
```

### Phase 3: Performance Optimizations (Low Risk)

#### 3.1 Expand OnPush Change Detection
Add OnPush strategy to more components for better performance:

```typescript
@Component({
  selector: 'app-component',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  // ...
})
```

**Recommended components:**
- Dashboard components
- List components (staff-list, supplier-list, etc.)
- Form components

#### 3.2 Implement Signals for State Management
Expand signal usage for reactive state:

```typescript
// Service with signals
export class StockService {
  private stockItems = signal<StockItem[]>([]);
  
  readonly items = this.stockItems.asReadonly();
  readonly itemCount = computed(() => this.stockItems().length);
  
  updateItems(items: StockItem[]) {
    this.stockItems.set(items);
  }
}
```

### Phase 4: Angular v20 New Features Adoption

#### 4.1 Resource API (Experimental)
Consider adopting the new Resource API for data fetching:

```typescript
// New pattern for async data
export class ProjectService {
  projectResource = resource({
    loader: async (params) => {
      const response = await fetch(`/api/projects/${params.id}`);
      return response.json();
    }
  });
}
```

#### 4.2 Improved Hydration
Ensure Server-Side Rendering (SSR) compatibility if planning to add it:

```typescript
// In app.config.ts
export const appConfig: ApplicationConfig = {
  providers: [
    provideClientHydration(),
    // ... other providers
  ]
};
```

### Phase 5: Testing and Validation

#### 5.1 Update Tests
- Update component tests for new patterns
- Ensure all specs pass with new syntax
- Add tests for signal-based components

#### 5.2 Build Optimization
Update build configuration for better performance:

```json
// angular.json
{
  "optimization": {
    "scripts": true,
    "styles": {
      "minify": true,
      "inlineCritical": true
    },
    "fonts": true
  }
}
```

## Implementation Timeline

### Week 1: Dependencies and Preparation
- [ ] Update all compatible dependencies
- [ ] Run full test suite
- [ ] Create backup branch

### Week 2: Code Modernization
- [ ] Migrate control flow syntax in templates
- [ ] Fix subscription management issues
- [ ] Convert remaining modules to standalone

### Week 3: Performance and Features
- [ ] Implement OnPush strategy
- [ ] Expand signal usage
- [ ] Adopt new Angular v20 features

### Week 4: Testing and Deployment
- [ ] Complete test coverage
- [ ] Performance testing
- [ ] Production deployment

## Breaking Changes to Watch For

1. **Strict TypeScript Settings**: Ensure all types are properly defined
2. **RxJS Compatibility**: Some operators may have changed behavior
3. **Material Design Updates**: Check for any UI/UX changes

## Commands for Migration

```bash
# Update Angular CLI globally
npm install -g @angular/cli@latest

# Update project dependencies
ng update @angular/core @angular/cli

# Run migrations
ng update

# Test the application
npm test
npm run build
```

## Post-Upgrade Checklist

- [ ] All tests passing
- [ ] Build size optimized
- [ ] No console errors
- [ ] Performance metrics improved
- [ ] All features working as expected
- [ ] Updated documentation

## Resources

- [Angular v20 Blog Post](https://blog.angular.dev/announcing-angular-v20-b5c9c06cf301)
- [Angular Update Guide](https://angular.dev/update-guide)
- [TypeScript 5.8 Release Notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-8.html)
- [Angular Signals Guide](https://angular.dev/guide/signals)