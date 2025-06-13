import { Timestamp } from '@angular/fire/firestore';

export interface StockItem {
  id?: string;
  itemCode: string;
  name: string;
  description?: string;
  category: StockCategory;
  subcategory?: string;
  unitOfMeasure: UnitOfMeasure;

  // Stock levels
  currentStock: number;
  allocatedStock: number;
  availableStock?: number; // Calculated: currentStock - allocatedStock
  minimumStock: number;
  reorderLevel: number;

  // Cost information
  standardCost: number;
  lastPurchasePrice?: number;

  // Storage information
  warehouseLocation?: string;
  storageRequirements?: string;

  // Supplier information
  primarySupplierId?: string;
  alternativeSupplierIds?: string[];

  // Quality information
  batchTracking: boolean;
  expiryTracking: boolean;

  // Status
  status: StockItemStatus;

  // Audit fields
  createdAt: Timestamp;
  createdBy: string;
  updatedAt: Timestamp;
  updatedBy: string;
}

export enum StockCategory {
  FIBRE_CABLE = 'fibre_cable',
  POLES = 'poles',
  EQUIPMENT = 'equipment',
  TOOLS = 'tools',
  CONSUMABLES = 'consumables',
  HOME_CONNECTIONS = 'home_connections',
  NETWORK_EQUIPMENT = 'network_equipment',
  SAFETY_EQUIPMENT = 'safety_equipment',
  OTHER = 'other',
}

export enum UnitOfMeasure {
  METERS = 'meters',
  UNITS = 'units',
  PIECES = 'pieces',
  BOXES = 'boxes',
  ROLLS = 'rolls',
  SETS = 'sets',
  LITERS = 'liters',
  KILOGRAMS = 'kg',
  HOURS = 'hours',
}

export enum StockItemStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DISCONTINUED = 'discontinued',
  OUT_OF_STOCK = 'out_of_stock',
}

export interface StockMovement {
  id?: string;
  stockItemId: string;
  stockItemDetails?: StockItem; // Populated on read
  type: MovementType;
  quantity: number;
  date: Timestamp;

  // Related entities
  projectId?: string;
  projectName?: string;
  contractorId?: string;
  contractorName?: string;
  supplierId?: string;
  supplierName?: string;

  // Location tracking
  fromLocationId?: string;
  fromLocation?: string;
  toLocationId?: string;
  toLocation?: string;

  // Cost tracking
  unitCost?: number;
  totalCost?: number;

  // Quality tracking
  batchNumber?: string;
  expiryDate?: Timestamp;
  qualityCheckStatus?: string;

  // Documentation
  referenceNumber?: string;
  notes?: string;
  attachments?: string[];

  // User tracking
  performedBy: string;
  performedByName?: string;
  approvedBy?: string;
  approvedByName?: string;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export enum MovementType {
  RECEIPT = 'receipt',
  ISSUE = 'issue',
  TRANSFER = 'transfer',
  ADJUSTMENT = 'adjustment',
  RETURN = 'return',
  SITE_ALLOCATION = 'site_allocation',
  CONSUMPTION = 'consumption',
}

export interface StockAllocation {
  id?: string;
  stockItemId: string;
  stockItemDetails?: StockItem;
  projectId: string;
  projectName?: string;
  boqItemId?: string;

  allocatedQuantity: number;
  consumedQuantity: number;
  remainingQuantity: number; // Calculated

  allocationDate: Timestamp;
  expectedUsageDate?: Timestamp;

  status: AllocationStatus;
  notes?: string;

  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export enum AllocationStatus {
  RESERVED = 'reserved',
  ISSUED = 'issued',
  PARTIALLY_CONSUMED = 'partially_consumed',
  CONSUMED = 'consumed',
  RETURNED = 'returned',
  CANCELLED = 'cancelled',
}

// Helper interfaces for import/export
export interface StockItemImport {
  itemCode: string;
  name: string;
  description?: string;
  category: string;
  subcategory?: string;
  unitOfMeasure: string;
  currentStock: number;
  minimumStock: number;
  reorderLevel: number;
  standardCost: number;
  warehouseLocation?: string;
}

export interface StockItemExport extends StockItemImport {
  id: string;
  availableStock: number;
  allocatedStock: number;
  status: string;
  lastUpdated: string;
}
