# Technical Reference - Detailed Guide

<module-metadata>
  <name>reference</name>
  <version>1.0</version>
  <priority>medium</priority>
  <last-updated>2025-07-18</last-updated>
</module-metadata>

## 🎨 Theme System Reference

### Theme Variables
```scss
// Available themes: light, dark, vf, fibreflow

// Color access patterns
@use '../../../styles/component-theming' as theme;

.component {
  // Colors
  color: theme.ff-rgb(foreground);
  background: theme.ff-rgba(primary, 0.1);
  border-color: theme.ff-var(border);
  
  // Spacing
  padding: theme.ff-spacing(md);  // 16px
  margin: theme.ff-spacing(xl);   // 32px
  
  // Responsive
  font-size: theme.ff-clamp(16, 2.5vw, 24);
}
```

### Color Tokens
| Token | Usage | Example |
|-------|-------|---------|
| primary | Main brand color | Buttons, headers |
| secondary | Secondary actions | Tabs, chips |
| background | Page background | Body, containers |
| foreground | Text color | Paragraphs, labels |
| card | Card backgrounds | mat-card |
| destructive | Errors, delete | Error messages |
| success | Success states | Checkmarks |
| warning | Warnings | Alert badges |

### Spacing Scale
```scss
xs: 4px   // Tight spacing
sm: 8px   // Compact elements  
md: 16px  // Default spacing
lg: 24px  // Sections
xl: 32px  // Major sections
2xl: 48px // Page sections
3xl: 64px // Hero sections
```

## 📐 Angular Patterns

### Component Structure
```typescript
@Component({
  selector: 'app-feature',
  standalone: true,
  imports: [
    CommonModule,
    MaterialModule,
    ReactiveFormsModule
  ],
  templateUrl: './feature.component.html',
  styleUrl: './feature.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FeatureComponent {
  // Dependency injection
  private service = inject(FeatureService);
  private fb = inject(FormBuilder);
  
  // Signals for state
  items = signal<Item[]>([]);
  loading = signal(false);
  
  // Computed values
  itemCount = computed(() => this.items().length);
  
  // Form
  form = this.fb.group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]]
  });
}
```

### Service Pattern
```typescript
@Injectable({ providedIn: 'root' })
export class ItemService extends BaseFirestoreService<Item> {
  constructor() {
    super('items');  // Collection name
  }
  
  // Project-specific queries
  getByProject(projectId: string): Observable<Item[]> {
    return this.getWithQuery([
      where('projectId', '==', projectId),
      orderBy('createdAt', 'desc')
    ]);
  }
  
  // With related data
  getWithDetails(id: string): Observable<ItemDetails> {
    return combineLatest([
      this.get(id),
      this.getRelatedData(id)
    ]).pipe(
      map(([item, related]) => ({ ...item, related }))
    );
  }
}
```

### Route Configuration
```typescript
// In app.routes.ts
export const routes: Routes = [
  {
    path: 'feature',
    loadChildren: () => import('./features/feature/feature.routes')
      .then(m => m.featureRoutes),
    canActivate: [authGuard],
    data: { roles: ['admin', 'manager'] }
  }
];

// In feature.routes.ts
export const featureRoutes: Routes = [
  { path: '', redirectTo: 'list', pathMatch: 'full' },
  {
    path: 'list',
    loadComponent: () => import('./pages/feature-list/feature-list.component')
      .then(m => m.FeatureListComponent)
  },
  {
    path: 'new',
    loadComponent: () => import('./pages/feature-form/feature-form.component')
      .then(m => m.FeatureFormComponent)
  },
  {
    path: ':id',
    loadComponent: () => import('./pages/feature-detail/feature-detail.component')
      .then(m => m.FeatureDetailComponent)
  }
];
```

## 🔥 Firebase/Firestore Patterns

### Collection Structure
```typescript
// Flat collections for queries
/projects/{projectId}
/tasks/{taskId}           // has projectId field
/staff/{staffId}          // global
/invoices/{invoiceId}     // has projectId field

// Subcollections for hierarchy
/projects/{projectId}/phases/{phaseId}
/projects/{projectId}/phases/{phaseId}/steps/{stepId}
```

### Real-time Listeners
```typescript
// For shared data - real-time updates
items$ = collectionData(
  collection(this.firestore, 'items'),
  { idField: 'id' }
);

// With query
projectItems$ = collectionData(
  query(
    collection(this.firestore, 'items'),
    where('projectId', '==', projectId),
    orderBy('createdAt', 'desc')
  ),
  { idField: 'id' }
);

// In component
ngOnInit() {
  this.itemService.items$.subscribe(
    items => this.items.set(items)
  );
}
```

### Security Rules Pattern
```javascript
// firestore.rules
match /projects/{projectId} {
  allow read: if request.auth != null;
  allow create: if hasRole('admin');
  allow update: if isProjectMember(projectId);
  allow delete: if false;  // Soft delete only
}

function hasRole(role) {
  return request.auth.token.role == role;
}

function isProjectMember(projectId) {
  return request.auth.uid in 
    get(/databases/$(database)/documents/projects/$(projectId)).data.members;
}
```

## 📋 Form Patterns

### Reactive Form with Validation
```typescript
form = this.fb.group({
  // Required field
  name: ['', [Validators.required, Validators.minLength(3)]],
  
  // Optional with default
  status: ['active'],
  
  // Nested group
  address: this.fb.group({
    street: [''],
    city: ['', Validators.required],
    zip: ['', Validators.pattern(/^\d{5}$/)]
  }),
  
  // Dynamic array
  items: this.fb.array([])
});

// Add to array
addItem() {
  const items = this.form.get('items') as FormArray;
  items.push(this.fb.group({
    name: ['', Validators.required],
    quantity: [1, [Validators.min(1), Validators.max(100)]]
  }));
}

// Custom validator
emailValidator(control: AbstractControl): ValidationErrors | null {
  const email = control.value;
  if (!email) return null;
  
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  return valid ? null : { invalidEmail: true };
}
```

### Material Form Fields
```html
<mat-form-field>
  <mat-label>Name</mat-label>
  <input matInput formControlName="name" required>
  <mat-error *ngIf="form.get('name')?.hasError('required')">
    Name is required
  </mat-error>
  <mat-error *ngIf="form.get('name')?.hasError('minlength')">
    Minimum 3 characters
  </mat-error>
</mat-form-field>

<!-- Date picker -->
<mat-form-field>
  <mat-label>Due Date</mat-label>
  <input matInput [matDatepicker]="picker" formControlName="dueDate">
  <mat-datepicker-toggle matIconSuffix [for]="picker"></mat-datepicker-toggle>
  <mat-datepicker #picker></mat-datepicker>
</mat-form-field>

<!-- Select -->
<mat-form-field>
  <mat-label>Status</mat-label>
  <mat-select formControlName="status">
    <mat-option value="active">Active</mat-option>
    <mat-option value="completed">Completed</mat-option>
  </mat-select>
</mat-form-field>
```

## 🌍 Localization (South Africa)

### Currency Formatting
```typescript
formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    minimumFractionDigits: 2
  }).format(amount);
}
// Output: R 1 234,56
```

### Date Formatting
```typescript
formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-ZA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(date);
}
// Output: 13 Jun 2025
```

### Number Formatting
```typescript
formatNumber(value: number): string {
  return new Intl.NumberFormat('en-ZA').format(value);
}
// Output: 1 000 000
```

## 📘 TypeScript Patterns

### Type Safety
```typescript
// Branded types for IDs
type ProjectId = string & { __brand: 'ProjectId' };
type UserId = string & { __brand: 'UserId' };

// Type guards
function isValidDate(value: unknown): value is Date {
  return value instanceof Date && !isNaN(value.getTime());
}

// Discriminated unions
type LoadingState<T> = 
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: Error };

// Template literals
type Route = `/projects/${string}` | `/users/${string}`;

// Utility types
type PartialExcept<T, K extends keyof T> = 
  Partial<T> & Pick<T, K>;
```

### Modern TypeScript Features
```typescript
// satisfies operator
const config = {
  apiUrl: 'https://api.example.com',
  timeout: 5000
} satisfies AppConfig;

// const type parameters
function identity<const T>(value: T): T {
  return value;
}

// using declarations
function processFile() {
  using file = openFile('data.txt');
  // file automatically closed
}
```

## 📱 Responsive Design

### Breakpoints
```scss
// Available breakpoints
$breakpoints: (
  xs: 0,
  sm: 640px,
  md: 768px,
  lg: 1024px,
  xl: 1280px,
  2xl: 1536px
);

// Usage
@media (min-width: 768px) {
  .container {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }
}

// With mixin
@include respond-to('md') {
  // Tablet and up styles
}
```

### Mobile-First Patterns
```scss
.component {
  // Mobile default
  padding: 16px;
  font-size: 14px;
  
  // Tablet
  @media (min-width: 768px) {
    padding: 24px;
    font-size: 16px;
  }
  
  // Desktop
  @media (min-width: 1024px) {
    padding: 32px;
    font-size: 18px;
  }
}
```

---

This reference contains the most commonly needed patterns and examples. For specific implementations, check existing code in the features directory.