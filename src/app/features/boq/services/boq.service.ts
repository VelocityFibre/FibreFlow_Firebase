import { Injectable } from '@angular/core';
import { Firestore, collection, collectionData, doc, docData, addDoc, updateDoc, deleteDoc, query, where, orderBy, CollectionReference, DocumentReference } from '@angular/fire/firestore';
import { Observable, from, map, catchError, of, switchMap } from 'rxjs';
import { BOQItem, BOQFilter, BOQSummary } from '../models/boq.model';

@Injectable({
  providedIn: 'root'
})
export class BOQService {
  private readonly collectionName = 'boqItems';
  private boqCollection: CollectionReference<BOQItem>;

  constructor(private firestore: Firestore) {
    this.boqCollection = collection(this.firestore, this.collectionName) as CollectionReference<BOQItem>;
  }

  // Get all BOQ items
  getBOQItems(): Observable<BOQItem[]> {
    const q = query(this.boqCollection, orderBy('createdAt', 'desc'));
    return collectionData(q, { idField: 'id' }).pipe(
      catchError(error => {
        console.error('Error fetching BOQ items:', error);
        return of([]);
      })
    );
  }

  // Get BOQ items by project
  getBOQItemsByProject(projectId: string): Observable<BOQItem[]> {
    const q = query(this.boqCollection, where('projectId', '==', projectId), orderBy('itemCode'));
    return collectionData(q, { idField: 'id' }).pipe(
      catchError(error => {
        console.error('Error fetching BOQ items by project:', error);
        return of([]);
      })
    );
  }

  // Get single BOQ item
  getBOQItem(id: string): Observable<BOQItem | undefined> {
    const docRef = doc(this.boqCollection, id);
    return docData(docRef, { idField: 'id' }).pipe(
      catchError(error => {
        console.error('Error fetching BOQ item:', error);
        return of(undefined);
      })
    );
  }

  // Add new BOQ item
  addBOQItem(item: Omit<BOQItem, 'id'>): Observable<string> {
    const newItem = {
      ...item,
      remainingQuantity: item.requiredQuantity - item.allocatedQuantity,
      totalPrice: item.requiredQuantity * item.unitPrice,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return from(addDoc(this.boqCollection, newItem)).pipe(
      map(docRef => docRef.id),
      catchError(error => {
        console.error('Error adding BOQ item:', error);
        throw error;
      })
    );
  }

  // Update BOQ item
  updateBOQItem(id: string, item: Partial<BOQItem>): Observable<void> {
    const docRef = doc(this.boqCollection, id);
    const updateData = {
      ...item,
      updatedAt: new Date()
    };

    // Recalculate if quantities or prices changed
    if (item.requiredQuantity !== undefined || item.allocatedQuantity !== undefined) {
      const required = item.requiredQuantity ?? 0;
      const allocated = item.allocatedQuantity ?? 0;
      updateData.remainingQuantity = required - allocated;
    }

    if (item.requiredQuantity !== undefined || item.unitPrice !== undefined) {
      const quantity = item.requiredQuantity ?? 0;
      const price = item.unitPrice ?? 0;
      updateData.totalPrice = quantity * price;
    }

    return from(updateDoc(docRef, updateData)).pipe(
      catchError(error => {
        console.error('Error updating BOQ item:', error);
        throw error;
      })
    );
  }

  // Delete BOQ item
  deleteBOQItem(id: string): Observable<void> {
    const docRef = doc(this.boqCollection, id);
    return from(deleteDoc(docRef)).pipe(
      catchError(error => {
        console.error('Error deleting BOQ item:', error);
        throw error;
      })
    );
  }

  // Allocate stock to BOQ item
  allocateStock(itemId: string, quantity: number): Observable<void> {
    return this.getBOQItem(itemId).pipe(
      switchMap(item => {
        if (!item) throw new Error('BOQ item not found');
        
        const newAllocated = item.allocatedQuantity + quantity;
        const newRemaining = item.requiredQuantity - newAllocated;
        
        let status = item.status;
        if (newRemaining === 0) {
          status = 'Fully Allocated';
        } else if (newAllocated > 0) {
          status = 'Partially Allocated';
        }

        return this.updateBOQItem(itemId, {
          allocatedQuantity: newAllocated,
          remainingQuantity: newRemaining,
          status: status
        });
      })
    );
  }

  // Get project summary
  getProjectSummary(projectId: string): Observable<BOQSummary> {
    return this.getBOQItemsByProject(projectId).pipe(
      map(items => {
        const summary: BOQSummary = {
          projectId,
          totalItems: items.length,
          totalValue: items.reduce((sum, item) => sum + item.totalPrice, 0),
          allocatedValue: items.reduce((sum, item) => sum + (item.allocatedQuantity * item.unitPrice), 0),
          remainingValue: 0,
          itemsNeedingQuotes: items.filter(item => item.needsQuote).length
        };
        
        summary.remainingValue = summary.totalValue - summary.allocatedValue;
        return summary;
      })
    );
  }

  // Import BOQ items from CSV data
  importBOQItems(projectId: string, csvData: any[]): Observable<void> {
    const items: Omit<BOQItem, 'id'>[] = csvData.map((row, index) => ({
      projectId,
      itemCode: row['Item Code'] || row['Code'] || `ITEM-${index + 1}`,
      description: row['Description'] || row['Item Description'] || '',
      specification: row['Specification'] || row['Spec'] || '',
      unit: row['Unit'] || row['UOM'] || 'Each',
      requiredQuantity: parseInt(row['Quantity'] || row['Required Quantity'] || '0') || 0,
      allocatedQuantity: 0,
      remainingQuantity: parseInt(row['Quantity'] || row['Required Quantity'] || '0') || 0,
      unitPrice: parseFloat(row['Unit Price'] || row['Price'] || '0') || 0,
      totalPrice: 0,
      status: 'Planned',
      needsQuote: row['Needs Quote']?.toLowerCase() === 'true' || row['RFQ']?.toLowerCase() === 'true',
      createdAt: new Date(),
      updatedAt: new Date()
    }));

    // Calculate total prices
    items.forEach(item => {
      item.totalPrice = item.requiredQuantity * item.unitPrice;
    });

    // Add all items
    const promises = items.map(item => addDoc(this.boqCollection, item));
    return from(Promise.all(promises)).pipe(
      map(() => void 0),
      catchError(error => {
        console.error('Error importing BOQ items:', error);
        throw error;
      })
    );
  }

  // Export BOQ items to CSV format
  exportToCSV(items: BOQItem[]): string {
    const headers = [
      'Project ID',
      'Item Code',
      'Description',
      'Specification',
      'Unit',
      'Required Quantity',
      'Allocated Quantity',
      'Remaining Quantity',
      'Unit Price',
      'Total Price',
      'Status',
      'Needs Quote'
    ];

    const rows = items.map(item => [
      item.projectId,
      item.itemCode,
      `"${item.description}"`,
      `"${item.specification || ''}"`,
      item.unit,
      item.requiredQuantity,
      item.allocatedQuantity,
      item.remainingQuantity,
      item.unitPrice.toFixed(2),
      item.totalPrice.toFixed(2),
      item.status,
      item.needsQuote ? 'Yes' : 'No'
    ]);

    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  }
}