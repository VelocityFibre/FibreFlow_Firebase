export type RFQStatus = 'draft' | 'sent' | 'closed' | 'cancelled';

export interface RFQ {
  id?: string;
  projectId: string;
  projectName: string; // For display purposes
  rfqNumber: string; // Auto-generated: RFQ-YYYY-001
  title: string;
  description: string;
  boqItemIds: string[]; // BOQ items included in this RFQ
  supplierIds: string[]; // Suppliers this RFQ was sent to
  manualEmails?: string[]; // Manual email addresses to send RFQ to
  status: RFQStatus;
  deadline: Date;
  deliveryLocation: string;
  paymentTerms?: string;
  specialRequirements?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  sentAt?: Date;
  closedAt?: Date;
}

export interface RFQSummary {
  totalItems: number;
  totalEstimatedValue: number;
  suppliersCount: number;
  quotesReceived: number;
  averageResponseTime?: number; // in days
}

export interface RFQItem {
  boqItemId: string;
  itemCode: string;
  description: string;
  specification: string;
  unit: string;
  requiredQuantity: number;
  estimatedUnitPrice?: number;
  estimatedTotalPrice?: number;
}
