# PoleTracker Service Migration Guide

This guide explains how to migrate from the Firebase-based PoleTrackerService to the Neon-based PoleTrackerNeonService.

## Service Comparison

### Key Differences

| Feature | Firebase Service | Neon Service |
|---------|-----------------|--------------|
| Real-time updates | Automatic via Firestore | Requires polling or manual refresh |
| Data source | Multiple Firebase collections | Single PostgreSQL database |
| Query performance | Good for simple queries | Excellent for complex queries |
| Offline support | Built-in | Requires custom implementation |
| Data integrity | Application-level | Database-level constraints |

## Migration Steps

### 1. Update Service Injection

**Before (Firebase):**
```typescript
import { PoleTrackerService } from './services/pole-tracker.service';

export class PoleTrackerListComponent {
  private poleService = inject(PoleTrackerService);
}
```

**After (Neon):**
```typescript
import { PoleTrackerNeonService } from './services/pole-tracker-neon.service';

export class PoleTrackerListComponent {
  private poleService = inject(PoleTrackerNeonService);
}
```

### 2. Method Compatibility

Most methods have the same signature, making migration straightforward:

#### ✅ Direct Replacements (No Changes Needed)
- `getAll(filter?: PoleTrackerFilter)`
- `getById(id: string)`
- `create(pole: Partial<PoleTracker>)`
- `update(id: string, updates: Partial<PoleTracker>)`
- `delete(id: string)`
- `getByProject(projectId: string)`
- `getByContractor(contractorId: string)`
- `getStatistics(projectId?: string)`

#### ⚠️ New Methods in Neon Service
- `getByPoleNumber(poleNumber: string)` - Direct pole lookup
- `validatePoleNumber(poleNumber: string, excludeId?: string)` - Database validation
- `checkPoleCapacity(poleId: string)` - Capacity checking
- `getConnectedDrops(poleId: string)` - Get drops for a pole
- `addStatusHistory(poleId: string, status: string, notes?: string)` - Status tracking

#### ❌ Methods Not Yet Implemented
- Real-time subscriptions (requires WebSocket or polling)
- Offline queue support (requires custom implementation)
- Batch operations (can be added)

### 3. Real-time Updates

Firebase provided automatic real-time updates. With Neon, you need to implement polling or refresh:

**Option 1: Manual Refresh**
```typescript
refreshPoles() {
  this.poles$ = this.poleService.getAll();
}
```

**Option 2: Polling**
```typescript
ngOnInit() {
  this.poles$ = interval(30000).pipe(
    startWith(0),
    switchMap(() => this.poleService.getAll())
  );
}
```

**Option 3: Event-based Refresh**
```typescript
// After create/update/delete operations
this.poleService.create(newPole).subscribe(() => {
  this.refreshPoles();
});
```

### 4. Error Handling

Neon service includes error handling, but you may want to add UI feedback:

```typescript
this.poleService.create(pole).subscribe({
  next: (id) => {
    this.snackBar.open('Pole created successfully', 'Close');
    this.refreshPoles();
  },
  error: (error) => {
    // Neon provides specific error messages
    this.snackBar.open(error.message || 'Error creating pole', 'Close');
  }
});
```

### 5. Photo Uploads

Photo upload method has changed slightly:

**Before (Firebase):**
```typescript
// Handled through pole update with uploads object
this.poleService.update(poleId, { uploads: { front: uploadData } });
```

**After (Neon):**
```typescript
// Direct photo upload method
this.poleService.uploadPhoto(poleId, UploadType.FRONT, photoUrl, thumbnailUrl);
```

### 6. Status History

Status updates now maintain history automatically:

```typescript
// This creates a status history entry AND updates the pole
this.poleService.addStatusHistory(
  poleId, 
  'quality_checked',
  'Passed quality inspection',
  currentUser.id
);
```

## Component Migration Examples

### List Component
```typescript
// Minimal changes needed
export class PoleTrackerListComponent implements OnInit {
  // Change: Import and inject Neon service
  private poleService = inject(PoleTrackerNeonService);
  
  poles$!: Observable<PoleTracker[]>;
  
  ngOnInit() {
    // Same API, works as before
    this.poles$ = this.poleService.getAll();
  }
  
  // Add refresh capability
  refresh() {
    this.poles$ = this.poleService.getAll();
  }
}
```

### Form Component
```typescript
export class PoleTrackerFormComponent {
  private poleService = inject(PoleTrackerNeonService);
  
  async save() {
    const pole = this.form.value;
    
    // New: Validate pole number first
    const isValid = await firstValueFrom(
      this.poleService.validatePoleNumber(pole.poleNumber)
    );
    
    if (!isValid) {
      this.showError('Pole number already exists');
      return;
    }
    
    // Same create API
    this.poleService.create(pole).subscribe({
      next: (id) => {
        this.router.navigate(['/pole-tracker', id]);
      },
      error: (error) => {
        this.showError(error.message);
      }
    });
  }
}
```

### Detail Component
```typescript
export class PoleTrackerDetailComponent {
  private poleService = inject(PoleTrackerNeonService);
  
  pole$!: Observable<PoleTracker | null>;
  drops$!: Observable<any[]>;
  
  ngOnInit() {
    const id = this.route.snapshot.params['id'];
    
    // Same API for pole details
    this.pole$ = this.poleService.getById(id);
    
    // New: Get connected drops
    this.drops$ = this.poleService.getConnectedDrops(id);
  }
  
  uploadPhoto(type: UploadType, file: File) {
    // Upload to storage first
    const url = await this.uploadToStorage(file);
    
    // New: Direct photo upload method
    this.poleService.uploadPhoto(this.poleId, type, url).subscribe(() => {
      this.refresh();
    });
  }
}
```

## Testing Migration

### 1. Unit Tests
- Mock `NeonService` instead of Firestore
- Test data validation methods
- Test error scenarios

### 2. Integration Tests
- Test with actual Neon database
- Verify data integrity constraints
- Test concurrent updates

### 3. Performance Tests
- Compare query performance
- Test with large datasets
- Monitor database connections

## Rollback Plan

If issues arise, you can temporarily switch back:

1. Keep both services available
2. Use environment flag to choose service:

```typescript
@Injectable()
export class PoleTrackerServiceFactory {
  create() {
    return environment.useNeon 
      ? inject(PoleTrackerNeonService)
      : inject(PoleTrackerService);
  }
}
```

## Benefits After Migration

1. **Data Integrity**: Database-level constraints ensure valid data
2. **Better Performance**: Complex queries run faster
3. **Unified Data**: All pole data in one place
4. **Advanced Features**: PostGIS for location queries
5. **Scalability**: PostgreSQL handles large datasets better

## Next Steps

1. Run migration script: `npm run migrate:poles`
2. Update all components to use Neon service
3. Test thoroughly in development
4. Monitor performance
5. Remove Firebase collections after verification