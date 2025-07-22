# Angular v20 Specific Guidelines

<module-metadata>
  <name>angular</name>
  <version>1.0</version>
  <priority>high</priority>
  <last-updated>2025-07-18</last-updated>
  <trigger-keywords>angular, component, directive, service, ng</trigger-keywords>
</module-metadata>

## 🚨 Angular v20 Critical Updates

### Your Training Data is Outdated!
**Always check**: https://angular.dev/guide/ for latest patterns

### Major Changes in v20

#### NG0200 Error = Circular Dependency (NOT ExpressionChanged)
```typescript
// ❌ WRONG - Circular dependency
@Injectable()
export class LoggerService {
  constructor(private error: ErrorService) {}
}

@Injectable()
export class ErrorService {
  constructor(private logger: LoggerService) {} // CIRCULAR!
}

// ✅ CORRECT - Break the cycle
@Injectable()
export class LoggerService {
  // No ErrorService injection
}

@Injectable() 
export class ErrorService {
  private logger = inject(LoggerService);
}
```

#### afterNextRender API (NEW!)
```typescript
// ❌ OLD Pattern - setTimeout
ngOnInit() {
  setTimeout(() => this.loadData(), 0);
}

// ✅ NEW Pattern - afterNextRender
constructor() {
  afterNextRender(() => {
    this.loadData();
  }, { injector: this.injector });
}

// Advanced usage with phases
afterNextRender({
  earlyRead: () => { /* DOM measurements */ },
  write: (measurements) => { /* DOM updates */ },
  read: () => { /* Final reads */ }
}, { injector: this.injector });
```

## 🎯 Component Best Practices

### Always Standalone
```typescript
@Component({
  selector: 'app-example',
  standalone: true,  // REQUIRED
  imports: [         // Direct imports
    CommonModule,
    MatButtonModule,
    ReactiveFormsModule
  ],
  template: `...`,
  changeDetection: ChangeDetectionStrategy.OnPush
})
```

### Signal-Based State
```typescript
export class TodoComponent {
  // State with signals
  todos = signal<Todo[]>([]);
  filter = signal<'all' | 'active' | 'done'>('all');
  
  // Computed values
  filteredTodos = computed(() => {
    const currentFilter = this.filter();
    const allTodos = this.todos();
    
    return currentFilter === 'all' 
      ? allTodos
      : allTodos.filter(t => t.status === currentFilter);
  });
  
  // Update methods
  addTodo(title: string) {
    this.todos.update(todos => [...todos, { title, done: false }]);
  }
}
```

### Effect Usage (Sparingly!)
```typescript
// ✅ GOOD - Logging, localStorage, DOM
effect(() => {
  const todos = this.todos();
  localStorage.setItem('todos', JSON.stringify(todos));
});

// ❌ BAD - State propagation
effect(() => {
  const todos = this.todos();
  this.todoCount.set(todos.length); // Use computed instead!
});
```

## 💉 Dependency Injection

### Always Use inject()
```typescript
// ❌ OLD - Constructor injection
constructor(
  private service: MyService,
  private fb: FormBuilder
) {}

// ✅ NEW - inject() function
export class Component {
  private service = inject(MyService);
  private fb = inject(FormBuilder);
  private injector = inject(Injector);
}
```

### Service Initialization Pattern
```typescript
@Injectable({ providedIn: 'root' })
export class DataService {
  private firestore = inject(Firestore);
  private auth = inject(Auth);
  
  // Deferred initialization
  private collection?: CollectionReference;
  
  private getCollection(): CollectionReference {
    if (!this.collection) {
      this.collection = collection(this.firestore, 'data');
    }
    return this.collection;
  }
  
  // Safe browser API access
  initialize(injector: Injector): void {
    afterNextRender(() => {
      // Safe to access window, document, etc.
      this.setupBrowserFeatures();
    }, { injector });
  }
}
```

## 🛣️ Routing Patterns

### Simple Direct Routes (Preferred)
```typescript
// In app.routes.ts - SIMPLE IS BETTER
export const routes: Routes = [
  {
    path: 'dashboard',
    loadComponent: () => import('./pages/dashboard/dashboard.component')
      .then(m => m.DashboardComponent),
    canActivate: [authGuard]
  },
  {
    path: 'projects',
    loadChildren: () => import('./features/projects/projects.routes')
      .then(m => m.projectRoutes)
  }
];
```

### Feature Routes
```typescript
// In feature.routes.ts
export const featureRoutes: Routes = [
  { 
    path: '', 
    loadComponent: () => import('./pages/list/list.component')
      .then(m => m.ListComponent)
  },
  {
    path: 'new',
    loadComponent: () => import('./pages/form/form.component')
      .then(m => m.FormComponent),
    canDeactivate: [unsavedChangesGuard]
  }
];
```

### Route Guards (Functional)
```typescript
// ❌ OLD - Class-based guards
@Injectable()
export class AuthGuard implements CanActivate {
  canActivate() { ... }
}

// ✅ NEW - Functional guards
export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(Auth);
  const router = inject(Router);
  
  return auth.currentUser 
    ? true 
    : router.createUrlTree(['/login']);
};
```

## 🎨 Template Syntax

### Control Flow (NEW!)
```html
<!-- ❌ OLD - Structural directives -->
<div *ngIf="loading">Loading...</div>
<div *ngFor="let item of items">{{ item }}</div>

<!-- ✅ NEW - Control flow -->
@if (loading) {
  <div>Loading...</div>
}

@for (item of items; track item.id) {
  <div>{{ item.name }}</div>
} @empty {
  <div>No items found</div>
}

@switch (status) {
  @case ('active') { <div>Active</div> }
  @case ('done') { <div>Done</div> }
  @default { <div>Unknown</div> }
}
```

### Defer Loading
```html
@defer (on viewport) {
  <heavy-component />
} @placeholder {
  <div>Loading...</div>
} @loading (minimum 1s) {
  <spinner />
} @error {
  <div>Failed to load</div>
}
```

## 🔧 Performance Optimization

### OnPush Change Detection
```typescript
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush
})
```

### Track Functions
```html
@for (item of items; track item.id) {
  <!-- Always use track for lists -->
}
```

### Lazy Loading
```typescript
// Routes
{
  path: 'feature',
  loadChildren: () => import('./feature/feature.routes')
}

// Components in templates
@defer (on interaction) {
  <expensive-component />
}
```

## 🧪 Testing Patterns

### Component Testing
```typescript
describe('Component', () => {
  let component: Component;
  
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [Component], // Standalone
      providers: [
        { provide: Service, useValue: mockService }
      ]
    });
    
    const fixture = TestBed.createComponent(Component);
    component = fixture.componentInstance;
  });
  
  it('should update signal', () => {
    component.updateValue('test');
    expect(component.value()).toBe('test');
  });
});
```

## 🚫 Common Pitfalls

### 1. Forgetting Standalone
```typescript
// Every component MUST have:
standalone: true
```

### 2. Using Constructor Injection
```typescript
// Always use inject() instead
```

### 3. Direct Signal Updates in Templates
```html
<!-- ❌ WRONG -->
<button (click)="count.set(count() + 1)">

<!-- ✅ RIGHT -->
<button (click)="increment()">
```

### 4. Circular Dependencies
```typescript
// Check for NG0200 errors
// Break cycles with deferred injection
```

### 5. Missing Track Functions
```html
<!-- Always track in loops -->
@for (item of items; track item.id)
```

---

Remember: Angular v20 has significant changes from earlier versions. When in doubt, check the official docs!