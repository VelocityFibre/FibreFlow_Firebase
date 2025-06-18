# RxJS 7.8 Best Practices

**Generated**: 2025-06-18  
**RxJS Version**: 7.8.0  
**Purpose**: Reactive programming patterns for codebase review

## 1. Memory Management

### 1.1 Unsubscribe Patterns
```typescript
// ✅ BEST PRACTICE: Use takeUntilDestroyed
export class DataComponent {
  private dataService = inject(DataService);
  
  ngOnInit() {
    this.dataService.getData()
      .pipe(takeUntilDestroyed())
      .subscribe(data => {
        // Handle data
      });
  }
}

// ✅ ALTERNATIVE: DestroyRef for services
export class DataService {
  private destroyRef = inject(DestroyRef);
  
  startPolling() {
    interval(5000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.fetchData());
  }
}

// ❌ AVOID: Manual subscription management
private subscription = new Subscription();
```

### 1.2 AsyncPipe Alternative with Signals
```typescript
// ✅ BEST PRACTICE: toSignal for template binding
export class UserComponent {
  private userService = inject(UserService);
  
  // Convert observable to signal
  user = toSignal(this.userService.currentUser$, {
    initialValue: null
  });
  
  // In template: {{ user()?.name }}
}

// ❌ AVOID: Manual subscribe in component
ngOnInit() {
  this.userService.currentUser$.subscribe(user => {
    this.user = user;
  });
}
```

## 2. Operator Patterns

### 2.1 Error Handling
```typescript
// ✅ BEST PRACTICE: Centralized error handling
export class ApiService {
  private http = inject(HttpClient);
  
  private handleError = (operation = 'operation') => {
    return (error: HttpErrorResponse): Observable<never> => {
      console.error(`${operation} failed:`, error);
      
      // User-facing error
      const message = error.error?.message || 'Something went wrong';
      
      // Re-throw for global handler
      return throwError(() => ({
        message,
        status: error.status,
        operation
      }));
    };
  };
  
  getData() {
    return this.http.get<Data[]>('/api/data').pipe(
      retry({ count: 2, delay: 1000 }),
      catchError(this.handleError('getData'))
    );
  }
}
```

### 2.2 Debouncing User Input
```typescript
// ✅ BEST PRACTICE: Search with debounce
export class SearchComponent {
  searchControl = new FormControl('');
  
  results = toSignal(
    this.searchControl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      filter(term => term.length >= 3),
      switchMap(term => this.search(term)),
      catchError(() => of([]))
    ),
    { initialValue: [] }
  );
  
  private search(term: string) {
    return this.http.get<Result[]>(`/api/search?q=${term}`);
  }
}
```

### 2.3 State Management
```typescript
// ✅ BEST PRACTICE: BehaviorSubject with signals
export class StateService {
  // Private state
  private stateSubject = new BehaviorSubject<State>(initialState);
  
  // Public signal for reading
  state = toSignal(this.stateSubject.asObservable(), {
    requireSync: true
  });
  
  // Computed values
  isLoading = computed(() => this.state().loading);
  items = computed(() => this.state().items);
  
  // State mutations
  updateItems(items: Item[]) {
    this.stateSubject.next({
      ...this.stateSubject.value,
      items,
      loading: false
    });
  }
}
```

## 3. HTTP Patterns

### 3.1 Caching Requests
```typescript
// ✅ BEST PRACTICE: Share results with shareReplay
export class ConfigService {
  private http = inject(HttpClient);
  
  private config$ = this.http.get<Config>('/api/config').pipe(
    shareReplay({ bufferSize: 1, refCount: true }),
    catchError(() => of(defaultConfig))
  );
  
  getConfig() {
    return this.config$;
  }
}
```

### 3.2 Polling with Backoff
```typescript
// ✅ BEST PRACTICE: Smart polling
export class NotificationService {
  private http = inject(HttpClient);
  
  pollNotifications() {
    return timer(0, 5000).pipe(
      switchMap(() => this.http.get<Notification[]>('/api/notifications')),
      retry({
        count: 3,
        delay: (error, retryCount) => {
          // Exponential backoff
          return timer(Math.pow(2, retryCount) * 1000);
        }
      }),
      takeUntilDestroyed()
    );
  }
}
```

### 3.3 Request Cancellation
```typescript
// ✅ BEST PRACTICE: Cancel previous requests
export class AutocompleteService {
  private searchSubject = new Subject<string>();
  
  results$ = this.searchSubject.pipe(
    debounceTime(300),
    distinctUntilChanged(),
    switchMap(term => 
      this.http.get<string[]>(`/api/autocomplete?q=${term}`).pipe(
        catchError(() => of([]))
      )
    )
  );
  
  search(term: string) {
    this.searchSubject.next(term);
  }
}
```

## 4. Combination Patterns

### 4.1 Multiple Data Sources
```typescript
// ✅ BEST PRACTICE: Combine related data
export class DashboardService {
  private http = inject(HttpClient);
  
  getDashboardData() {
    return forkJoin({
      stats: this.getStats(),
      recentItems: this.getRecentItems(),
      notifications: this.getNotifications()
    }).pipe(
      map(data => ({
        ...data,
        timestamp: new Date()
      })),
      catchError(() => of({
        stats: null,
        recentItems: [],
        notifications: [],
        timestamp: new Date()
      }))
    );
  }
}
```

### 4.2 Sequential Requests
```typescript
// ✅ BEST PRACTICE: Chain dependent requests
export class OrderService {
  createOrder(orderData: OrderData) {
    return this.validateOrder(orderData).pipe(
      switchMap(validation => {
        if (!validation.valid) {
          return throwError(() => validation.errors);
        }
        return this.saveOrder(orderData);
      }),
      switchMap(order => this.sendConfirmation(order.id)),
      map(confirmation => ({
        order: confirmation.order,
        emailSent: confirmation.sent
      }))
    );
  }
}
```

## 5. Performance Patterns

### 5.1 Throttling Updates
```typescript
// ✅ BEST PRACTICE: Throttle expensive operations
export class ScrollService {
  private scrollSubject = new Subject<Event>();
  
  scrollPosition$ = this.scrollSubject.pipe(
    throttleTime(100, undefined, { leading: true, trailing: true }),
    map(event => (event.target as HTMLElement).scrollTop),
    distinctUntilChanged()
  );
  
  @HostListener('scroll', ['$event'])
  onScroll(event: Event) {
    this.scrollSubject.next(event);
  }
}
```

### 5.2 Batch Operations
```typescript
// ✅ BEST PRACTICE: Buffer and batch
export class AnalyticsService {
  private eventSubject = new Subject<AnalyticsEvent>();
  
  constructor() {
    this.eventSubject.pipe(
      bufferTime(5000, null, 50), // 5s or 50 events
      filter(events => events.length > 0),
      concatMap(events => this.sendBatch(events)),
      retry({ count: 3, delay: 1000 })
    ).subscribe();
  }
  
  track(event: AnalyticsEvent) {
    this.eventSubject.next(event);
  }
}
```

## 6. Testing Patterns

### 6.1 Testing Observables
```typescript
// ✅ BEST PRACTICE: Use marble testing
it('should debounce search input', () => {
  const scheduler = new TestScheduler((actual, expected) => {
    expect(actual).toEqual(expected);
  });
  
  scheduler.run(({ cold, expectObservable }) => {
    const input = cold('a-b-c-d-e-f|', {
      a: 'h',
      b: 'he',
      c: 'hel',
      d: 'hell',
      e: 'hello',
      f: 'hello!'
    });
    
    const expected = '-------c---f|';
    
    const result = input.pipe(
      debounceTime(30, scheduler),
      distinctUntilChanged()
    );
    
    expectObservable(result).toBe(expected, {
      c: 'hel',
      f: 'hello!'
    });
  });
});
```

### 6.2 Mocking HTTP
```typescript
// ✅ BEST PRACTICE: Mock observable responses
it('should handle errors', (done) => {
  const error = new HttpErrorResponse({
    error: { message: 'Server error' },
    status: 500
  });
  
  httpClient.get.and.returnValue(throwError(() => error));
  
  service.getData().subscribe({
    next: () => fail('should have failed'),
    error: (err) => {
      expect(err.message).toBe('Server error');
      done();
    }
  });
});
```

## 7. Custom Operators

### 7.1 Loading State Operator
```typescript
// ✅ BEST PRACTICE: Reusable operators
export function withLoading<T>() {
  return (source: Observable<T>) => {
    return defer(() => {
      const loading = signal(true);
      const error = signal<Error | null>(null);
      
      return source.pipe(
        tap({
          next: () => {
            loading.set(false);
            error.set(null);
          },
          error: (err) => {
            loading.set(false);
            error.set(err);
          }
        }),
        map(value => ({ value, loading, error }))
      );
    });
  };
}

// Usage
data$ = this.api.getData().pipe(withLoading());
```

## 8. Migration from Deprecated Patterns

### 8.1 Replace deprecated operators
```typescript
// ❌ OLD: combineLatest as static
import { combineLatest } from 'rxjs';
combineLatest([obs1$, obs2$]);

// ✅ NEW: combineLatest function
import { combineLatest } from 'rxjs';
combineLatest([obs1$, obs2$]);

// ❌ OLD: do operator
.pipe(do(value => console.log(value)))

// ✅ NEW: tap operator
.pipe(tap(value => console.log(value)))
```

## 9. Common Pitfalls to Avoid

### 9.1 Nested Subscriptions
```typescript
// ❌ AVOID: Nested subscriptions
this.user$.subscribe(user => {
  this.orders$.subscribe(orders => {
    // Process user and orders
  });
});

// ✅ BETTER: Use combination operators
combineLatest([this.user$, this.orders$]).pipe(
  map(([user, orders]) => ({ user, orders }))
).subscribe(data => {
  // Process combined data
});
```

### 9.2 Not Handling Errors
```typescript
// ❌ AVOID: No error handling
this.http.get('/api/data').subscribe(data => {
  this.data = data;
});

// ✅ BETTER: Always handle errors
this.http.get('/api/data').pipe(
  catchError(error => {
    console.error('Failed to load data:', error);
    return of([]); // Fallback value
  })
).subscribe(data => {
  this.data = data;
});
```

## 10. Checklist for Review

- [ ] All subscriptions use takeUntilDestroyed()
- [ ] No nested subscriptions
- [ ] Error handling on all HTTP calls
- [ ] Debouncing on user input
- [ ] ShareReplay for cached data
- [ ] SwitchMap for cancellable requests
- [ ] Proper error recovery strategies
- [ ] No memory leaks
- [ ] Using signals where appropriate
- [ ] Proper testing with marbles

## Performance Tips

1. Use `shareReplay` for expensive operations
2. Implement virtual scrolling with observables
3. Debounce/throttle user interactions
4. Cancel unnecessary requests with `switchMap`
5. Batch operations when possible
6. Use `distinctUntilChanged` to prevent unnecessary updates
7. Implement smart polling with backoff
8. Use `combineLatest` sparingly (prefer individual subscriptions)