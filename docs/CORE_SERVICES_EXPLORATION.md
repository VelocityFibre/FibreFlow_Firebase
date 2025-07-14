# FibreFlow Core Services Exploration

*Created: 2025-01-14*  
*Status: Initial Discovery*

## Directory Overview

**Location**: `src/app/core/services/`  
**Total Files**: 31 services

## Service Categories

### 1. Foundation Services
- **BaseFirestoreService**: Abstract base class with audit trail integration
- **FirestoreAuditWrapperService**: Wrapper for audit operations
- **AuditTrailService**: Comprehensive audit logging system

### 2. Authentication & Security
- **AuthService**: Authentication management
- **RoleService**: Role-based access control

### 3. Application Infrastructure
- **AppInitializerService**: App initialization
- **GlobalErrorHandlerService**: Global error handling
- **SentryErrorHandlerService**: Sentry integration
- **RemoteLoggerService**: Remote logging
- **LoadingService**: Loading state management
- **NotificationService**: User notifications
- **ThemeService**: Theme management
- **EventBusService**: Event communication

### 4. Storage & State
- **BrowserStorageService**: Browser storage wrapper
- **RouteTrackerService**: Route tracking
- **ServiceWorkerUpdateService**: PWA updates

### 5. Project-Specific Services
- **ProjectService**: Project management
- **ProjectInitializationService**: Project setup
- **ProjectCleanupService**: Project cleanup
- **PhaseService**: Project phases
- **StepService**: Project steps
- **TaskService**: Project tasks
- **StaffProjectBridgeService**: Staff-project linking

### 6. Feature Support
- **KpiCalculatorService**: KPI calculations
- **DateFormatService**: Date formatting
- **DevNoteService**: Development notes

## Key Findings

### 1. BaseFirestoreService Pattern NOT Used

**Discovery**: Despite documentation stating "All services extend BaseFirestoreService", the actual implementation shows:
- BaseFirestoreService exists with comprehensive audit logging
- NO services actually extend it
- Services use direct Firestore injection instead

**Evidence**:
```typescript
// BaseFirestoreService exists with methods:
- addDocWithAudit()
- updateDocWithAudit()
- setDocWithAudit()
- deleteDocWithAudit()

// But services like ProjectService, BOQService, StaffService:
- Inject Firestore directly
- Don't extend BaseFirestoreService
- Don't use audit methods
```

### 2. Actual Service Pattern

Services follow this pattern:
```typescript
@Injectable({
  providedIn: 'root'
})
export class ServiceName {
  private firestore = inject(Firestore);
  private collection = collection(this.firestore, 'collectionName');
  
  // CRUD methods using direct Firestore operations
  getAll(): Observable<Model[]> { }
  getById(id: string): Observable<Model> { }
  create(data: Model): Promise<DocumentReference> { }
  update(id: string, data: Partial<Model>): Promise<void> { }
  delete(id: string): Promise<void> { }
}
```

### 3. Audit Trail Integration

**Current State**:
- AuditTrailService exists and is comprehensive
- Has queue-based batch logging
- Supports user/system actions
- BUT: Not integrated with most services

**Manual Integration** in some services:
```typescript
// ProjectService manually calls audit
private auditService = inject(AuditTrailService);
// Then manually logs actions
```

## Service Architecture Insights

### 1. Dependency Injection
- Uses Angular's `inject()` function
- Services marked with `providedIn: 'root'`
- No traditional constructor DI

### 2. Observable Pattern
- Heavy use of RxJS Observables
- Real-time data with `collectionData()`
- Error handling with `catchError()`

### 3. Firestore Integration
- Direct use of @angular/fire/firestore
- Collection references typed with generics
- Server timestamps for created/updated

### 4. No Service Inheritance
- Services are standalone
- No shared base class usage
- Each service handles its own logic

## Recommendations

### 1. Refactor to Use BaseFirestoreService
```typescript
// Current approach needs updating to:
export class ProjectService extends BaseFirestoreService {
  protected getEntityType(): EntityType {
    return 'project';
  }
  
  // Use inherited audit methods
}
```

### 2. Or Remove BaseFirestoreService
If not using inheritance pattern, consider:
- Converting BaseFirestoreService to utility functions
- Creating an AuditWrapper service
- Documenting the actual pattern used

### 3. Standardize Service Structure
Create a service template that reflects actual usage:
- Direct Firestore injection
- Standard CRUD methods
- Observable return types
- Manual audit integration where needed

## Next Steps

1. **Document Actual Patterns** ✅
   - Services don't extend BaseFirestoreService
   - Direct Firestore usage is standard
   - Audit trail manually integrated

2. **Create Service Specifications**
   - Template for new services
   - Integration patterns
   - Testing approaches

3. **Update antiHall Knowledge**
   - Correct the inheritance misconception
   - Document real patterns
   - Add service creation guide

## File Count Summary

**Core Services**: 31 files
- Infrastructure: 15 files
- Project-related: 6 files  
- Feature support: 10 files

**Feature Services**: 39 files (from glob search)
- Located in `features/*/services/`
- Follow similar patterns
- No BaseFirestoreService inheritance

**Total Service Files**: ~70 files