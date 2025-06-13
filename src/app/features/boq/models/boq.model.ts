export interface BOQItem {
  id?: string;
  projectId: string;
  projectName?: string; // For display purposes
  itemCode: string;
  description: string;
  specification?: string;
  unit: string;
  requiredQuantity: number;
  allocatedQuantity: number;
  remainingQuantity: number;
  unitPrice: number;
  totalPrice: number;
  status: BOQStatus;
  needsQuote: boolean;
  stockItemId?: string; // Link to stock management
  createdAt?: Date;
  updatedAt?: Date;
  createdBy?: string;
  updatedBy?: string;
}

export type BOQStatus = 'Planned' | 'Partially Allocated' | 'Fully Allocated' | 'Ordered' | 'Delivered';

export interface BOQSummary {
  projectId: string;
  totalItems: number;
  totalValue: number;
  allocatedValue: number;
  remainingValue: number;
  itemsNeedingQuotes: number;
}

export interface BOQImportData {
  projectId: string;
  items: Partial<BOQItem>[];
}

export interface BOQFilter {
  projectId?: string;
  status?: BOQStatus | 'all';
  searchTerm?: string;
  needsQuote?: boolean;
}