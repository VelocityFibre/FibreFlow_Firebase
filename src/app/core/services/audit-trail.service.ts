import { Injectable, inject } from '@angular/core';
import { 
  Firestore, 
  collection, 
  doc, 
  writeBatch, 
  query, 
  orderBy, 
  limit, 
  startAfter,
  where,
  getDocs,
  DocumentSnapshot,
  serverTimestamp,
  Timestamp
} from '@angular/fire/firestore';
import { AuthService } from './auth.service';
import { 
  AuditLog, 
  EntityType, 
  AuditAction, 
  ActionType, 
  ActionStatus,
  FieldChange,
  BulkOperation,
  AuditFilters,
  PaginatedAuditResult,
  UnifiedAuditLog
} from '../models/audit-log.model';

@Injectable({
  providedIn: 'root'
})
export class AuditTrailService {
  private firestore = inject(Firestore);
  private authService = inject(AuthService);
  private logQueue: AuditLog[] = [];
  private readonly BATCH_SIZE = 50;
  private readonly FLUSH_INTERVAL = 5000; // 5 seconds
  private flushTimer?: number;

  constructor() {
    this.startPeriodicFlush();
  }

  /**
   * Log a user action with success/failure status
   */
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
  ): Promise<void> {
    const changes = this.calculateFieldChanges(oldData, newData);
    
    const auditLog: AuditLog = {
      id: '', // Will be auto-generated
      entityType,
      entityId,
      entityName,
      action,
      changes,
      userId: this.authService.currentUser()?.uid || 'system',
      userEmail: this.authService.currentUser()?.email || 'system@fibreflow.com',
      userDisplayName: this.authService.currentUser()?.displayName || 'System',
      actionType: 'user',
      status,
      errorMessage,
      timestamp: serverTimestamp() as Timestamp,
      sessionId: this.generateSessionId(),
      metadata,
      source: 'audit'
    };

    this.addToQueue(auditLog);
  }

  /**
   * Log a system/automated action
   */
  async logSystemAction(
    entityType: EntityType,
    entityId: string,
    entityName: string,
    action: AuditAction,
    description: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const auditLog: AuditLog = {
      id: '',
      entityType,
      entityId,
      entityName,
      action,
      userId: 'system',
      userEmail: 'system@fibreflow.com',
      userDisplayName: 'System',
      actionType: 'system',
      status: 'success',
      timestamp: serverTimestamp() as Timestamp,
      metadata: {
        description,
        ...metadata
      },
      source: 'audit'
    };

    this.addToQueue(auditLog);
  }

  /**
   * Log bulk operations efficiently
   */
  async logBulkOperation(
    entityType: EntityType,
    operation: BulkOperation,
    status: ActionStatus = 'success',
    errorMessage?: string
  ): Promise<void> {
    const auditLog: AuditLog = {
      id: '',
      entityType,
      entityId: 'BULK_OPERATION',
      entityName: `${operation.entityCount} ${entityType}s`,
      action: operation.operationType as AuditAction,
      userId: this.authService.currentUser()?.uid || 'system',
      userEmail: this.authService.currentUser()?.email || 'system@fibreflow.com',
      userDisplayName: this.authService.currentUser()?.displayName || 'System',
      actionType: 'user',
      status,
      errorMessage,
      timestamp: serverTimestamp() as Timestamp,
      sessionId: this.generateSessionId(),
      metadata: {
        bulkOperation: operation,
        affectedEntityIds: operation.entityIds.slice(0, 100), // Limit to prevent doc size issues
        totalAffected: operation.entityCount
      },
      source: 'audit'
    };

    this.addToQueue(auditLog);
  }

  /**
   * Get paginated audit logs with filters
   */
  async getAuditLogs(
    filters: AuditFilters = {},
    pageLimit: number = 50,
    lastDocument?: DocumentSnapshot
  ): Promise<PaginatedAuditResult> {
    try {
      let q = query(
        collection(this.firestore, 'audit-logs'),
        orderBy('timestamp', 'desc'),
        limit(pageLimit)
      );

      // Apply filters
      if (filters.entityTypes?.length) {
        q = query(q, where('entityType', 'in', filters.entityTypes));
      }

      if (filters.actions?.length) {
        q = query(q, where('action', 'in', filters.actions));
      }

      if (filters.actionTypes?.length) {
        q = query(q, where('actionType', 'in', filters.actionTypes));
      }

      if (filters.statuses?.length) {
        q = query(q, where('status', 'in', filters.statuses));
      }

      if (filters.userEmail) {
        q = query(q, where('userEmail', '==', filters.userEmail));
      }

      if (filters.entityId) {
        q = query(q, where('entityId', '==', filters.entityId));
      }

      if (filters.dateRange) {
        q = query(q, where('timestamp', '>=', filters.dateRange.start));
        q = query(q, where('timestamp', '<=', filters.dateRange.end));
      }

      if (lastDocument) {
        q = query(q, startAfter(lastDocument));
      }

      const snapshot = await getDocs(q);
      const logs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AuditLog[];

      // Apply text search filter if provided (client-side for now)
      let filteredLogs = logs;
      if (filters.searchText) {
        const searchTerm = filters.searchText.toLowerCase();
        filteredLogs = logs.filter(log =>
          log.entityName.toLowerCase().includes(searchTerm) ||
          log.userEmail.toLowerCase().includes(searchTerm) ||
          log.action.toLowerCase().includes(searchTerm) ||
          log.entityType.toLowerCase().includes(searchTerm)
        );
      }

      return {
        logs: filteredLogs,
        hasMore: snapshot.docs.length === pageLimit,
        lastDocument: snapshot.docs[snapshot.docs.length - 1]
      };
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      return { logs: [], hasMore: false };
    }
  }

  /**
   * Get audit logs for a specific entity
   */
  async getEntityAuditHistory(
    entityType: EntityType,
    entityId: string,
    pageLimit: number = 20
  ): Promise<AuditLog[]> {
    try {
      const q = query(
        collection(this.firestore, 'audit-logs'),
        where('entityType', '==', entityType),
        where('entityId', '==', entityId),
        orderBy('timestamp', 'desc'),
        limit(pageLimit)
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AuditLog[];
    } catch (error) {
      console.error('Error fetching entity audit history:', error);
      return [];
    }
  }

  /**
   * Get unified audit view (includes email and stock logs)
   */
  async getUnifiedAuditView(filters: AuditFilters = {}): Promise<UnifiedAuditLog[]> {
    // For now, just return main audit logs
    // TODO: Integrate with email and stock logs when needed
    const result = await this.getAuditLogs(filters);
    
    return result.logs.map(log => ({
      id: log.id,
      source: log.source || 'audit',
      entityType: log.entityType,
      entityName: log.entityName,
      action: log.action,
      userEmail: log.userEmail,
      userDisplayName: log.userDisplayName,
      timestamp: log.timestamp,
      details: this.formatLogDetails(log),
      status: log.status,
      errorMessage: log.errorMessage,
      metadata: log.metadata
    }));
  }

  /**
   * Check if current user can access audit logs (admin only)
   */
  canAccessAuditTrail(): boolean {
    const user = this.authService.currentUser;
    const adminEmails = [
      'louisrdup@gmail.com', // Louis - Primary admin
      'dev@test.com',        // Development user
      'admin@fibreflow.com'  // Backup admin email
    ];
    
    return user()?.email ? adminEmails.includes(user()!.email) : false;
  }

  // Private helper methods

  private addToQueue(log: AuditLog): void {
    this.logQueue.push(log);
    
    if (this.logQueue.length >= this.BATCH_SIZE) {
      this.flushLogs();
    }
  }

  private startPeriodicFlush(): void {
    this.flushTimer = window.setInterval(() => {
      this.flushLogs();
    }, this.FLUSH_INTERVAL);
  }

  private async flushLogs(): Promise<void> {
    if (this.logQueue.length === 0) return;

    try {
      const batch = writeBatch(this.firestore);
      const logsToFlush = this.logQueue.splice(0, this.BATCH_SIZE);

      logsToFlush.forEach(log => {
        const docRef = doc(collection(this.firestore, 'audit-logs'));
        batch.set(docRef, {
          ...log,
          id: docRef.id
        });
      });

      await batch.commit();
    } catch (error) {
      console.error('Error flushing audit logs:', error);
      // Re-add failed logs to queue for retry
      this.logQueue.unshift(...this.logQueue.splice(0));
    }
  }

  private calculateFieldChanges(oldData?: any, newData?: any): FieldChange[] | undefined {
    if (!oldData || !newData) return undefined;

    const changes: FieldChange[] = [];
    const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);

    allKeys.forEach(key => {
      const oldValue = oldData[key];
      const newValue = newData[key];

      if (this.isValueChanged(oldValue, newValue)) {
        changes.push({
          field: key,
          oldValue,
          newValue,
          dataType: this.getDataType(newValue),
          displayOldValue: this.formatDisplayValue(oldValue),
          displayNewValue: this.formatDisplayValue(newValue)
        });
      }
    });

    return changes.length > 0 ? changes : undefined;
  }

  private isValueChanged(oldValue: any, newValue: any): boolean {
    if (oldValue === newValue) return false;
    if (oldValue == null && newValue == null) return false;
    if (typeof oldValue === 'object' && typeof newValue === 'object') {
      return JSON.stringify(oldValue) !== JSON.stringify(newValue);
    }
    return true;
  }

  private getDataType(value: any): 'string' | 'number' | 'boolean' | 'object' | 'date' | 'array' {
    if (value === null || value === undefined) return 'string';
    if (value instanceof Date || value instanceof Timestamp) return 'date';
    if (Array.isArray(value)) return 'array';
    const type = typeof value;
    if (type === 'string' || type === 'number' || type === 'boolean' || type === 'object') {
      return type;
    }
    return 'string';
  }

  private formatDisplayValue(value: any): string {
    if (value === null || value === undefined) return '';
    if (value instanceof Date) return value.toLocaleDateString();
    if (value instanceof Timestamp) return value.toDate().toLocaleDateString();
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }

  private formatLogDetails(log: AuditLog): string {
    const action = log.action.replace('_', ' ');
    const entity = log.entityType;
    
    if (log.changes?.length) {
      const changedFields = log.changes.map(c => c.field).join(', ');
      return `${action} ${entity} "${log.entityName}" - Changed: ${changedFields}`;
    }
    
    return `${action} ${entity} "${log.entityName}"`;
  }

  private generateSessionId(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }

  ngOnDestroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    // Flush any remaining logs
    this.flushLogs();
  }
}