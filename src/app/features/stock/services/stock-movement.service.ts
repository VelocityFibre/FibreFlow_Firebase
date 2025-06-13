import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  doc,
  query,
  where,
  orderBy,
  limit,
  collectionData,
  runTransaction,
  serverTimestamp,
  Timestamp,
  writeBatch,
  getDoc,
} from '@angular/fire/firestore';
import { Observable, map } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { StockService } from './stock.service';
import { ProjectService } from '../../../core/services/project.service';
import {
  StockMovement,
  ReferenceType,
  StockMovementFilter,
  StockMovementSummary,
  isIncomingMovement,
  isOutgoingMovement,
} from '../models/stock-movement.model';
import { StockItem, MovementType } from '../models/stock-item.model';

@Injectable({
  providedIn: 'root',
})
export class StockMovementService {
  private firestore = inject(Firestore);
  private authService = inject(AuthService);
  private stockService = inject(StockService);
  private projectService = inject(ProjectService);

  private movementsCollection = collection(this.firestore, 'stockMovements');

  // Get all movements with optional filtering
  getMovements(filter?: StockMovementFilter): Observable<StockMovement[]> {
    let q = query(this.movementsCollection, orderBy('movementDate', 'desc'));

    if (filter) {
      const constraints = [];

      if (filter.itemId) {
        constraints.push(where('itemId', '==', filter.itemId));
      }
      if (filter.movementType) {
        constraints.push(where('movementType', '==', filter.movementType));
      }
      if (filter.referenceType) {
        constraints.push(where('referenceType', '==', filter.referenceType));
      }
      if (filter.projectId) {
        constraints.push(where('toProjectId', '==', filter.projectId));
      }
      if (filter.performedBy) {
        constraints.push(where('performedBy', '==', filter.performedBy));
      }

      if (constraints.length > 0) {
        q = query(this.movementsCollection, ...constraints, orderBy('movementDate', 'desc'));
      }
    }

    return collectionData(q, { idField: 'id' }) as Observable<StockMovement[]>;
  }

  // Get movements for a specific stock item
  getItemMovements(itemId: string): Observable<StockMovement[]> {
    const q = query(
      this.movementsCollection,
      where('itemId', '==', itemId),
      orderBy('movementDate', 'desc'),
    );
    return collectionData(q, { idField: 'id' }) as Observable<StockMovement[]>;
  }

  // Get recent movements (last 50)
  getRecentMovements(limitCount: number = 50): Observable<StockMovement[]> {
    const q = query(this.movementsCollection, orderBy('movementDate', 'desc'), limit(limitCount));
    return collectionData(q, { idField: 'id' }) as Observable<StockMovement[]>;
  }

  // Create a new stock movement
  async createMovement(
    movement: Omit<StockMovement, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<string> {
    const currentUser = await this.authService.getCurrentUser();
    if (!currentUser) throw new Error('User not authenticated');

    return runTransaction(this.firestore, async (transaction) => {
      // Get the stock item
      const itemDoc = doc(this.firestore, 'stockItems', movement.itemId);
      const itemSnapshot = await transaction.get(itemDoc);

      if (!itemSnapshot.exists()) {
        throw new Error('Stock item not found');
      }

      const stockItem = itemSnapshot.data() as StockItem;
      const previousStock = stockItem.currentStock;
      let newStock = previousStock;

      // Calculate new stock level
      if (isIncomingMovement(movement.movementType)) {
        newStock = previousStock + movement.quantity;
      } else if (isOutgoingMovement(movement.movementType)) {
        newStock = previousStock - movement.quantity;

        // Check if we have enough stock
        if (newStock < 0) {
          throw new Error(
            `Insufficient stock. Available: ${previousStock}, Requested: ${movement.quantity}`,
          );
        }
      }

      // Create the movement record
      const movementDoc = doc(this.movementsCollection);
      const newMovement: StockMovement = {
        ...movement,
        id: movementDoc.id,
        previousStock,
        newStock,
        performedBy: currentUser.uid,
        performedByName: currentUser.displayName || currentUser.email || 'Unknown',
        movementDate: movement.movementDate || (serverTimestamp() as Timestamp),
        createdAt: serverTimestamp() as Timestamp,
        updatedAt: serverTimestamp() as Timestamp,
      };

      // Update stock item
      transaction.update(itemDoc, {
        currentStock: newStock,
        availableStock: newStock - stockItem.allocatedStock,
        lastMovementDate: serverTimestamp(),
        lastMovementType: movement.movementType,
        updatedAt: serverTimestamp(),
      });

      // Create movement record
      transaction.set(movementDoc, newMovement);

      // Update project allocation if it's an allocation movement
      if (movement.movementType === MovementType.ALLOCATION && movement.toProjectId) {
        // You could add project-specific tracking here
      }

      return movementDoc.id;
    });
  }

  // Bulk create movements (for imports or stock takes)
  async createBulkMovements(
    movements: Omit<StockMovement, 'id' | 'createdAt' | 'updatedAt'>[],
  ): Promise<void> {
    const currentUser = await this.authService.getCurrentUser();
    if (!currentUser) throw new Error('User not authenticated');

    const batch = writeBatch(this.firestore);
    const stockUpdates = new Map<string, number>();

    // First, calculate all stock changes
    for (const movement of movements) {
      const currentChange = stockUpdates.get(movement.itemId) || 0;

      if (isIncomingMovement(movement.movementType)) {
        stockUpdates.set(movement.itemId, currentChange + movement.quantity);
      } else if (isOutgoingMovement(movement.movementType)) {
        stockUpdates.set(movement.itemId, currentChange - movement.quantity);
      }
    }

    // Verify stock levels
    for (const [itemId, change] of stockUpdates.entries()) {
      if (change < 0) {
        const itemDoc = doc(this.firestore, 'stockItems', itemId);
        const itemSnapshot = await getDoc(itemDoc);

        if (itemSnapshot.exists()) {
          const stockItem = itemSnapshot.data() as StockItem;
          if (stockItem.currentStock + change < 0) {
            throw new Error(
              `Insufficient stock for item ${stockItem.name}. Available: ${stockItem.currentStock}, Change: ${change}`,
            );
          }
        }
      }
    }

    // Create all movements
    for (const movement of movements) {
      const movementDoc = doc(this.movementsCollection);
      const newMovement: StockMovement = {
        ...movement,
        id: movementDoc.id,
        performedBy: currentUser.uid,
        performedByName: currentUser.displayName || currentUser.email || 'Unknown',
        movementDate: movement.movementDate || (serverTimestamp() as Timestamp),
        createdAt: serverTimestamp() as Timestamp,
        updatedAt: serverTimestamp() as Timestamp,
        previousStock: 0, // Will be updated in individual transactions
        newStock: 0,
      };

      batch.set(movementDoc, newMovement);
    }

    // Update stock items
    for (const [itemId, change] of stockUpdates.entries()) {
      const itemDoc = doc(this.firestore, 'stockItems', itemId);
      batch.update(itemDoc, {
        currentStock: change,
        lastMovementDate: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    await batch.commit();
  }

  // Get movement summary for an item or project
  getMovementSummary(filter: StockMovementFilter): Observable<StockMovementSummary> {
    return this.getMovements(filter).pipe(
      map((movements) => {
        let totalIn = 0;
        let totalOut = 0;
        let totalValue = 0;
        const movementsByType = new Map<MovementType, number>();

        movements.forEach((movement) => {
          if (isIncomingMovement(movement.movementType)) {
            totalIn += movement.quantity;
          } else if (isOutgoingMovement(movement.movementType)) {
            totalOut += movement.quantity;
          }

          totalValue += movement.totalCost;

          const currentCount = movementsByType.get(movement.movementType) || 0;
          movementsByType.set(movement.movementType, currentCount + movement.quantity);
        });

        return {
          totalIn,
          totalOut,
          netMovement: totalIn - totalOut,
          movementsByType,
          totalValue,
        };
      }),
    );
  }

  // Transfer stock between locations/projects
  async transferStock(
    itemId: string,
    quantity: number,
    fromLocation: string,
    toLocation: string,
    fromProjectId?: string,
    toProjectId?: string,
    notes?: string,
  ): Promise<void> {
    const stockItem = await this.stockService.getStockItemOnce(itemId);
    if (!stockItem) throw new Error('Stock item not found');

    // Create outgoing movement
    const outgoingMovement: Omit<StockMovement, 'id' | 'createdAt' | 'updatedAt'> = {
      itemId,
      itemCode: stockItem.itemCode,
      itemName: stockItem.name,
      movementType: MovementType.TRANSFER_OUT,
      quantity,
      unitOfMeasure: stockItem.unitOfMeasure,
      referenceType: ReferenceType.TRANSFER,
      fromLocation,
      fromProjectId,
      fromProjectName: fromProjectId ? 'Project Name' : undefined, // Would fetch from project service
      unitCost: stockItem.standardCost,
      totalCost: stockItem.standardCost * quantity,
      notes,
      performedBy: '',
      performedByName: '',
      previousStock: 0,
      newStock: 0,
      movementDate: serverTimestamp() as Timestamp,
    };

    // Create incoming movement
    const incomingMovement: Omit<StockMovement, 'id' | 'createdAt' | 'updatedAt'> = {
      ...outgoingMovement,
      movementType: MovementType.TRANSFER_IN,
      toLocation,
      toProjectId,
      toProjectName: toProjectId ? 'Project Name' : undefined,
      fromLocation: undefined,
      fromProjectId: undefined,
      fromProjectName: undefined,
    };

    // Create both movements
    await this.createMovement(outgoingMovement);
    await this.createMovement(incomingMovement);
  }

  // Adjust stock (for corrections, damages, etc.)
  async adjustStock(
    itemId: string,
    adjustmentQuantity: number,
    movementType: MovementType,
    reason: string,
    notes?: string,
  ): Promise<void> {
    const stockItem = await this.stockService.getStockItemOnce(itemId);
    if (!stockItem) throw new Error('Stock item not found');

    const movement: Omit<StockMovement, 'id' | 'createdAt' | 'updatedAt'> = {
      itemId,
      itemCode: stockItem.itemCode,
      itemName: stockItem.name,
      movementType,
      quantity: Math.abs(adjustmentQuantity),
      unitOfMeasure: stockItem.unitOfMeasure,
      referenceType: ReferenceType.ADJUSTMENT,
      reason,
      notes,
      unitCost: stockItem.standardCost,
      totalCost: stockItem.standardCost * Math.abs(adjustmentQuantity),
      performedBy: '',
      performedByName: '',
      previousStock: 0,
      newStock: 0,
      movementDate: serverTimestamp() as Timestamp,
    };

    await this.createMovement(movement);
  }

  // Allocate stock to a project
  async allocateToProject(
    itemId: string,
    quantity: number,
    projectId: string,
    notes?: string,
  ): Promise<void> {
    const [stockItem, project] = await Promise.all([
      this.stockService.getStockItemOnce(itemId),
      this.projectService.getProjectOnce(projectId),
    ]);

    if (!stockItem) throw new Error('Stock item not found');
    if (!project) throw new Error('Project not found');

    const movement: Omit<StockMovement, 'id' | 'createdAt' | 'updatedAt'> = {
      itemId,
      itemCode: stockItem.itemCode,
      itemName: stockItem.name,
      movementType: MovementType.ALLOCATION,
      quantity,
      unitOfMeasure: stockItem.unitOfMeasure,
      referenceType: ReferenceType.PROJECT,
      referenceId: projectId,
      referenceNumber: project.projectCode,
      toProjectId: projectId,
      toProjectName: project.name,
      unitCost: stockItem.standardCost,
      totalCost: stockItem.standardCost * quantity,
      notes,
      performedBy: '',
      performedByName: '',
      previousStock: 0,
      newStock: 0,
      movementDate: serverTimestamp() as Timestamp,
    };

    await this.createMovement(movement);

    // Update allocated stock on the item
    await this.stockService.updateAllocatedStock(itemId, stockItem.allocatedStock + quantity);
  }

  // Return stock from a project
  async returnFromProject(
    itemId: string,
    quantity: number,
    projectId: string,
    reason: string,
    notes?: string,
  ): Promise<void> {
    const [stockItem, project] = await Promise.all([
      this.stockService.getStockItemOnce(itemId),
      this.projectService.getProjectOnce(projectId),
    ]);

    if (!stockItem) throw new Error('Stock item not found');
    if (!project) throw new Error('Project not found');

    const movement: Omit<StockMovement, 'id' | 'createdAt' | 'updatedAt'> = {
      itemId,
      itemCode: stockItem.itemCode,
      itemName: stockItem.name,
      movementType: MovementType.RETURN_FROM_PROJECT,
      quantity,
      unitOfMeasure: stockItem.unitOfMeasure,
      referenceType: ReferenceType.RETURN,
      referenceId: projectId,
      referenceNumber: project.projectCode,
      fromProjectId: projectId,
      fromProjectName: project.name,
      reason,
      notes,
      unitCost: stockItem.standardCost,
      totalCost: stockItem.standardCost * quantity,
      performedBy: '',
      performedByName: '',
      previousStock: 0,
      newStock: 0,
      movementDate: serverTimestamp() as Timestamp,
    };

    await this.createMovement(movement);

    // Update allocated stock on the item
    const newAllocated = Math.max(0, stockItem.allocatedStock - quantity);
    await this.stockService.updateAllocatedStock(itemId, newAllocated);
  }
}
