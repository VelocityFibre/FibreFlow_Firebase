import { Timestamp } from '@angular/fire/firestore';

export interface StockMovement {
  id?: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  movementType: MovementType;
  quantity: number;
  unitOfMeasure: string;
  
  // Reference Information
  referenceType?: ReferenceType;
  referenceId?: string;
  referenceNumber?: string;
  
  // From/To Information
  fromLocation?: string;
  toLocation?: string;
  fromProjectId?: string;
  fromProjectName?: string;
  toProjectId?: string;
  toProjectName?: string;
  
  // Financial Information
  unitCost: number;
  totalCost: number;
  
  // Additional Details
  reason?: string;
  notes?: string;
  performedBy: string;
  performedByName: string;
  approvedBy?: string;
  approvedByName?: string;
  
  // Stock Levels (snapshot at time of movement)
  previousStock: number;
  newStock: number;
  
  // Timestamps
  movementDate: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export enum MovementType {
  // Incoming
  PURCHASE = 'purchase',
  RETURN_FROM_PROJECT = 'return_from_project',
  TRANSFER_IN = 'transfer_in',
  ADJUSTMENT_INCREASE = 'adjustment_increase',
  FOUND = 'found',
  
  // Outgoing
  ALLOCATION = 'allocation',
  TRANSFER_OUT = 'transfer_out',
  ADJUSTMENT_DECREASE = 'adjustment_decrease',
  DAMAGE = 'damage',
  LOSS = 'loss',
  THEFT = 'theft',
  EXPIRED = 'expired',
  SALE = 'sale',
  
  // Neutral
  STOCK_TAKE = 'stock_take',
  RECOUNT = 'recount'
}

export enum ReferenceType {
  PURCHASE_ORDER = 'purchase_order',
  PROJECT = 'project',
  TRANSFER = 'transfer',
  ADJUSTMENT = 'adjustment',
  STOCK_TAKE = 'stock_take',
  RETURN = 'return',
  INVOICE = 'invoice'
}

export interface StockMovementFilter {
  itemId?: string;
  movementType?: MovementType;
  referenceType?: ReferenceType;
  projectId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  performedBy?: string;
}

export interface StockMovementSummary {
  totalIn: number;
  totalOut: number;
  netMovement: number;
  movementsByType: Map<MovementType, number>;
  totalValue: number;
}

// Helper functions for movement types
export function isIncomingMovement(type: MovementType): boolean {
  return [
    MovementType.PURCHASE,
    MovementType.RETURN_FROM_PROJECT,
    MovementType.TRANSFER_IN,
    MovementType.ADJUSTMENT_INCREASE,
    MovementType.FOUND
  ].includes(type);
}

export function isOutgoingMovement(type: MovementType): boolean {
  return [
    MovementType.ALLOCATION,
    MovementType.TRANSFER_OUT,
    MovementType.ADJUSTMENT_DECREASE,
    MovementType.DAMAGE,
    MovementType.LOSS,
    MovementType.THEFT,
    MovementType.EXPIRED,
    MovementType.SALE
  ].includes(type);
}

export function getMovementTypeLabel(type: MovementType): string {
  const labels: Record<MovementType, string> = {
    [MovementType.PURCHASE]: 'Purchase',
    [MovementType.RETURN_FROM_PROJECT]: 'Return from Project',
    [MovementType.TRANSFER_IN]: 'Transfer In',
    [MovementType.ADJUSTMENT_INCREASE]: 'Adjustment (Increase)',
    [MovementType.FOUND]: 'Found',
    [MovementType.ALLOCATION]: 'Project Allocation',
    [MovementType.TRANSFER_OUT]: 'Transfer Out',
    [MovementType.ADJUSTMENT_DECREASE]: 'Adjustment (Decrease)',
    [MovementType.DAMAGE]: 'Damage',
    [MovementType.LOSS]: 'Loss',
    [MovementType.THEFT]: 'Theft',
    [MovementType.EXPIRED]: 'Expired',
    [MovementType.SALE]: 'Sale',
    [MovementType.STOCK_TAKE]: 'Stock Take',
    [MovementType.RECOUNT]: 'Recount'
  };
  return labels[type] || type;
}

export function getMovementTypeIcon(type: MovementType): string {
  const icons: Record<MovementType, string> = {
    [MovementType.PURCHASE]: 'shopping_cart',
    [MovementType.RETURN_FROM_PROJECT]: 'keyboard_return',
    [MovementType.TRANSFER_IN]: 'call_received',
    [MovementType.ADJUSTMENT_INCREASE]: 'add_circle',
    [MovementType.FOUND]: 'search',
    [MovementType.ALLOCATION]: 'assignment',
    [MovementType.TRANSFER_OUT]: 'call_made',
    [MovementType.ADJUSTMENT_DECREASE]: 'remove_circle',
    [MovementType.DAMAGE]: 'broken_image',
    [MovementType.LOSS]: 'error',
    [MovementType.THEFT]: 'security',
    [MovementType.EXPIRED]: 'schedule',
    [MovementType.SALE]: 'sell',
    [MovementType.STOCK_TAKE]: 'inventory',
    [MovementType.RECOUNT]: 'refresh'
  };
  return icons[type] || 'swap_horiz';
}

export function getMovementTypeColor(type: MovementType): string {
  if (isIncomingMovement(type)) return 'success';
  if (isOutgoingMovement(type)) return 'warn';
  return 'primary';
}