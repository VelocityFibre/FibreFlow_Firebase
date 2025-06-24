import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  writeBatch,
  WriteBatch,
  DocumentReference,
  CollectionReference,
  serverTimestamp,
  DocumentData,
  UpdateData,
  WithFieldValue,
  PartialWithFieldValue,
  getDoc,
} from '@angular/fire/firestore';
import { AuditTrailService } from './audit-trail.service';
import { EntityType } from '../models/audit-log.model';

/**
 * Firestore wrapper that automatically logs all database operations
 * This service intercepts all Firestore operations and creates audit logs
 */
@Injectable({
  providedIn: 'root',
})
export class FirestoreAuditWrapper {
  private firestore = inject(Firestore);
  private auditService = inject(AuditTrailService);

  // Map collection names to entity types
  private collectionToEntityMap: Record<string, EntityType> = {
    projects: 'project',
    tasks: 'task',
    clients: 'client',
    suppliers: 'supplier',
    contractors: 'contractor',
    staff: 'staff',
    stock: 'stock',
    materials: 'material',
    boq: 'boq',
    quotes: 'quote',
    phases: 'phase',
    steps: 'step',
    roles: 'role',
    users: 'user',
    settings: 'settings',
    emails: 'email',
  };

  // Get entity type from collection path
  private getEntityType(path: string): EntityType {
    const parts = path.split('/');
    const collectionName = parts[0];
    return this.collectionToEntityMap[collectionName] || ('unknown' as any);
  }

  // Extract entity name from document data
  private getEntityName(data: any): string {
    return (
      data?.name ||
      data?.title ||
      data?.projectName ||
      data?.clientName ||
      data?.email ||
      data?.id ||
      'Unknown'
    );
  }

  /**
   * Wrapped addDoc that automatically logs creation
   */
  async addDocWithAudit<T extends DocumentData>(
    collectionRef: CollectionReference<T>,
    data: WithFieldValue<T>,
  ): Promise<DocumentReference<T>> {
    const docRef = await addDoc(collectionRef, data);

    // Log audit trail asynchronously
    try {
      const entityType = this.getEntityType(collectionRef.path);
      const entityName = this.getEntityName(data);

      await this.auditService.logUserAction(
        entityType,
        docRef.id,
        entityName,
        'create',
        undefined,
        { ...data, id: docRef.id },
        'success',
      );
    } catch (error) {
      console.error('Audit logging failed for addDoc:', error);
    }

    return docRef;
  }

  /**
   * Wrapped updateDoc that automatically logs updates
   */
  async updateDocWithAudit<T extends DocumentData>(
    documentRef: DocumentReference<T>,
    data: UpdateData<T>,
  ): Promise<void> {
    // Get current data for comparison
    let oldData: any;
    try {
      const snapshot = await getDoc(documentRef);
      oldData = snapshot.data();
    } catch (error) {
      console.warn('Could not fetch old data for audit:', error);
    }

    // Perform the update
    await updateDoc(documentRef, data);

    // Log audit trail asynchronously
    try {
      const pathParts = documentRef.path.split('/');
      const entityType = this.getEntityType(documentRef.path);
      const entityName = this.getEntityName(oldData || data);

      await this.auditService.logUserAction(
        entityType,
        documentRef.id,
        entityName,
        'update',
        oldData,
        { ...oldData, ...data },
        'success',
      );
    } catch (error) {
      console.error('Audit logging failed for updateDoc:', error);
    }
  }

  /**
   * Wrapped setDoc that automatically logs creation/updates
   */
  async setDocWithAudit<T extends DocumentData>(
    documentRef: DocumentReference<T>,
    data: PartialWithFieldValue<T>,
    options?: { merge?: boolean },
  ): Promise<void> {
    // Get current data if it exists
    let oldData: any;
    let isUpdate = false;
    try {
      const snapshot = await getDoc(documentRef);
      if (snapshot.exists()) {
        oldData = snapshot.data();
        isUpdate = true;
      }
    } catch (error) {
      // Document doesn't exist, this is a create
    }

    // Perform the set
    await setDoc(documentRef, data, options || {});

    // Log audit trail asynchronously
    try {
      const entityType = this.getEntityType(documentRef.path);
      const entityName = this.getEntityName(data);

      await this.auditService.logUserAction(
        entityType,
        documentRef.id,
        entityName,
        isUpdate ? 'update' : 'create',
        oldData,
        options?.merge ? { ...oldData, ...data } : data,
        'success',
      );
    } catch (error) {
      console.error('Audit logging failed for setDoc:', error);
    }
  }

  /**
   * Wrapped deleteDoc that automatically logs deletions
   */
  async deleteDocWithAudit<T extends DocumentData>(
    documentRef: DocumentReference<T>,
  ): Promise<void> {
    // Get data before deletion
    let oldData: any;
    try {
      const snapshot = await getDoc(documentRef);
      oldData = snapshot.data();
    } catch (error) {
      console.warn('Could not fetch data for deletion audit:', error);
    }

    // Perform the deletion
    await deleteDoc(documentRef);

    // Log audit trail asynchronously
    try {
      const entityType = this.getEntityType(documentRef.path);
      const entityName = this.getEntityName(oldData);

      await this.auditService.logUserAction(
        entityType,
        documentRef.id,
        entityName,
        'delete',
        oldData,
        undefined,
        'success',
      );
    } catch (error) {
      console.error('Audit logging failed for deleteDoc:', error);
    }
  }

  /**
   * Create an audited write batch
   */
  createAuditedBatch(): AuditedWriteBatch {
    return new AuditedWriteBatch(this.firestore, this.auditService);
  }

  /**
   * Get regular Firestore references (when you don't need auditing)
   */
  getCollection<T = DocumentData>(path: string): CollectionReference<T> {
    return collection(this.firestore, path) as CollectionReference<T>;
  }

  getDoc<T = DocumentData>(path: string, ...pathSegments: string[]): DocumentReference<T> {
    return doc(this.firestore, path, ...pathSegments) as DocumentReference<T>;
  }
}

/**
 * Custom WriteBatch that logs all operations
 */
export class AuditedWriteBatch {
  private batch: WriteBatch;
  private operations: Array<{
    type: 'create' | 'update' | 'delete';
    path: string;
    id: string;
    entityType: EntityType;
    entityName: string;
    oldData?: any;
    newData?: any;
  }> = [];

  constructor(
    private firestore: Firestore,
    private auditService: AuditTrailService,
  ) {
    this.batch = writeBatch(firestore);
  }

  set<T extends DocumentData>(
    documentRef: DocumentReference<T>,
    data: PartialWithFieldValue<T>,
  ): AuditedWriteBatch {
    this.batch.set(documentRef, data);

    const pathParts = documentRef.path.split('/');
    const collectionName = pathParts[0];
    const entityType = this.getEntityType(collectionName);

    this.operations.push({
      type: 'create',
      path: documentRef.path,
      id: documentRef.id,
      entityType,
      entityName: this.getEntityName(data),
      newData: data,
    });

    return this;
  }

  update<T extends DocumentData>(
    documentRef: DocumentReference<T>,
    data: UpdateData<T>,
  ): AuditedWriteBatch {
    this.batch.update(documentRef, data);

    const pathParts = documentRef.path.split('/');
    const collectionName = pathParts[0];
    const entityType = this.getEntityType(collectionName);

    this.operations.push({
      type: 'update',
      path: documentRef.path,
      id: documentRef.id,
      entityType,
      entityName: this.getEntityName(data),
      newData: data,
    });

    return this;
  }

  delete(documentRef: DocumentReference): AuditedWriteBatch {
    this.batch.delete(documentRef);

    const pathParts = documentRef.path.split('/');
    const collectionName = pathParts[0];
    const entityType = this.getEntityType(collectionName);

    this.operations.push({
      type: 'delete',
      path: documentRef.path,
      id: documentRef.id,
      entityType,
      entityName: 'Unknown', // Will be updated if we can fetch the data
      oldData: undefined,
    });

    return this;
  }

  async commit(): Promise<void> {
    // Fetch old data for updates and deletes
    for (const op of this.operations) {
      if (op.type === 'update' || op.type === 'delete') {
        try {
          const docRef = doc(this.firestore, op.path);
          const snapshot = await getDoc(docRef);
          if (snapshot.exists()) {
            op.oldData = snapshot.data();
            op.entityName = this.getEntityName(op.oldData);
          }
        } catch (error) {
          console.warn('Could not fetch old data for batch audit:', error);
        }
      }
    }

    // Commit the batch
    await this.batch.commit();

    // Log all operations asynchronously
    const auditPromises = this.operations.map((op) => {
      const action = op.type === 'create' ? 'create' : op.type === 'update' ? 'update' : 'delete';

      return this.auditService
        .logUserAction(
          op.entityType,
          op.id,
          op.entityName,
          action,
          op.oldData,
          op.newData,
          'success',
        )
        .catch((error) => {
          console.error('Audit logging failed for batch operation:', error);
        });
    });

    // Wait for all audit logs to complete
    await Promise.all(auditPromises);
  }

  private getEntityType(collectionName: string): EntityType {
    const collectionToEntityMap: Record<string, EntityType> = {
      projects: 'project',
      tasks: 'task',
      clients: 'client',
      suppliers: 'supplier',
      contractors: 'contractor',
      staff: 'staff',
      stock: 'stock',
      materials: 'material',
      boq: 'boq',
      quotes: 'quote',
      phases: 'phase',
      steps: 'step',
      roles: 'role',
      users: 'user',
      settings: 'settings',
      emails: 'email',
    };

    return collectionToEntityMap[collectionName] || ('unknown' as any);
  }

  private getEntityName(data: any): string {
    return (
      data?.name ||
      data?.title ||
      data?.projectName ||
      data?.clientName ||
      data?.email ||
      data?.id ||
      'Unknown'
    );
  }
}
