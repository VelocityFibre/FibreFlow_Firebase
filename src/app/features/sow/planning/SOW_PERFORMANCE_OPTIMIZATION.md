# SOW Module - Performance Benchmarks & Optimization Strategy

## Overview
This document defines performance targets, optimization techniques, and monitoring strategies for the SOW module to ensure fast, responsive user experience even with large datasets.

## Performance Benchmarks

### Target Metrics
| Operation | Small (< 1K records) | Medium (1K-10K) | Large (10K-50K) | Massive (50K+) |
|-----------|---------------------|-----------------|-----------------|----------------|
| File Upload | < 1s | < 2s | < 5s | < 10s |
| Excel Parsing | < 2s | < 5s | < 15s | < 30s |
| Validation | < 1s | < 3s | < 10s | < 20s |
| Calculations | < 0.5s | < 1s | < 3s | < 5s |
| Save to Firebase | < 2s | < 3s | < 5s | < 10s |
| UI Responsiveness | 60 FPS | 60 FPS | 30+ FPS | 30+ FPS |

### Memory Targets
- Peak memory usage: < 500MB for 50K records
- No memory leaks after import
- Garbage collection friendly

## Optimization Strategies

### 1. File Processing Optimization

#### Streaming Parser for Large Files
```typescript
class StreamingExcelParser {
  async parseInChunks(file: File, chunkSize = 1000): AsyncGenerator<any[]> {
    const reader = new FileReader();
    const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks
    
    let offset = 0;
    while (offset < file.size) {
      const chunk = file.slice(offset, offset + CHUNK_SIZE);
      const data = await this.readChunk(chunk);
      
      // Parse Excel chunk
      const workbook = XLSX.read(data, { type: 'array' });
      const rows = XLSX.utils.sheet_to_json(workbook.Sheets[0]);
      
      yield rows;
      offset += CHUNK_SIZE;
    }
  }
}
```

#### Web Worker for CPU-Intensive Operations
```typescript
// excel-worker.ts
self.addEventListener('message', async (e) => {
  const { file, type } = e.data;
  
  // Parse in worker thread
  const data = await parseExcelFile(file);
  const validated = validateData(data, type);
  
  self.postMessage({
    type: 'complete',
    data: validated,
    stats: {
      rowCount: data.length,
      errorCount: validated.errors.length
    }
  });
});
```

### 2. Validation Performance

#### Batch Validation with Early Exit
```typescript
class OptimizedValidator {
  async validateBatch(
    items: any[], 
    rules: ValidationRule[],
    options: { stopOnError?: boolean } = {}
  ) {
    const errors: ValidationError[] = [];
    const BATCH_SIZE = 100;
    
    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      const batch = items.slice(i, i + BATCH_SIZE);
      
      // Parallel validation within batch
      const batchErrors = await Promise.all(
        batch.map(item => this.validateItem(item, rules))
      );
      
      errors.push(...batchErrors.flat());
      
      // Early exit if critical errors
      if (options.stopOnError && errors.some(e => e.severity === 'critical')) {
        break;
      }
    }
    
    return errors;
  }
}
```

#### Validation Caching
```typescript
class ValidationCache {
  private cache = new Map<string, ValidationResult>();
  private maxSize = 10000;
  
  getOrValidate(key: string, validator: () => ValidationResult): ValidationResult {
    if (this.cache.has(key)) {
      return this.cache.get(key)!;
    }
    
    const result = validator();
    
    // LRU eviction
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(key, result);
    return result;
  }
}
```

### 3. UI Responsiveness

#### Virtual Scrolling for Large Tables
```html
<cdk-virtual-scroll-viewport 
  itemSize="48" 
  class="validation-viewport"
  (scrolledIndexChange)="onScroll($event)">
  
  <tr *cdkVirtualFor="let item of validationErrors; trackBy: trackByFn">
    <td>{{ item.row }}</td>
    <td>{{ item.field }}</td>
    <td>{{ item.error }}</td>
    <td>
      <button mat-button (click)="fixError(item)">Fix</button>
    </td>
  </tr>
</cdk-virtual-scroll-viewport>
```

#### Debounced Updates
```typescript
class PerformanceOptimizedComponent {
  private updateSubject = new Subject<any>();
  
  ngOnInit() {
    // Debounce rapid updates
    this.updateSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(data => {
      this.processUpdate(data);
    });
  }
  
  onDataChange(data: any) {
    this.updateSubject.next(data);
  }
}
```

### 4. Memory Management

#### Cleanup Strategy
```typescript
class MemoryEfficientSOW {
  private largeDataArrays: any[] = [];
  
  ngOnDestroy() {
    // Clear large arrays
    this.largeDataArrays.forEach(arr => arr.length = 0);
    
    // Clear blob URLs
    this.blobUrls.forEach(url => URL.revokeObjectURL(url));
    
    // Clear IndexedDB temp data
    this.clearTempStorage();
    
    // Force garbage collection hint
    if (window.gc) window.gc();
  }
  
  // Use WeakMap for metadata
  private metadata = new WeakMap<object, any>();
}
```

#### Progressive Data Loading
```typescript
class ProgressiveLoader {
  async loadDataProgressive(
    totalRecords: number,
    loadBatch: (offset: number, limit: number) => Promise<any[]>
  ) {
    const PAGE_SIZE = 1000;
    const results = [];
    
    for (let offset = 0; offset < totalRecords; offset += PAGE_SIZE) {
      // Load batch
      const batch = await loadBatch(offset, PAGE_SIZE);
      results.push(...batch);
      
      // Update UI
      this.progress.set((offset + PAGE_SIZE) / totalRecords * 100);
      
      // Allow UI to update
      await this.nextTick();
    }
    
    return results;
  }
  
  private nextTick(): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, 0));
  }
}
```

### 5. Firebase Optimization

#### Batch Writes
```typescript
class FirebaseOptimizer {
  async batchSave(items: any[], collectionName: string) {
    const BATCH_SIZE = 500; // Firestore limit
    const batches = [];
    
    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      const batch = writeBatch(this.firestore);
      const batchItems = items.slice(i, i + BATCH_SIZE);
      
      batchItems.forEach(item => {
        const docRef = doc(collection(this.firestore, collectionName));
        batch.set(docRef, item);
      });
      
      batches.push(batch.commit());
    }
    
    await Promise.all(batches);
  }
}
```

#### Efficient Queries
```typescript
// Use field masks to reduce data transfer
const query = query(
  collection(firestore, 'sows'),
  where('projectId', '==', projectId),
  select('id', 'calculations.totals', 'createdAt')
);
```

### 6. Calculation Optimization

#### Memoization for Expensive Calculations
```typescript
class CalculationOptimizer {
  private memoCache = new Map<string, any>();
  
  @memoize()
  calculateDailyTargets(totals: SOWTotals, days: number): DailyTargets {
    const key = `${JSON.stringify(totals)}_${days}`;
    
    if (this.memoCache.has(key)) {
      return this.memoCache.get(key);
    }
    
    const result = {
      polePermissionsDaily: Math.ceil(totals.polePermissionsTotal / days),
      homeSignupsDaily: Math.ceil(totals.homeSignupsTotal / days),
      fibreStringingDaily: Math.ceil(totals.fibreStringingTotal / days),
      // ... other calculations
    };
    
    this.memoCache.set(key, result);
    return result;
  }
}
```

## Performance Monitoring

### Real User Monitoring (RUM)
```typescript
class PerformanceMonitor {
  trackImportPerformance(operation: string) {
    const startMark = `sow_${operation}_start`;
    const endMark = `sow_${operation}_end`;
    
    performance.mark(startMark);
    
    return {
      complete: () => {
        performance.mark(endMark);
        performance.measure(operation, startMark, endMark);
        
        const measure = performance.getEntriesByName(operation)[0];
        
        // Send to analytics
        this.analytics.track('sow_performance', {
          operation,
          duration: measure.duration,
          timestamp: new Date().toISOString()
        });
        
        // Clean up
        performance.clearMarks();
        performance.clearMeasures();
      }
    };
  }
}
```

### Performance Budget
```typescript
interface PerformanceBudget {
  // Bundle sizes
  bundles: {
    main: 500, // KB
    sowModule: 100, // KB
    xlsxLibrary: 400 // KB
  };
  
  // Runtime metrics
  runtime: {
    initialLoad: 3000, // ms
    importFlow: 30000, // ms for 10k records
    memoryPeak: 500 // MB
  };
  
  // Core Web Vitals
  vitals: {
    LCP: 2500, // Largest Contentful Paint
    FID: 100,  // First Input Delay
    CLS: 0.1   // Cumulative Layout Shift
  };
}
```

## Optimization Checklist

### Before Development
- [ ] Set up performance monitoring
- [ ] Configure bundle analyzer
- [ ] Create performance test data
- [ ] Set up memory profiling

### During Development
- [ ] Use virtual scrolling for large lists
- [ ] Implement progressive loading
- [ ] Add loading skeletons
- [ ] Debounce user inputs
- [ ] Use track by functions

### Before Deployment
- [ ] Run performance tests
- [ ] Check bundle sizes
- [ ] Profile memory usage
- [ ] Test with slow network
- [ ] Verify lazy loading

## Performance Testing

### Load Testing Script
```typescript
async function performanceTest() {
  const testCases = [
    { size: 100, name: 'Small' },
    { size: 1000, name: 'Medium' },
    { size: 10000, name: 'Large' },
    { size: 50000, name: 'Massive' }
  ];
  
  for (const testCase of testCases) {
    const data = generateTestData(testCase.size);
    const file = createExcelFile(data);
    
    console.log(`Testing ${testCase.name} (${testCase.size} records)`);
    
    const start = performance.now();
    await sowImport.processFile(file);
    const duration = performance.now() - start;
    
    console.log(`Duration: ${duration}ms`);
    console.log(`Memory: ${performance.memory?.usedJSHeapSize / 1024 / 1024}MB`);
  }
}
```

## Troubleshooting Performance Issues

### Common Problems & Solutions

1. **Slow Excel Parsing**
   - Use streaming parser
   - Process in Web Worker
   - Show progress indicator

2. **UI Freezing**
   - Implement virtual scrolling
   - Use requestAnimationFrame
   - Batch DOM updates

3. **Memory Leaks**
   - Unsubscribe from observables
   - Clear large arrays
   - Remove event listeners

4. **Slow Validation**
   - Cache validation results
   - Use early exit strategy
   - Parallel processing

5. **Firebase Timeouts**
   - Use batch operations
   - Implement retry logic
   - Add connection monitoring