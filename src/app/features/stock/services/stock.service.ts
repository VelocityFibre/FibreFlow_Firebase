import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  collectionData,
  docData,
  CollectionReference,
  Timestamp,
  serverTimestamp,
  writeBatch,
  limit,
  getDoc,
} from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';
import { Observable, map } from 'rxjs';
import {
  StockItem,
  StockAllocation,
  StockItemStatus,
  AllocationStatus,
  StockItemImport,
} from '../models/stock-item.model';
import {
  StockMovement,
  // MovementType,
  isIncomingMovement,
  isOutgoingMovement,
} from '../models/stock-movement.model';

@Injectable({
  providedIn: 'root',
})
export class StockService {
  private firestore = inject(Firestore);
  private auth = inject(Auth);

  private stockItemsCollection = collection(
    this.firestore,
    'stockItems',
  ) as CollectionReference<StockItem>;
  private stockMovementsCollection = collection(
    this.firestore,
    'stockMovements',
  ) as CollectionReference<StockMovement>;
  private stockAllocationsCollection = collection(
    this.firestore,
    'stockAllocations',
  ) as CollectionReference<StockAllocation>;

  // Stock Items CRUD
  getStockItems(): Observable<StockItem[]> {
    const q = query(this.stockItemsCollection, orderBy('name'));
    return collectionData(q, { idField: 'id' }).pipe(
      map((items) =>
        items.map((item) => ({
          ...item,
          availableStock: item.currentStock - item.allocatedStock,
        })),
      ),
    );
  }

  getStockItemById(id: string): Observable<StockItem | undefined> {
    const docRef = doc(this.stockItemsCollection, id);
    return docData(docRef, { idField: 'id' }).pipe(
      map((item) =>
        item
          ? {
              ...item,
              availableStock: item.currentStock - item.allocatedStock,
            }
          : undefined,
      ),
    );
  }

  getStockItemsByCategory(category: string): Observable<StockItem[]> {
    const q = query(this.stockItemsCollection, where('category', '==', category), orderBy('name'));
    return collectionData(q, { idField: 'id' }).pipe(
      map((items) =>
        items.map((item) => ({
          ...item,
          availableStock: item.currentStock - item.allocatedStock,
        })),
      ),
    );
  }

  getLowStockItems(): Observable<StockItem[]> {
    const q = query(
      this.stockItemsCollection,
      where('status', '==', StockItemStatus.ACTIVE),
      orderBy('name'),
    );
    return collectionData(q, { idField: 'id' }).pipe(
      map((items) =>
        items
          .map((item) => ({
            ...item,
            availableStock: item.currentStock - item.allocatedStock,
          }))
          .filter((item) => item.currentStock <= item.reorderLevel),
      ),
    );
  }

  async createStockItem(stockItem: Partial<StockItem>): Promise<string> {
    const docRef = doc(this.stockItemsCollection);
    const user = this.auth.currentUser;

    const newItem: StockItem = {
      ...(stockItem as StockItem),
      allocatedStock: 0,
      status: stockItem.status || StockItemStatus.ACTIVE,
      createdAt: serverTimestamp() as Timestamp,
      createdBy: user?.uid || 'system',
      updatedAt: serverTimestamp() as Timestamp,
      updatedBy: user?.uid || 'system',
    };

    await setDoc(docRef, newItem);
    return docRef.id;
  }

  async updateStockItem(id: string, updates: Partial<StockItem>): Promise<void> {
    const docRef = doc(this.stockItemsCollection, id);
    const user = this.auth.currentUser;

    await updateDoc(docRef, {
      ...updates,
      updatedAt: serverTimestamp(),
      updatedBy: user?.uid || 'system',
    });
  }

  async deleteStockItem(id: string): Promise<void> {
    const docRef = doc(this.stockItemsCollection, id);
    await deleteDoc(docRef);
  }

  // Get a single stock item (for non-observable use)
  async getStockItemOnce(id: string): Promise<StockItem | undefined> {
    const docRef = doc(this.stockItemsCollection, id);
    const snapshot = await getDoc(docRef);
    if (snapshot.exists()) {
      return { ...snapshot.data(), id: snapshot.id } as StockItem;
    }
    return undefined;
  }

  // Update allocated stock
  async updateAllocatedStock(id: string, allocatedStock: number): Promise<void> {
    const docRef = doc(this.stockItemsCollection, id);
    const user = this.auth.currentUser;
    const item = await this.getStockItemOnce(id);

    if (item) {
      await updateDoc(docRef, {
        allocatedStock,
        availableStock: item.currentStock - allocatedStock,
        updatedAt: serverTimestamp(),
        updatedBy: user?.uid || 'system',
      });
    }
  }

  // Stock Movements
  getStockMovements(stockItemId?: string): Observable<StockMovement[]> {
    let q;
    if (stockItemId) {
      q = query(
        this.stockMovementsCollection,
        where('itemId', '==', stockItemId),
        orderBy('movementDate', 'desc'),
        limit(100),
      );
    } else {
      q = query(this.stockMovementsCollection, orderBy('movementDate', 'desc'), limit(100));
    }

    return collectionData(q, { idField: 'id' });
  }

  async createStockMovement(movement: Partial<StockMovement>): Promise<void> {
    const batch = writeBatch(this.firestore);
    const user = this.auth.currentUser;

    // Create movement record
    const movementRef = doc(this.stockMovementsCollection);
    const newMovement: StockMovement = {
      ...(movement as StockMovement),
      performedBy: user?.uid || 'system',
      performedByName: user?.displayName || 'System',
      createdAt: serverTimestamp() as Timestamp,
      updatedAt: serverTimestamp() as Timestamp,
    };
    batch.set(movementRef, newMovement);

    // Update stock item quantities
    if (movement.itemId && movement.quantity) {
      const stockItemRef = doc(this.stockItemsCollection, movement.itemId);
      const currentItem = await this.getStockItemOnce(movement.itemId);

      if (currentItem) {
        let newStock = currentItem.currentStock;

        // Calculate new stock based on movement type
        if (isIncomingMovement(movement.movementType!)) {
          newStock = currentItem.currentStock + movement.quantity;
        } else if (isOutgoingMovement(movement.movementType!)) {
          newStock = currentItem.currentStock - movement.quantity;
        }

        batch.update(stockItemRef, {
          currentStock: newStock,
          updatedAt: serverTimestamp(),
          updatedBy: user?.uid || 'system',
        });
      }
    }

    await batch.commit();
  }

  private async getStockItemCurrentStock(stockItemId: string): Promise<number> {
    const docRef = doc(this.stockItemsCollection, stockItemId);
    const snapshot = await getDoc(docRef);
    return snapshot.data()?.currentStock || 0;
  }

  // Stock Allocations
  getStockAllocations(projectId?: string): Observable<StockAllocation[]> {
    let q;
    if (projectId) {
      q = query(
        this.stockAllocationsCollection,
        where('projectId', '==', projectId),
        where('status', 'in', [AllocationStatus.RESERVED, AllocationStatus.ISSUED]),
        orderBy('allocationDate', 'desc'),
      );
    } else {
      q = query(
        this.stockAllocationsCollection,
        where('status', 'in', [AllocationStatus.RESERVED, AllocationStatus.ISSUED]),
        orderBy('allocationDate', 'desc'),
      );
    }

    return collectionData(q, { idField: 'id' });
  }

  async createStockAllocation(allocation: Partial<StockAllocation>): Promise<void> {
    const batch = writeBatch(this.firestore);
    const user = this.auth.currentUser;

    // Create allocation record
    const allocationRef = doc(this.stockAllocationsCollection);
    const newAllocation: StockAllocation = {
      ...(allocation as StockAllocation),
      consumedQuantity: 0,
      remainingQuantity: allocation.allocatedQuantity || 0,
      status: AllocationStatus.RESERVED,
      createdBy: user?.uid || 'system',
      createdAt: serverTimestamp() as Timestamp,
      updatedAt: serverTimestamp() as Timestamp,
    };
    batch.set(allocationRef, newAllocation);

    // Update stock item allocated quantity
    if (allocation.stockItemId && allocation.allocatedQuantity) {
      const stockItemRef = doc(this.stockItemsCollection, allocation.stockItemId);
      const currentAllocated = await this.getStockItemAllocatedStock(allocation.stockItemId);

      batch.update(stockItemRef, {
        allocatedStock: currentAllocated + allocation.allocatedQuantity,
        updatedAt: serverTimestamp(),
        updatedBy: user?.uid || 'system',
      });
    }

    await batch.commit();
  }

  private async getStockItemAllocatedStock(stockItemId: string): Promise<number> {
    const docRef = doc(this.stockItemsCollection, stockItemId);
    const snapshot = await getDoc(docRef);
    return snapshot.data()?.allocatedStock || 0;
  }

  // Import/Export functionality
  async importStockItems(items: StockItemImport[]): Promise<{ success: number; errors: string[] }> {
    const batch = writeBatch(this.firestore);
    const user = this.auth.currentUser;
    const errors: string[] = [];
    let successCount = 0;

    for (let i = 0; i < items.length; i++) {
      try {
        const item = items[i];
        const docRef = doc(this.stockItemsCollection);

        const newItem: StockItem = {
          itemCode: item.itemCode,
          name: item.name,
          description: item.description,
          category: item.category as any,
          subcategory: item.subcategory,
          unitOfMeasure: item.unitOfMeasure as any,
          currentStock: item.currentStock || 0,
          allocatedStock: 0,
          minimumStock: item.minimumStock || 0,
          reorderLevel: item.reorderLevel || item.minimumStock || 0,
          standardCost: item.standardCost || 0,
          warehouseLocation: item.warehouseLocation,
          batchTracking: false,
          expiryTracking: false,
          status: StockItemStatus.ACTIVE,
          createdAt: serverTimestamp() as Timestamp,
          createdBy: user?.uid || 'system',
          updatedAt: serverTimestamp() as Timestamp,
          updatedBy: user?.uid || 'system',
        };

        batch.set(docRef, newItem);
        successCount++;

        // Commit batch every 500 items (Firestore limit)
        if ((i + 1) % 500 === 0) {
          await batch.commit();
        }
      } catch (error) {
        errors.push(`Row ${i + 2}: ${error}`);
      }
    }

    // Commit remaining items
    if (successCount % 500 !== 0) {
      await batch.commit();
    }

    return { success: successCount, errors };
  }

  exportStockItems(): Observable<StockItem[]> {
    return this.getStockItems();
  }

  // Utility methods
  generateItemCode(category: string): string {
    const prefix = category.substring(0, 3).toUpperCase();
    const timestamp = Date.now().toString().slice(-6);
    return `${prefix}-${timestamp}`;
  }

  checkStockAvailability(stockItemId: string, requiredQuantity: number): Observable<boolean> {
    return this.getStockItemById(stockItemId).pipe(
      map((item) => {
        if (!item) return false;
        const available = item.currentStock - item.allocatedStock;
        return available >= requiredQuantity;
      }),
    );
  }
}
