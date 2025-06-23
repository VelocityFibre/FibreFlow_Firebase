import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  docData,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  CollectionReference,
  serverTimestamp,
  Timestamp,
} from '@angular/fire/firestore';
import { Observable, from, map, catchError, of, combineLatest, switchMap, throwError } from 'rxjs';
import { RFQ, RFQSummary, RFQItem } from '../models/rfq.model';
import { BOQItem } from '../../boq/models/boq.model';
import { BOQService } from '../../boq/services/boq.service';
import { RemoteLoggerService } from '../../../core/services/remote-logger.service';

@Injectable({
  providedIn: 'root',
})
export class RFQService {
  private readonly collectionName = 'rfqs';
  private rfqCollection!: CollectionReference<RFQ>;

  private firestore = inject(Firestore);
  private boqService = inject(BOQService);
  private logger = inject(RemoteLoggerService);

  constructor() {
    console.log('RFQService constructor - initializing...');
    console.log('Firestore instance:', this.firestore ? 'exists' : 'undefined');
    this.logger.info('RFQService initializing', 'RFQService', {
      firestoreExists: !!this.firestore,
    });

    try {
      this.rfqCollection = collection(
        this.firestore,
        this.collectionName,
      ) as CollectionReference<RFQ>;
      console.log('RFQ collection initialized successfully');
      this.logger.info('RFQ collection initialized successfully', 'RFQService');
    } catch (error) {
      console.error('Error initializing RFQ collection:', error);
      this.logger.error(`Error initializing RFQ collection: ${error}`, 'RFQService', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // Get all RFQs
  getRFQs(): Observable<RFQ[]> {
    try {
      const q = query(this.rfqCollection, orderBy('createdAt', 'desc'));
      return collectionData(q, { idField: 'id' }).pipe(
        catchError((error) => {
          console.warn('Index not ready, using in-memory sorting:', error.message);
          return collectionData(this.rfqCollection, { idField: 'id' }).pipe(
            map((items) => {
              return items.sort((a, b) => {
                const dateA = new Date(a.createdAt);
                const dateB = new Date(b.createdAt);
                return dateB.getTime() - dateA.getTime();
              });
            }),
          );
        }),
      );
    } catch (error) {
      console.error('Error getting RFQs:', error);
      return of([]);
    }
  }

  // Get RFQs by project
  getRFQsByProject(projectId: string): Observable<RFQ[]> {
    try {
      const q = query(
        this.rfqCollection,
        where('projectId', '==', projectId),
        orderBy('createdAt', 'desc'),
      );
      return collectionData(q, { idField: 'id' }).pipe(
        catchError((error) => {
          console.warn('Index not ready, using fallback query:', error.message);
          const fallbackQuery = query(this.rfqCollection, where('projectId', '==', projectId));
          return collectionData(fallbackQuery, { idField: 'id' }).pipe(
            map((items) => {
              return items.sort((a, b) => {
                const dateA = new Date(a.createdAt);
                const dateB = new Date(b.createdAt);
                return dateB.getTime() - dateA.getTime();
              });
            }),
          );
        }),
      );
    } catch (error) {
      console.error('Error getting RFQs by project:', error);
      return of([]);
    }
  }

  // Get single RFQ
  getRFQ(id: string): Observable<RFQ | undefined> {
    const docRef = doc(this.rfqCollection, id);
    return docData(docRef, { idField: 'id' }).pipe(
      catchError((error) => {
        console.error('Error getting RFQ:', error);
        return of(undefined);
      }),
    );
  }

  // Create new RFQ
  createRFQ(rfq: Omit<RFQ, 'id' | 'rfqNumber' | 'createdAt' | 'updatedAt'>): Observable<string> {
    console.log('createRFQ called with data:', rfq);
    this.logger.info('createRFQ started', 'RFQService', {
      projectId: rfq.projectId,
      title: rfq.title,
      supplierCount: rfq.supplierIds?.length || 0,
      boqItemCount: rfq.boqItemIds?.length || 0,
    });

    return this.generateRFQNumber().pipe(
      switchMap((rfqNumber) => {
        console.log('Generated RFQ number:', rfqNumber);
        this.logger.info('RFQ number generated', 'RFQService', { rfqNumber });

        // Convert deadline to ISO string if it's a Date
        const rfqData: any = {
          ...rfq,
          rfqNumber,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        // Handle deadline conversion
        if (rfq.deadline instanceof Date) {
          rfqData.deadline = rfq.deadline.toISOString();
        } else if (typeof rfq.deadline === 'string') {
          rfqData.deadline = rfq.deadline;
        } else {
          rfqData.deadline = new Date().toISOString();
        }

        console.log('About to add RFQ to Firestore');
        console.log('RFQ data:', JSON.stringify(rfqData, null, 2));

        this.logger.info('Attempting Firestore addDoc', 'RFQService', {
          collectionPath: this.collectionName,
          dataKeys: Object.keys(rfqData),
          deadline: rfqData.deadline,
        });

        return from(addDoc(this.rfqCollection, rfqData)).pipe(
          map((docRef) => {
            console.log('RFQ successfully added to Firestore with ID:', docRef.id);
            this.logger.info('RFQ created successfully', 'RFQService', {
              rfqId: docRef.id,
              rfqNumber: rfqNumber,
            });
            return docRef.id;
          }),
          catchError((error) => {
            console.error('Error in addDoc operation:', error);
            console.error('Error type:', error.constructor.name);
            console.error('Error message:', error.message);
            console.error('Error code:', error.code);

            this.logger.error('Firestore addDoc failed', 'RFQService', {
              errorType: error.constructor.name,
              errorMessage: error.message,
              errorCode: error.code,
              stack: error.stack,
            });

            return throwError(
              () => new Error(`Failed to create RFQ: ${error.message || 'Unknown error'}`),
            );
          }),
        );
      }),
      catchError((error) => {
        console.error('Error in createRFQ:', error);
        this.logger.error('createRFQ failed', 'RFQService', {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });
        return throwError(() => error);
      }),
    );
  }

  // Update RFQ
  updateRFQ(id: string, rfq: Partial<RFQ>): Observable<void> {
    const docRef = doc(this.rfqCollection, id);
    const updateData = {
      ...rfq,
      updatedAt: new Date(),
    };

    return from(updateDoc(docRef, updateData)).pipe(
      catchError((error) => {
        console.error('Error updating RFQ:', error);
        throw error;
      }),
    );
  }

  // Delete RFQ
  deleteRFQ(id: string): Observable<void> {
    const docRef = doc(this.rfqCollection, id);
    return from(deleteDoc(docRef)).pipe(
      catchError((error) => {
        console.error('Error deleting RFQ:', error);
        throw error;
      }),
    );
  }

  // Generate RFQ number
  private generateRFQNumber(): Observable<string> {
    console.log('Generating RFQ number...');
    const year = new Date().getFullYear();

    // Simplified approach - just use timestamp to avoid query issues
    const timestamp = Date.now().toString().slice(-6);
    const rfqNumber = `RFQ-${year}-${timestamp}`;
    console.log('Generated RFQ number:', rfqNumber);

    return of(rfqNumber);

    /* Original complex query - commented out due to potential index issues
    const q = query(this.rfqCollection, where('rfqNumber', '>=', `RFQ-${year}-`), where('rfqNumber', '<', `RFQ-${year + 1}-`));
    
    return collectionData(q).pipe(
      map(rfqs => {
        const numbers = rfqs
          .map(rfq => rfq.rfqNumber)
          .filter(num => num.startsWith(`RFQ-${year}-`))
          .map(num => parseInt(num.split('-')[2]) || 0)
          .sort((a, b) => b - a);
        
        const nextNumber = numbers.length > 0 ? numbers[0] + 1 : 1;
        return `RFQ-${year}-${nextNumber.toString().padStart(3, '0')}`;
      }),
      catchError(() => {
        // Fallback to timestamp-based number
        const timestamp = Date.now().toString().slice(-6);
        return of(`RFQ-${year}-${timestamp}`);
      })
    );
    */
  }

  // Get RFQ items with BOQ details
  getRFQItemsWithDetails(rfq: RFQ): Observable<RFQItem[]> {
    if (!rfq.boqItemIds || rfq.boqItemIds.length === 0) {
      return of([]);
    }

    // Get BOQ items for this RFQ
    return this.boqService.getBOQItemsByProject(rfq.projectId).pipe(
      map((boqItems) => {
        return boqItems
          .filter((item) => rfq.boqItemIds.includes(item.id!))
          .map((item) => this.convertBOQItemToRFQItem(item));
      }),
      catchError((error) => {
        console.error('Error getting RFQ items with details:', error);
        return of([]);
      }),
    );
  }

  // Create RFQ from BOQ items
  createRFQFromBOQItems(
    projectId: string,
    projectName: string,
    boqItems: BOQItem[],
    rfqData: Partial<RFQ>,
  ): Observable<string> {
    console.log('createRFQFromBOQItems - START');
    console.log('Parameters:', {
      projectId,
      projectName,
      boqItemsCount: boqItems.length,
      rfqData: JSON.stringify(rfqData, null, 2),
    });

    this.logger.info('createRFQFromBOQItems started', 'RFQService', {
      projectId,
      projectName,
      boqItemsCount: boqItems.length,
      supplierCount: rfqData.supplierIds?.length || 0,
      title: rfqData.title,
    });

    try {
      const boqItemIds = boqItems.map((item) => item.id!).filter((id) => id);
      console.log('Extracted BOQ Item IDs:', boqItemIds);
      this.logger.info('BOQ items processed', 'RFQService', {
        originalCount: boqItems.length,
        validIdCount: boqItemIds.length,
        sampleIds: boqItemIds.slice(0, 3),
      });

      if (boqItemIds.length === 0) {
        console.error('No valid BOQ item IDs found');
        this.logger.error('No valid BOQ item IDs found', 'RFQService', {
          boqItems: boqItems.map((item) => ({ id: item.id, itemCode: item.itemCode })),
        });
        throw new Error('No valid BOQ item IDs found');
      }

      // Ensure deadline is a Date object
      let deadline = rfqData.deadline;
      if (!deadline) {
        deadline = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 2 weeks default
      }

      this.logger.info('Preparing RFQ object', 'RFQService', {
        hasDeadline: !!rfqData.deadline,
        deadlineType: typeof deadline,
        paymentTerms: rfqData.paymentTerms,
      });

      const newRFQ: Omit<RFQ, 'id' | 'rfqNumber' | 'createdAt' | 'updatedAt'> = {
        projectId,
        projectName,
        title: rfqData.title || `RFQ for ${projectName}`,
        description: rfqData.description || `Request for quotes for ${boqItems.length} items`,
        boqItemIds,
        supplierIds: rfqData.supplierIds || [],
        manualEmails: rfqData.manualEmails || [],
        status: 'draft',
        deadline: deadline,
        deliveryLocation: rfqData.deliveryLocation || '',
        paymentTerms: rfqData.paymentTerms || '30_days',
        specialRequirements: rfqData.specialRequirements || '',
        createdBy: rfqData.createdBy || 'current-user', // TODO: Get from auth service
      };

      console.log('Prepared RFQ object:', JSON.stringify(newRFQ, null, 2));
      console.log('About to call createRFQ method...');

      this.logger.info('Calling createRFQ', 'RFQService', {
        rfqTitle: newRFQ.title,
        status: newRFQ.status,
      });

      return this.createRFQ(newRFQ).pipe(
        map((rfqId) => {
          console.log('createRFQFromBOQItems - SUCCESS, RFQ ID:', rfqId);
          this.logger.info('createRFQFromBOQItems completed successfully', 'RFQService', {
            rfqId,
            projectId,
            boqItemCount: boqItemIds.length,
          });
          return rfqId;
        }),
        catchError((error) => {
          console.error('createRFQFromBOQItems - ERROR:', error);
          this.logger.error('createRFQFromBOQItems failed', 'RFQService', {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            projectId,
          });
          throw error;
        }),
      );
    } catch (error) {
      console.error('createRFQFromBOQItems - SYNC ERROR:', error);
      this.logger.error('createRFQFromBOQItems sync error', 'RFQService', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      return throwError(() => error);
    }
  }

  // Get RFQ summary
  getRFQSummary(rfqId: string): Observable<RFQSummary> {
    return this.getRFQ(rfqId).pipe(
      switchMap((rfq) => {
        if (!rfq) {
          throw new Error('RFQ not found');
        }

        return this.getRFQItemsWithDetails(rfq).pipe(
          map((items) => {
            const summary: RFQSummary = {
              totalItems: items.length,
              totalEstimatedValue: items.reduce(
                (sum, item) => sum + (item.estimatedTotalPrice || 0),
                0,
              ),
              suppliersCount: rfq.supplierIds.length,
              quotesReceived: 0, // TODO: Get from quotes service when implemented
            };
            return summary;
          }),
        );
      }),
      catchError((error) => {
        console.error('Error getting RFQ summary:', error);
        return of({
          totalItems: 0,
          totalEstimatedValue: 0,
          suppliersCount: 0,
          quotesReceived: 0,
        });
      }),
    );
  }

  // Helper method to convert BOQ item to RFQ item
  private convertBOQItemToRFQItem(boqItem: BOQItem): RFQItem {
    return {
      boqItemId: boqItem.id!,
      itemCode: boqItem.itemCode,
      description: boqItem.description,
      specification: boqItem.specification || '',
      unit: boqItem.unit,
      requiredQuantity: boqItem.remainingQuantity, // Use remaining quantity for RFQ
      estimatedUnitPrice: boqItem.unitPrice > 0 ? boqItem.unitPrice : undefined,
      estimatedTotalPrice:
        boqItem.unitPrice > 0 ? boqItem.remainingQuantity * boqItem.unitPrice : undefined,
    };
  }
}
