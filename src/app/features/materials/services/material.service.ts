import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
  query,
  where,
  orderBy,
  CollectionReference,
  writeBatch,
  limit,
  QueryConstraint,
  serverTimestamp,
} from '@angular/fire/firestore';
import { collectionData, docData } from '@angular/fire/firestore';
import { Observable, from, map, catchError, of, firstValueFrom } from 'rxjs';
import {
  MasterMaterial,
  MaterialFilter,
  MaterialSummary,
  MaterialCategory,
} from '../models/material.model';
import { RemoteLoggerService } from '../../../core/services/remote-logger.service';
import { BaseFirestoreService } from '../../../core/services/base-firestore.service';
import { EntityType } from '../../../core/models/audit-log.model';

@Injectable({
  providedIn: 'root',
})
export class MaterialService extends BaseFirestoreService<MasterMaterial> {
  protected override firestore = inject(Firestore); // Still needed for batch operations
  private logger = inject(RemoteLoggerService);
  protected collectionName = 'materials';

  protected getEntityType(): EntityType {
    return 'material';
  }

  // Get all materials with optional filters
  getMaterials(filter?: MaterialFilter): Observable<MasterMaterial[]> {
    this.logger.debug('getMaterials called', 'MaterialService', filter as Record<string, unknown>);

    const constraints: QueryConstraint[] = [orderBy('itemCode')];

    // Only add server-side filters if no isActive filter is specified
    // This avoids the index requirement temporarily
    if (!filter?.isActive) {
      if (filter?.category) {
        constraints.push(where('category', '==', filter.category));
      }

      if (filter?.supplierId) {
        constraints.push(where('supplierId', '==', filter.supplierId));
      }
    }

    return this.getWithQuery(constraints).pipe(
      map((materials) => {
        this.logger.debug('Materials fetched from Firestore', 'MaterialService', {
          count: materials.length,
          filter,
          sampleMaterials: materials
            .slice(0, 3)
            .map((m) => ({ id: m.id, itemCode: m.itemCode, isActive: m.isActive })),
        });

        // Apply client-side filters
        let filtered = materials;

        // Filter by isActive on client side if specified
        if (filter?.isActive !== undefined) {
          filtered = filtered.filter((m) => m.isActive === filter.isActive);
          this.logger.debug('Active filter applied', 'MaterialService', {
            isActive: filter.isActive,
            beforeCount: materials.length,
            afterCount: filtered.length,
          });
        }

        // Apply search filter on client side
        if (filter?.searchTerm) {
          const searchLower = filter.searchTerm.toLowerCase();
          filtered = filtered.filter(
            (m) =>
              m.itemCode.toLowerCase().includes(searchLower) ||
              m.description.toLowerCase().includes(searchLower) ||
              m.specifications?.toLowerCase().includes(searchLower),
          );
          this.logger.debug('Search filter applied', 'MaterialService', {
            searchTerm: filter.searchTerm,
            beforeCount: materials.length,
            afterCount: filtered.length,
          });
        }

        return filtered;
      }),
      catchError((error) => {
        this.logger.error('Error fetching materials', 'MaterialService', error);
        return of([]);
      }),
    );
  }

  // Get material by ID
  getMaterial(id: string): Observable<MasterMaterial | undefined> {
    return this.getById(id).pipe(
      catchError((error) => {
        console.error('Error fetching material:', error);
        return of(undefined);
      }),
    );
  }

  // Get material by item code
  getMaterialByCode(itemCode: string): Observable<MasterMaterial | undefined> {
    return this.getWithQuery([where('itemCode', '==', itemCode), limit(1)]).pipe(
      map((materials) => materials[0]),
      catchError((error) => {
        console.error('Error fetching material by code:', error);
        return of(undefined);
      }),
    );
  }

  // Check if item code exists
  async checkItemCodeExists(itemCode: string): Promise<boolean> {
    await this.logger.debug('Checking if item code exists', 'MaterialService', { itemCode });

    try {
      const exists = await firstValueFrom(
        this.getWithQuery([where('itemCode', '==', itemCode), limit(1)]).pipe(
          map((materials) => materials.length > 0),
          catchError((error) => {
            this.logger.error('Error checking item code', 'MaterialService', error);
            return of(false);
          }),
        ),
      );

      await this.logger.debug('Item code check result', 'MaterialService', {
        itemCode,
        exists,
      });

      return exists;
    } catch (error) {
      await this.logger.logError(error as Error, 'MaterialService', 'Failed to check item code');
      return false;
    }
  }

  // Add new material
  async addMaterial(
    material: Omit<MasterMaterial, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<string> {
    await this.logger.debug('MaterialService.addMaterial called', 'MaterialService', material);

    try {
      // Check if item code already exists
      const exists = await this.checkItemCodeExists(material.itemCode);
      if (exists) {
        const error = new Error(`Material with item code ${material.itemCode} already exists`);
        await this.logger.warn('Duplicate item code detected', 'MaterialService', {
          itemCode: material.itemCode,
        });
        throw error;
      }

      const newMaterial = {
        ...material,
        isActive: material.isActive ?? true,
      };

      const id = await this.create(newMaterial);

      await this.logger.info('Material saved successfully', 'MaterialService', {
        docId: id,
      });

      return id;
    } catch (error) {
      await this.logger.logError(error as Error, 'MaterialService', 'Failed to add material');
      throw error;
    }
  }

  // Update material
  updateMaterial(id: string, material: Partial<MasterMaterial>): Observable<void> {
    const { id: _, ...updateData } = material; // Remove id from update object
    return from(this.update(id, updateData));
  }

  // Delete material (soft delete)
  deleteMaterial(id: string): Observable<void> {
    return this.updateMaterial(id, { isActive: false });
  }

  // Hard delete material (use with caution)
  hardDeleteMaterial(id: string): Observable<void> {
    return from(this.delete(id));
  }

  // Import multiple materials
  async importMaterials(
    materials: Omit<MasterMaterial, 'id' | 'createdAt' | 'updatedAt'>[],
  ): Promise<void> {
    const batch = writeBatch(this.firestore);
    const existingCodes = new Set<string>();

    // Check for duplicate item codes in the import
    for (const material of materials) {
      if (existingCodes.has(material.itemCode)) {
        throw new Error(`Duplicate item code in import: ${material.itemCode}`);
      }
      existingCodes.add(material.itemCode);

      // Check if item code already exists in database
      const exists = await this.checkItemCodeExists(material.itemCode);
      if (exists) {
        throw new Error(`Material with item code ${material.itemCode} already exists`);
      }
    }

    // Add all materials in a batch
    for (const material of materials) {
      const docRef = doc(collection(this.firestore, this.collectionName));
      const newMaterial = {
        ...material,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        isActive: material.isActive ?? true,
      };
      batch.set(docRef, newMaterial);
    }

    await batch.commit();
  }

  // Export materials to CSV format
  exportMaterials(materials: MasterMaterial[]): string {
    const headers = [
      'Item Code',
      'Description',
      'Category',
      'Subcategory',
      'Unit',
      'Unit Cost',
      'Specifications',
      'Supplier',
      'Min Stock',
      'Max Stock',
      'Reorder Point',
    ];

    const rows = materials.map((m) => [
      m.itemCode,
      `"${m.description.replace(/"/g, '""')}"`, // Escape quotes in description
      m.category,
      m.subcategory || '',
      m.unitOfMeasure,
      m.unitCost.toString(),
      m.specifications ? `"${m.specifications.replace(/"/g, '""')}"` : '',
      m.supplierName || '',
      m.minimumStockLevel?.toString() || '',
      m.maximumStockLevel?.toString() || '',
      m.reorderPoint?.toString() || '',
    ]);

    const csv = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');

    return csv;
  }

  // Get material summary statistics
  getMaterialSummary(): Observable<MaterialSummary> {
    return this.getMaterials({ isActive: true }).pipe(
      map((materials) => {
        const categoryCounts: Record<string, number> = {};
        let totalValue = 0;
        const lowStockItems = 0;

        materials.forEach((m) => {
          categoryCounts[m.category] = (categoryCounts[m.category] || 0) + 1;
          totalValue += m.unitCost;
          // Note: lowStockItems would need stock data to calculate
        });

        return {
          totalMaterials: materials.length,
          totalValue,
          categoryCounts: categoryCounts as Record<MaterialCategory, number>,
          lowStockItems,
        };
      }),
    );
  }

  // Get materials by category
  getMaterialsByCategory(category: MaterialCategory): Observable<MasterMaterial[]> {
    return this.getMaterials({ category, isActive: true });
  }

  // Search materials
  searchMaterials(searchTerm: string): Observable<MasterMaterial[]> {
    return this.getMaterials({ searchTerm, isActive: true });
  }

  // Get all categories
  getCategories(): MaterialCategory[] {
    return [
      'Drop Cable',
      'Feeder Cable - ADSS',
      'Distribution Cable - Mini ADSS',
      'Underground Cable - Micro Blown',
      'Pole - Creosote',
      'Pole - Steel',
      'Connector',
      'Duct',
      'Closure',
      'Accessories',
    ];
  }

  // Get all units of measure
  getUnitsOfMeasure(): string[] {
    return ['each', 'meters', 'feet', 'units', 'rolls', 'boxes'];
  }
}
