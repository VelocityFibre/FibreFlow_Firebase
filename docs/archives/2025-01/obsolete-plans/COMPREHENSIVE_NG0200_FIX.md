# Comprehensive NG0200 Fix Plan

## Root Causes Identified

1. **Firebase Persistence**: `enableIndexedDbPersistence()` is called synchronously in app.config.ts
2. **ThemeService**: Accesses localStorage and modifies DOM during initialization
3. **PhasesPageComponent**: Accesses localStorage in ngOnInit
4. **Service Injection Timing**: Multiple services being injected might cause timing issues

## The NG0200 Error Pattern

The error is happening during Angular's hydration phase when:
- Components are being created
- Services are being injected
- Change detection runs before all async operations complete

## Immediate Fix Strategy

### 1. Disable Firebase Persistence Temporarily
Remove the synchronous persistence call from app.config.ts

### 2. Create a Global Initialization Service
Move all initialization logic to a single service that runs after Angular is stable

### 3. Use APP_INITIALIZER Properly
Ensure all browser API access happens after Angular initialization

## Implementation Steps

1. **Remove Firebase persistence from app.config.ts**
2. **Create AppInitializerService** to handle all deferred initialization
3. **Update all components** to use deferred initialization
4. **Test each route** to ensure no NG0200 errors

## Code Changes Needed

### app.config.ts
```typescript
provideFirestore(() => {
  const firestore = getFirestore();
  // Remove enableIndexedDbPersistence from here
  return firestore;
})
```

### app-initializer.service.ts
```typescript
@Injectable({ providedIn: 'root' })
export class AppInitializerService {
  initialize(): Promise<void> {
    return new Promise((resolve) => {
      afterNextRender(() => {
        // Enable Firebase persistence
        const firestore = getFirestore();
        enableIndexedDbPersistence(firestore).catch(console.warn);
        
        // Other initialization tasks
        resolve();
      });
    });
  }
}
```

### Update APP_INITIALIZER
```typescript
{
  provide: APP_INITIALIZER,
  useFactory: (initializer: AppInitializerService) => () => initializer.initialize(),
  deps: [AppInitializerService],
  multi: true
}
```