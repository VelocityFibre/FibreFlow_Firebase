import { inject } from '@angular/core';
import {
  Firestore,
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  getDoc,
  DocumentReference,
  CollectionReference,
  DocumentData,
  UpdateData,
  WithFieldValue,
  PartialWithFieldValue,
} from '@angular/fire/firestore';
import { AuditTrailService } from './audit-trail.service';
import { EntityType } from '../models/audit-log.model';

/**
 * Base service that ALL Firestore services should extend
 * Automatically logs all CRUD operations to audit trail
 */
export abstract class BaseFirestoreService {
  protected firestore = inject(Firestore);
  private auditService = inject(AuditTrailService);

  // Abstract method that child services must implement
  protected abstract getEntityType(): EntityType;

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
}
