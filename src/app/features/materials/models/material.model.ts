export interface MasterMaterial {
  itemCode: string; // Primary Key
  description: string;
  category: string;
  subcategory?: string;
  unitOfMeasure: 'each' | 'meters' | 'feet' | 'units';
  unitCost: number;
  defaultSpoolLength?: number; // For cables
  supplierId?: string;
  specifications?: string;
  minimumStock?: number;
  createdAt: Date;
  updatedAt: Date;
}