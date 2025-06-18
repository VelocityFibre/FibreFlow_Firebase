# FibreFlow State Management Optimization Plan

## 🎯 Strategy: Leverage Existing Firebase + Angular Features

Instead of adding NgRx/Akita, we'll optimize the current stack by:
1. **Maximizing Firestore's real-time capabilities**
2. **Adopting Angular Signals for local state**
3. **Creating reusable service patterns**

## 📋 Implementation Plan

### Phase 1: Firestore Real-time Optimization (Week 1)

#### 1.1 Create Base Firestore Service
```typescript
// core/services/base-firestore.service.ts
export abstract class BaseFirestoreService<T> {
  protected cache = new Map<string, Observable<T>>();
  
  // Cached real-time document listener
  protected getDocument(path: string): Observable<T> {
    if (!this.cache.has(path)) {
      this.cache.set(path, 
        this.firestore.doc<T>(path).valueChanges().pipe(
          shareReplay(1)
        )
      );
    }
    return this.cache.get(path)!;
  }
  
  // Cached collection with real-time updates
  protected getCollection(path: string, queryFn?: QueryFn): Observable<T[]> {
    const key = queryFn ? `${path}-${queryFn.toString()}` : path;
    if (!this.cache.has(key)) {
      this.cache.set(key,
        this.firestore.collection<T>(path, queryFn)
          .valueChanges({ idField: 'id' })
          .pipe(shareReplay(1))
      );
    }
    return this.cache.get(key)!;
  }
}
```

#### 1.2 Migrate Services to Real-time Pattern
- ✅ Benefits: Auto-sync, no manual refresh, real-time collaboration
- Convert one-time `get()` calls to `valueChanges()` listeners
- Services to update:
  - [ ] ProjectService
  - [ ] TaskService  
  - [ ] StockService
  - [ ] StaffService

### Phase 2: Angular Signals Integration (Week 1-2)

#### 2.1 Create Signal-based State Services
```typescript
// Example: Project State Service
export class ProjectStateService {
  // Signals for reactive state
  private projectsSignal = signal<Project[]>([]);
  private selectedProjectId = signal<string | null>(null);
  private loadingSignal = signal(false);
  
  // Public computed values
  projects = this.projectsSignal.asReadonly();
  selectedProject = computed(() => 
    this.projectsSignal().find(p => p.id === this.selectedProjectId())
  );
  
  activeProjects = computed(() =>
    this.projectsSignal().filter(p => p.status === ProjectStatus.ACTIVE)
  );
  
  projectStats = computed(() => ({
    total: this.projectsSignal().length,
    active: this.activeProjects().length,
    completed: this.projectsSignal().filter(p => p.status === ProjectStatus.COMPLETED).length
  }));
}
```

#### 2.2 Components to Convert
- [ ] Dashboard (statistics)
- [ ] Project List (filters/sorting)
- [ ] Task Management (assignee filters)
- [ ] Stock Management (inventory levels)

### Phase 3: Service Pattern Optimization (Week 2)

#### 3.1 Implement Smart Caching
```typescript
export class SmartCacheService {
  // Cache with TTL (time-to-live)
  private cache = new Map<string, { data: any, timestamp: number }>();
  private ttl = 5 * 60 * 1000; // 5 minutes
  
  get<T>(key: string, fetcher: () => Observable<T>): Observable<T> {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.ttl) {
      return of(cached.data);
    }
    
    return fetcher().pipe(
      tap(data => this.cache.set(key, { data, timestamp: Date.now() }))
    );
  }
}
```

#### 3.2 Create Facade Services
```typescript
// Combine related operations
export class ProjectFacadeService {
  constructor(
    private projects: ProjectService,
    private tasks: TaskService,
    private phases: PhaseService
  ) {}
  
  // Single method to get all project data
  getProjectDetails(projectId: string) {
    return combineLatest({
      project: this.projects.getProjectById(projectId),
      phases: this.phases.getProjectPhases(projectId),
      tasks: this.tasks.getTasksByProject(projectId)
    });
  }
}
```

## 📊 Expected Benefits

### Before vs After

| Aspect | Current | Optimized |
|--------|---------|-----------|
| **Data Freshness** | Manual refresh | Real-time sync |
| **API Calls** | Duplicate requests | Cached & shared |
| **State Updates** | Scattered | Centralized signals |
| **Offline Support** | Basic | Full sync |
| **Performance** | Good | Excellent |

### Performance Improvements
- 🚀 50% fewer API calls through caching
- ⚡ Instant UI updates with signals
- 🔄 Real-time collaboration features
- 📱 Better offline experience

## 🛠️ Implementation Steps

### Week 1: Foundation
1. Create base services and patterns
2. Implement real-time listeners for Projects
3. Add signal-based state for Dashboard
4. Test offline scenarios

### Week 2: Rollout
1. Migrate remaining services
2. Convert complex components to signals
3. Implement smart caching
4. Add performance monitoring

### Week 3: Polish
1. Optimize bundle size
2. Add e2e tests for real-time features
3. Document patterns for team
4. Performance benchmarking

## 🎯 Success Metrics
- ✅ All major collections use real-time listeners
- ✅ 0 duplicate API calls for same data
- ✅ <100ms UI response to state changes
- ✅ Full offline functionality
- ✅ 30% reduction in code complexity

## 📝 Notes
- No need for NgRx/Akita - Firebase + Signals is sufficient
- Focus on leveraging existing tools better
- Gradual migration - no breaking changes
- Team training on new patterns