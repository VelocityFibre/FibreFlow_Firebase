import { Timestamp } from '@angular/fire/firestore';

export interface MasterMaterial {
  id?: string;
  itemCode: string; // Unique identifier (e.g., "DP-A-1-LB-86/73-2-10")
  description: string;
  category: MaterialCategory;
  subcategory?: string;
  unitOfMeasure: UnitOfMeasure;
  unitCost: number;
  specifications?: string;
  defaultSpoolLength?: number; // For cable materials
  supplierId?: string;
  supplierName?: string;
  minimumStockLevel?: number;
  maximumStockLevel?: number;
  reorderPoint?: number;
  reorderQuantity?: number;
  isActive: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  createdBy?: string;
  updatedBy?: string;
}

export type UnitOfMeasure = 'each' | 'meters' | 'feet' | 'units' | 'rolls' | 'boxes';

export type MaterialCategory =
  | 'Drop Cable'
  | 'Feeder Cable - ADSS'
  | 'Distribution Cable - Mini ADSS'
  | 'Underground Cable - Micro Blown'
  | 'Pole - Creosote'
  | 'Pole - Steel'
  | 'Connector'
  | 'Duct'
  | 'Closure'
  | 'Accessories';

export interface MaterialFilter {
  category?: MaterialCategory;
  searchTerm?: string;
  isActive?: boolean;
  supplierId?: string;
}

export interface MaterialImportRow {
  'Item Code': string;
  Description: string;
  Category: string;
  Unit: string;
  'Unit Cost': string;
  Specifications?: string;
  Supplier?: string;
  'Min Stock'?: string;
  'Max Stock'?: string;
  'Reorder Point'?: string;
}

export interface MaterialSummary {
  totalMaterials: number;
  totalValue: number;
  categoryCounts: Record<MaterialCategory, number>;
  lowStockItems: number;
}
