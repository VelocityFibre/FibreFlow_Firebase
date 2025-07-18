import { inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  Firestore,
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  getDoc,
  query,
  where,
  orderBy,
  limit,
  QueryConstraint,
  WhereFilterOp,
  DocumentReference,
  CollectionReference,
  DocumentData,
  UpdateData,
  WithFieldValue,
  PartialWithFieldValue,
  collectionData,
  docData,
  serverTimestamp,
  Timestamp,
} from '@angular/fire/firestore';
import { AuditTrailService } from './audit-trail.service';
import { EntityType } from '../models/audit-log.model';

// Type for data that excludes automatically managed fields
export type CreateData<T> = Omit<T, 'id' | 'createdAt' | 'updatedAt'>;

// Base interface for all Firestore entities
export interface BaseEntity {
  id?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

/**
 * Base service that ALL Firestore services should extend
 * Automatically logs all CRUD operations to audit trail
 * Provides standardized CRUD operations with audit logging
 */
export abstract class BaseFirestoreService<T extends BaseEntity> {
  protected firestore = inject(Firestore);
  private auditService = inject(AuditTrailService);

  // Abstract methods that child services must implement
  protected abstract collectionName: string;
  protected abstract getEntityType(): EntityType;

  // Standardized collection reference
  protected get collection(): CollectionReference<T> {
    return this.getCollection<T>(this.collectionName);
  }

  // Helper to extract entity name from data
  protected getEntityName(data: any): string {
    return (
      data?.name ||
      data?.title ||
      data?.projectName ||
      data?.clientName ||
      data?.email ||
      data?.subject ||
      data?.id ||
      'Unknown'
    );
  }

  /**
   * Add document with automatic audit logging
   */
  protected async addDocWithAudit<T extends DocumentData>(
    collectionRef: CollectionReference<T>,
    data: WithFieldValue<T>,
  ): Promise<DocumentReference<T>> {
    try {
      const docRef = await addDoc(collectionRef, data);

      // Log audit trail
      this.auditService
        .logUserAction(
          this.getEntityType(),
          docRef.id,
          this.getEntityName(data),
          'create',
          undefined,
          { ...data, id: docRef.id },
          'success',
        )
        .catch((error) => console.error('Audit logging failed:', error));

      return docRef;
    } catch (error) {
      // Log failed attempt
      this.auditService
        .logUserAction(
          this.getEntityType(),
          'unknown',
          this.getEntityName(data),
          'create',
          undefined,
          data,
          'failed',
          error instanceof Error ? error.message : 'Unknown error',
        )
        .catch((auditError) => console.error('Audit logging failed:', auditError));

      throw error;
    }
  }

  /**
   * Update document with automatic audit logging
   */
  protected async updateDocWithAudit<T extends DocumentData>(
    documentRef: DocumentReference<T>,
    data: UpdateData<T>,
  ): Promise<void> {
    let oldData: any;
    try {
      // Get current data
      const snapshot = await getDoc(documentRef);
      oldData = snapshot.data();

      // Perform update
      await updateDoc(documentRef, data);

      // Log audit trail
      this.auditService
        .logUserAction(
          this.getEntityType(),
          documentRef.id,
          this.getEntityName(oldData || data),
          'update',
          oldData,
          { ...oldData, ...data },
          'success',
        )
        .catch((error) => console.error('Audit logging failed:', error));
    } catch (error) {
      // Log failed attempt
      this.auditService
        .logUserAction(
          this.getEntityType(),
          documentRef.id,
          this.getEntityName(oldData || data),
          'update',
          oldData,
          data,
          'failed',
          error instanceof Error ? error.message : 'Unknown error',
        )
        .catch((auditError) => console.error('Audit logging failed:', auditError));

      throw error;
    }
  }

  /**
   * Set document with automatic audit logging
   */
  protected async setDocWithAudit<T extends DocumentData>(
    documentRef: DocumentReference<T>,
    data: PartialWithFieldValue<T>,
    options?: { merge?: boolean },
  ): Promise<void> {
    let oldData: any;
    let isUpdate = false;

    try {
      // Check if document exists
      const snapshot = await getDoc(documentRef);
      if (snapshot.exists()) {
        oldData = snapshot.data();
        isUpdate = true;
      }

      // Perform set
      await setDoc(documentRef, data, options || {});

      // Log audit trail
      this.auditService
        .logUserAction(
          this.getEntityType(),
          documentRef.id,
          this.getEntityName(data),
          isUpdate ? 'update' : 'create',
          oldData,
          options?.merge ? { ...oldData, ...data } : data,
          'success',
        )
        .catch((error) => console.error('Audit logging failed:', error));
    } catch (error) {
      // Log failed attempt
      this.auditService
        .logUserAction(
          this.getEntityType(),
          documentRef.id,
          this.getEntityName(data),
          isUpdate ? 'update' : 'create',
          oldData,
          data,
          'failed',
          error instanceof Error ? error.message : 'Unknown error',
        )
        .catch((auditError) => console.error('Audit logging failed:', auditError));

      throw error;
    }
  }

  /**
   * Delete document with automatic audit logging
   */
  protected async deleteDocWithAudit<T extends DocumentData>(
    documentRef: DocumentReference<T>,
  ): Promise<void> {
    let oldData: any;

    try {
      // Get data before deletion
      const snapshot = await getDoc(documentRef);
      oldData = snapshot.data();

      // Perform deletion
      await deleteDoc(documentRef);

      // Log audit trail
      this.auditService
        .logUserAction(
          this.getEntityType(),
          documentRef.id,
          this.getEntityName(oldData),
          'delete',
          oldData,
          undefined,
          'success',
        )
        .catch((error) => console.error('Audit logging failed:', error));
    } catch (error) {
      // Log failed attempt
      this.auditService
        .logUserAction(
          this.getEntityType(),
          documentRef.id,
          this.getEntityName(oldData) || 'Unknown',
          'delete',
          oldData,
          undefined,
          'failed',
          error instanceof Error ? error.message : 'Unknown error',
        )
        .catch((auditError) => console.error('Audit logging failed:', auditError));

      throw error;
    }
  }

  /**
   * Helper to get collection reference
   */
  protected getCollection<T = DocumentData>(path: string): CollectionReference<T> {
    return collection(this.firestore, path) as CollectionReference<T>;
  }

  /**
   * Helper to get document reference
   */
  protected getDoc<T = DocumentData>(
    path: string,
    ...pathSegments: string[]
  ): DocumentReference<T> {
    return doc(this.firestore, path, ...pathSegments) as DocumentReference<T>;
  }

  // Standardized CRUD Operations

  /**
   * Get all documents from collection
   */
  getAll(): Observable<T[]> {
    return collectionData(this.collection, { idField: 'id' });
  }

  /**
   * Get document by ID
   */
  getById(id: string): Observable<T | undefined> {
    const docRef = this.getDoc<T>(this.collectionName, id);
    return docData(docRef, { idField: 'id' });
  }

  /**
   * Create new document with audit logging
   */
  async create(data: CreateData<T>): Promise<string> {
    const timestampedData = {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    } as WithFieldValue<T>;

    const docRef = await this.addDocWithAudit(this.collection, timestampedData);
    return docRef.id;
  }

  /**
   * Update document with audit logging
   */
  async update(id: string, data: Partial<T>): Promise<void> {
    const docRef = this.getDoc<T>(this.collectionName, id);
    const timestampedData = {
      ...data,
      updatedAt: serverTimestamp(),
    } as UpdateData<T>;

    await this.updateDocWithAudit(docRef, timestampedData);
  }

  /**
   * Delete document with audit logging
   */
  async delete(id: string): Promise<void> {
    const docRef = this.getDoc<T>(this.collectionName, id);
    await this.deleteDocWithAudit(docRef);
  }

  // Query Helper Methods

  /**
   * Get documents with custom query constraints
   */
  protected getWithQuery(constraints: QueryConstraint[]): Observable<T[]> {
    const q = query(this.collection, ...constraints);
    return collectionData(q, { idField: 'id' });
  }

  /**
   * Get documents with simple where filter
   */
  protected getWithFilter(field: string, operator: WhereFilterOp, value: any): Observable<T[]> {
    return this.getWithQuery([where(field, operator, value)]);
  }

  /**
   * Get active/enabled documents (common pattern)
   */
  getActive(): Observable<T[]> {
    return this.getWithFilter('isActive', '==', true);
  }

  /**
   * Get documents ordered by creation date
   */
  getOrderedByDate(direction: 'asc' | 'desc' = 'desc'): Observable<T[]> {
    return this.getWithQuery([orderBy('createdAt', direction)]);
  }

  /**
   * Get limited number of documents
   */
  getLimited(limitCount: number): Observable<T[]> {
    return this.getWithQuery([limit(limitCount)]);
  }
}
