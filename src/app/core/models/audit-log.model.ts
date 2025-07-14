import { Timestamp } from '@angular/fire/firestore';

export type EntityType =
  | 'project'
  | 'task'
  | 'phase'
  | 'step'
  | 'client'
  | 'supplier'
  | 'contractor'
  | 'staff'
  | 'stock'
  | 'material'
  | 'boq'
  | 'quote'
  | 'email'
  | 'settings'
  | 'role'
  | 'user'
  | 'devNote';

export type AuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'assign'
  | 'unassign'
  | 'status_change'
  | 'send'
  | 'approve'
  | 'reject'
  | 'archive'
  | 'restore'
  | 'login'
  | 'logout'
  | 'permission_denied'
  | 'bulk_update'
  | 'bulk_delete'
  | 'bulk_create';

export type ActionType = 'user' | 'system' | 'scheduled';
export type ActionStatus = 'success' | 'failed';

export interface FieldChange {
  field: string; // Field name (e.g., 'name', 'status')
  fieldPath?: string; // Nested field path (e.g., 'address.city')
  oldValue: any; // Previous value
  newValue: any; // New value
  dataType: 'string' | 'number' | 'boolean' | 'date' | 'object' | 'array';
  displayOldValue?: string; // Human-readable old value
  displayNewValue?: string; // Human-readable new value
}

export interface AuditLog {
  id: string; // Auto-generated document ID
  entityType: EntityType; // Type of entity affected
  entityId: string; // ID of the affected entity
  entityName: string; // Human-readable entity identifier
  action: AuditAction; // Action performed
  changes?: FieldChange[]; // Field-level changes for updates
  userId: string; // Who performed the action
  userEmail: string;
  userDisplayName: string;
  actionType: ActionType; // user/system/scheduled
  status: ActionStatus; // success/failed
  errorMessage?: string; // For failed operations
  timestamp: Timestamp; // When the action occurred
  sessionId?: string; // Browser session ID
  metadata?: Record<string, any>; // Flexible additional context
  source?: 'audit' | 'email' | 'stock'; // Source system for unified view
}

export interface BulkOperation {
  operationType: 'bulk_update' | 'bulk_delete' | 'bulk_create';
  entityCount: number;
  entityIds: string[];
  summary: string; // "Updated 15 tasks status to 'completed'"
  affectedFields?: string[]; // Fields that were changed in bulk
}

export interface AuditFilters {
  entityTypes?: EntityType[];
  actions?: AuditAction[];
  actionTypes?: ActionType[];
  statuses?: ActionStatus[];
  userId?: string;
  userEmail?: string;
  entityId?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  searchText?: string;
  source?: ('audit' | 'email' | 'stock')[];
  limit?: number;
  offset?: number;
}

export interface PaginatedAuditResult {
  logs: AuditLog[];
  hasMore: boolean;
  total?: number;
  lastDocument?: any; // For Firestore pagination
}

// Helper interface for unified audit view
export interface UnifiedAuditLog {
  id: string;
  source: 'audit' | 'email' | 'stock';
  entityType: string;
  entityName: string;
  action: string;
  userEmail: string;
  userDisplayName: string;
  timestamp: Timestamp;
  details: string; // Human-readable description
  status: ActionStatus;
  errorMessage?: string;
  metadata?: any;
}
