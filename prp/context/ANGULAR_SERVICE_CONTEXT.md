# Angular Service Context Template

## 🎯 **SERVICE PATTERN**

### Base Service Extension
```typescript
import { Injectable } from '@angular/core';
import { BaseFirestoreService } from '@core/services/base-firestore.service';
import { [ModelName] } from '@core/models/[model-name].model';

@Injectable({ providedIn: 'root' })
export class [ServiceName]Service extends BaseFirestoreService<[ModelName]> {
  constructor() {
    super('[collection-name]');
  }
  
  // Custom methods here
}
```

### Key Patterns to Follow
1. **Always extend BaseFirestoreService** for Firestore collections
2. **Use signals for state management**
3. **Return Observables for async operations**
4. **Handle errors with catchError**
5. **Implement proper typing**

### Common Methods
```typescript
// Get with query
getActive(): Observable<[Model][]> {
  return this.getWithQuery([
    where('status', '==', 'active'),
    orderBy('createdAt', 'desc')
  ]);
}

// Get with relationships
getWithRelated(id: string): Observable<[Model]> {
  return this.get(id).pipe(
    switchMap(item => {
      // Load related data
      return combineLatest([
        of(item),
        this.relatedService.getByParent(id)
      ]).pipe(
        map(([item, related]) => ({
          ...item,
          related
        }))
      );
    })
  );
}

// Computed signals
activeCount = computed(() => 
  this.items().filter(item => item.status === 'active').length
);
```

### Error Handling
```typescript
operation(): Observable<Result> {
  return this.http.post<Result>(url, data).pipe(
    catchError(error => {
      console.error('Operation failed:', error);
      this.snackBar.open('Operation failed', 'Close', {
        duration: 3000
      });
      return EMPTY;
    })
  );
}
```

### Testing Template
```typescript
describe('[ServiceName]Service', () => {
  let service: [ServiceName]Service;
  
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [/* required imports */],
      providers: [/* mocked dependencies */]
    });
    service = TestBed.inject([ServiceName]Service);
  });
  
  it('should be created', () => {
    expect(service).toBeTruthy();
  });
  
  // Add specific tests
});
```

## 🚨 **IMPORTANT NOTES**

1. **Never manipulate data directly** - Use service methods
2. **Always type your models** - No 'any' types
3. **Handle loading states** - Use signals or BehaviorSubjects
4. **Consider offline scenarios** - Firestore handles this well
5. **Implement proper cleanup** - Unsubscribe when needed

## 📚 **REFERENCES**

- Base Service: `src/app/core/services/base-firestore.service.ts`
- Example Services: ProjectService, TaskService, StaffService
- Angular Docs: https://angular.io/guide/dependency-injection
- RxJS Patterns: https://www.learnrxjs.io/