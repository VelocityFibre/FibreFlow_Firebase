# FibreFlow Services Reference Guide

## Overview
This directory contains all core services for the FibreFlow application. Services follow consistent patterns with dependency injection, signal-based state management, and Firebase integration.

## Base Service Pattern

### BaseFirestoreService
**Location**: `base-firestore.service.ts`
**Purpose**: Abstract base class for all Firestore services with automatic audit logging

```typescript
export abstract class BaseFirestoreService {
  protected firestore = inject(Firestore);
  private auditService = inject(AuditTrailService);
  
  // Required abstract method
  protected abstract getEntityType(): EntityType;
  
  // CRUD methods with audit logging
  protected async addDocWithAudit<T>(collection, data): Promise<DocumentReference<T>>
  protected async updateDocWithAudit<T>(doc, data): Promise<void>
  protected async setDocWithAudit<T>(doc, data, options?): Promise<void>
  protected async deleteDocWithAudit<T>(doc): Promise<void>
  
  // Helper methods
  protected getEntityName(data: any): string
  protected getCollection<T>(path: string): CollectionReference<T>
  protected getDoc<T>(path: string, ...segments): DocumentReference<T>
}
```

**Key Features**:
- Automatic audit trail logging for all CRUD operations
- Entity name extraction from various data fields
- Success/failure tracking with error messages
- Helper methods for collection/document references

## Core Services

### AuthService
**Purpose**: Mock authentication service (development mode)
**Status**: Development only - always logged in as admin

```typescript
class AuthService {
  // Signals
  readonly currentUser = signal<User | null>(mockUser);
  readonly currentUserProfile = signal<UserProfile | null>(mockUserProfile);
  readonly isAuthenticated = computed(() => !!user);
  readonly userRole = computed(() => profile?.userGroup);
  readonly isAdmin = computed(() => profile?.userGroup === 'admin');
  
  // Methods
  async loginWithGoogle(): Promise<User>
  async logout(): Promise<void>
  getCurrentUser(): User | null
  getCurrentUserProfile(): UserProfile | null
  hasRole(role: UserGroup): boolean
  hasAnyRole(roles: UserGroup[]): boolean
  async updateUserProfile(updates: Partial<UserProfile>): Promise<void>
}
```

### ThemeService
**Purpose**: Manages application theming with 4 themes
**Themes**: light, dark, vf, fibreflow

```typescript
class ThemeService {
  private theme = signal<Theme>('light');
  
  initialize(injector: Injector): void  // Call in app.component
  getTheme(): Theme
  setTheme(theme: Theme): void
  toggleTheme(): void
  
  // Computed signals
  readonly isDark = computed(() => theme === 'dark' || theme === 'vf');
  readonly themeClass = computed(() => `theme-${theme}`);
}
```

### NotificationService
**Purpose**: User notifications via Material Snackbar

```typescript
class NotificationService {
  success(message: string, action?: string): void
  error(message: string, action?: string): void
  warning(message: string, action?: string): void
  info(message: string, action?: string): void
  showWithProgress(message: string): void
  dismiss(): void
}
```

### LoadingService
**Purpose**: Global loading state management

```typescript
class LoadingService {
  readonly isLoading = computed(() => loadingCount > 0);
  
  show(): void  // Increments counter
  hide(): void  // Decrements counter
  reset(): void // Force reset to 0
}
```

### AuditTrailService
**Purpose**: Comprehensive audit logging for all entities
**Features**: Batched writes, field change tracking, bulk operations

```typescript
class AuditTrailService {
  // User actions
  async logUserAction(
    entityType: EntityType,
    entityId: string,
    entityName: string,
    action: AuditAction,
    oldData?: any,
    newData?: any,
    status: ActionStatus = 'success',
    errorMessage?: string,
    metadata?: Record<string, any>
  ): Promise<void>
  
  // System actions
  async logSystemAction(...): Promise<void>
  
  // Bulk operations
  async logBulkOperation(
    entityType: EntityType,
    operation: BulkOperation,
    status: ActionStatus,
    errorMessage?: string
  ): Promise<void>
  
  // Queries
  async getAuditLogs(
    filters?: AuditFilters,
    pageLimit?: number,
    lastDocument?: DocumentSnapshot
  ): Promise<PaginatedAuditResult>
  
  async getEntityAuditHistory(
    entityType: EntityType,
    entityId: string,
    pageLimit?: number
  ): Promise<AuditLog[]>
  
  // Permissions
  canAccessAuditTrail(): boolean  // Admin only
  
  // Utilities
  async forceFlush(): Promise<void>  // Force immediate write
}
```

## Feature Services

### ProjectService
**Purpose**: Complete project lifecycle management
**Collections**: projects, phases (subcollection), steps (subcollection), tasks (subcollection)

```typescript
class ProjectService {
  // CRUD Operations
  getProjects(): Observable<Project[]>
  getActiveProjects(): Observable<Project[]>
  getProjectById(id: string): Observable<Project | undefined>
  async getProjectOnce(id: string): Promise<Project | undefined>
  async createProject(project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<string>
  async updateProject(id: string, updates: Partial<Project>): Promise<void>
  async deleteProject(id: string): Promise<void>
  
  // Hierarchical Data
  getProjectHierarchy(projectId: string): Observable<ProjectHierarchy | undefined>
  getPhases(projectId: string): Observable<Phase[]>
  getSteps(projectId: string, phaseId: string): Observable<Step[]>
  getTasks(projectId: string, phaseId: string, stepId: string): Observable<Task[]>
  
  // Phase Operations
  async createPhase(projectId: string, phase: Omit<Phase, 'id'>): Promise<string>
  async updatePhase(projectId: string, phaseId: string, updates: Partial<Phase>): Promise<void>
  
  // Client Relations
  getProjectsByClient(clientId: string): Observable<Project[]>
  async updateClientMetricsForProject(clientId: string): Promise<void>
  
  // Progress Calculations
  async calculateProjectProgress(projectId: string): Promise<number>
  async calculatePhaseProgress(projectId: string, phaseId: string): Promise<number>
}
```

### PhaseService
**Purpose**: Project phase management with dependencies
**Features**: Templates, dependencies, assignments

```typescript
class PhaseService {
  // Phase CRUD
  getProjectPhases(projectId: string): Observable<Phase[]>
  getPhase(projectId: string, phaseId: string): Observable<Phase | undefined>
  async createProjectPhases(projectId: string): Promise<void>
  
  // Status & Assignment
  async updatePhaseStatus(
    projectId: string,
    phaseId: string,
    status: PhaseStatus,
    blockedReason?: string
  ): Promise<void>
  
  async assignPhase(projectId: string, phaseId: string, staffId: string | null): Promise<void>
  
  // Dates & Progress
  async updatePhaseDates(
    projectId: string,
    phaseId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<void>
  
  calculateProjectProgress(phases: Phase[]): number
  
  // Dependencies
  canStartPhase(phase: Phase, allPhases: Phase[]): boolean
  
  // Templates
  getPhaseTemplates(): Observable<PhaseTemplate[]>
  createPhaseTemplate(template: Omit<PhaseTemplate, 'id'>): Observable<void>
  updatePhaseTemplate(templateId: string, updates: Partial<PhaseTemplate>): Observable<void>
  deletePhaseTemplate(templateId: string): Observable<void>
  
  // Utilities
  async ensureProjectHasPhases(projectId: string): Promise<void>
  async initializeDefaultTemplates(): Promise<void>
}
```

### TaskService
**Purpose**: Task management across projects
**Collections**: tasks (global collection)

```typescript
class TaskService {
  // Task Queries
  getAllTasks(): Observable<Task[]>
  getTasksByProject(projectId: string): Observable<Task[]>
  getTasksByPhase(phaseId: string): Observable<Task[]>
  getTasksByAssignee(userId: string): Observable<Task[]>
  getTask(taskId: string): Observable<Task | undefined>
  
  // CRUD Operations
  async createTask(task: Omit<Task, 'id'>): Promise<string>
  async updateTask(taskId: string, updates: Partial<Task>): Promise<void>
  async deleteTask(taskId: string): Promise<void>
  
  // Task Management
  async assignTask(taskId: string, userId: string, notes?: string): Promise<void>
  async updateTaskProgress(taskId: string, percentage: number, actualHours?: number): Promise<void>
  async updateTaskOrder(tasks: { id: string; orderNo: number }[]): Promise<void>
  async reassignTask(taskId: string, newUserId: string, reason: string): Promise<void>
  
  // Notes
  async addTaskNote(taskId: string, note: string): Promise<void>
  getTaskNotes(taskId: string): Observable<TaskNote[]>
  
  // Templates & Initialization
  async createTasksForPhase(projectId: string, phase: Phase): Promise<void>
  async createTasksForProject(projectId: string, phases: Phase[]): Promise<void>
  async initializeProjectTasks(projectId: string): Promise<void>
  async initializeProjectTasksWithSteps(projectId: string): Promise<void>
  async migrateTasksWithStepIds(projectId: string): Promise<void>
  
  // Statistics
  getTaskStatsByUser(userId: string): Observable<TaskStats>
}
```

### RoleService
**Purpose**: Role-based access control
**Collections**: roles

```typescript
class RoleService {
  // Role Management
  getRoles(): Observable<Role[]>
  getRole(id: string): Observable<Role | undefined>
  async createRole(role: Omit<Role, 'id' | 'createdAt' | 'updatedAt'>): Promise<string>
  async updateRole(id: string, updates: Partial<Role>): Promise<void>
  async deleteRole(id: string): Promise<void>
  
  // Permissions
  getPermissions(): Observable<Permission[]>
  getPermissionsByCategory(): Observable<Map<string, Permission[]>>
  async hasPermission(userId: string, permissionId: string): Promise<boolean>
  
  // Initialization
  async initializeDefaultRoles(): Promise<void>
}
```

### BrowserStorageService
**Purpose**: Safe localStorage wrapper for SSR compatibility

```typescript
class BrowserStorageService {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
  isAvailable(): boolean
}
```

## Utility Services

### ErrorHandlerService / GlobalErrorHandler / SentryErrorHandler
**Purpose**: Centralized error handling with Sentry integration

### EventBusService
**Purpose**: Application-wide event communication

### DateFormatService
**Purpose**: Consistent date formatting across the app

### KpiCalculatorService
**Purpose**: KPI calculations for daily progress

### RemoteLoggerService
**Purpose**: Remote logging capabilities

### ServiceWorkerUpdateService / SwService
**Purpose**: PWA update management

### RouteTrackerService
**Purpose**: Navigation tracking

### DevNoteService
**Purpose**: Development notes management

### ProjectInitializationService
**Purpose**: Initialize new projects with default phases/tasks

### ProjectCleanupService
**Purpose**: Clean up project data

### StaffProjectBridgeService
**Purpose**: Bridge between staff and project data

### StepService
**Purpose**: Project step management

### AppInitializerService
**Purpose**: Application initialization logic

### CustomPreloadService
**Purpose**: Custom route preloading strategy

### FirestoreAuditWrapperService
**Purpose**: Wrapper for Firestore operations with audit logging

## Common Patterns

### 1. Service Structure
```typescript
@Injectable({ providedIn: 'root' })
export class FeatureService {
  // Inject dependencies
  private firestore = inject(Firestore);
  private authService = inject(AuthService);
  
  // Collection references
  private collection = collection(this.firestore, 'items');
  
  // Public methods return Observables
  getAll(): Observable<Item[]> { }
  getById(id: string): Observable<Item | undefined> { }
  
  // Async methods for mutations
  async create(item: Omit<Item, 'id'>): Promise<string> { }
  async update(id: string, updates: Partial<Item>): Promise<void> { }
  async delete(id: string): Promise<void> { }
}
```

### 2. Signal-Based State
```typescript
// Use signals for state
private itemsSignal = signal<Item[]>([]);
readonly items = this.itemsSignal.asReadonly();

// Computed values
readonly itemCount = computed(() => this.itemsSignal().length);
```

### 3. Firestore Timestamps
```typescript
// Always use serverTimestamp for consistency
const data = {
  ...item,
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp()
};
```

### 4. Error Handling
```typescript
try {
  await operation();
  // Log success to audit trail
} catch (error) {
  console.error('Operation failed:', error);
  // Log failure to audit trail
  throw error;
}
```

### 5. Observable Patterns
```typescript
// Return Observable for real-time updates
return collectionData(query, { idField: 'id' }) as Observable<Item[]>;

// Use firstValueFrom for one-time reads
const item = await firstValueFrom(this.getById(id));
```

## Service Dependencies

### Dependency Graph
```
BaseFirestoreService
├── AuditTrailService
│
AuthService (standalone - mock)
│
Core Services
├── ThemeService → BrowserStorageService
├── NotificationService → MatSnackBar
├── LoadingService (standalone)
├── AuditTrailService → AuthService, Firestore
│
Feature Services
├── ProjectService → Firestore, ProjectInitService, PhaseService, ClientService, AuditService
├── PhaseService → Firestore, Auth, StaffService
├── TaskService → Firestore, AuthService, StaffService, AuditService
├── RoleService → Firestore, AuthService
│
Utility Services
└── Various utility services with minimal dependencies
```

## Best Practices

1. **Always extend BaseFirestoreService** for entities that need audit logging
2. **Use signals** for reactive state management
3. **Return Observables** from query methods for real-time updates
4. **Use async/await** for mutation methods
5. **Include proper TypeScript types** for all methods
6. **Handle errors gracefully** with try-catch blocks
7. **Log important operations** to audit trail
8. **Use serverTimestamp()** for all timestamp fields
9. **Inject dependencies** using the inject() function
10. **Keep services focused** on a single responsibility

## Migration Notes

- Services are migrating from RxJS BehaviorSubject to Angular Signals
- Legacy observable properties marked with deprecation warnings
- All new features should use signals exclusively
- Firestore operations remain Observable-based for real-time updates