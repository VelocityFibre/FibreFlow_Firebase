import { Injectable, inject, OnDestroy } from '@angular/core';
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
  Timestamp,
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
  UnifiedAuditLog,
} from '../models/audit-log.model';

@Injectable({
  providedIn: 'root',
})
export class AuditTrailService implements OnDestroy {
  private firestore = inject(Firestore);
  private authService = inject(AuthService);
  private logQueue: AuditLog[] = [];
  private readonly BATCH_SIZE = 10; // Reduced for faster flushing
  private readonly FLUSH_INTERVAL = 2000; // 2 seconds instead of 5
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
    metadata?: Record<string, any>,
  ): Promise<void> {
    console.log('🎯 AuditTrailService.logUserAction called:', {
      entityType,
      entityId,
      entityName,
      action,
      status,
    });

    const changes = this.calculateFieldChanges(oldData, newData);

    const auditLog: AuditLog = {
      id: '', // Will be auto-generated
      entityType,
      entityId,
      entityName,
      action,
      changes,
      userId: this.authService.currentUser()?.uid || 'anonymous',
      userEmail: this.authService.currentUser()?.email || 'anonymous@fibreflow.com',
      userDisplayName: this.authService.currentUser()?.displayName || 'Anonymous User',
      actionType: 'user',
      status,
      errorMessage,
      timestamp: null as any, // Will be set to serverTimestamp() during flush
      sessionId: this.generateSessionId(),
      metadata,
      source: 'audit',
    };

    console.log('📋 Created audit log object:', auditLog);
    this.addToQueue(auditLog);
    console.log('✅ Added audit log to queue');

    // Force immediate flush for testing
    console.log('⚡ Forcing immediate flush...');
    this.flushLogs();
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
    metadata?: Record<string, any>,
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
      timestamp: null as any, // Will be set to serverTimestamp() during flush
      metadata: {
        description,
        ...metadata,
      },
      source: 'audit',
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
    errorMessage?: string,
  ): Promise<void> {
    const auditLog: AuditLog = {
      id: '',
      entityType,
      entityId: 'BULK_OPERATION',
      entityName: `${operation.entityCount} ${entityType}s`,
      action: operation.operationType as AuditAction,
      userId: this.authService.currentUser()?.uid || 'anonymous',
      userEmail: this.authService.currentUser()?.email || 'anonymous@fibreflow.com',
      userDisplayName: this.authService.currentUser()?.displayName || 'Anonymous User',
      actionType: 'user',
      status,
      errorMessage,
      timestamp: null as any, // Will be set to serverTimestamp() during flush
      sessionId: this.generateSessionId(),
      metadata: {
        bulkOperation: operation,
        affectedEntityIds: operation.entityIds.slice(0, 100), // Limit to prevent doc size issues
        totalAffected: operation.entityCount,
      },
      source: 'audit',
    };

    this.addToQueue(auditLog);
  }

  /**
   * Get paginated audit logs with filters
   */
  async getAuditLogs(
    filters: AuditFilters = {},
    pageLimit: number = 50,
    lastDocument?: DocumentSnapshot,
  ): Promise<PaginatedAuditResult> {
    try {
      console.log('🔍 Querying audit-logs collection with filters:', filters);

      let q = query(
        collection(this.firestore, 'audit-logs'),
        orderBy('timestamp', 'desc'),
        limit(pageLimit),
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
      console.log('📊 Firestore query result:', snapshot.docs.length, 'documents found');

      const logs = snapshot.docs.map((doc) => {
        const data = { id: doc.id, ...doc.data() } as AuditLog;
        console.log('📄 Audit log document:', data);
        return data;
      });

      // Apply text search filter if provided (client-side for now)
      let filteredLogs = logs;
      if (filters.searchText) {
        const searchTerm = filters.searchText.toLowerCase();
        filteredLogs = logs.filter(
          (log) =>
            log.entityName.toLowerCase().includes(searchTerm) ||
            log.userEmail.toLowerCase().includes(searchTerm) ||
            log.action.toLowerCase().includes(searchTerm) ||
            log.entityType.toLowerCase().includes(searchTerm),
        );
        console.log('🔎 After text search filter:', filteredLogs.length, 'logs');
      }

      console.log(
        '✅ Final audit logs result:',
        filteredLogs.length,
        'logs, hasMore:',
        snapshot.docs.length === pageLimit,
      );

      return {
        logs: filteredLogs,
        hasMore: snapshot.docs.length === pageLimit,
        lastDocument: snapshot.docs[snapshot.docs.length - 1],
      };
    } catch (error) {
      console.error('❌ Error fetching audit logs:', error);
      return { logs: [], hasMore: false };
    }
  }

  /**
   * Get audit logs for a specific entity
   */
  async getEntityAuditHistory(
    entityType: EntityType,
    entityId: string,
    pageLimit: number = 20,
  ): Promise<AuditLog[]> {
    try {
      const q = query(
        collection(this.firestore, 'audit-logs'),
        where('entityType', '==', entityType),
        where('entityId', '==', entityId),
        orderBy('timestamp', 'desc'),
        limit(pageLimit),
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
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

    return result.logs.map((log) => ({
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
      metadata: log.metadata,
    }));
  }

  /**
   * Check if current user can access audit logs (admin only)
   */
  canAccessAuditTrail(): boolean {
    const user = this.authService.currentUser;
    const adminEmails = [
      'louisrdup@gmail.com', // Louis - Primary admin
      'dev@test.com', // Development user
      'admin@fibreflow.com', // Backup admin email
    ];

    return user()?.email ? adminEmails.includes(user()!.email) : false;
  }

  /**
   * Force immediate flush of audit logs (useful for testing)
   */
  async forceFlush(): Promise<void> {
    console.log('⚡ Force flushing audit logs...');
    await this.flushLogs();
  }

  // Private helper methods

  private addToQueue(log: AuditLog): void {
    this.logQueue.push(log);
    console.log('📌 Current queue size:', this.logQueue.length);

    if (this.logQueue.length >= this.BATCH_SIZE) {
      console.log('🔄 Queue size reached batch limit, flushing...');
      this.flushLogs();
    }
  }

  private startPeriodicFlush(): void {
    console.log('⏰ Starting periodic flush with interval:', this.FLUSH_INTERVAL, 'ms');
    this.flushTimer = window.setInterval(() => {
      console.log('⏰ Periodic flush timer triggered');
      this.flushLogs();
    }, this.FLUSH_INTERVAL);
  }

  private async flushLogs(): Promise<void> {
    if (this.logQueue.length === 0) return;

    try {
      console.log('🚀 Flushing audit logs to Firestore:', this.logQueue.length, 'logs');

      const batch = writeBatch(this.firestore);
      const logsToFlush = this.logQueue.splice(0, this.BATCH_SIZE);

      logsToFlush.forEach((log) => {
        const docRef = doc(collection(this.firestore, 'audit-logs'));
        // Create a copy of the log without the timestamp field
        const { timestamp, ...logWithoutTimestamp } = log;
        
        // Clean up the log data to remove undefined values
        const cleanedLog = this.removeUndefinedValues(logWithoutTimestamp);
        
        const logData = {
          ...cleanedLog,
          id: docRef.id,
          // Set serverTimestamp directly in the batch operation
          timestamp: serverTimestamp(),
        };
        console.log('📝 Writing audit log:', logData);
        batch.set(docRef, logData);
      });

      await batch.commit();
      console.log('✅ Successfully flushed audit logs to Firestore');
    } catch (error) {
      console.error('❌ Error flushing audit logs:', error);
      // Re-add failed logs to queue for retry
      this.logQueue.unshift(...this.logQueue.splice(0));
    }
  }

  private calculateFieldChanges(oldData?: any, newData?: any): FieldChange[] | undefined {
    if (!oldData || !newData) return undefined;

    const changes: FieldChange[] = [];
    const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);

    allKeys.forEach((key) => {
      const oldValue = oldData[key];
      const newValue = newData[key];

      if (this.isValueChanged(oldValue, newValue)) {
        changes.push({
          field: key,
          oldValue: oldValue === undefined ? null : oldValue,
          newValue: newValue === undefined ? null : newValue,
          dataType: this.getDataType(newValue),
          displayOldValue: this.formatDisplayValue(oldValue),
          displayNewValue: this.formatDisplayValue(newValue),
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
      const changedFields = log.changes.map((c) => c.field).join(', ');
      return `${action} ${entity} "${log.entityName}" - Changed: ${changedFields}`;
    }

    return `${action} ${entity} "${log.entityName}"`;
  }

  private generateSessionId(): string {
    return (
      Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
    );
  }

  /**
   * Recursively remove undefined values from an object
   * Firebase doesn't accept undefined values
   */
  private removeUndefinedValues(obj: any): any {
    if (obj === null || obj === undefined) {
      return null;
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.removeUndefinedValues(item))
        .filter(item => item !== undefined);
    }
    
    if (typeof obj === 'object' && obj.constructor === Object) {
      const cleanedObj: any = {};
      for (const key of Object.keys(obj)) {
        const value = obj[key];
        if (value !== undefined) {
          cleanedObj[key] = this.removeUndefinedValues(value);
        }
      }
      return cleanedObj;
    }
    
    return obj;
  }

  ngOnDestroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    // Flush any remaining logs
    this.flushLogs();
  }
}
