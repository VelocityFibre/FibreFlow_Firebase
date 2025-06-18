# Angular v20 Best Practices Documentation Summary

**Generated**: 2025-06-18  
**Angular Version**: 20.0.3  
**Purpose**: Reference guide for codebase review

## 1. Component Architecture

### 1.1 Standalone Components (Required)
```typescript
// ✅ BEST PRACTICE: All components should be standalone
@Component({
  selector: 'app-example',
  standalone: true,
  imports: [CommonModule, MatButtonModule],
  template: `...`
})
export class ExampleComponent {}

// ❌ AVOID: NgModules (deprecated pattern)
```

### 1.2 Dependency Injection with inject()
```typescript
// ✅ BEST PRACTICE: Use inject() function
export class ExampleComponent {
  private service = inject(ExampleService);
  private router = inject(Router);
  
  // ❌ AVOID: Constructor injection
  // constructor(private service: ExampleService) {}
}
```

### 1.3 Change Detection Strategy
```typescript
// ✅ BEST PRACTICE: Always use OnPush
@Component({
  selector: 'app-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // ...
})
```

## 2. Signals (New State Management)

### 2.1 Component State with Signals
```typescript
// ✅ BEST PRACTICE: Use signals for reactive state
export class TodoComponent {
  // Simple signals
  todos = signal<Todo[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);
  
  // Computed signals
  completedCount = computed(() => 
    this.todos().filter(t => t.completed).length
  );
  
  // Effects for side effects
  constructor() {
    effect(() => {
      console.log(`Todo count: ${this.todos().length}`);
    });
  }
  
  // ❌ AVOID: Plain properties for state
  // todos: Todo[] = [];
}
```

### 2.2 Input/Output Signals
```typescript
// ✅ BEST PRACTICE: Signal-based inputs/outputs
export class UserCardComponent {
  // Required input
  user = input.required<User>();
  
  // Optional input with default
  showDetails = input(false);
  
  // Output events
  selected = output<User>();
  
  // ❌ AVOID: Decorator-based
  // @Input() user!: User;
  // @Output() selected = new EventEmitter<User>();
}
```

## 3. Control Flow Syntax

### 3.1 New Built-in Control Flow
```typescript
// ✅ BEST PRACTICE: New syntax in templates
@Component({
  template: `
    <!-- Conditionals -->
    @if (user()) {
      <div>{{ user().name }}</div>
    } @else if (loading()) {
      <mat-spinner />
    } @else {
      <div>No user found</div>
    }
    
    <!-- Loops -->
    @for (item of items(); track item.id) {
      <app-item [data]="item" />
    } @empty {
      <div>No items</div>
    }
    
    <!-- Switch -->
    @switch (status()) {
      @case ('active') { <div>Active</div> }
      @case ('inactive') { <div>Inactive</div> }
      @default { <div>Unknown</div> }
    }
    
    <!-- Defer loading -->
    @defer (on viewport) {
      <app-heavy-component />
    } @placeholder {
      <div>Loading...</div>
    } @loading (minimum 100ms) {
      <mat-spinner />
    }
  `
})

// ❌ AVOID: Structural directives
// *ngIf, *ngFor, *ngSwitch
```

## 4. Routing Best Practices

### 4.1 Lazy Loading with Standalone
```typescript
// ✅ BEST PRACTICE: Direct component imports
export const routes: Routes = [
  {
    path: 'dashboard',
    loadComponent: () => 
      import('./dashboard/dashboard.component').then(m => m.DashboardComponent)
  },
  {
    path: 'admin',
    loadChildren: () => 
      import('./admin/admin.routes').then(m => m.ADMIN_ROUTES)
  }
];

// ❌ AVOID: Module-based lazy loading
```

### 4.2 Route Guards with inject()
```typescript
// ✅ BEST PRACTICE: Functional guards
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  
  return auth.isAuthenticated() || router.parseUrl('/login');
};

// ❌ AVOID: Class-based guards
```

## 5. Forms Best Practices

### 5.1 Reactive Forms with Signals
```typescript
// ✅ BEST PRACTICE: Typed reactive forms
export class UserFormComponent {
  form = new FormGroup({
    name: new FormControl('', Validators.required),
    email: new FormControl('', [Validators.required, Validators.email])
  });
  
  // Signal for form state
  formValid = toSignal(this.form.statusChanges.pipe(
    map(status => status === 'VALID')
  ));
  
  // ❌ AVOID: Untyped forms
}
```

## 6. Services & Observables

### 6.1 Service Pattern
```typescript
// ✅ BEST PRACTICE: Tree-shakable services
@Injectable({
  providedIn: 'root'
})
export class DataService {
  private http = inject(HttpClient);
  
  // Use signals for state
  private dataSignal = signal<Data[]>([]);
  data = this.dataSignal.asReadonly();
  
  // Expose methods, not subjects
  loadData() {
    return this.http.get<Data[]>('/api/data').pipe(
      tap(data => this.dataSignal.set(data))
    );
  }
}
```

### 6.2 HTTP with Interceptors
```typescript
// ✅ BEST PRACTICE: Functional interceptors
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  
  if (auth.token()) {
    req = req.clone({
      headers: req.headers.set('Authorization', `Bearer ${auth.token()}`)
    });
  }
  
  return next(req);
};

// Configure in app.config.ts
export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(
      withInterceptors([authInterceptor])
    )
  ]
};
```

## 7. Performance Optimizations

### 7.1 Image Optimization
```typescript
// ✅ BEST PRACTICE: NgOptimizedImage
@Component({
  template: `
    <img ngSrc="path/to/image.jpg" 
         width="400" 
         height="300"
         priority />
  `,
  imports: [NgOptimizedImage]
})
```

### 7.2 Virtual Scrolling
```typescript
// ✅ BEST PRACTICE: For large lists
@Component({
  template: `
    <cdk-virtual-scroll-viewport itemSize="50">
      @for (item of items(); track item.id) {
        <div>{{ item.name }}</div>
      }
    </cdk-virtual-scroll-viewport>
  `,
  imports: [ScrollingModule]
})
```

## 8. Testing Patterns

### 8.1 Component Testing
```typescript
// ✅ BEST PRACTICE: Testing with signals
it('should update count', () => {
  const fixture = TestBed.createComponent(CounterComponent);
  const component = fixture.componentInstance;
  
  // Test signal values
  expect(component.count()).toBe(0);
  
  // Trigger updates
  component.increment();
  fixture.detectChanges();
  
  expect(component.count()).toBe(1);
});
```

## 9. Error Handling

### 9.1 Global Error Handler
```typescript
// ✅ BEST PRACTICE: Centralized error handling
export const appConfig: ApplicationConfig = {
  providers: [
    {
      provide: ErrorHandler,
      useClass: GlobalErrorHandler
    }
  ]
};

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private logger = inject(LoggerService);
  
  handleError(error: Error): void {
    this.logger.error(error);
  }
}
```

## 10. TypeScript Best Practices

### 10.1 Strict Type Safety
```typescript
// ✅ BEST PRACTICE: Use strict types
interface User {
  id: string;
  name: string;
  email: string;
}

// Use satisfies for type checking
const defaultUser = {
  id: '',
  name: '',
  email: ''
} satisfies User;

// ❌ AVOID: any types
```

### 10.2 Branded Types for IDs
```typescript
// ✅ BEST PRACTICE: Type-safe IDs
type UserId = string & { __brand: 'UserId' };
type ProjectId = string & { __brand: 'ProjectId' };

// Prevents mixing IDs
function getUser(id: UserId): User { }
```

## Migration Checklist

- [ ] Convert all components to standalone
- [ ] Replace constructor DI with inject()
- [ ] Add OnPush to all components
- [ ] Convert state to signals
- [ ] Update templates to new control flow
- [ ] Convert guards to functional
- [ ] Update interceptors to functional
- [ ] Add proper TypeScript types
- [ ] Implement error handling
- [ ] Add performance optimizations

## Resources

- [Angular.dev](https://angular.dev)
- [Angular Blog](https://blog.angular.io)
- [Angular GitHub](https://github.com/angular/angular)
- [Migration Guide](https://angular.dev/update-guide)