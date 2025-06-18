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
import { Observable, map, switchMap, of, combineLatest } from 'rxjs';
import {
  StockItem,
  StockAllocation,
  StockItemStatus,
  AllocationStatus,
  StockItemImport,
  StockCategory,
  UnitOfMeasure,
} from '../models/stock-item.model';
import {
  StockMovement,
  MovementType,
  isIncomingMovement,
  isOutgoingMovement,
} from '../models/stock-movement.model';
import { MaterialService } from '../../materials/services/material.service';

@Injectable({
  providedIn: 'root',
})
export class StockService {
  private firestore = inject(Firestore);
  private auth = inject(Auth);
  private materialService = inject(MaterialService);

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

  // Helper methods for type validation
  private isValidStockCategory(value: string): value is StockCategory {
    return Object.values(StockCategory).includes(value as StockCategory);
  }

  private isValidUnitOfMeasure(value: string): value is UnitOfMeasure {
    return Object.values(UnitOfMeasure).includes(value as UnitOfMeasure);
  }

  private mapToStockCategory(value: string): StockCategory {
    const normalizedValue = value.toLowerCase().replace(/\s+/g, '_');

    const categoryMap: Record<string, StockCategory> = {
      fibre_cable: StockCategory.FIBRE_CABLE,
      'fibre cable': StockCategory.FIBRE_CABLE,
      cable: StockCategory.FIBRE_CABLE,
      poles: StockCategory.POLES,
      equipment: StockCategory.EQUIPMENT,
      tools: StockCategory.TOOLS,
      consumables: StockCategory.CONSUMABLES,
      home_connections: StockCategory.HOME_CONNECTIONS,
      'home connections': StockCategory.HOME_CONNECTIONS,
      network_equipment: StockCategory.NETWORK_EQUIPMENT,
      'network equipment': StockCategory.NETWORK_EQUIPMENT,
      safety_equipment: StockCategory.SAFETY_EQUIPMENT,
      'safety equipment': StockCategory.SAFETY_EQUIPMENT,
    };

    return categoryMap[normalizedValue] || StockCategory.OTHER;
  }

  private mapToUnitOfMeasure(value: string): UnitOfMeasure {
    const normalizedValue = value.toLowerCase();

    const unitMap: Record<string, UnitOfMeasure> = {
      meters: UnitOfMeasure.METERS,
      m: UnitOfMeasure.METERS,
      units: UnitOfMeasure.UNITS,
      unit: UnitOfMeasure.UNITS,
      pieces: UnitOfMeasure.PIECES,
      piece: UnitOfMeasure.PIECES,
      boxes: UnitOfMeasure.BOXES,
      box: UnitOfMeasure.BOXES,
      rolls: UnitOfMeasure.ROLLS,
      roll: UnitOfMeasure.ROLLS,
      sets: UnitOfMeasure.SETS,
      set: UnitOfMeasure.SETS,
      liters: UnitOfMeasure.LITERS,
      l: UnitOfMeasure.LITERS,
      kilograms: UnitOfMeasure.KILOGRAMS,
      kg: UnitOfMeasure.KILOGRAMS,
      hours: UnitOfMeasure.HOURS,
      hr: UnitOfMeasure.HOURS,
    };

    return unitMap[normalizedValue] || UnitOfMeasure.UNITS;
  }

  // Stock Items CRUD
  getStockItems(projectId?: string): Observable<StockItem[]> {
    let q;
    if (projectId) {
      // Get project-specific stock items
      q = query(this.stockItemsCollection, where('projectId', '==', projectId), orderBy('name'));
    } else {
      // Get global stock items (no projectId or isProjectSpecific = false)
      // Use == false instead of != true to avoid composite index requirement
      q = query(
        this.stockItemsCollection,
        where('isProjectSpecific', '==', false),
        orderBy('name'),
      );
    }

    return collectionData(q, { idField: 'id' }).pipe(
      switchMap((items) => this.enrichStockItemsWithMaterialData(items)),
      map((items) =>
        items.map((item) => ({
          ...item,
          availableStock: item.currentStock - item.allocatedStock,
        })),
      ),
    );
  }

  // Get stock items by project
  getStockItemsByProject(projectId: string): Observable<StockItem[]> {
    const q = query(
      this.stockItemsCollection,
      where('projectId', '==', projectId),
      orderBy('name'),
    );
    return collectionData(q, { idField: 'id' }).pipe(
      switchMap((items) => this.enrichStockItemsWithMaterialData(items)),
      map((items) =>
        items.map((item) => ({
          ...item,
          availableStock: item.currentStock - item.allocatedStock,
        })),
      ),
    );
  }

  // Get all stock items (both global and project-specific)
  getAllStockItems(): Observable<StockItem[]> {
    const q = query(this.stockItemsCollection, orderBy('name'));
    return collectionData(q, { idField: 'id' }).pipe(
      switchMap((items) => this.enrichStockItemsWithMaterialData(items)),
      map((items) =>
        items.map((item) => ({
          ...item,
          availableStock: item.currentStock - item.allocatedStock,
        })),
      ),
    );
  }

  // Helper method to enrich stock items with material data
  private enrichStockItemsWithMaterialData(stockItems: StockItem[]): Observable<StockItem[]> {
    if (stockItems.length === 0) return of([]);

    // Get unique item codes
    const itemCodes = [...new Set(stockItems.map((item) => item.itemCode))];

    // Fetch material data for all item codes
    const materialObservables = itemCodes.map((code) =>
      this.materialService.getMaterialByCode(code).pipe(map((material) => ({ code, material }))),
    );

    return combineLatest(materialObservables).pipe(
      map((materialsData) => {
        // Create a map for quick lookup
        const materialMap = new Map(materialsData.map(({ code, material }) => [code, material]));

        // Enrich stock items with material data
        return stockItems.map((item) => {
          const material = materialMap.get(item.itemCode);
          if (material) {
            return {
              ...item,
              materialDetails: {
                name: material.description,
                description: material.description,
                category: material.category,
                specifications: material.specifications,
                unitOfMeasure: material.unitOfMeasure,
              },
            };
          }
          return item;
        });
      }),
    );
  }

  getStockItemById(id: string): Observable<StockItem | undefined> {
    const docRef = doc(this.stockItemsCollection, id);
    return docData(docRef, { idField: 'id' }).pipe(
      switchMap((item) => {
        if (!item) return of(undefined);

        // Enrich with material data
        return this.materialService.getMaterialByCode(item.itemCode).pipe(
          map((material) => {
            const enrichedItem = {
              ...item,
              availableStock: item.currentStock - item.allocatedStock,
            };

            if (material) {
              enrichedItem.materialDetails = {
                name: material.description,
                description: material.description,
                category: material.category,
                specifications: material.specifications,
                unitOfMeasure: material.unitOfMeasure,
              };
            }

            return enrichedItem;
          }),
        );
      }),
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
      isProjectSpecific: !!stockItem.projectId, // Set based on projectId presence
      createdAt: serverTimestamp() as Timestamp,
      createdBy: user?.uid || 'system',
      updatedAt: serverTimestamp() as Timestamp,
      updatedBy: user?.uid || 'system',
    };

    await setDoc(docRef, newItem);
    return docRef.id;
  }

  // Create project-specific stock item from global stock
  async createProjectStockItem(
    globalStockItemId: string,
    projectId: string,
    projectName: string,
    quantity: number,
  ): Promise<string> {
    const globalItem = await this.getStockItemOnce(globalStockItemId);
    if (!globalItem) {
      throw new Error('Global stock item not found');
    }

    const docRef = doc(this.stockItemsCollection);
    const user = this.auth.currentUser;

    const projectItem: StockItem = {
      ...globalItem,
      id: undefined, // New ID will be generated
      projectId,
      projectName,
      isProjectSpecific: true,
      globalStockItemId,
      currentStock: quantity,
      allocatedStock: 0,
      createdAt: serverTimestamp() as Timestamp,
      createdBy: user?.uid || 'system',
      updatedAt: serverTimestamp() as Timestamp,
      updatedBy: user?.uid || 'system',
    };

    await setDoc(docRef, projectItem);

    // Create a movement record for this allocation
    await this.createStockMovement({
      itemId: globalStockItemId,
      itemCode: globalItem.itemCode,
      itemName: globalItem.name,
      movementType: MovementType.ALLOCATION,
      quantity,
      unitOfMeasure: globalItem.unitOfMeasure,
      unitCost: globalItem.unitCost || globalItem.standardCost || 0,
      totalCost: (globalItem.unitCost || globalItem.standardCost || 0) * quantity,
      previousStock: globalItem.currentStock,
      newStock: globalItem.currentStock - quantity,
      movementDate: serverTimestamp() as Timestamp,
      toProjectId: projectId,
      toProjectName: projectName,
      notes: `Allocated to project ${projectName}`,
      performedBy: user?.uid || 'system',
      performedByName: user?.displayName || 'System',
    });

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

  // Generate item code
  generateItemCode(category: string): string {
    const prefix = category.substring(0, 3).toUpperCase();
    const timestamp = Date.now().toString().slice(-6);
    return `${prefix}-${timestamp}`;
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
          category: this.mapToStockCategory(item.category),
          subcategory: item.subcategory,
          unitOfMeasure: this.mapToUnitOfMeasure(item.unitOfMeasure),
          currentStock: item.currentStock || 0,
          allocatedStock: 0,
          minimumStock: item.minimumStock || 0,
          reorderLevel: item.reorderLevel || item.minimumStock || 0,
          standardCost: item.standardCost || 0,
          warehouseLocation: item.warehouseLocation,
          batchTracking: false,
          expiryTracking: false,
          status: StockItemStatus.ACTIVE,
          isProjectSpecific: false, // Imported items are global by default
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
