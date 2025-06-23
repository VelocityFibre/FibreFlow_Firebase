# FibreFlow Audit Trail System - Technical Specification

## 1. Executive Summary

A lightweight, admin-only audit trail system to track all user data modifications in FibreFlow. Designed for minimal performance impact with comprehensive coverage of user actions.

## 2. Requirements Summary

### 2.1 Core Requirements
- **Entities**: Track ALL entities (projects, tasks, clients, suppliers, contractors, stock, BOQ, quotes, etc.)
- **Actions**: Log create, update, delete, assign operations
- **Access**: Admin-only access to minimize performance impact
- **Retention**: 12 months active, archive after 1 year
- **Performance**: Must not affect user operations (<5ms overhead)

### 2.2 Special Requirements
- Track system/automated actions separately from user actions
- Log failed operations (permission denied, validation errors)
- Include existing email and stock logs in unified view
- Simple list view - no dashboards or analytics needed
- Handle bulk operations efficiently

### 2.3 Explicitly NOT Required
- Data recovery/undo functionality
- Real-time notifications
- Anomaly detection
- Compliance reporting
- Activity dashboards

## 3. Technical Architecture

### 3.1 Storage Strategy - Separate Firestore Collection

**Primary Collection**: `audit-logs`
```typescript
interface AuditLog {
  id: string;                    // Auto-generated
  entityType: EntityType;        // 'project', 'task', 'client', etc.
  entityId: string;             // ID of affected entity
  entityName: string;           // Human-readable entity identifier
  action: AuditAction;          // 'create', 'update', 'delete', 'assign'
  changes?: FieldChange[];      // Field-level changes for updates
  userId: string;               // Who performed the action
  userEmail: string;
  userDisplayName: string;
  actionType: 'user' | 'system' | 'scheduled'; // Distinguish user vs system actions
  status: 'success' | 'failed'; // Track failed operations
  errorMessage?: string;        // For failed operations
  timestamp: Timestamp;
  sessionId?: string;
  metadata?: Record<string, any>; // Flexible additional context
}
```

**Archive Collection**: `audit-logs-archive-{year}`
- Partition by year for efficient querying
- Same structure as primary collection
- Automated migration after 12 months

### 3.2 Data Models

```typescript
type EntityType = 
  | 'project' | 'task' | 'phase' | 'step'
  | 'client' | 'supplier' | 'contractor' | 'staff'
  | 'stock' | 'material' | 'boq' | 'quote'
  | 'email' | 'settings' | 'role' | 'user';

type AuditAction = 
  | 'create' | 'update' | 'delete' 
  | 'assign' | 'unassign' | 'status_change'
  | 'login' | 'logout' | 'permission_denied';

interface FieldChange {
  field: string;                // Field name
  oldValue: any;                // Previous value
  newValue: any;                // New value
  displayOldValue?: string;     // Human-readable old value
  displayNewValue?: string;     // Human-readable new value
}

interface BulkOperation {
  operationType: 'bulk_update' | 'bulk_delete' | 'bulk_create';
  entityCount: number;
  entityIds: string[];
  summary: string;              // "Updated 15 tasks status to 'completed'"
}
```

### 3.3 Service Architecture

```typescript
// Core audit service
@Injectable({ providedIn: 'root' })
export class AuditTrailService {
  private firestore = inject(Firestore);
  private authService = inject(AuthService);

  // Primary logging methods
  async logUserAction(
    entityType: EntityType,
    entityId: string,
    action: AuditAction,
    oldData?: any,
    newData?: any,
    status: 'success' | 'failed' = 'success',
    errorMessage?: string
  ): Promise<void> {
    // Async, non-blocking audit log creation
  }

  async logSystemAction(
    entityType: EntityType,
    entityId: string,
    action: AuditAction,
    description: string
  ): Promise<void> {
    // For automated/scheduled actions
  }

  async logBulkOperation(
    entityType: EntityType,
    operation: BulkOperation
  ): Promise<void> {
    // Efficient bulk operation logging
  }

  // Query methods for admin UI
  async getAuditLogs(
    filters: AuditFilters,
    limit: number = 50,
    startAfter?: DocumentSnapshot
  ): Promise<{ logs: AuditLog[], hasMore: boolean }> {
    // Paginated audit log retrieval
  }

  async getUnifiedAuditView(filters: AuditFilters): Promise<UnifiedAuditLog[]> {
    // Combines regular audit logs with email logs and stock movements
  }
}
```

### 3.4 Integration Strategy - Manual Logging

Simple, explicit approach - add audit logging to each service method:

```typescript
// Example in project.service.ts
async updateProject(id: string, data: Partial<Project>): Promise<Project> {
  try {
    const oldProject = await this.getProject(id);
    const updatedProject = await this.firestore
      .collection('projects')
      .doc(id)
      .update(data);
    
    // Audit logging - async, non-blocking
    this.auditTrailService.logUserAction(
      'project', 
      id, 
      'update', 
      oldProject, 
      { ...oldProject, ...data },
      'success'
    );
    
    return updatedProject;
  } catch (error) {
    // Log failed operations too
    this.auditTrailService.logUserAction(
      'project', 
      id, 
      'update', 
      undefined, 
      data,
      'failed',
      error.message
    );
    throw error;
  }
}
```

### 3.5 Unified Audit View

Combine different audit sources into single admin interface:

```typescript
interface UnifiedAuditLog {
  id: string;
  source: 'audit' | 'email' | 'stock';
  entityType: string;
  entityName: string;
  action: string;
  userEmail: string;
  timestamp: Timestamp;
  details: string;               // Human-readable description
  status: 'success' | 'failed';
  metadata?: any;
}

// Service method to merge different audit sources
async getUnifiedAuditView(filters: AuditFilters): Promise<UnifiedAuditLog[]> {
  const [auditLogs, emailLogs, stockLogs] = await Promise.all([
    this.getRegularAuditLogs(filters),
    this.getEmailAuditLogs(filters),
    this.getStockAuditLogs(filters)
  ]);

  return this.mergeAndSortAuditLogs(auditLogs, emailLogs, stockLogs);
}
```

## 4. Performance Optimizations

### 4.1 Asynchronous Logging
```typescript
// Non-blocking audit logging using Firebase queue
class AsyncAuditLogger {
  private logQueue: AuditLog[] = [];
  private batchSize = 50;
  private flushInterval = 5000; // 5 seconds

  constructor() {
    // Periodic batch flush
    setInterval(() => this.flushLogs(), this.flushInterval);
  }

  addToQueue(log: AuditLog): void {
    this.logQueue.push(log);
    if (this.logQueue.length >= this.batchSize) {
      this.flushLogs();
    }
  }

  private async flushLogs(): Promise<void> {
    if (this.logQueue.length === 0) return;
    
    const batch = writeBatch(this.firestore);
    const logsToFlush = this.logQueue.splice(0, this.batchSize);
    
    logsToFlush.forEach(log => {
      const docRef = doc(collection(this.firestore, 'audit-logs'));
      batch.set(docRef, log);
    });
    
    await batch.commit();
  }
}
```

### 4.2 Bulk Operation Handling
```typescript
// Efficient bulk operation logging
async logBulkUpdate(
  entityType: EntityType,
  entityIds: string[],
  updateData: any,
  affectedCount: number
): Promise<void> {
  // Single audit log for bulk operation instead of individual logs
  const bulkLog: AuditLog = {
    id: '', // Will be auto-generated
    entityType,
    entityId: 'BULK_OPERATION',
    entityName: `${affectedCount} ${entityType}s`,
    action: 'bulk_update',
    changes: [{
      field: 'bulk_operation',
      oldValue: null,
      newValue: updateData,
      displayNewValue: `Updated ${affectedCount} items`
    }],
    userId: this.authService.currentUser.uid,
    userEmail: this.authService.currentUser.email,
    userDisplayName: this.authService.currentUser.displayName,
    actionType: 'user',
    status: 'success',
    timestamp: serverTimestamp(),
    metadata: {
      affectedEntityIds: entityIds.slice(0, 100), // Limit to prevent document size issues
      totalAffected: affectedCount
    }
  };

  await this.addToQueue(bulkLog);
}
```

## 5. Admin UI Implementation

### 5.1 Simple List Component
```typescript
// src/app/features/admin/audit-trail/audit-trail.component.ts
@Component({
  selector: 'app-audit-trail',
  standalone: true,
  template: `
    <div class="audit-trail-page">
      <!-- Simple filters -->
      <mat-card class="filters-card">
        <mat-form-field>
          <mat-select placeholder="Entity Type" [(value)]="selectedEntityType">
            <mat-option value="">All Types</mat-option>
            <mat-option *ngFor="let type of entityTypes" [value]="type">
              {{type | titlecase}}
            </mat-option>
          </mat-select>
        </mat-form-field>
        
        <mat-form-field>
          <input matInput placeholder="User Email" [(ngModel)]="userFilter">
        </mat-form-field>
        
        <mat-form-field>
          <input matInput [matDatepicker]="picker" placeholder="Date" [(ngModel)]="dateFilter">
          <mat-datepicker-toggle matSuffix [for]="picker"></mat-datepicker-toggle>
          <mat-datepicker #picker></mat-datepicker>
        </mat-form-field>
        
        <button mat-raised-button color="primary" (click)="applyFilters()">
          Filter
        </button>
      </mat-card>

      <!-- Audit logs list -->
      <mat-card>
        <div class="audit-log-item" *ngFor="let log of auditLogs">
          <div class="log-header">
            <span class="entity-type">{{log.entityType | titlecase}}</span>
            <span class="action" [class]="'action-' + log.action">{{log.action | titlecase}}</span>
            <span class="status" [class]="'status-' + log.status">{{log.status}}</span>
            <span class="timestamp">{{log.timestamp | date:'medium'}}</span>
          </div>
          
          <div class="log-details">
            <strong>{{log.entityName}}</strong> {{log.action}} by 
            <strong>{{log.userDisplayName}}</strong> ({{log.userEmail}})
          </div>
          
          <div class="changes" *ngIf="log.changes?.length">
            <div *ngFor="let change of log.changes" class="field-change">
              <span class="field-name">{{change.field}}:</span>
              <span class="old-value">{{change.displayOldValue || change.oldValue}}</span>
              <span class="arrow">→</span>
              <span class="new-value">{{change.displayNewValue || change.newValue}}</span>
            </div>
          </div>
          
          <div class="error-message" *ngIf="log.errorMessage">
            <mat-icon>error</mat-icon>
            {{log.errorMessage}}
          </div>
        </div>
        
        <button mat-button (click)="loadMore()" *ngIf="hasMore">
          Load More
        </button>
      </mat-card>
    </div>
  `
})
export class AuditTrailComponent implements OnInit {
  auditLogs: UnifiedAuditLog[] = [];
  hasMore = true;
  loading = false;
  
  // Filters
  selectedEntityType = '';
  userFilter = '';
  dateFilter: Date | null = null;
  
  entityTypes = ['project', 'task', 'client', 'supplier', 'stock', 'email'];

  constructor(private auditService: AuditTrailService) {}

  async ngOnInit() {
    await this.loadAuditLogs();
  }

  async applyFilters() {
    this.auditLogs = [];
    await this.loadAuditLogs();
  }

  async loadAuditLogs() {
    this.loading = true;
    const filters: AuditFilters = {
      entityType: this.selectedEntityType || undefined,
      userEmail: this.userFilter || undefined,
      date: this.dateFilter || undefined
    };

    const result = await this.auditService.getUnifiedAuditView(filters);
    this.auditLogs = [...this.auditLogs, ...result.logs];
    this.hasMore = result.hasMore;
    this.loading = false;
  }

  async loadMore() {
    // Implement pagination
    await this.loadAuditLogs();
  }
}
```

### 5.2 Route Configuration
```typescript
// Update app.routes.ts
{
  path: 'audit-trail',
  loadComponent: () =>
    import('./features/admin/audit-trail/audit-trail.component').then(
      (m) => m.AuditTrailComponent
    ),
  canActivate: [AuthGuard, AdminGuard],
  data: { title: 'Audit Trail' },
}
```

## 6. Implementation Phases

### MVP Phase (Week 1-2)
1. **Core Infrastructure**
   - Create AuditTrailService with basic logging methods
   - Define audit log data models
   - Implement async logging queue

2. **Basic Integration**
   - Add audit logging to 3-4 critical services (projects, tasks, clients)
   - Handle success/failure logging
   - Test performance impact

3. **Simple Admin UI**
   - Basic list view of audit logs
   - Simple filtering (entity type, user, date)
   - Pagination support

### Phase 2 (Week 3-4)
1. **Comprehensive Coverage**
   - Add audit logging to ALL entity services
   - Implement bulk operation logging
   - Add system action tracking

2. **Unified View**
   - Integrate with existing email logs
   - Integrate with stock movement logs
   - Create unified audit interface

3. **Performance Optimization**
   - Implement automated archiving
   - Optimize query performance
   - Add monitoring

## 7. Security & Permissions

```typescript
// Admin-only access guard
@Injectable()
export class AdminAuditGuard implements CanActivate {
  constructor(private authService: AuthService) {}

  canActivate(): boolean {
    const user = this.authService.currentUser;
    return user?.role === 'admin';
  }
}

// Firestore security rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /audit-logs/{logId} {
      allow read: if request.auth != null && 
                     getUserRole(request.auth.uid) == 'admin';
      allow write: if false; // Only backend writes
    }
  }
}
```

## 8. Monitoring & Maintenance

### 8.1 Performance Monitoring
- Track audit log write latency
- Monitor storage growth
- Alert if audit logging fails

### 8.2 Automated Maintenance
```typescript
// Cloud Function for monthly archiving
export const archiveOldAuditLogs = functions.pubsub
  .schedule('0 2 1 * *') // Monthly
  .onRun(async () => {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    
    // Move logs to archive collection
    await moveLogsToArchive(oneYearAgo);
  });
```

This specification provides a comprehensive, lightweight audit trail system tailored to your specific requirements with minimal complexity and maximum performance.