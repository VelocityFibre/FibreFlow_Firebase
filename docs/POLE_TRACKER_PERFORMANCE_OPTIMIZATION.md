# Pole Tracker Performance Optimization Guide

*Created: 2025-01-16*

## Current Performance Issues

### Metrics from Lawley Project (4,468 poles)
- **Query Time**: 26.9 seconds to load all poles
- **Data Size**: 4.28 MB transferred
- **DOM Elements**: 4,468 table rows rendered
- **Memory Usage**: ~13 MB in browser
- **Performance Impact**: 75x slower than paginated approach

## Optimization Strategies

### 1. Immediate Fix: Pagination (1-2 hours work)

**Implementation Steps**:

#### A. Update Service Method
```typescript
// pole-tracker.service.ts
getPlannedPolesByProjectPaginated(
  projectId: string, 
  pageSize: number = 50,
  lastVisible?: DocumentSnapshot
): Observable<{ poles: PlannedPole[], hasMore: boolean }> {
  let q = query(
    collection(this.firestore, 'planned-poles'),
    where('projectId', '==', projectId),
    orderBy('poleNumber'),
    limit(pageSize)
  );
  
  if (lastVisible) {
    q = query(q, startAfter(lastVisible));
  }
  
  return from(getDocs(q)).pipe(
    map((snapshot) => ({
      poles: snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }) as PlannedPole),
      hasMore: snapshot.docs.length === pageSize,
      lastDoc: snapshot.docs[snapshot.docs.length - 1]
    }))
  );
}
```

#### B. Update Component
```typescript
// pole-tracker-list.component.ts
export class PoleTrackerListComponent {
  // Add pagination properties
  pageSize = 50;
  currentPage = 0;
  hasMore = true;
  lastDoc: any = null;
  
  // Update template to use MatPaginator
  // Add to imports: MatPaginatorModule
}
```

#### C. Add to Template
```html
<mat-paginator 
  [length]="totalPoles"
  [pageSize]="pageSize"
  [pageSizeOptions]="[25, 50, 100]"
  (page)="onPageChange($event)">
</mat-paginator>
```

**Expected Results**:
- Initial load: ~350ms (75x faster)
- Data transfer: 0.05 MB (98% reduction)

### 2. Virtual Scrolling (3-4 hours work)

**Implementation**:

```typescript
// Import CDK Virtual Scrolling
import { ScrollingModule } from '@angular/cdk/scrolling';

// Template change
<cdk-virtual-scroll-viewport itemSize="48" class="pole-list-viewport">
  <mat-table [dataSource]="dataSource">
    <!-- Table content -->
  </mat-table>
</cdk-virtual-scroll-viewport>
```

**CSS**:
```scss
.pole-list-viewport {
  height: 600px;
  overflow: auto;
}
```

### 3. Server-Side Filtering (4-6 hours work)

**Add Smart Search**:
```typescript
// Enhanced search with debouncing
searchControl = new FormControl('');

ngOnInit() {
  this.searchControl.valueChanges.pipe(
    debounceTime(300),
    distinctUntilChanged(),
    switchMap(term => this.searchPoles(term))
  ).subscribe(results => {
    this.poles.set(results);
  });
}

searchPoles(term: string) {
  if (!term || term.length < 3) {
    return this.loadPoles();
  }
  
  // Use composite query
  return this.poleService.searchPoles(this.projectId, term);
}
```

### 4. Progressive Data Loading Pattern

```typescript
// Implement infinite scroll
@HostListener('window:scroll', ['$event'])
onScroll(event: any) {
  const scrollPosition = window.innerHeight + window.scrollY;
  const threshold = document.body.offsetHeight - 200;
  
  if (scrollPosition > threshold && !this.loading && this.hasMore) {
    this.loadMorePoles();
  }
}

loadMorePoles() {
  this.loading = true;
  this.poleService.getNextPage(this.lastDoc).subscribe(result => {
    this.poles.update(current => [...current, ...result.poles]);
    this.lastDoc = result.lastDoc;
    this.hasMore = result.hasMore;
    this.loading = false;
  });
}
```

### 5. Data Structure Optimization

**Create Summary Documents**:
```typescript
// Firestore structure
projects/{projectId}/statistics/poles {
  total: 4468,
  byType: { feeder: 2107, distribution: 2361 },
  byContractor: { ... },
  lastUpdated: Timestamp
}
```

**Use Field Projections**:
```typescript
// For list view, only fetch needed fields
.select('poleNumber', 'poleType', 'location', 'dropCount', 'status')
```

### 6. Caching Strategy

```typescript
// Implement simple cache service
@Injectable()
export class PoleDataCache {
  private cache = new Map<string, CachedData>();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes
  
  get(key: string): PlannedPole[] | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    return null;
  }
  
  set(key: string, data: PlannedPole[]) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }
}
```

## Performance Testing in Browser

### Using Chrome DevTools

1. **Network Tab**:
   - Check payload size
   - Monitor request duration
   - Look for waterfall timing

2. **Performance Tab**:
   - Record page load
   - Check for long tasks
   - Identify rendering bottlenecks

3. **Memory Tab**:
   - Take heap snapshots
   - Monitor memory growth
   - Check for detached DOM nodes

### Lighthouse Audit
```bash
# Run Lighthouse for performance score
# Focus on:
- First Contentful Paint
- Time to Interactive
- Total Blocking Time
- Cumulative Layout Shift
```

## Implementation Priority

### Phase 1: Quick Wins (1 day)
1. ✅ Add pagination (50 records default)
2. ✅ Implement trackBy function
3. ✅ Add loading indicators
4. ✅ Remove orderBy until index created

### Phase 2: Major Improvements (1 week)
1. 📝 Virtual scrolling implementation
2. 📝 Server-side search/filter
3. 📝 Progressive loading
4. 📝 Field projections

### Phase 3: Advanced Optimization (2 weeks)
1. 🔲 Summary statistics documents
2. 🔲 Client-side caching
3. 🔲 Firestore bundles
4. 🔲 Web Workers for data processing

## Expected Outcomes

### Before Optimization
- Load time: 27 seconds
- Data transfer: 4.3 MB
- User experience: Frozen UI

### After Phase 1
- Load time: <1 second
- Data transfer: 50 KB
- User experience: Instant response

### After Full Implementation
- Load time: <500ms
- Data transfer: On-demand
- User experience: Smooth scrolling, instant search

## Code Example: Complete Paginated Implementation

```typescript
// Updated pole-tracker-list.component.ts
export class PoleTrackerListComponent implements OnInit {
  // Pagination
  pageSize = 50;
  pageIndex = 0;
  totalPoles = 0;
  
  // Performance
  trackByPoleId = (index: number, pole: PoleTrackerListItem) => pole.id;
  
  loadPoles() {
    this.loading.set(true);
    
    // Get count first
    this.poleService.getPolesCount(this.selectedProjectId)
      .subscribe(count => this.totalPoles = count);
    
    // Load page
    this.poleService.getPolesPaginated(
      this.selectedProjectId,
      this.pageSize,
      this.pageIndex
    ).subscribe({
      next: (poles) => {
        this.poles.set(poles);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading poles:', error);
        this.loading.set(false);
      }
    });
  }
  
  onPageChange(event: PageEvent) {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadPoles();
  }
}
```

## Monitoring Performance

```typescript
// Add performance monitoring
const startTime = performance.now();

this.loadPoles().subscribe(() => {
  const loadTime = performance.now() - startTime;
  console.log(`Poles loaded in ${loadTime}ms`);
  
  // Send to analytics
  if (window.gtag) {
    gtag('event', 'timing_complete', {
      name: 'pole_list_load',
      value: Math.round(loadTime)
    });
  }
});
```

## Testing Different Approaches

Use the performance test script:
```bash
node test-pole-tracker-performance.js
```

This will show you exact metrics for different query strategies.

---

**Remember**: The goal is to load data progressively and only what's visible to the user. Loading 4,468 records at once is unnecessary when users can only see ~20 rows on screen!